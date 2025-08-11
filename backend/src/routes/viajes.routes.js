const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { crearViaje, listarViajes, misViajes, actualizarEstado } = require('../controllers/viajes.controller');

router.get('/', requireAuth(), listarViajes);
router.get('/mios', requireAuth(['CONDUCTOR']), misViajes);
router.post('/', requireAuth(['CONDUCTOR']), crearViaje);
router.patch('/:idViaje/estado', requireAuth(['CONDUCTOR']), actualizarEstado);

module.exports = router;
