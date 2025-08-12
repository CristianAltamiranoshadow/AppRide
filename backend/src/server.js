require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Configuración mejorada de CORS
const corsOptions = {
  origin: [
    process.env.CORS_ORIGEN, 
    'http://localhost:5173', 
    'https://localhost:5173'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));

// Configuración de archivos estáticos
const uploadsDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Ruta de prueba mejorada
app.get('/', (req, res) => {
  res.json({ 
    mensaje: 'Backend AppRide funcionando',
    version: '1.0.0',
    entorno: process.env.NODE_ENV || 'development',
    rutas_disponibles: {
      auth: '/api/auth',
      viajes: '/api/viajes',
      reservas: '/api/reservas',
      usuarios: '/api/usuarios'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Endpoint para obtener usuarios
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuarios');
    res.json(result.rows);
  } catch (error) {
    console.error('Error consultando usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Endpoint para crear un usuario nuevo
app.post('/api/usuarios', async (req, res) => {
  const { rol, correo, contrasena_hash, nombre_completo, telefono, avatar_url, latitud, longitud, info_vehiculo } = req.body;
  try {
    const query = `
      INSERT INTO usuarios 
        (rol, correo, contrasena_hash, nombre_completo, telefono, avatar_url, latitud, longitud, info_vehiculo, creado_en, actualizado_en)
      VALUES 
        ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW(), NOW())
      RETURNING *;
    `;
    const values = [rol, correo, contrasena_hash, nombre_completo, telefono, avatar_url, latitud, longitud, info_vehiculo];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// Endpoint para actualizar un usuario (por id)
app.put('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { rol, correo, contrasena_hash, nombre_completo, telefono, avatar_url, latitud, longitud, info_vehiculo } = req.body;
  try {
    const query = `
      UPDATE usuarios SET
        rol = $1,
        correo = $2,
        contrasena_hash = $3,
        nombre_completo = $4,
        telefono = $5,
        avatar_url = $6,
        latitud = $7,
        longitud = $8,
        info_vehiculo = $9,
        actualizado_en = NOW()
      WHERE id = $10
      RETURNING *;
    `;
    const values = [rol, correo, contrasena_hash, nombre_completo, telefono, avatar_url, latitud, longitud, info_vehiculo, id];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// Endpoint PATCH para actualizar parcialmente un usuario por id
app.patch('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
  }

  // Construir dinámicamente SET para UPDATE
  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const key in fields) {
    // Ignorar campos que no se deben actualizar manualmente
    if (['id', 'creado_en', 'actualizado_en'].includes(key)) continue;

    setClauses.push(`${key} = $${idx}`);
    values.push(fields[key]);
    idx++;
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
  }

  // Agregar actualización de la columna actualizado_en
  setClauses.push(`actualizado_en = NOW()`);

  const query = `
    UPDATE usuarios SET
      ${setClauses.join(', ')}
    WHERE id = $${idx}
    RETURNING *;
  `;
  values.push(id);

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando usuario parcialmente:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// Manejo de errores global
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

// Conexión a la base de datos con reintentos
const connectWithRetry = () => {
  pool.connect()
    .then(() => console.log('✅ Conectado a PostgreSQL'))
    .catch(err => {
      console.error('❌ Error de conexión a PostgreSQL:', err.message);
      console.log('Reintentando conexión en 5 segundos...');
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// Levantar servidor con manejo de errores
const PORT = process.env.PUERTO || 5050;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor backend en http://localhost:${PORT}`);
});

// Manejo de cierre elegante
process.on('SIGTERM', () => {
  console.log('Recibido SIGTERM. Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado');
    pool.end(() => {
      console.log('Conexión a PostgreSQL cerrada');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('Recibido SIGINT. Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado');
    pool.end(() => {
      console.log('Conexión a PostgreSQL cerrada');
      process.exit(0);
    });
  });
});
