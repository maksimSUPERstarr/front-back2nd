const initialAuthors = [
  { id: 'a1', name: 'Михаил Булгаков', country: 'Россия' },
  { id: 'a2', name: 'Джордж Оруэлл', country: 'Великобритания' },
  { id: 'a3', name: 'Рэй Брэдбери', country: 'США' }
];

const initialBooks = [
  { id: 'b1', title: 'Мастер и Маргарита', year: 1967, genre: 'роман', authorId: 'a1' },
  { id: 'b2', title: '1984', year: 1949, genre: 'антиутопия', authorId: 'a2' },
  { id: 'b3', title: '451 градус по Фаренгейту', year: 1953, genre: 'антиутопия', authorId: 'a3' }
];

let authors = structuredClone(initialAuthors);
let books = structuredClone(initialBooks);

function nextId(prefix, collection) {
  const max = collection
    .map((item) => Number(item.id.replace(prefix, '')))
    .filter(Number.isFinite)
    .reduce((largest, value) => Math.max(largest, value), 0);

  return `${prefix}${max + 1}`;
}

export function getAuthors() {
  return authors;
}

export function getBooks() {
  return books;
}

export function findAuthorById(id) {
  return authors.find((author) => author.id === id) ?? null;
}

export function findBookById(id) {
  return books.find((book) => book.id === id) ?? null;
}

export function getBooksByAuthor(authorId) {
  return books.filter((book) => book.authorId === authorId);
}

export function addAuthor(input) {
  const author = {
    id: nextId('a', authors),
    name: input.name,
    country: input.country ?? null
  };
  authors.push(author);
  return author;
}

export function addBook(input) {
  const book = {
    id: nextId('b', books),
    title: input.title,
    year: input.year,
    genre: input.genre,
    authorId: input.authorId
  };
  books.push(book);
  return book;
}

export function resetStore() {
  authors = structuredClone(initialAuthors);
  books = structuredClone(initialBooks);
}
