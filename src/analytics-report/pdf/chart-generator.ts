import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';
import { DailyMetric } from '../interfaces/report.interfaces';

const renderer = new ChartJSNodeCanvas({
  width: 900,
  height: 300,
  backgroundColour: '#FFFFFF',
});

function tickFormatter(value: number | string): string {
  const n = Number(value);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function buildLineConfig(
  metrics: DailyMetric[],
  label: string,
  color: string,
): ChartConfiguration {
  return {
    type: 'line',
    data: {
      labels: metrics.map((m) => m.date),
      datasets: [
        {
          label,
          data: metrics.map((m) => m.value),
          borderColor: color,
          backgroundColor: `${color}18`,
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointRadius: metrics.length > 20 ? 2 : 4,
          pointBackgroundColor: color,
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: '#64748B',
            font: { size: 12 },
            boxWidth: 12,
            boxHeight: 12,
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#F1F5F9' },
          border: { display: false },
          ticks: {
            color: '#94A3B8',
            font: { size: 10 },
            maxTicksLimit: 12,
            maxRotation: 0,
          },
        },
        y: {
          grid: { color: '#F1F5F9' },
          border: { display: false },
          beginAtZero: true,
          ticks: {
            color: '#94A3B8',
            font: { size: 10 },
            callback: tickFormatter,
          },
        },
      },
    },
  };
}

export async function generateLineChart(
  metrics: DailyMetric[],
  label: string,
  color: string,
): Promise<Buffer | null> {
  if (!metrics || metrics.length < 2) return null;
  try {
    const config = buildLineConfig(metrics, label, color);
    return await renderer.renderToBuffer(config);
  } catch {
    return null;
  }
}
