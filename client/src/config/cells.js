/**
 * cells.js
 * --------
 * The information hexagons around the core: what each one is called, which popup it opens and how
 * its number is calculated (shown in that popup). Positions are in components/stage.js. Edit the
 * text here; no component changes are needed.
 */
export const CELL_INFO = Object.freeze({
  safe: {
    title: "Safe to spend today",
    short: "Living budget left, divided by the days left this month, today included.",
    explain: "Your living budget (the needs and wants shares of this month's earnings) minus what you have spent, divided by the days left in the month, today included. Spend up to this and the month stays on plan."
  },
  goal: {
    title: "Your goal",
    short: "When you can afford your goal at the pace your plan saves. Open it to edit.",
    explain: "When you can afford your goal at the pace your plan saves. Click to set the price, what you already saved and an optional deadline."
  },
  needs: {
    title: "Needs",
    short: "Earnings times your needs share. Pays Housing, Food, Transport and Bills.",
    explain: "Earnings times your needs share. It pays for Housing, Food, Transport and Bills. The bar shows how much of it is used."
  },
  wants: {
    title: "Wants",
    short: "Earnings times your wants share. Pays Lifestyle: fun, shopping, subscriptions.",
    explain: "Earnings times your wants share. It pays for Lifestyle: fun, shopping and subscriptions."
  },
  pool: {
    title: "Savings",
    short: "Earnings times your savings share, set aside first. It goes to your goal.",
    explain: "Earnings times your savings share. It is set aside first, before you spend, so you pay yourself first. It goes to your goal."
  },
  after: {
    title: "After saving",
    short: "Earnings minus the savings pool: what you have to live on.",
    explain: "Earnings minus the savings pool: what you have left to live on once your savings are set aside."
  },
  left: {
    title: "Left this month",
    short: "Earnings minus everything spent and saved so far.",
    explain: "Earnings minus everything spent and saved so far. Negative means you have spent more than you earned."
  },
  level: {
    title: "Saver level",
    short: "A score from the share of earnings you saved. Top level at your savings target.",
    explain: "A game-style score from the share of your earnings you saved this month. Each step up is a bigger share, and the top level is reached at the savings target."
  },
  net: {
    title: "Safety net",
    short: "Months of essentials kept for emergencies. Three to six is common.",
    explain: "Months of planned essentials (your needs pool) to keep aside for emergencies. Common guidance is three to six months, and more if your income varies."
  },
  pace: {
    title: "Spending pace",
    short: "Running spend through the month against your living budget.",
    explain: "Your running total of needs and wants through the month against the living budget. Bills count on their due day and savings are not counted as spending. The dashed line is an even pace."
  },
  advice: {
    title: "Advice",
    short: "Plain-language tips from your numbers. Open it to read them all.",
    explain: "Plain-language suggestions from your numbers: overspending, pace, bills due soon, and how to reach your goal sooner."
  },
  quick: {
    title: "Quick add",
    short: "Type a line like food 450 lunch or +85000 salary. Ctrl K opens it anywhere.",
    explain: "Type one line such as food 450 lunch, rent 30k or +85000 salary."
  }
});
