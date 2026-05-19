export const typeDefs = `#graphql
  type Author {
    id: ID!
    name: String!
    country: String
    books: [Book!]!
  }

  type Book {
    id: ID!
    title: String!
    year: Int!
    genre: String!
    author: Author!
  }

  input CreateAuthorInput {
    name: String!
    country: String
  }

  input CreateBookInput {
    title: String!
    year: Int!
    genre: String!
    authorId: ID!
  }

  type Query {
    books: [Book!]!
    book(id: ID!): Book
    authors: [Author!]!
  }

  type Mutation {
    createAuthor(input: CreateAuthorInput!): Author!
    createBook(input: CreateBookInput!): Book!
  }
`;
