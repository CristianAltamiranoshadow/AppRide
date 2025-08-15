require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const errorHandler = require('./middlewares/errorHandler');

const app = express();

// CORS (mantengo tu CORS_ORIGEN y los 5173)
const corsOptions = {
  origin: [
    process.env.CORS_ORIGEN,
    'http://localhost:5173',
    'https://localhost:5173'
  ].filter(Boolean),
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));

// estáticos
const uploadsDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadsDir));

// rutas info
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

app.get('/health', (req, res) => res.status(200).json({ status: 'healthy' }));

// RUTAS API (modulares)
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/viajes', require('./routes/viajes.routes'));
app.use('/api/reservas', require('./routes/reservas.routes'));

// 404
app.use((req, res) => res.status(404).json({ error: 'No encontrado' }));

// errores
app.use(errorHandler);

// arranque
const PORT = process.env.PUERTO || process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Servidor backend en http://localhost:${PORT}`));
