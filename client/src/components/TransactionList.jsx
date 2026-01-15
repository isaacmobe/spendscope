import { useContext } from "react";
import BentoCard from "./BentoCard";
import { TransactionsContext } from "../context/TransactionsContext";
import { formatMoney } from "../utils/formatters";

/**
 * TransactionList
 * ---------------
 * Shows transactions from global state.
 * Includes a delete button that calls removeTransaction(id).
 */
export default function TransactionList() {
  const { filteredItems, loading, error, removeTransaction, setEditingTransaction } =
  useContext(TransactionsContext);

  return (
    <BentoCard title="Recent Transactions" className="md:col-span-7">
      {/* Loading state */}
      {loading ? <p className="text-sm text-gray-600">Loading...</p> : null}

      {/* Error state */}
      {error ? <p className="text-sm text-red-600">Error: {error}</p> : null}

      {/* Empty state */}
      {!loading && !error && filteredItems.length === 0 ? (
        <p className="text-sm text-gray-600">No transactions yet.</p>
      ) : null}

      {/* Data state */}
      <ul className="divide-y divide-gray-100">
        {filteredItems.map((t) => (

          <li key={t._id} className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              {/* Title */}
              <p className="font-semibold truncate">{t.title}</p>

              {/* Metadata */}
              <p className="text-xs text-gray-600 mt-1">
                {t.category || "General"} • {t.type}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Amount (colored by type) */}
              <span
                className={[
                  "font-bold text-brand-red",
                  t.type === "income" ? "text-emerald-700" : "text-red-700"
                ].join(" ")}
              >
                {t.type === "income" ? "+" : "-"}KSh {formatMoney(t.amount)}
              </span>

              {/* Delete & Edit button */}
              <button
                onClick={() => setEditingTransaction(t)}
                className="rounded-xl border border-green-200 bg-brand-green/70 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                title="Edit this transaction"
              >
                Edit
              </button>

              <button
                onClick={() => {
                  // Confirm deletion to prevent accidental loss of data
                  const ok = window.confirm(`Delete "${t.title}"? This cannot be undone.`);
                  if (ok) removeTransaction(t._id);
                }}
                className="rounded-xl border border-red-200 bg-brand-red/10 text-brand-red px-3 py-1.5 text-xs font-semibold hover:opacity-90"
                title="Delete this transaction"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </BentoCard>
  );
}
