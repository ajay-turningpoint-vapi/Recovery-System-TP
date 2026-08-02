function errorHandler(err, req, res, next) {
  console.error('Unhandled API Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `API Route Not Found - ${req.originalUrl}`,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
