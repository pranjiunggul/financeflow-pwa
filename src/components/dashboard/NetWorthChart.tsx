import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { Transaction, Account, CurrencyCode } from '../../types';
import { getNetWorthTimeline } from '../../services/analytics';
import { formatCurrency } from '../../services/fx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface NetWorthChartProps {
  transactions: Transaction[];
  accounts: Account[];
  baseCurrency: CurrencyCode;
}

export const NetWorthChart: React.FC<NetWorthChartProps> = ({
  transactions,
  accounts,
  baseCurrency,
}) => {
  const [days, setDays] = useState<number>(30);

  const points = useMemo(() => {
    return getNetWorthTimeline(transactions, accounts, baseCurrency, days);
  }, [transactions, accounts, baseCurrency, days]);

  const chartData = {
    labels: points.map((p) => p.label),
    datasets: [
      {
        label: `Net Worth (${baseCurrency})`,
        data: points.map((p) => p.netWorth),
        borderColor: '#3b82f6',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 240);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.00)');
          return gradient;
        },
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: days <= 30 ? 3 : 0,
        pointHoverRadius: 6,
        pointBackgroundColor: '#60a5fa',
        pointBorderColor: '#1e3a8a',
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#94a3b8',
        bodyColor: '#ffffff',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context: any) => {
            return `Net Worth: ${formatCurrency(context.parsed.y, baseCurrency)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(51, 65, 85, 0.4)' },
        ticks: {
          color: '#64748b',
          font: { size: 10 },
          callback: (value: any) => formatCurrency(value, baseCurrency, { compact: true }),
        },
      },
    },
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Net Worth Evolution
          </h3>
          <p className="text-xs text-slate-400">Historical asset trend in {baseCurrency}</p>
        </div>

        {/* Interval Buttons */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {[
            { label: '30D', value: 30 },
            { label: '90D', value: 90 },
            { label: '6M', value: 180 },
            { label: '1Y', value: 365 },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setDays(item.value)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                days === item.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};
