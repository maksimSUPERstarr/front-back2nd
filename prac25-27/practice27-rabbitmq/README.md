# Практика 27 - RabbitMQ

Проект реализует асинхронную обработку задач через RabbitMQ.

## Запуск RabbitMQ

```bash
npm run docker:up
```

RabbitMQ Management UI: `http://localhost:15672`, логин `guest`, пароль `guest`.

## Producer API

```bash
npm run api
```

Маршрут добавления задачи:

```bash
curl -X POST http://localhost:3001/tasks \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"email\",\"payload\":{\"to\":\"student@example.com\",\"subject\":\"Test\"}}"
```

## Worker-процессы

В двух отдельных терминалах:

```bash
npm run worker:1
npm run worker:2
```

RabbitMQ распределяет сообщения между двумя воркерами, потому что у каждого consumer включен `prefetch(1)`.

## Retry и DLQ

- Основная очередь: `practice27.tasks`.
- Retry-очереди: `practice27.retry.1`, `practice27.retry.2`, `practice27.retry.3`.
- Задержки retry: 1 секунда, 2 секунды, 4 секунды.
- Максимум retry-попыток: 3.
- DLQ: `practice27.dead`.

Для проверки DLQ можно отправить задачу с `type: "fail"` или `payload.fail: true`:

```bash
curl -X POST http://localhost:3001/tasks \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"fail\",\"payload\":{\"fail\":true}}"
```

После трех повторных попыток сообщение попадает в `practice27.dead`.
