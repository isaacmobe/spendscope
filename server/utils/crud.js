import { HttpError, objectId, parseBody } from "./validate.js";

/**
 * makeCrud({ Model, spec, sort })
 * -------------------------------
 * Builds list/create/update/remove handlers for a user-owned resource.
 * Safety rules applied to every resource:
 * - every query includes { user: req.userId } (no access to other users' rows)
 * - input goes through parseBody(spec): whitelisted, typed, range-checked
 * - ids are validated before use; update uses $set with the whitelisted fields only
 * Express 5 forwards rejected promises to the error middleware, so no try/catch is needed.
 */
export function makeCrud({ Model, spec, sort = { createdAt: -1 }, limit = 500 }) {
  const notFound = () => new HttpError(404, "Not found.");

  return {
    list: async (req, res) => {
      const data = await Model.find({ user: req.userId }).sort(sort).limit(limit);
      res.json({ success: true, count: data.length, data });
    },

    create: async (req, res) => {
      const fields = parseBody(req.body, spec);
      const data = await Model.create({ ...fields, user: req.userId });
      res.status(201).json({ success: true, data });
    },

    update: async (req, res) => {
      const id = objectId(req.params.id);
      const fields = parseBody(req.body, spec, { partial: true });
      const data = await Model.findOneAndUpdate(
        { _id: id, user: req.userId },
        { $set: fields },
        { returnDocument: "after", runValidators: true }
      );
      if (!data) throw notFound();
      res.json({ success: true, data });
    },

    remove: async (req, res) => {
      const id = objectId(req.params.id);
      const data = await Model.findOneAndDelete({ _id: id, user: req.userId });
      if (!data) throw notFound();
      res.json({ success: true, data: { id } });
    }
  };
}
