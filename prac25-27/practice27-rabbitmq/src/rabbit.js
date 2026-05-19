import amqplib from 'amqplib';
import { config } from './config.js';

export async function connectRabbit() {
  return amqplib.connect(config.amqpUrl);
}

export async function setupRabbit(channel) {
  await channel.assertExchange(config.taskExchange, 'direct', { durable: true });
  await channel.assertExchange(config.retryExchange, 'direct', { durable: true });
  await channel.assertExchange(config.deadLetterExchange, 'direct', { durable: true });

  await channel.assertQueue(config.taskQueue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': config.deadLetterExchange,
      'x-dead-letter-routing-key': config.deadRoutingKey
    }
  });
  await channel.bindQueue(config.taskQueue, config.taskExchange, config.routingKey);

  await channel.assertQueue(config.deadLetterQueue, { durable: true });
  await channel.bindQueue(config.deadLetterQueue, config.deadLetterExchange, config.deadRoutingKey);

  for (const [index, delayMs] of config.retryDelaysMs.entries()) {
    const attempt = index + 1;
    const queueName = retryQueueName(attempt);
    const routingKey = retryRoutingKey(attempt);

    await channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-message-ttl': delayMs,
        'x-dead-letter-exchange': config.taskExchange,
        'x-dead-letter-routing-key': config.routingKey
      }
    });
    await channel.bindQueue(queueName, config.retryExchange, routingKey);
  }
}

export function retryQueueName(attempt) {
  return `practice27.retry.${attempt}`;
}

export function retryRoutingKey(attempt) {
  return `tasks.retry.${attempt}`;
}
