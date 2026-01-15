/**
 * Central error handler:
 * - Any controller calling next(error) ends up here.
 * - Keeps error responses consistent for the frontend.
 */
export const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Handle Mongoose validation errors in a friendly way
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(", ") });
  }

  // Generic fallback
  res.status(500).json({
    success: false,
    message: err.message || "Server error"
  });
};
