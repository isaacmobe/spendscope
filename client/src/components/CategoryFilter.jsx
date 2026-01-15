import { useContext } from "react";
import BentoCard from "./BentoCard";
import { TransactionsContext } from "../context/TransactionsContext";

/**
 * CategoryFilter
 * --------------
 * A small UI control that changes activeCategory in Context.
 * This affects what the list (and optionally chart) displays.
 */
export default function CategoryFilter() {
  const { activeCategory, setActiveCategory, categories } =
    useContext(TransactionsContext);

  return (
    <BentoCard title="Filter" className="md:col-span-12">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm text-gray-600">Category</label>

        <select
          className="w-full sm:w-72 rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
          value={activeCategory}
          onChange={(e) => setActiveCategory(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <p className="text-xs text-gray-500">
          Tip: Choose “All” to show everything.
        </p>
      </div>
    </BentoCard>
  );
}
