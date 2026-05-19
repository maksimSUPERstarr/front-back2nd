# Практические задания 25-27

Тематический проект для блока практик по фронтенд- и бэкенд-разработке.

## Структура

- `practice25-vite` - React-приложение на Vite: два маршрута, lazy loading через `React.lazy` и `Suspense`, production build и отчет анализатора бандла.
- `practice26-graphql` - GraphQL API каталога книг на Apollo Server: типы `Author` и `Book`, запросы, мутации и вложенные резолверы.
- `practice27-rabbitmq` - система асинхронной обработки задач: Express producer, RabbitMQ, worker-процессы, retry с экспоненциальной задержкой и DLQ.

## Быстрый запуск

```bash
npm install
npm run build:25
npm run test:26
```

RabbitMQ-блок требует Docker:

```bash
npm run docker:27
npm run api:27
npm run worker1:27
npm run worker2:27
```

## Отчетные материалы

- Отчет анализатора Vite создается командой `npm run build:25` в файле `practice25-vite/dist/bundle-report.html`.
- Скриншоты и проверочные запросы для GraphQL находятся в `practice26-graphql/report`.
- Команды для проверки RabbitMQ описаны в `practice27-rabbitmq/README.md`.
