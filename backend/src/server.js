require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Middlewares
app.use(cors({ origin: process.env.CORS_ORIGEN }));
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(process.env.UPLOAD_DIR || 'uploads'));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ mensaje: 'Backend AppRide funcionando ' });
});

// Probar conexión a la BD
pool.connect()
  .then(() => console.log('Conectado a PostgreSQL'))
  .catch(err => console.error('Error de conexión a PostgreSQL:', err));

// Levantar servidor
const PORT = process.env.PUERTO || 5050;
app.listen(PORT, () => {
  console.log(`Servidor backend en http://localhost:${PORT}`);
});
