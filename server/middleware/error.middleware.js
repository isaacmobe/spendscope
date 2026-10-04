/**
 * Central error handler.
 * - HttpError / body-parser errors expose their own status and message (safe, written by us).
 * - Mongoose validation, bad-cast and duplicate-key errors map to 400/409.
 * - Anything else is logged server-side and returned as a generic 500, so internals never leak.
 */
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let status = 500;
  let message = "Server error.";

  if (err.status && err.status < 500) {
    // HttpError, or body-parser (malformed JSON = 400, too large = 413)
    status = err.status;
    message = err.type === "entity.parse.failed" ? "Malformed JSON body." : err.type === "entity.too.large" ? "Request body too large." : err.message;
  } else if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  } else if (err.name === "CastError") {
    status = 400;
    message = "Invalid value supplied.";
  } else if (err.code === 11000) {
    status = 409;
    message = "That email is already registered.";
  } else {
    console.error(err);
  }

  res.status(status).json({ success: false, message });
};
