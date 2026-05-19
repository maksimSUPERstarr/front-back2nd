export const config = {
  amqpUrl: process.env.AMQP_URL ?? 'amqp://localhost:5672',
  apiPort: Number(process.env.PORT ?? 3001),
  taskExchange: 'practice27.task.exchange',
  retryExchange: 'practice27.retry.exchange',
  deadLetterExchange: 'practice27.dlx',
  taskQueue: 'practice27.tasks',
  deadLetterQueue: 'practice27.dead',
  routingKey: 'tasks.create',
  deadRoutingKey: 'tasks.dead',
  maxRetries: 3,
  retryDelaysMs: [1000, 2000, 4000]
};
