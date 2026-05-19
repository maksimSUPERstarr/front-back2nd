export const buildMetrics = [
  { name: 'Code splitting', value: 'lazy route chunk' },
  { name: 'Tree-shaking', value: 'ES modules' },
  { name: 'Production build', value: 'Vite + Rollup' },
  { name: 'Bundle analysis', value: 'rollup-plugin-visualizer' }
];

export function formatMetric(metric) {
  return `${metric.name}: ${metric.value}`;
}

export function unusedDevelopmentOnlyHelper() {
  return 'This helper demonstrates code that can be removed by tree-shaking.';
}
