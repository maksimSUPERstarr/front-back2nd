import { setTimeout as delay } from 'node:timers/promises';
import { config } from './config.js';
import { connectRabbit, retryRoutingKey, setupRabbit } from './rabbit.js';

const workerId =
  process.argv.find((arg) => arg.startsWith('--id='))?.replace('--id=', '') ??
  process.env.WORKER_ID ??
  '1';

const connection = await connectRabbit();
const channel = await connection.createChannel();
await setupRabbit(channel);
await channel.prefetch(1);

console.log(`[Worker ${workerId}] started. Waiting for tasks...`);

channel.consume(config.taskQueue, async (message) => {
  if (!message) return;

  const task = JSON.parse(message.content.toString());
  const attempt = Number(message.properties.headers?.['x-attempt'] ?? 0);

  console.log(`[Worker ${workerId}] task ${task.id}, attempt ${attempt + 1}`);

  try {
    await processTask(task);
    channel.ack(message);
    console.log(`[Worker ${workerId}] task ${task.id} completed`);
  } catch (error) {
    console.error(`[Worker ${workerId}] task ${task.id} failed: ${error.message}`);

    if (attempt < config.maxRetries) {
      const nextAttempt = attempt + 1;
      const retryDelay = config.retryDelaysMs[nextAttempt - 1];

      channel.publish(config.retryExchange, retryRoutingKey(nextAttempt), message.content, {
        contentType: 'application/json',
        deliveryMode: 2,
        headers: {
          ...message.properties.headers,
          'x-attempt': nextAttempt,
          'x-last-error': error.message
        }
      });

      channel.ack(message);
      console.warn(
        `[Worker ${workerId}] task ${task.id} moved to retry ${nextAttempt}; delay ${retryDelay}ms`
      );
      return;
    }

    console.error(`[Worker ${workerId}] task ${task.id} moved to DLQ`);
    channel.nack(message, false, false);
  }
});

async function processTask(task) {
  await delay(900);

  if (task.payload?.fail === true || task.type === 'fail') {
    throw new Error('Simulated processing error');
  }

  console.log(`[Worker ${workerId}] processed ${task.type}`, task.payload);
}

process.on('SIGINT', async () => {
  await channel.close();
  await connection.close();
  process.exit(0);
});
