/**
 * plan.js
 * -------
 * Every tunable rule behind the plan, in one place. finance.js reads these; nothing else in the
 * app hard-codes a threshold. Change a number here and the maths, the advice text and the tests
 * that import it follow.
 */
export const PLAN = Object.freeze({
  // Average days per month, to turn a deadline date into a number of months.
  daysPerMonth: 30.44,
  // A projection longer than this many months is shown as "not reachable" (50 years).
  maxProjectionMonths: 600,

  // Savings share of earnings that counts as "on target". 0.20 is the savings part of 50/30/20.
  savingsTarget: 0.2,
  // Share-of-earnings steps for saver levels. Level 0 = nothing saved, then +1 per step reached.
  saverLevelSteps: [0.05, 0.1, 0.15, 0.2],

  // "What if" advice: how many percentage points more of earnings to try saving.
  whatIfShare: 0.05,
  // Raise rule (Save More Tomorrow idea): share of an earnings increase to save.
  raiseSaveShare: 0.5,

  // Month-end pace warning: only after this share of the month has passed, and only when the
  // projection exceeds the budget by more than this factor.
  paceFromElapsed: 0.2,
  paceTolerance: 1.1,

  // Last N days of the month in which unspent money is flagged for savings.
  sweepWithinDays: 7,
  // Bills due within N days are listed as upcoming.
  dueSoonDays: 7,

  // Goal progress levels that trigger a celebration.
  milestones: Object.freeze([0.25, 0.5, 0.75, 1]),

  // Ready-made earnings splits offered in Settings.
  presets: Object.freeze([
    { label: "Balanced 50/30/20", values: { needs: 50, wants: 30, savings: 20 } },
    { label: "Lean 60/20/20", values: { needs: 60, wants: 20, savings: 20 } },
    { label: "Saver 50/20/30", values: { needs: 50, wants: 20, savings: 30 } }
  ])
});

// Highest saver level (one more than the number of steps).
export const MAX_LEVEL = PLAN.saverLevelSteps.length + 1;
