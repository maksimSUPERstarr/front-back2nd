const NOTES_KEY = 'notes';

let socket = null;
let vapidPublicKey = null;
const localReminderTimers = new Map();
const shownReminderIds = new Map();

// ======================
// УТИЛИТЫ
// ======================

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function updateConnectionStatus() {
    const el = document.getElementById('connection-status');
    if (!el) return;

    el.textContent = navigator.onLine ? 'Сеть: онлайн' : 'Сеть: офлайн';
}

function updateSwStatus(message) {
    const el = document.getElementById('sw-status');
    if (!el) return;

    el.textContent = message;
}

function updatePushStatus(message) {
    const el = document.getElementById('push-status');
    if (!el) return;

    el.textContent = message;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatDateTime(timestamp) {
    try {
        return new Date(timestamp).toLocaleString('ru-RU');
    } catch {
        return 'Некорректная дата';
    }
}


function wasReminderJustShown(reminderId) {
    if (!reminderId) return false;

    const now = Date.now();
    const lastShownAt = shownReminderIds.get(reminderId) || 0;

    if (now - lastShownAt < 10000) {
        return true;
    }

    shownReminderIds.set(reminderId, now);
    return false;
}

function updateSnoozedReminderInList(reminderId, minutes = 15) {
    const cleanMinutes = Number(minutes) || 15;
    const nextReminderAt = Date.now() + cleanMinutes * 60 * 1000;
    const notes = getNotes();
    const reminderKey = String(reminderId);
    let updatedNote = null;

    const updatedNotes = notes.map((note) => {
        if (String(note.id) === reminderKey) {
            updatedNote = {
                ...note,
                reminder: nextReminderAt
            };
            return updatedNote;
        }

        return note;
    });

    if (!updatedNote) return false;

    saveNotes(updatedNotes);
    renderNotes();
    scheduleLocalReminder(updatedNote);
    return true;
}

async function snoozeReminder(reminderId, noteText, minutes = 15) {
    const cleanText = String(noteText || '').trim();
    const cleanMinutes = Number(minutes) || 15;

    if (!reminderId || !cleanText) return;

    try {
        const response = await fetch('/snooze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reminderId,
                noteText: cleanText,
                snoozeMinutes: cleanMinutes
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        updateSnoozedReminderInList(reminderId, cleanMinutes);

        showToast(`Напоминание отложено на ${cleanMinutes} минут`);
    } catch (error) {
        console.error('Ошибка откладывания напоминания:', error);
        showToast('Не удалось отложить напоминание');
    }
}

function showReminderPopup(noteText, reminderId) {
    const toast = document.getElementById('toast');
    const cleanText = String(noteText || '').trim();
    if (!toast || !cleanText) return;

    toast.innerHTML = `
        <div style="font-weight:700;margin-bottom:6px;">Напоминание</div>
        <div style="margin-bottom:12px;">${escapeHtml(cleanText)}</div>
        <button id="snooze-15-btn" type="button" style="background:transparent;color:#fff;border:1px solid #fff;border-radius:999px;padding:8px 12px;cursor:pointer;">
            Отложить на 15 минут
        </button>
    `;
    toast.classList.add('show');

    const button = document.getElementById('snooze-15-btn');
    button?.addEventListener('click', async () => {
        clearTimeout(showToast._timer);
        toast.classList.remove('show');
        await snoozeReminder(reminderId, cleanText, 15);
    });

    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
        toast.classList.remove('show');
    }, 10000);
}

async function showReminderNotification(noteText, reminderId) {
    const cleanText = String(noteText || '').trim();
    if (!cleanText || wasReminderJustShown(reminderId)) return;

    showReminderPopup(cleanText, reminderId);

    if (!('Notification' in window)) {
        return;
    }

    if (Notification.permission !== 'granted') {
        updatePushStatus('Push: включи уведомления для системных напоминаний');
        return;
    }

    const options = {
        body: cleanText,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-32.png',
        tag: `reminder-${reminderId || Date.now()}`,
        renotify: true,
        data: {
            reminderId,
            noteText: cleanText
        },
        actions: [
            {
                action: 'snooze',
                title: 'Отложить на 5 минут'
            },
            {
                action: 'snooze15',
                title: 'Отложить на 15 минут'
            }
        ]
    };

    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification('Напоминание', options);
            return;
        }

        new Notification('Напоминание', options);
    } catch (error) {
        console.error('Ошибка показа напоминания:', error);
    }
}

function scheduleLocalReminder(note) {
    const normalized = normalizeNote(note);
    if (!normalized || !normalized.reminder) return;

    const delayMs = normalized.reminder - Date.now();
    if (delayMs <= 0) return;

    if (localReminderTimers.has(normalized.id)) {
        clearTimeout(localReminderTimers.get(normalized.id));
    }

    const timerId = setTimeout(() => {
        localReminderTimers.delete(normalized.id);
        showReminderNotification(normalized.text, normalized.id);
    }, delayMs);

    localReminderTimers.set(normalized.id, timerId);
}

function scheduleSavedReminders() {
    getNotes().forEach(scheduleLocalReminder);
}

window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'reminderSnoozed') {
            updateSnoozedReminderInList(event.data.reminderId, event.data.snoozeMinutes);
            showToast(`Напоминание отложено на ${event.data.snoozeMinutes} минут`);
        }
    });
}

// ======================
// LOCAL STORAGE
// ======================

function normalizeNote(rawNote) {
    if (!rawNote) return null;

    if (typeof rawNote === 'string') {
        return {
            id: Date.now() + Math.floor(Math.random() * 1000),
            text: rawNote,
            reminder: null,
            createdAt: Date.now()
        };
    }

    const id = Number(rawNote.id) || Date.now() + Math.floor(Math.random() * 1000);
    const text = typeof rawNote.text === 'string' ? rawNote.text.trim() : '';
    const reminder =
        rawNote.reminder === null || rawNote.reminder === undefined
            ? null
            : Number(rawNote.reminder);
    const createdAt = Number(rawNote.createdAt) || Date.now();

    if (!text) return null;

    return {
        id,
        text,
        reminder: Number.isFinite(reminder) ? reminder : null,
        createdAt
    };
}

function getNotes() {
    try {
        const raw = localStorage.getItem(NOTES_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map(normalizeNote)
            .filter(Boolean)
            .sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
        console.error('Ошибка чтения заметок из localStorage:', error);
        return [];
    }
}

function saveNotes(notes) {
    try {
        localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch (error) {
        console.error('Ошибка сохранения заметок в localStorage:', error);
        showToast('Не удалось сохранить заметки');
    }
}

function upsertNote(note) {
    const normalized = normalizeNote(note);
    if (!normalized) return;

    const notes = getNotes();
    const existingIndex = notes.findIndex((item) => item.id === normalized.id);

    if (existingIndex !== -1) {
        notes[existingIndex] = normalized;
    } else {
        notes.unshift(normalized);
    }

    notes.sort((a, b) => b.createdAt - a.createdAt);
    saveNotes(notes);
}

// ======================
// РЕНДЕР
// ======================

function renderNotes() {
    const list = document.getElementById('notes-list');
    const empty = document.getElementById('notes-empty-state');

    if (!list || !empty) return;

    const notes = getNotes();
    list.innerHTML = '';

    if (!notes.length) {
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    notes.forEach((note) => {
        const card = document.createElement('article');
        card.className = 'card';
        card.style.marginBottom = '12px';

        const reminderHtml = note.reminder
            ? `<p><small><strong>Напоминание:</strong> ${escapeHtml(formatDateTime(note.reminder))}</small></p>`
            : '<p><small>Без напоминания</small></p>';

        card.innerHTML = `
      <p><strong>Заметка:</strong> ${escapeHtml(note.text)}</p>
      ${reminderHtml}
      <p><small><strong>Создано:</strong> ${escapeHtml(formatDateTime(note.createdAt))}</small></p>
    `;

        list.appendChild(card);
    });
}

// ======================
// ЗАМЕТКИ
// ======================

function addNote(text) {
    const cleanText = String(text).trim();
    if (!cleanText) return;

    const newNote = {
        id: Date.now(),
        text: cleanText,
        reminder: null,
        createdAt: Date.now()
    };

    upsertNote(newNote);
    renderNotes();

    if (socket) {
        socket.emit('newTask', newNote);
    }

    showToast('Заметка добавлена');
}

function addReminder(text, dateTime) {
    const cleanText = String(text).trim();
    if (!cleanText || !dateTime) return false;

    const reminderTimestamp = new Date(dateTime).getTime();

    if (!Number.isFinite(reminderTimestamp)) {
        showToast('Некорректная дата напоминания');
        return false;
    }

    if (reminderTimestamp <= Date.now()) {
        showToast('Нельзя установить напоминание на прошедшее время');
        return false;
    }

    const reminderId = Date.now();

    const newNote = {
        id: reminderId,
        text: cleanText,
        reminder: reminderTimestamp,
        createdAt: Date.now()
    };

    upsertNote(newNote);
    renderNotes();
    scheduleLocalReminder(newNote);

    if (socket) {
        socket.emit('newReminder', {
            reminderId,
            noteText: cleanText,
            reminderAt: new Date(reminderTimestamp).toISOString()
        });
    }

    showToast('Заметка с напоминанием сохранена');
    return true;
}

// ======================
// APP SHELL
// ======================

async function loadContent(page) {
    const container = document.getElementById('app-content');
    if (!container) return;

    try {
        const response = await fetch(`/content/${page}.html`, { cache: 'no-store' });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        container.innerHTML = html;

        if (page === 'home') {
            initHomePage();
        }
    } catch (error) {
        console.error(`Ошибка загрузки страницы ${page}:`, error);
        container.innerHTML = `
      <div class="card">
        <p><strong>Ошибка загрузки страницы.</strong></p>
        <p>Проверь подключение к сети или работу сервера.</p>
      </div>
    `;
    }
}

function initNavigation() {
    const navHome = document.getElementById('nav-home');
    const navAbout = document.getElementById('nav-about');

    navHome?.addEventListener('click', () => loadContent('home'));
    navAbout?.addEventListener('click', () => loadContent('about'));
}

// ======================
// HOME PAGE
// ======================

function initHomePage() {
    renderNotes();

    const noteForm = document.getElementById('note-form');
    const reminderForm = document.getElementById('reminder-form');
    const reminderDateInput = document.getElementById('reminder-datetime');

    if (reminderDateInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        reminderDateInput.min = now.toISOString().slice(0, 16);
    }

    noteForm?.addEventListener('submit', (event) => {
        event.preventDefault();

        const input = document.getElementById('note-input');
        const value = input?.value?.trim();

        if (!value) {
            showToast('Введите текст заметки');
            return;
        }

        addNote(value);
        noteForm.reset();
    });

    reminderForm?.addEventListener('submit', (event) => {
        event.preventDefault();

        const textInput = document.getElementById('reminder-input');
        const dateInput = document.getElementById('reminder-datetime');

        const text = textInput?.value?.trim();
        const dateTime = dateInput?.value;

        if (!text || !dateTime) {
            showToast('Заполни текст и дату напоминания');
            return;
        }

        const success = addReminder(text, dateTime);
        if (success) {
            reminderForm.reset();

            if (dateInput) {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                dateInput.min = now.toISOString().slice(0, 16);
            }
        }
    });
}

// ======================
// SOCKET.IO
// ======================

function initSocket() {
    if (typeof io === 'undefined') {
        console.warn('Socket.IO client library is not loaded');
        return;
    }

    socket = io();

    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });

    socket.on('taskAdded', (task) => {
        const normalized = normalizeNote(task);
        if (!normalized) return;

        const alreadyExists = getNotes().some((note) => note.id === normalized.id);
        if (alreadyExists) return;

        upsertNote(normalized);
        renderNotes();
        showToast('Новая задача добавлена в другой вкладке');
    });

    socket.on('reminderDue', ({ reminderId, noteText } = {}) => {
        if (localReminderTimers.has(reminderId)) {
            clearTimeout(localReminderTimers.get(reminderId));
            localReminderTimers.delete(reminderId);
        }

        showReminderNotification(noteText, reminderId);
    });
}

// ======================
// SERVICE WORKER
// ======================

async function registerSW() {
    if (!('serviceWorker' in navigator)) {
        updateSwStatus('Service Worker: не поддерживается');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        updateSwStatus('Service Worker: зарегистрирован');

        return registration;
    } catch (error) {
        console.error('Ошибка регистрации Service Worker:', error);
        updateSwStatus('Service Worker: ошибка регистрации');
        return null;
    }
}

// ======================
// PUSH
// ======================

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function fetchVapidKey() {
    try {
        const response = await fetch('/api/config');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        vapidPublicKey = data.vapidPublicKey || null;
    } catch (error) {
        console.error('Ошибка получения VAPID ключа:', error);
        vapidPublicKey = null;
    }
}

async function syncPushStatus() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        updatePushStatus('Push: не поддерживается');
        return;
    }

    if (Notification.permission === 'denied') {
        updatePushStatus('Push: запрещен в браузере');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            updatePushStatus('Push: включен');
        } else if (Notification.permission === 'granted') {
            updatePushStatus('Push: разрешен, но не подписан');
        } else {
            updatePushStatus('Push: не активирован');
        }
    } catch (error) {
        console.error('Ошибка проверки push-подписки:', error);
        updatePushStatus('Push: ошибка проверки');
    }
}

async function subscribeUser() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        showToast('Push не поддерживается в этом браузере');
        updatePushStatus('Push: не поддерживается');
        return;
    }

    if (!vapidPublicKey) {
        showToast('VAPID ключ не получен с сервера');
        updatePushStatus('Push: нет VAPID ключа');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });
        }

        const response = await fetch('/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        updatePushStatus('Push: включен');
        showToast('Уведомления включены');
    } catch (error) {
        console.error('Ошибка подписки на push:', error);
        updatePushStatus('Push: ошибка подписки');
        showToast('Не удалось включить уведомления');
    }
}

async function unsubscribeUser() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        updatePushStatus('Push: не поддерживается');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            updatePushStatus('Push: выключен');
            showToast('Подписка уже отключена');
            return;
        }

        const response = await fetch('/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        await subscription.unsubscribe();

        updatePushStatus('Push: выключен');
        showToast('Уведомления отключены');
    } catch (error) {
        console.error('Ошибка отписки от push:', error);
        updatePushStatus('Push: ошибка отписки');
        showToast('Не удалось отключить уведомления');
    }
}

function initPushButtons() {
    const enableBtn = document.getElementById('enable-notifications');
    const disableBtn = document.getElementById('disable-notifications');

    enableBtn?.addEventListener('click', async () => {
        if (!('Notification' in window)) {
            showToast('Уведомления не поддерживаются');
            updatePushStatus('Push: не поддерживается');
            return;
        }

        try {
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                await subscribeUser();
            } else if (permission === 'denied') {
                updatePushStatus('Push: запрещен в браузере');
                showToast('Пользователь запретил уведомления');
            } else {
                updatePushStatus('Push: не активирован');
                showToast('Разрешение на уведомления не выдано');
            }
        } catch (error) {
            console.error('Ошибка запроса разрешения на уведомления:', error);
            showToast('Не удалось запросить разрешение');
        }
    });

    disableBtn?.addEventListener('click', unsubscribeUser);
}

// ======================
// INIT
// ======================

async function init() {
    updateConnectionStatus();
    initNavigation();
    initSocket();

    await fetchVapidKey();
    initPushButtons();

    await registerSW();
    await syncPushStatus();

    await loadContent('home');
    scheduleSavedReminders();
}

document.addEventListener('DOMContentLoaded', init);