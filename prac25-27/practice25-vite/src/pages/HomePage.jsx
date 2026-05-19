import { buildMetrics, formatMetric } from '../data/metrics.js';

export function HomePage() {
  return (
    <section className="page-grid">
      <div className="intro">
        <h2>Главная страница</h2>
        <p>
          Минимальное React-приложение собрано через Vite. В production-сборке
          используются отдельные чанки для React и лениво загружаемого маршрута.
        </p>
      </div>

      <div className="metrics" aria-label="Техники оптимизации">
        {buildMetrics.map((metric) => (
          <article key={metric.name} className="metric-card">
            <span>{metric.name}</span>
            <strong>{metric.value}</strong>
            <small>{formatMetric(metric)}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
