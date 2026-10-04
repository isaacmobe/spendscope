/**
 * tour.js
 * -------
 * The guided tutorial, as data. Each step points at an element carrying data-tour="<target>"
 * (steps whose target is not on screen are skipped) or has no target and is shown centred.
 * Edit the text here; no component changes are needed.
 */
export const TOUR_STEPS = [
  {
    id: "welcome",
    target: null,
    title: "Welcome to SpendScope",
    body: "It turns what you earn into a plan: how much to spend, how much to save, and when you can afford your goal. This short tour shows the main controls. Use the arrow keys or the buttons."
  },
  {
    id: "core",
    target: "core-input",
    title: "1. Add your earnings",
    body: "Type an amount here and press Add. The six areas unlock and your whole plan is calculated from this number. You can add more earnings any time."
  },
  {
    id: "stage",
    target: "stage",
    title: "2. Six spending areas",
    body: "Each hexagon is an area: Housing, Food, Transport, Bills, Lifestyle and your Motorbike Fund. The liquid level shows how much of its share of the month you have used. It turns orange near the limit and rose when over."
  },
  {
    id: "node",
    target: "node-first",
    title: "Record spending",
    body: "Click an area, type the amount and an optional note, then press Add. Recurring bills are entered once under Bills and counted every month."
  },
  {
    id: "tiles",
    target: "cell-needs",
    title: "3. Your plan",
    body: "The cells on the left show your earnings split into needs, wants and savings (50/30/20 by default, editable in Settings). Savings are set aside first, so you pay yourself before you spend. Click any cell to see how its number is worked out."
  },
  {
    id: "status",
    target: "cell-goal",
    title: "4. Your goal",
    body: "This hexagon shows when you can afford your goal. Click it to set the price, what you already saved and an optional deadline. It turns rose when you are behind pace and tells you how to catch up."
  },
  {
    id: "safe",
    target: "cell-safe",
    title: "Safe to spend today",
    body: "The amount you can spend today without breaking the month. Click it to see how it is worked out."
  },
  {
    id: "trend",
    target: "cell-pace",
    title: "Spending pace",
    body: "Click it for your running total against the budget. Staying under the dashed line means you are on pace."
  },
  {
    id: "quick",
    target: "quick-add",
    title: "Quick add",
    body: "Type one line such as food 450 lunch, rent 30k or +85000 salary. Press Ctrl+K (Cmd+K on a Mac) from anywhere to open it."
  },
  {
    id: "months",
    target: "months",
    title: "Look back",
    body: "Use the arrows to see earlier months as they ended. Entries you add while looking back are dated at the end of that month."
  },
  {
    id: "currency",
    target: "currency",
    title: "KES and USD",
    body: "Switch the display currency whenever you like. Amounts convert with your exchange rate, which you can type or load live in Settings."
  },
  {
    id: "settings",
    target: "settings",
    title: "Settings",
    body: "Change your earnings split, savings growth and exchange rate, update your password, create a recovery code, and export your data."
  },
  {
    id: "theme",
    target: "theme",
    title: "Light and dark",
    body: "Switch themes here. It follows your device until you choose one."
  },
  {
    id: "done",
    target: "tutorial",
    title: "You are ready",
    body: "Add your earnings to begin. You can open this tutorial again any time from this button."
  }
];
