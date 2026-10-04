import Transaction from "../models/Transaction.js";
import Goal from "../models/Goal.js";
import Bill from "../models/Bill.js";
import { CURRENCIES } from "../models/User.js";
import { makeCrud } from "../utils/crud.js";
import { date, int, num, oneOf, str } from "../utils/validate.js";

/**
 * Field specs: field -> [parser, required].
 * These are the ONLY fields clients may set on each resource.
 */
const currency = (v) => oneOf(v, "currency", CURRENCIES);

export const transactions = makeCrud({
  Model: Transaction,
  sort: { date: -1 },
  spec: {
    title: [(v) => str(v, "title", { max: 60, required: true }), true],
    amount: [(v) => num(v, "amount", { min: 0, exclusiveMin: true }), true],
    type: [(v) => oneOf(v, "type", ["income", "expense"]), true],
    category: [(v) => str(v, "category", { max: 30 }) || "General", false],
    currency: [currency, false],
    date: [(v) => date(v, "date"), false]
  }
});

export const goals = makeCrud({
  Model: Goal,
  spec: {
    name: [(v) => str(v, "name", { max: 60, required: true }), true],
    targetAmount: [(v) => num(v, "targetAmount", { min: 0, exclusiveMin: true }), true],
    savedAmount: [(v) => num(v, "savedAmount", { min: 0 }), false],
    currency: [currency, false],
    deadline: [(v) => date(v, "deadline"), false]
  }
});

export const bills = makeCrud({
  Model: Bill,
  sort: { dueDay: 1 },
  spec: {
    name: [(v) => str(v, "name", { max: 60, required: true }), true],
    amount: [(v) => num(v, "amount", { min: 0, exclusiveMin: true }), true],
    dueDay: [(v) => int(v, "dueDay", { min: 1, max: 31 }), true],
    category: [(v) => str(v, "category", { max: 30 }) || "Bills", false],
    currency: [currency, false]
  }
});
