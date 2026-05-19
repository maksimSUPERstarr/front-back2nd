export default function AboutPage() {
  return (
    <section className="about-panel">
      <h2>О проекте</h2>
      <p>
        Этот маршрут загружается через динамический импорт:
        <code> React.lazy(() =&gt; import('./pages/AboutPage.jsx'))</code>.
      </p>
      <ul>
        <li>Маршрут вынесен в отдельный chunk.</li>
        <li>Пока chunk загружается, отображается fallback из `Suspense`.</li>
        <li>Отчет бандла создается в `dist/bundle-report.html`.</li>
      </ul>
    </section>
  );
}
