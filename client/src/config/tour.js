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
    body: "Every time money arrives, you give each shilling a job: bills, savings for your goals, and spending. This short tour shows the three steps. Use the arrow keys or the buttons."
  },
  {
    id: "steps",
    target: "steps",
    title: "Three steps",
    body: "Receive the money, plan it, then spend from your envelopes. The lit step is where you are now."
  },
  {
    id: "core",
    target: "core-input",
    title: "1. Receive",
    body: "Type what you just received and press Add. It shows as money waiting to be assigned in the centre."
  },
  {
    id: "plan",
    target: "plan-button",
    title: "2. Plan it",
    body: "Press Plan this money. The system suggests how to split it: bills first, then savings toward your goals, then living money. You can change any amount and watch the effect on your goals before you confirm."
  },
  {
    id: "stage",
    target: "stage",
    title: "3. Spend from envelopes",
    body: "Each hexagon is an envelope. The liquid level shows how much of its planned money is left. Click one to record spending. When you spend, the envelope goes down."
  },
  {
    id: "goals",
    target: "node-goals",
    title: "Goals",
    body: "Add as many goals as you like: a motorbike, a laptop, a trip. Savings fill your emergency fund first, then goals in the order shown. You can change the order here."
  },
  {
    id: "bills",
    target: "node-bills",
    title: "Bills",
    body: "Enter each recurring bill once, in the currency it is billed in (for example a subscription in US dollars). The Bills envelope is topped up in every plan and each bill is taken on its due day."
  },
  {
    id: "quick",
    target: "quick-add",
    title: "Quick add",
    body: "Type one line such as food 450 lunch, rent 30k or +85000 salary. Press Ctrl+K (Cmd+K on a Mac) from anywhere to open it."
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
    body: "Change the suggested split, the emergency fund size, savings growth and exchange rate, update your password, create a recovery code, and export your data."
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
    body: "Enter what you just received to begin. You can open this tutorial again any time from this button."
  }
];
