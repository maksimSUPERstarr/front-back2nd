import { startStandaloneServer } from '@apollo/server/standalone';
import { createApolloServer } from './server.js';

const port = Number(process.env.PORT ?? 4000);
const server = createApolloServer();

const { url } = await startStandaloneServer(server, {
  listen: { port }
});

console.log(`GraphQL API started at ${url}`);
