# Практика 26 - GraphQL API

API реализует каталог книг на Apollo Server.

## Запуск

```bash
npm install
npm run start
```

Сервер запускается на `http://localhost:4000/`. Запросы для Apollo Sandbox находятся в `report/queries.graphql`.

## Реализовано

- Типы `Author` и `Book`.
- Связь один-ко-многим: один автор может иметь несколько книг.
- `Query.books`, `Query.book(id)`, `Query.authors`.
- `Mutation.createAuthor`, `Mutation.createBook`.
- Вложенные резолверы `Book.author` и `Author.books`.
- Автоматическая проверка трех сценариев командой `npm run test`.
