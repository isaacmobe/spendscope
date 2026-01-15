import { useContext } from "react";
import BentoCard from "./BentoCard";
import { TransactionsContext } from "../context/TransactionsContext";
import { formatMoney } from "../utils/formatters";

/**
 * BudgetBanner
 * ------------
 * Displays:
 * - current month's expense total
 * - user-set budget value
 * - warning state if over budget
 */
export default function BudgetBanner() {
  const { monthExpense, overBudget, monthlyBudget, setMonthlyBudget } =
    useContext(TransactionsContext);

  return (
    <BentoCard title="Budget (This Month)" className="md:col-span-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">
            Spent: KSh {formatMoney(monthExpense)} / Budget: KSh{" "}
            {formatMoney(monthlyBudget)}
          </p>

          {/* Warning message changes based on business rule */}
          <p className={["text-sm mt-1", overBudget ? "text-red-700" : "text-gray-600"].join(" ")}>
            {overBudget
              ? "Over budget — consider reducing spending this month."
              : "On track — keep it up."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Set budget</label>
          <input
            type="number"
            min="0"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(Number(e.target.value))}
            className="w-40 rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>
    </BentoCard>
  );
}
