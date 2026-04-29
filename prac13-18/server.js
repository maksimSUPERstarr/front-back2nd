const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');
const { Server } = require('socket.io');
const webpush = require('web-push');
require('dotenv').config();

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || 'localhost';

const SSL_KEY_PATH =
    process.env.SSL_KEY_PATH || path.join(__dirname, 'cert', 'localhost-key.pem');
const SSL_CERT_PATH =
    process.env.SSL_CERT_PATH || path.join(__dirname, 'cert', 'localhost.pem');
const SSL_PFX_PATH =
    process.env.SSL_PFX_PATH || path.join(__dirname, 'cert', 'localhost.pfx');
const SSL_PFX_PASSPHRASE = process.env.SSL_PFX_PASSPHRASE || '';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:example@example.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
    console.warn(
        '[WARN] VAPID keys are not configured. Push notifications will not work until .env is filled.'
    );
}

const hasPemCertificate = fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH);
const hasPfxCertificate = fs.existsSync(SSL_PFX_PATH);

if (!hasPemCertificate && !hasPfxCertificate) {
    console.error('[ERROR] SSL certificate files not found.');
    console.error(`Key path: ${SSL_KEY_PATH}`);
    console.error(`Cert path: ${SSL_CERT_PATH}`);
    console.error(`PFX path: ${SSL_PFX_PATH}`);
    process.exit(1);
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ======================
// ХРАНИЛИЩА В ПАМЯТИ
// ======================

const subscriptions = [];
const reminderTimers = new Map();

// ======================
// УТИЛИТЫ
// ======================

function isValidSubscription(subscription) {
    return Boolean(
        subscription &&
        typeof subscription === 'object' &&
        typeof subscription.endpoint === 'string' &&
        subscription.endpoint.trim()
    );
}

function addSubscription(subscription) {
    if (!isValidSubscription(subscription)) {
        return false;
    }

    const exists = subscriptions.some(
        (item) => item.endpoint === subscription.endpoint
    );

    if (!exists) {
        subscriptions.push(subscription);
    }

    return true;
}

function removeSubscriptionByEndpoint(endpoint) {
    if (!endpoint || typeof endpoint !== 'string') {
        return false;
    }

    const index = subscriptions.findIndex((item) => item.endpoint === endpoint);

    if (index === -1) {
        return false;
    }

    subscriptions.splice(index, 1);
    return true;
}

async function sendPushNotification(payload) {
    if (!subscriptions.length) {
        return;
    }

    const invalidEndpoints = [];

    const results = await Promise.allSettled(
        subscriptions.map(async (subscription) => {
            try {
                await webpush.sendNotification(subscription, JSON.stringify(payload));
            } catch (error) {
                const statusCode = error?.statusCode;

                if (statusCode === 404 || statusCode === 410) {
                    invalidEndpoints.push(subscription.endpoint);
                }

                throw error;
            }
        })
    );

    results.forEach((result) => {
        if (result.status === 'rejected') {
            const error = result.reason;
            const statusCode = error?.statusCode;

            if (statusCode !== 404 && statusCode !== 410) {
                console.error('[Push error]', error);
            }
        }
    });

    if (invalidEndpoints.length) {
        invalidEndpoints.forEach((endpoint) => removeSubscriptionByEndpoint(endpoint));
    }
}

function scheduleReminder(reminderId, noteText, delayMs) {
    if (!reminderId || !noteText || !Number.isFinite(delayMs) || delayMs <= 0) {
        return false;
    }

    if (reminderTimers.has(reminderId)) {
        clearTimeout(reminderTimers.get(reminderId));
    }

    const timerId = setTimeout(async () => {
        try {
            await sendPushNotification({
                title: 'Напоминание',
                body: noteText,
                reminderId
            });

            if (typeof io !== 'undefined') {
                io.emit('reminderDue', { reminderId, noteText });
            }
        } catch (error) {
            console.error('[Reminder push error]', error);
        } finally {
            reminderTimers.delete(reminderId);
        }
    }, delayMs);

    reminderTimers.set(reminderId, timerId);
    return true;
}

// ======================
// API
// ======================

app.get('/api/config', (req, res) => {
    res.json({
        vapidPublicKey: VAPID_PUBLIC_KEY
    });
});

app.post('/subscribe', (req, res) => {
    const subscription = req.body;

    if (!isValidSubscription(subscription)) {
        return res.status(400).json({
            error: 'Некорректные данные подписки'
        });
    }

    const added = addSubscription(subscription);

    if (!added) {
        return res.status(400).json({
            error: 'Не удалось сохранить подписку'
        });
    }

    return res.status(201).json({
        message: 'Подписка сохранена'
    });
});

app.post('/unsubscribe', (req, res) => {
    const { endpoint } = req.body;

    if (!endpoint || typeof endpoint !== 'string') {
        return res.status(400).json({
            error: 'Endpoint обязателен'
        });
    }

    removeSubscriptionByEndpoint(endpoint);

    return res.json({
        message: 'Подписка удалена'
    });
});

app.post('/snooze', (req, res) => {
    const { reminderId, noteText } = req.body;
    const snoozeMinutes = Math.min(1440, Math.max(1, Number(req.body.snoozeMinutes) || 5));

    if (!reminderId || !noteText) {
        return res.status(400).json({
            error: 'reminderId и noteText обязательны'
        });
    }

    const delayMs = snoozeMinutes * 60 * 1000;
    const scheduled = scheduleReminder(reminderId, noteText, delayMs);

    if (!scheduled) {
        return res.status(400).json({
            error: 'Не удалось отложить напоминание'
        });
    }

    return res.json({
        message: `Напоминание отложено на ${snoozeMinutes} минут`
    });
});
app.post('/notify', async (req, res) => {
    const { title, body, reminderId } = req.body;

    try {
        await sendPushNotification({
            title: title || 'Новое уведомление',
            body: body || 'У вас новое сообщение',
            reminderId: reminderId || null
        });

        return res.json({
            message: 'Уведомление отправлено'
        });
    } catch (error) {
        console.error('[Notify error]', error);

        return res.status(500).json({
            error: 'Ошибка отправки уведомления'
        });
    }
});

// ======================
// HTTPS + SOCKET.IO
// ======================

const httpsOptions = hasPfxCertificate
    ? {
        pfx: fs.readFileSync(SSL_PFX_PATH),
        passphrase: SSL_PFX_PASSPHRASE
    }
    : {
        key: fs.readFileSync(SSL_KEY_PATH),
        cert: fs.readFileSync(SSL_CERT_PATH)
    };

const server = https.createServer(httpsOptions, app);

const io = new Server(server, {
    cors: {
        origin: true,
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    socket.on('newTask', async (task) => {
        try {
            if (!task || typeof task !== 'object' || !String(task.text || '').trim()) {
                return;
            }

            socket.broadcast.emit('taskAdded', task);

            await sendPushNotification({
                title: 'Новая задача',
                body: String(task.text || 'Добавлена новая задача'),
                reminderId: null
            });
        } catch (error) {
            console.error('[Socket newTask error]', error);
        }
    });

    socket.on('newReminder', ({ reminderId, noteText, reminderAt } = {}) => {
        try {
            if (!reminderId || !noteText || !reminderAt) {
                return;
            }

            const reminderTimestamp = new Date(reminderAt).getTime();

            if (!Number.isFinite(reminderTimestamp)) {
                return;
            }
 
            const delayMs = reminderTimestamp - Date.now();

            if (delayMs <= 0) {
                return;
            }

            scheduleReminder(reminderId, noteText, delayMs);
        } catch (error) {
            console.error('[Socket newReminder error]', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('[Socket] Client disconnected:', socket.id);
    });
});

// ======================
// START
// ======================

server.listen(PORT, HOST, () => {
    console.log(`HTTPS server started: https://${HOST}:${PORT}`);
});