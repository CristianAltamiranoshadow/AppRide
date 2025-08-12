const router = require('express').Router();
const { 
  registrar, 
  login, 
  obtenerPerfil, 
  subirAvatar 
} = require('../controllers/auth.controller');
const { upload } = require('../middlewares/upload');
const { requireauth } = require('../middlewares/auth');

// Rutas públicas
router.post('/register', upload.single('avatar'), registrar); // Ruta principal en inglés
router.post('/registro', upload.single('avatar'), registrar); // Alias en español
router.post('/login', login);

// Rutas protegidas
router.get('/me', requireAuth(), obtenerPerfil);
router.post('/avatar', requireAuth(), upload.single('avatar'), subirAvatar);

module.exports = router;
