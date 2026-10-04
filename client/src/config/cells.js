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
    explain: "Your living budget (the needs and wants shares of this month's earnings) minus what you have spent, divided by the days left in the month, today included. Spend up to this and the month stays on plan."
  },
  goal: {
    title: "Your goal",
    explain: "When you can afford your goal at the pace your plan saves. Click to set the price, what you already saved and an optional deadline."
  },
  needs: {
    title: "Needs",
    explain: "Earnings times your needs share. It pays for Housing, Food, Transport and Bills. The bar shows how much of it is used."
  },
  wants: {
    title: "Wants",
    explain: "Earnings times your wants share. It pays for Lifestyle: fun, shopping and subscriptions."
  },
  pool: {
    title: "Savings",
    explain: "Earnings times your savings share. It is set aside first, before you spend, so you pay yourself first. It goes to your goal."
  },
  after: {
    title: "After saving",
    explain: "Earnings minus the savings pool: what you have left to live on once your savings are set aside."
  },
  left: {
    title: "Left this month",
    explain: "Earnings minus everything spent and saved so far. Negative means you have spent more than you earned."
  },
  level: {
    title: "Saver level",
    explain: "A game-style score from the share of your earnings you saved this month. Each step up is a bigger share, and the top level is reached at the savings target."
  },
  net: {
    title: "Safety net",
    explain: "Months of planned essentials (your needs pool) to keep aside for emergencies. Common guidance is three to six months, and more if your income varies."
  },
  pace: {
    title: "Spending pace",
    explain: "Your running total of needs and wants through the month against the living budget. Bills count on their due day and savings are not counted as spending. The dashed line is an even pace."
  },
  advice: {
    title: "Advice",
    explain: "Plain-language suggestions from your numbers: overspending, pace, bills due soon, and how to reach your goal sooner."
  },
  quick: {
    title: "Quick add",
    explain: "Type one line such as food 450 lunch, rent 30k or +85000 salary."
  }
});
