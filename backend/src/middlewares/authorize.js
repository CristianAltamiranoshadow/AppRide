// src/middlewares/authorize.js

// Lista de roles aceptados en tu BD (ENUM)
const VALID_ROLES = ['ADMINISTRADOR', 'CONDUCTOR', 'ESTUDIANTE'];

/** Normaliza el rol a MAYÚSCULAS y mapea "ADMIN" -> "ADMINISTRADOR" */
const normalize = (r) => {
  if (r == null) return r;
  const up = String(r).trim().toUpperCase();
  return up === 'ADMIN' ? 'ADMINISTRADOR' : up;
};

/**
 * Middleware de autorización por rol.
 * Uso: authorize('ADMINISTRADOR', 'CONDUCTOR')
 * Si no se pasan roles, permite a cualquier usuario autenticado.
 */
function authorize(...rolesPermitidos) {
  const normalized = rolesPermitidos.flat().map(normalize);
  const hasRolesFilter = normalized.length > 0;

  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });

    const rolUser = normalize(req.user.rol);
    if (!VALID_ROLES.includes(rolUser)) {
      return res.status(403).json({ error: 'Rol inválido' });
    }

    if (hasRolesFilter && !normalized.includes(rolUser)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    return next();
  };
}

/** Middleware de conveniencia: requiere solo estar autenticado (sin roles) */
function authorizeAny(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  return next();
}

// Export default y nombrados para compatibilidad
module.exports = authorize;
module.exports.authorize = authorize;
module.exports.authorizeAny = authorizeAny;
module.exports.VALID_ROLES = VALID_ROLES;
