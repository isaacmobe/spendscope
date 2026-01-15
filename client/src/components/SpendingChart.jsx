import { useContext, useMemo } from "react";
import BentoCard from "./BentoCard";
import { TransactionsContext } from "../context/TransactionsContext";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";

/**
 * Chart.js setup:
 * - You must register the pieces you use (scales, elements, plugins)
 * - This is required by Chart.js v3+ and also helps keep bundle size smaller
 */
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function SpendingChart() {
  /**
   * Use filteredItems from Context so the chart always matches the current filter.
   * Example:
   * - If user filters to "Transport", chart shows Transport expenses only.
   * - If "All", chart shows all expenses.
   */
  const { filteredItems } = useContext(TransactionsContext);

  /**
   * Build chart data for the last 14 days of EXPENSES.
   * We aggregate amounts by day (YYYY-MM-DD) to make a clean trend graph.
   *
   * useMemo is used so we only recompute when filteredItems changes.
   */
  const { labels, points } = useMemo(() => {
    const days = 14;
    const now = new Date();

    // Map of YYYY-MM-DD -> total expense for that day
    const map = new Map();

    // Initialize last N days to 0 so the chart remains stable even if some days have no entries
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);

      // Keep a consistent "date key" format
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }

    // Add expense amounts into the map (only within the last 14 days keys)
    for (const t of filteredItems) {
      // We only chart expenses (income is excluded from this trend)
      if (t.type !== "expense") continue;

      // Convert transaction date to the same YYYY-MM-DD key format
      const key = new Date(t.date).toISOString().slice(0, 10);

      // Ignore anything outside the last 14 days window
      if (!map.has(key)) continue;

      // Add to that day's total
      map.set(key, map.get(key) + Number(t.amount || 0));
    }

    // Labels: use MM-DD for compact display on the x-axis
    const labels = Array.from(map.keys()).map((k) => k.slice(5));

    // Points: numeric values for each day (y-axis)
    const points = Array.from(map.values());

    return { labels, points };
  }, [filteredItems]);

  /**
   * hasData
   * -------
   * If every point is 0, showing a flat line isn't useful.
   * We'll display a friendly message instead.
   */
  const hasData = points.some((n) => n > 0);

  /**
   * Chart dataset configuration.
   * Dataset label appears in the legend + tooltips.
   */
  const data = {
    labels,
    datasets: [
      {
        label: "Expenses (Last 14 days)",
        data: points,

        // A little smoothing makes the line look nicer
        tension: 0.35
      }
    ]
  };

  /**
   * Chart display options:
   * - Format y-axis tick labels as KSh currency
   * - Format tooltip values as KSh currency
   */
  const options = {
    responsive: true,
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          // Format the tooltip values to look like money
          label: (ctx) => `KSh ${Number(ctx.parsed.y || 0).toLocaleString()}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          // Format y-axis ticks as money
          callback: (value) => `KSh ${Number(value).toLocaleString()}`
        }
      }
    }
  };


  return (
    <BentoCard title="Spending Trend" className="md:col-span-7">
      {/* Conditional rendering:
          - If we have recent expense data, show the chart
          - Otherwise show a helpful message
      */}
      {hasData ? (
        <Line data={data} options={options} />
      ) : (
        <p className="text-sm text-gray-600">
          No expense data in the last 14 days for this filter. Add a recent expense to see the trend.
        </p>
      )}
    </BentoCard>
  );
}
