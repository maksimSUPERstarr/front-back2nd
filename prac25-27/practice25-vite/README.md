# Практика 25 - Vite и оптимизация бандла

## Запуск

```bash
npm install
npm run dev
npm run build
```

## Выполнено

- React-приложение создано на Vite.
- Реализованы два маршрута: `/` и `/about`.
- Маршрут `/about` загружается через `React.lazy` и `Suspense`.
- В `vite.config.js` подключен `rollup-plugin-visualizer`.
- Команда `npm run build` создает production-сборку и файл `dist/bundle-report.html`.

## Отчет

Скриншот отчета анализатора: `report/bundle-report.png`.
