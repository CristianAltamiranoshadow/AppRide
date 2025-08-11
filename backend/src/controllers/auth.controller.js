const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const registroSchema = z.object({
  rol: z.enum(['ADMINISTRADOR','CONDUCTOR','ESTUDIANTE']),
  correo: z.string().email(),
  contrasena: z.string().min(6),
  nombre_completo: z.string().min(2),
  telefono: z.string().optional(),
  latitud: z.number().optional(),
  longitud: z.number().optional(),
  info_vehiculo: z.string().optional()
});

exports.registrar = asyncHandler(async (req, res) => {
  const d = registroSchema.parse(req.body);
  const hash = await bcrypt.hash(d.contrasena, 10);
  const q = `
    INSERT INTO usuarios (rol, correo, contrasena_hash, nombre_completo, telefono, latitud, longitud, info_vehiculo)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING id, rol, correo, nombre_completo, telefono, avatar_url, latitud, longitud, info_vehiculo, creado_en
  `;
  const { rows } = await pool.query(q, [
    d.rol, d.correo, hash, d.nombre_completo, d.telefono || null, d.latitud || null, d.longitud || null, d.info_vehiculo || null
  ]);
  const usuario = rows[0];
  const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, process.env.JWT_SECRETO, { expiresIn: '7d' });
  res.status(201).json({ usuario, token });
});

const loginSchema = z.object({
  correo: z.string().email(),
  contrasena: z.string().min(6)
});

exports.login = asyncHandler(async (req, res) => {
  const { correo, contrasena } = loginSchema.parse(req.body);
  const { rows } = await pool.query(`SELECT * FROM usuarios WHERE correo=$1`, [correo]);
  const usuario = rows[0];
  if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });
  const ok = await bcrypt.compare(contrasena, usuario.contrasena_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
  const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, process.env.JWT_SECRETO, { expiresIn: '7d' });
  delete usuario.contrasena_hash;
  res.json({ usuario, token });
});

exports.yo = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, rol, correo, nombre_completo, telefono, avatar_url, latitud, longitud, info_vehiculo
     FROM usuarios WHERE id=$1`, [req.user.id]);
  res.json(rows[0]);
});

exports.subirAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
  const url = `/uploads/${req.file.filename}`;
  await pool.query(`UPDATE usuarios SET avatar_url=$1, actualizado_en=now() WHERE id=$2`, [url, req.user.id]);
  res.json({ avatar_url: url });
});
