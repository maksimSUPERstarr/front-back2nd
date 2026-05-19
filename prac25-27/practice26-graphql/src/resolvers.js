import { GraphQLError } from 'graphql';
import {
  addAuthor,
  addBook,
  findAuthorById,
  findBookById,
  getAuthors,
  getBooks,
  getBooksByAuthor
} from './store.js';

export const resolvers = {
  Query: {
    books: () => getBooks(),
    book: (_, { id }) => findBookById(id),
    authors: () => getAuthors()
  },

  Mutation: {
    createAuthor: (_, { input }) => addAuthor(input),

    createBook: (_, { input }) => {
      const author = findAuthorById(input.authorId);
      if (!author) {
        throw new GraphQLError(`Author with id "${input.authorId}" was not found`, {
          extensions: { code: 'AUTHOR_NOT_FOUND' }
        });
      }

      return addBook(input);
    }
  },

  Book: {
    author: (book) => findAuthorById(book.authorId)
  },

  Author: {
    books: (author) => getBooksByAuthor(author.id)
  }
};
