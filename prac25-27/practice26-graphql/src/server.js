import { ApolloServer } from '@apollo/server';
import { resolvers } from './resolvers.js';
import { typeDefs } from './schema.js';

export function createApolloServer() {
  return new ApolloServer({
    typeDefs,
    resolvers
  });
}
