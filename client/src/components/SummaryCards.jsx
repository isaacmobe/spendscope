import { useContext } from "react";
import BentoCard from "./BentoCard";
import { TransactionsContext } from "../context/TransactionsContext";
import { formatMoney } from "../utils/formatters";

/**
 * SummaryCards
 * ------------
 * Displays derived business values:
 * - income total
 * - expense total
 * - balance
 *
 * These values are computed inside Context (single source of truth).
 */
export default function SummaryCards() {
  const { income, expense, balance } = useContext(TransactionsContext);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      <BentoCard title="Balance" className="md:col-span-4">
        <p className="text-3xl font-bold text-brand-yellow">KSh {formatMoney(balance)}</p>
        <p className="text-sm text-gray-600 mt-1">Income minus expenses</p>
      </BentoCard>

      <BentoCard title="Income" className="md:col-span-4">
        <p className="text-3xl font-bold text-brand-green">KSh {formatMoney(income)}</p>
        <p className="text-sm text-gray-600 mt-1">All-time total</p>
      </BentoCard>

      <BentoCard title="Expenses" className="md:col-span-4">
        <p className="text-3xl font-bold text-brand-red">KSh {formatMoney(expense)}</p>
        <p className="text-sm text-gray-600 mt-1">All-time total</p>
      </BentoCard>
    </div>
  );
}
