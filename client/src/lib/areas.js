/**
 * areas.js
 * --------
 * The six spending "areas" shown as hexagon nodes around the earnings core.
 * - id:     stored as the transaction category (keeps data simple and queryable)
 * - group:  which share of earnings pays for it (needs / wants / savings)
 * - weight: the area's share of its group's budget (weights inside a group add up to 1)
 */
export const AREAS = [
  { id: "housing", label: "Housing", group: "needs", weight: 0.4, hint: "Rent, utilities, repairs" },
  { id: "food", label: "Food", group: "needs", weight: 0.25, hint: "Groceries and eating out" },
  { id: "transport", label: "Transport", group: "needs", weight: 0.15, hint: "Fares, fuel, boda and matatu" },
  { id: "bills", label: "Bills", group: "needs", weight: 0.2, hint: "Recurring monthly bills" },
  { id: "lifestyle", label: "Lifestyle", group: "wants", weight: 1, hint: "Fun, shopping, subscriptions" },
  { id: "savings", label: "Motorbike Fund", group: "savings", weight: 1, hint: "Money set aside for the bike" }
];

export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a]));

// Category used for earnings entered in the core.
export const INCOME_CATEGORY = "earnings";
