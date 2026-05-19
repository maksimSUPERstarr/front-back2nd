import { connectRabbit, setupRabbit } from './rabbit.js';

const connection = await connectRabbit();
const channel = await connection.createChannel();

await setupRabbit(channel);

console.log('RabbitMQ exchanges, queues, retry queues and DLQ are ready.');

await channel.close();
await connection.close();
