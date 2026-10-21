import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { allocations, bills, goals, transactions } from "../controllers/resources.js";

/**
 * Builds a standard REST router from a handler set.
 * requireAuth is applied once here, so no data route can be reached while logged out.
 */
const restRouter = ({ list, create, update, remove }) => {
  const router = express.Router();
  router.use(requireAuth);
  router.get("/", list);
  router.post("/", create);
  router.put("/:id", update);
  router.delete("/:id", remove);
  return router;
};

export const transactionsRouter = restRouter(transactions);
export const goalsRouter = restRouter(goals);
export const billsRouter = restRouter(bills);

// Plans: GET lists allocations, POST confirms a whole plan, PUT is not offered (a plan is deleted and redone).
export const allocationsRouter = (() => {
  const router = express.Router();
  router.use(requireAuth);
  router.get("/", allocations.list);
  router.post("/", allocations.create);
  router.delete("/:id", allocations.remove);
  return router;
})();
