const { pool } = require('../config/db');

// GET /api/viajes
exports.listar = async (req, res, next) => {
  try {
    const r = await pool.query('SELECT * FROM viajes');
    res.json(r.rows);
  } catch (e) { next(e); }
};

// GET /api/viajes/:id
exports.obtener = async (req, res, next) => {
  try {
    const r = await pool.query('SELECT * FROM viajes WHERE id=$1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Viaje no encontrado' });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
};

// POST /api/viajes
exports.crear = async (req, res, next) => {
  try {
    const { id_conductor, origen_latitud, origen_longitud, destino_latitud, destino_longitud, salida_en, asientos_totales } = req.body;

    // validar conductor
    const cond = await pool.query('SELECT id FROM usuarios WHERE id=$1 AND rol=$2', [id_conductor, 'CONDUCTOR']);
    if (cond.rows.length === 0) return res.status(400).json({ error: 'El conductor especificado no existe o no tiene el rol adecuado' });

    const q = `
      INSERT INTO viajes (
        id_conductor, origen_latitud, origen_longitud, destino_latitud, destino_longitud,
        salida_en, asientos_totales, asientos_disponibles
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *
    `;
    const vals = [id_conductor, origen_latitud, origen_longitud, destino_latitud, destino_longitud, new Date(salida_en), asientos_totales];
    const { rows } = await pool.query(q, vals);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};

// PUT /api/viajes/:id
exports.actualizar = async (req, res, next) => {
  try {
    const { id_conductor, origen_latitud, origen_longitud, destino_latitud, destino_longitud, salida_en, asientos_totales, estado } = req.body;

    if (id_conductor) {
      const cond = await pool.query('SELECT id FROM usuarios WHERE id=$1 AND rol=$2', [id_conductor, 'CONDUCTOR']);
      if (cond.rows.length === 0) return res.status(400).json({ error: 'El conductor especificado no existe o no tiene el rol adecuado' });
    }

    const q = `
      UPDATE viajes SET
        id_conductor = COALESCE($1, id_conductor),
        origen_latitud = COALESCE($2, origen_latitud),
        origen_longitud = COALESCE($3, origen_longitud),
        destino_latitud = COALESCE($4, destino_latitud),
        destino_longitud = COALESCE($5, destino_longitud),
        salida_en = COALESCE($6, salida_en),
        asientos_totales = COALESCE($7, asientos_totales),
        estado = COALESCE($8, estado),
        asientos_disponibles = COALESCE($7, asientos_totales) - (
          SELECT COUNT(*) FROM reservas WHERE id_viaje = $9 AND estado IN ('SOLICITADA','ACEPTADA')
        )
      WHERE id = $9
      RETURNING *
    `;
    const vals = [id_conductor, origen_latitud, origen_longitud, destino_latitud, destino_longitud, salida_en ? new Date(salida_en) : null, asientos_totales, estado, req.params.id];
    const { rows } = await pool.query(q, vals);
    if (rows.length === 0) return res.status(404).json({ error: 'Viaje no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

// PATCH /api/viajes/:id
exports.actualizarParcial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'No se enviaron campos para actualizar' });

    const allowed = ['origen_latitud','origen_longitud','destino_latitud','destino_longitud','salida_en','asientos_totales','estado'];
    const set = [];
    const vals = [];
    let i = 1;

    for (const k of Object.keys(fields)) {
      if (!allowed.includes(k)) continue;
      set.push(`${k} = $${i}`);
      vals.push(k === 'salida_en' ? new Date(fields[k]) : fields[k]);
      i++;
    }
    if (set.length === 0) return res.status(400).json({ error: 'No hay campos válidos para actualizar' });

    // si cambia asientos_totales recalcula disponibles
    if (fields.asientos_totales) {
      set.push(`asientos_disponibles = $${i} - (SELECT COUNT(*) FROM reservas WHERE id_viaje = $${i+1} AND estado IN ('SOLICITADA','ACEPTADA'))`);
      vals.push(fields.asientos_totales);
      i++;
    }

    vals.push(id);
    const q = `UPDATE viajes SET ${set.join(', ')} WHERE id = $${i} RETURNING *`;
    const { rows } = await pool.query(q, vals);
    if (rows.length === 0) return res.status(404).json({ error: 'Viaje no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

// DELETE /api/viajes/:id
exports.eliminar = async (req, res, next) => {
  try {
    const r = await pool.query('DELETE FROM viajes WHERE id=$1 RETURNING *', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Viaje no encontrado' });
    res.json({ mensaje: `Viaje ${req.params.id} eliminado correctamente`, viaje_eliminado: r.rows[0] });
  } catch (e) {
    if (e.code === '23503') return res.status(409).json({ error: 'No se puede eliminar el viaje', motivo: 'Existen reservas asociadas a este viaje' });
    next(e);
  }
};
