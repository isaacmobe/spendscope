import Transaction from "../models/Transaction.js";
import Goal from "../models/Goal.js";
import Bill from "../models/Bill.js";
import Allocation from "../models/Allocation.js";
import { CURRENCIES } from "../models/User.js";
import { makeCrud } from "../utils/crud.js";
import { HttpError, date, int, num, objectId, oneOf, str } from "../utils/validate.js";
import { parseAllocationPlan } from "../utils/allocations.js";

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

const goalCrud = makeCrud({
  Model: Goal,
  sort: { priority: 1, createdAt: 1 },
  spec: {
    name: [(v) => str(v, "name", { max: 60, required: true }), true],
    targetAmount: [(v) => num(v, "targetAmount", { min: 0, exclusiveMin: true }), true],
    savedAmount: [(v) => num(v, "savedAmount", { min: 0 }), false],
    priority: [(v) => int(v, "priority", { min: 0, max: 99 }), false],
    currency: [currency, false],
    deadline: [(v) => date(v, "deadline"), false]
  }
});

// Deleting a goal also removes the money planned into it, so that money returns to "to assign".
export const goals = {
  ...goalCrud,
  remove: async (req, res) => {
    const id = objectId(req.params.id);
    const gone = await Goal.findOneAndDelete({ _id: id, user: req.userId });
    if (!gone) throw new HttpError(404, "Not found.");
    await Allocation.deleteMany({ user: req.userId, envelope: `goal:${id}` });
    res.json({ success: true, data: { id } });
  }
};

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

/**
 * Allocations: list, confirm a plan (all lines at once), and delete one line.
 * A plan is validated completely before anything is saved, so it is stored whole or not at all.
 */
const allocationCrud = makeCrud({ Model: Allocation, sort: { date: -1, createdAt: -1 }, limit: 2000, spec: {} });
export const allocations = {
  list: allocationCrud.list,
  remove: allocationCrud.remove,
  create: async (req, res) => {
    const owned = await Goal.find({ user: req.userId }).select("_id");
    const rows = parseAllocationPlan(req.body, new Set(owned.map((g) => String(g._id))));
    const data = await Allocation.insertMany(rows.map((r) => ({ ...r, user: req.userId })));
    res.status(201).json({ success: true, count: data.length, data });
  }
};
