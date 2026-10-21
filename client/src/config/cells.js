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
    short: "Bills plus your share of the flexible money for Housing, Food and Transport.",
    explain: "Your recurring bills, exactly, plus the needs share of the money left after bills and savings. It pays for Housing, Food, Transport and Bills. The bar shows how much of it is used."
  },
  wants: {
    title: "Wants",
    short: "Your share of the flexible money for Lifestyle: fun, shopping, subscriptions.",
    explain: "The wants share of the money left after bills and savings. It pays for Lifestyle: fun, shopping and subscriptions."
  },
  pool: {
    title: "Savings",
    short: "What the plan sets aside first: your minimum, or more if your goal deadline needs it.",
    explain: "Savings come right after bills, before you spend. It is the larger of your minimum savings share and what your goal deadline needs each month, but never so much that less than a set share of the money left after bills stays for living."
  },
  after: {
    title: "After saving",
    short: "Earnings minus the savings set aside: bills plus everything you can spend.",
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
    title: "Emergency fund",
    short: "Savings fill this emergency buffer first. Then the goal fund starts, and the 3-month safety net comes next.",
    explain: "Your first savings build a starter emergency fund: one month of bills plus basic living costs. Only savings beyond it count toward your goal. Once it is full, this hexagon shows your longer safety net target."
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
