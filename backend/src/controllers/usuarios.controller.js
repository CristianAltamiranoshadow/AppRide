// src/controllers/usuarios.controller.js
const { pool } = require('../config/db');

const VALID_ROLES = ['ADMINISTRADOR', 'CONDUCTOR', 'ESTUDIANTE'];
const normalizeRole = (r) => {
  if (!r) return undefined;
  const up = String(r).trim().toUpperCase();
  return up === 'ADMIN' ? 'ADMINISTRADOR' : up;
};

// Campos seguros (nunca devolvemos contrasena_hash)
const SAFE_FIELDS = `
  id, rol, correo, nombre_completo, telefono, avatar_url,
  latitud, longitud, info_vehiculo, creado_en, actualizado_en
`;

// ========== HELPERS ==========
function pickAllowed(obj, allowed) {
  const out = {};
  for (const k of allowed) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  return out;
}

async function updateUserById(id, body) {
  // Normalizaciones
  const update = {};
  if ('correo' in body) {
    const correo = String(body.correo || '').trim().toLowerCase();
    if (!correo) throw Object.assign(new Error('Correo inválido'), { status: 400 });
    update.correo = correo;
  }
  if ('rol' in body) {
    const rolNorm = normalizeRole(body.rol);
    if (!VALID_ROLES.includes(rolNorm)) {
      throw Object.assign(new Error('Rol inválido'), { status: 400 });
    }
    update.rol = rolNorm;
  }

  // Otros campos permitidos
  const extra = pickAllowed(body, ['nombre_completo','telefono','avatar_url','latitud','longitud','info_vehiculo']);
  Object.assign(update, extra);

  // No permitir contraseña por aquí
  if ('contrasena' in body || 'contrasena_hash' in body) {
    throw Object.assign(new Error('Actualización de contraseña no permitida en este endpoint'), { status: 400 });
  }

  const keys = Object.keys(update);
  if (keys.length === 0) {
    throw Object.assign(new Error('No hay campos válidos para actualizar'), { status: 400 });
  }

  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const vals = keys.map(k => update[k]);

  const q = `
    UPDATE usuarios
    SET ${set}
    WHERE id = $${keys.length + 1}
    RETURNING ${SAFE_FIELDS}
  `;
  const { rows } = await pool.query(q, [...vals, id]);
  if (rows.length === 0) {
    const err = new Error('Usuario no encontrado');
    err.status = 404;
    throw err;
  }
  return rows[0];
}

// ========== HANDLERS ==========

// GET /api/usuarios/me  (requiere requireAuth en la ruta)
exports.me = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${SAFE_FIELDS} FROM usuarios WHERE id = $1`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

// GET /api/usuarios  (usa authorize en rutas para ADMIN)
exports.listar = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT ${SAFE_FIELDS} FROM usuarios ORDER BY creado_en DESC`);
    res.json(rows);
  } catch (e) { next(e); }
};

// GET /api/usuarios/:id  (con requireAuth + selfOrAdmin en rutas si quieres)
exports.obtener = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${SAFE_FIELDS} FROM usuarios WHERE id=$1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

// POST /api/usuarios  -> Bloqueado (usa /api/auth/register)
exports.crear = async (_req, res) => {
  return res.status(405).json({ error: 'Usa /api/auth/register para crear usuarios' });
};

// PUT /api/usuarios/:id  (ADMIN desde rutas): actualiza campos permitidos
exports.actualizar = async (req, res, next) => {
  try {
    const updated = await updateUserById(req.params.id, req.body);
    res.json(updated);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'El correo electrónico ya está registrado' });
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
};

// PATCH /api/usuarios/:id  (ADMIN): idem PUT pero parcial (usa mismo helper)
exports.actualizarParcial = async (req, res, next) => {
  try {
    const updated = await updateUserById(req.params.id, req.body);
    res.json(updated);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'El correo electrónico ya está registrado' });
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
};

// DELETE /api/usuarios/:id  (ADMIN)
exports.eliminar = async (req, res, next) => {
  try {
    const { rows, rowCount } = await pool.query(
      'DELETE FROM usuarios WHERE id=$1 RETURNING id, correo',
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({ mensaje: `Usuario ${rows[0].correo} eliminado`, id: rows[0].id });
  } catch (e) {
    if (e.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar: usuario tiene registros relacionados',
        detalles: 'Este usuario tiene viajes o reservas asociadas',
      });
    }
    next(e);
  }
};
