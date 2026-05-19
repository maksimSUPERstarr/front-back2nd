import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { createApolloServer } from '../src/server.js';
import { resetStore } from '../src/store.js';

let server;

beforeEach(async () => {
  resetStore();
  server = createApolloServer();
  await server.start();
});

afterEach(async () => {
  await server.stop();
});

describe('books GraphQL API', () => {
  it('returns all books with nested authors', async () => {
    const result = await server.executeOperation({
      query: `#graphql
        query Books {
          books {
            id
            title
            author {
              name
            }
          }
        }
      `
    });

    assert.equal(result.body.kind, 'single');
    assert.equal(result.body.singleResult.errors, undefined);
    assert.equal(result.body.singleResult.data.books.length, 3);
    assert.equal(result.body.singleResult.data.books[0].author.name, 'Михаил Булгаков');
  });

  it('creates an author and returns nested books', async () => {
    const result = await server.executeOperation({
      query: `#graphql
        mutation CreateAuthor($input: CreateAuthorInput!) {
          createAuthor(input: $input) {
            id
            name
            books {
              id
            }
          }
        }
      `,
      variables: {
        input: { name: 'Аркадий Стругацкий', country: 'Россия' }
      }
    });

    assert.equal(result.body.kind, 'single');
    assert.equal(result.body.singleResult.errors, undefined);
    assert.equal(result.body.singleResult.data.createAuthor.name, 'Аркадий Стругацкий');
    assert.deepEqual(result.body.singleResult.data.createAuthor.books, []);
  });

  it('creates a book for an existing author', async () => {
    const result = await server.executeOperation({
      query: `#graphql
        mutation CreateBook($input: CreateBookInput!) {
          createBook(input: $input) {
            title
            author {
              id
              name
            }
          }
        }
      `,
      variables: {
        input: {
          title: 'Собачье сердце',
          year: 1925,
          genre: 'повесть',
          authorId: 'a1'
        }
      }
    });

    assert.equal(result.body.kind, 'single');
    assert.equal(result.body.singleResult.errors, undefined);
    assert.equal(result.body.singleResult.data.createBook.author.id, 'a1');
  });
});
