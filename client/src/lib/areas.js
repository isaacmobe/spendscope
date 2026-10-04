/**
 * areas.js
 * --------
 * The six spending "areas" shown as hexagon nodes around the earnings core.
 * - id:     stored as the transaction category (keeps data simple and queryable)
 * - group:  which share of earnings pays for it (needs / wants / savings)
 * - weight: the area's share of its group's budget (weights inside a group add up to 1)
 * - variable: day-to-day spending we can project to month end (rent and bills are lumpy, so no)
 * - aliases: words the quick-add bar understands ("food 450 lunch", "rent 30000")
 */
export const AREAS = [
  { id: "housing", label: "Housing", group: "needs", weight: 0.4, hint: "Rent, utilities, repairs", aliases: ["housing", "rent", "house", "utilities", "electricity", "water", "kplc", "repairs"] },
  { id: "food", label: "Food", group: "needs", weight: 0.25, variable: true, hint: "Groceries and eating out", aliases: ["food", "lunch", "dinner", "supper", "breakfast", "groceries", "naivas", "carrefour", "eat", "snack", "restaurant"] },
  { id: "transport", label: "Transport", group: "needs", weight: 0.15, variable: true, hint: "Fares, fuel, boda and matatu", aliases: ["transport", "fare", "matatu", "boda", "fuel", "petrol", "uber", "bolt", "taxi", "parking"] },
  { id: "bills", label: "Bills", group: "needs", weight: 0.2, hint: "Recurring monthly bills", aliases: ["bill", "bills", "wifi", "internet", "loan", "insurance", "fees", "tuition"] },
  { id: "lifestyle", label: "Lifestyle", group: "wants", weight: 1, variable: true, hint: "Fun, shopping, subscriptions", aliases: ["lifestyle", "fun", "movie", "movies", "shopping", "netflix", "clothes", "gift", "airtime", "drinks", "gym"] },
  { id: "savings", label: "Motorbike Fund", group: "savings", weight: 1, hint: "Money set aside for the bike", aliases: ["save", "saved", "saving", "savings", "bike", "motorbike", "fund"] }
];

export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a]));

// Category used for earnings entered in the core.
export const INCOME_CATEGORY = "earnings";

// Words that mark an entry as earnings in the quick-add bar.
export const INCOME_WORDS = ["earn", "earned", "income", "salary", "wage", "gig", "sale", "sold", "bonus"];
