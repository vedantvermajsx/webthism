export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors.map(e => ({ path: e.path, message: e.message }))
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Resource already exists'
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
};
