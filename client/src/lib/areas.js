/**
 * areas.js
 * --------
 * The envelopes money is planned into. Each has an id (stored as the transaction category), a label,
 * and a weight for sharing out the needs part of the flexible money.
 *   bills:     funded to cover the recurring bills; each bill is charged automatically on its due day
 *   housing, food, transport: needs (flexible money shared by weight)
 *   lifestyle: wants
 * Savings are not an envelope: they go to the emergency fund and to your goals (see ledger.js).
 * - aliases: words the quick-add bar understands ("food 450 lunch", "rent 30000")
 */
export const AREAS = [
  { id: "housing", label: "Housing", group: "needs", weight: 0.4, hint: "Rent, utilities, repairs", aliases: ["housing", "rent", "house", "utilities", "electricity", "water", "kplc", "repairs"] },
  { id: "food", label: "Food", group: "needs", weight: 0.25, hint: "Groceries and eating out", aliases: ["food", "lunch", "dinner", "supper", "breakfast", "groceries", "naivas", "carrefour", "eat", "snack", "restaurant"] },
  { id: "transport", label: "Transport", group: "needs", weight: 0.15, hint: "Fares, fuel, boda and matatu", aliases: ["transport", "fare", "matatu", "boda", "fuel", "petrol", "uber", "bolt", "taxi", "parking"] },
  { id: "bills", label: "Bills", group: "bills", weight: 0, hint: "Recurring monthly bills", aliases: ["bill", "bills", "wifi", "internet", "loan", "insurance", "fees", "tuition"] },
  { id: "lifestyle", label: "Lifestyle", group: "wants", weight: 1, hint: "Fun, shopping, subscriptions", aliases: ["lifestyle", "fun", "movie", "movies", "shopping", "netflix", "clothes", "gift", "airtime", "drinks", "gym"] }
];

export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a]));

// Category used for earnings entered in the core.
export const INCOME_CATEGORY = "earnings";

// Words that mark an entry as earnings in the quick-add bar.
export const INCOME_WORDS = ["earn", "earned", "income", "salary", "wage", "gig", "sale", "sold", "bonus"];
