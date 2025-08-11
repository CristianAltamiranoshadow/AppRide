const router = require('express').Router();
const { registrar, login, obtenerPerfil, subirAvatar } = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

// Rutas públicas
// En tu archivo de rutas (auth.routes.js)
router.post('/register', registrar);  // Cambiar de '/registro' a '/register'
router.post('/login', login);

// Rutas protegidas (requieren autenticación)
router.get('/me', requireAuth(), obtenerPerfil);  // Mejor nombre que "yo"
router.post('/avatar', requireAuth(), upload.single('avatar'), subirAvatar);

module.exports = router;