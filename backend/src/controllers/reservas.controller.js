// src/controllers/reservas.controller.js
const { pool } = require('../config/db');

// Estados activos: SOLICITADA, ACEPTADA
const isActiva = (estado) => ['SOLICITADA', 'ACEPTADA'].includes(estado);

// GET /api/reservas
// ADMINISTRADOR => todas
// CONDUCTOR     => reservas de sus viajes
// ESTUDIANTE    => sus reservas
exports.listar = async (req, res, next) => {
  try {
    const { id, rol } = req.user || {};
    let q = 'SELECT * FROM reservas ORDER BY creado_en DESC';
    let vals = [];

    if (rol === 'ESTUDIANTE') {
      q = 'SELECT * FROM reservas WHERE id_estudiante = $1 ORDER BY creado_en DESC';
      vals = [id];
    } else if (rol === 'CONDUCTOR') {
      q = `
        SELECT r.*
        FROM reservas r
        JOIN viajes v ON v.id = r.id_viaje
        WHERE v.id_conductor = $1
        ORDER BY r.creado_en DESC
      `;
      vals = [id];
    }
    const r = await pool.query(q, vals);
    res.json(r.rows);
  } catch (e) { next(e); }
};

// GET /api/reservas/:id
exports.obtener = async (req, res, next) => {
  try {
    const r = await pool.query('SELECT * FROM reservas WHERE id=$1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
};

// POST /api/reservas  (solo ESTUDIANTE)
exports.crear = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id: id_estudiante, rol } = req.user || {};
    if (rol !== 'ESTUDIANTE') {
      client.release();
      return res.status(403).json({ error: 'Solo estudiantes pueden reservar' });
    }

    const { id_viaje, recogida_latitud, recogida_longitud } = req.body;
    if (!id_viaje) {
      client.release();
      return res.status(400).json({ error: 'id_viaje es requerido' });
    }

    await client.query('BEGIN');

    // Viaje disponible (PLANIFICADO) con cupo
    const vRes = await client.query(
      `SELECT * FROM viajes
       WHERE id = $1 AND estado = 'PLANIFICADO' AND asientos_disponibles > 0
       FOR UPDATE`,
      [id_viaje]
    );
    if (vRes.rows.length === 0) {
      await client.query('ROLLBACK'); client.release();
      return res.status(400).json({ error: 'El viaje no está disponible para reservas' });
    }

    // No permitir duplicado activo (capa app, además del índice parcial)
    const dup = await client.query(
      `SELECT 1
       FROM reservas
       WHERE id_viaje = $1 AND id_estudiante = $2
         AND estado IN ('SOLICITADA','ACEPTADA')`,
      [id_viaje, id_estudiante]
    );
    if (dup.rows.length > 0) {
      await client.query('ROLLBACK'); client.release();
      return res.status(409).json({ error: 'Ya tienes una reserva activa para este viaje' });
    }

    // Crear reserva (estado inicial SOLICITADA)
    const ins = await client.query(
      `INSERT INTO reservas (id_viaje, id_estudiante, recogida_latitud, recogida_longitud, estado)
       VALUES ($1,$2,$3,$4,'SOLICITADA')
       RETURNING *`,
      [id_viaje, id_estudiante, recogida_latitud, recogida_longitud]
    );

    // Decrementar cupo
    await client.query(
      'UPDATE viajes SET asientos_disponibles = asientos_disponibles - 1 WHERE id=$1',
      [id_viaje]
    );

    await client.query('COMMIT'); client.release();
    res.status(201).json(ins.rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    client.release();
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El estudiante ya tiene una reserva activa para este viaje' });
    }
    next(err);
  }
};

// PUT/PATCH /api/reservas/:id  (usa un único handler)
exports.actualizarEstado = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { estado, recogida_latitud, recogida_longitud } = req.body;

    if (!estado && recogida_latitud === undefined && recogida_longitud === undefined) {
      client.release();
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    await client.query('BEGIN');

    // Bloquear reserva
    const r0 = await client.query(
      `SELECT id, id_viaje, id_estudiante, estado
       FROM reservas
       WHERE id=$1
       FOR UPDATE`,
      [id]
    );
    if (r0.rowCount === 0) {
      await client.query('ROLLBACK'); client.release();
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    const reserva = r0.rows[0];

    // Si pasa a activa, validar duplicado activo
    if (estado && isActiva(estado)) {
      const dup = await client.query(
        `SELECT 1
         FROM reservas
         WHERE id_viaje=$1 AND id_estudiante=$2
           AND id <> $3
           AND estado IN ('SOLICITADA','ACEPTADA')`,
        [reserva.id_viaje, reserva.id_estudiante, reserva.id]
      );
      if (dup.rowCount > 0) {
        await client.query('ROLLBACK'); client.release();
        return res.status(409).json({ error: 'Ya existe una reserva activa para este viaje y estudiante' });
      }
    }

    // Determinar ajuste de asiento
    let deltaAsiento = 0;
    if (estado && estado !== reserva.estado) {
      const eraActiva = isActiva(reserva.estado);
      const seraActiva = isActiva(estado);

      if (eraActiva && !seraActiva) {
        // libera asiento
        deltaAsiento = +1;
      } else if (!eraActiva && seraActiva) {
        // ocupa asiento si hay cupo y viaje planificado
        const v = await client.query(
          `SELECT asientos_disponibles, estado
           FROM viajes
           WHERE id=$1
           FOR UPDATE`,
          [reserva.id_viaje]
        );
        if (v.rowCount === 0) {
          await client.query('ROLLBACK'); client.release();
          return res.status(400).json({ error: 'Viaje no existe' });
        }
        const viaje = v.rows[0];
        if (viaje.estado !== 'PLANIFICADO') {
          await client.query('ROLLBACK'); client.release();
          return res.status(400).json({ error: 'El viaje no está disponible para activar reservas' });
        }
        if (viaje.asientos_disponibles <= 0) {
          await client.query('ROLLBACK'); client.release();
          return res.status(400).json({ error: 'No hay asientos disponibles' });
        }
        deltaAsiento = -1;
      }
    }

    // Actualizar reserva
    const r1 = await client.query(
      `UPDATE reservas
       SET estado = COALESCE($1, estado),
           recogida_latitud = COALESCE($2, recogida_latitud),
           recogida_longitud = COALESCE($3, recogida_longitud)
       WHERE id=$4
       RETURNING *`,
      [estado, recogida_latitud, recogida_longitud, id]
    );

    // Ajustar asientos si corresponde
    if (deltaAsiento !== 0) {
      await client.query(
        `UPDATE viajes
         SET asientos_disponibles = asientos_disponibles + $1
         WHERE id=$2`,
        [deltaAsiento, reserva.id_viaje]
      );
    }

    await client.query('COMMIT'); client.release();
    res.json(r1.rows[0]);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    client.release();
    next(e);
  }
};

// DELETE /api/reservas/:id  (atómico)
exports.eliminar = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const r = await client.query(
      'DELETE FROM reservas WHERE id=$1 RETURNING id, id_viaje, estado',
      [req.params.id]
    );
    if (r.rowCount === 0) {
      await client.query('ROLLBACK'); client.release();
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // Si la reserva eliminada estaba activa, reponer asiento
    if (isActiva(r.rows[0].estado)) {
      await client.query(
        'UPDATE viajes SET asientos_disponibles = asientos_disponibles + 1 WHERE id=$1',
        [r.rows[0].id_viaje]
      );
    }

    await client.query('COMMIT'); client.release();
    res.json({
      mensaje: `Reserva ${req.params.id} eliminada correctamente`,
      id_reserva_eliminada: r.rows[0].id
    });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    client.release();
    next(e);
  }
};
