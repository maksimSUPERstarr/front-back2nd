import express from 'express';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { connectRabbit, setupRabbit } from './rabbit.js';

const app = express();
app.use(express.json());

const connection = await connectRabbit();
const channel = await connection.createChannel();
await setupRabbit(channel);

app.get('/health', (_, res) => {
  res.json({ status: 'ok', queue: config.taskQueue });
});

app.post('/tasks', async (req, res) => {
  const { type, payload = {} } = req.body ?? {};

  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'Field "type" is required' });
  }

  const task = {
    id: randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString()
  };

  channel.publish(config.taskExchange, config.routingKey, Buffer.from(JSON.stringify(task)), {
    contentType: 'application/json',
    deliveryMode: 2,
    headers: {
      'x-attempt': 0
    }
  });

  res.status(202).json({ status: 'queued', task });
});

const server = app.listen(config.apiPort, () => {
  console.log(`Producer API started at http://localhost:${config.apiPort}`);
});

async function shutdown() {
  server.close();
  await channel.close();
  await connection.close();
}

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});
