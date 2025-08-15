// src/middlewares/auth.js
const jwt = require('jsonwebtoken');

/** Devuelve el secreto JWT desde env (acepta JWT_SECRET o JWT_SECRETO) */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.JWT_SECRETO;
  if (!secret) {
    // Error explícito para detectar entornos mal configurados
    throw new Error('Falta JWT_SECRET/JWT_SECRETO en variables de entorno');
  }
  return secret;
}

/** Extrae el token Bearer del header Authorization */
function extractBearer(req) {
  const header = (req.headers.authorization || '').trim();
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim();
}

/** Verifica token y agrega req.user = { id, rol, correo } */
function requireAuth(req, res, next) {
  try {
    const token = extractBearer(req);
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    const payload = jwt.verify(token, getJwtSecret());
    // Aseguramos formato mínimo requerido por el backend
    const { id, rol, correo } = payload || {};
    if (!id || !rol) {
      return res.status(401).json({ error: 'Token inválido: payload incompleto' });
    }
    req.user = { id, rol, correo };
    return next();
  } catch (err) {
    // jwt.verify puede lanzar TokenExpiredError o JsonWebTokenError
    const msg = err && err.name === 'TokenExpiredError'
      ? 'Token expirado'
      : 'Token inválido';
    return res.status(401).json({ error: `${msg}` });
  }
}

/**
 * No exige token: si viene lo valida y setea req.user; si no, sigue sin usuario.
 * Útil para endpoints públicos que personalizan respuesta si hay sesión.
 */
function optionalAuth(req, _res, next) {
  const token = extractBearer(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, getJwtSecret());
    const { id, rol, correo } = payload || {};
    if (id && rol) req.user = { id, rol, correo };
  } catch {
    // Ignoramos errores: simplemente no hay usuario autenticado
  }
  return next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  extractBearer,
};
