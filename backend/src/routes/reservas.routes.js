const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { unirseViaje, misReservas, decidirReserva } = require('../controllers/reservas.controller');

router.get('/mias', requireAuth(['ESTUDIANTE']), misReservas);
router.post('/:idViaje', requireAuth(['ESTUDIANTE']), unirseViaje);
router.patch('/:idReserva', requireAuth(['CONDUCTOR']), decidirReserva);

module.exports = router;
