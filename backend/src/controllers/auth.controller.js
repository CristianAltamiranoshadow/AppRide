// src/controllers/auth.controller.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
const VALID_ROLES = ['ADMINISTRADOR', 'CONDUCTOR', 'ESTUDIANTE'];

// Normaliza rol (mapea ADMIN -> ADMINISTRADOR)
const normalizeRole = (r) => {
  if (!r) return 'ESTUDIANTE';
  const up = String(r).trim().toUpperCase();
  return up === 'ADMIN' ? 'ADMINISTRADOR' : up;
};

const getJwtSecret = () => {
  const s = process.env.JWT_SECRET || process.env.JWT_SECRETO;
  if (!s) throw new Error('Falta JWT_SECRET/JWT_SECRETO en .env');
  return s;
};

// POST /api/auth/register
// body: { rol, nombre_completo, correo, contrasena, telefono?, avatar_url?, latitud?, longitud?, info_vehiculo? }
exports.register = async (req, res, next) => {
  try {
    let {
      rol, nombre_completo, correo, contrasena,
      telefono, avatar_url, latitud, longitud, info_vehiculo
    } = req.body;

    rol = normalizeRole(rol || 'ESTUDIANTE');
    if (!VALID_ROLES.includes(rol)) return res.status(400).json({ error: 'Rol inválido' });

    const correoNorm = (correo || '').trim().toLowerCase();
    if (!correoNorm) return res.status(400).json({ error: 'Correo requerido' });
    if (!contrasena) return res.status(400).json({ error: 'Contraseña requerida' });
    if (!nombre_completo || String(nombre_completo).trim().length < 3) {
      return res.status(400).json({ error: 'Nombre inválido' });
    }

    // ¿ya existe?
    const exist = await pool.query('SELECT id FROM usuarios WHERE correo=$1', [correoNorm]);
    if (exist.rowCount > 0) return res.status(409).json({ error: 'El correo electrónico ya está registrado' });

    const contrasena_hash = await bcrypt.hash(contrasena, rounds);

    const q = `
      INSERT INTO usuarios
        (rol, correo, contrasena_hash, nombre_completo, telefono, avatar_url, latitud, longitud, info_vehiculo)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id, rol, correo, nombre_completo, telefono, avatar_url, latitud, longitud, info_vehiculo
    `;
    const { rows } = await pool.query(q, [
      rol, correoNorm, contrasena_hash, nombre_completo,
      telefono, avatar_url, latitud, longitud, info_vehiculo
    ]);
    const user = rows[0];

    const token = jwt.sign(
      { id: user.id, rol: user.rol, correo: user.correo },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({ user, token });
  } catch (e) {
    if (e && e.code === '23505') {
      return res.status(409).json({ error: 'El correo electrónico ya está registrado' });
    }
    next(e);
  }
};

// POST /api/auth/login  { correo, contrasena }
exports.login = async (req, res, next) => {
  try {
    const correoNorm = (req.body.correo || '').trim().toLowerCase();
    const contrasena = req.body.contrasena;

    if (!correoNorm || !contrasena) {
      return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }

    const sel = `
      SELECT id, rol, correo, nombre_completo, telefono, avatar_url, latitud, longitud, info_vehiculo, contrasena_hash
      FROM usuarios
      WHERE correo=$1
    `;
    const { rows } = await pool.query(sel, [correoNorm]);
    if (rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = rows[0];
    const ok = await bcrypt.compare(contrasena, user.contrasena_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    delete user.contrasena_hash;

    const token = jwt.sign(
      { id: user.id, rol: user.rol, correo: user.correo },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ user, token });
  } catch (e) { next(e); }
};
