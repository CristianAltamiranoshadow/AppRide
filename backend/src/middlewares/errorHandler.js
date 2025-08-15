module.exports = function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const msg = err.message || 'Error interno del servidor';
  if (process.env.NODE_ENV !== 'test') console.error('ERROR:', msg, err.stack || '');
  res.status(status).json({ error: msg });
};
