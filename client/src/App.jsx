import Header from "./components/Header";
import SummaryCards from "./components/SummaryCards";
import BudgetBanner from "./components/BudgetBanner";
import SpendingChart from "./components/SpendingChart";
import TransactionForm from "./components/TransactionForm";
import TransactionList from "./components/TransactionList";
import CategoryFilter from "./components/CategoryFilter";
import Footer from "./components/Footer";

/**
 * App.jsx
 * -------
 * Full MVP dashboard layout:
 * - Header
 * - Summary
 * - Budget (month-based business rule)
 * - Chart (spending trend visualization)
 * - Form + list (CRUD)
 */
export default function App() {
  return (
    <div className="min-h-screen bg-brand-cream">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <Header />

        <SummaryCards />

        {/* Budget banner is full-width */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <BudgetBanner />
          <CategoryFilter />
        </div>


        {/* Main bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          {/* Left: list + chart stacked */}
          <div className="md:col-span-7 space-y-4">
            <TransactionList />
            <SpendingChart />
          </div>

          {/* Right: make this column match the left column height */}
          <div className="md:col-span-5 flex">
            {/* flex-1 makes TransactionForm stretch vertically */}
            <div className="flex-1">
              <TransactionForm />
            </div>
          </div>
        </div>



        {/* Footer bento */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <Footer />
        </div>

      </div>
    </div>
  );
}
