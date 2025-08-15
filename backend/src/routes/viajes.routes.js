const router = require('express').Router();
const { body, param } = require('express-validator');
const { handleValidation } = require('../middlewares/validate');
const ctrl = require('../controllers/viajes.controller');

router.get('/', ctrl.listar);
router.get('/:id', [param('id').isUUID().withMessage('id inválido')], handleValidation, ctrl.obtener);

router.post(
  '/',
  [
    body('id_conductor').isUUID().withMessage('id_conductor inválido'),
    body('origen_latitud').isFloat().withMessage('origen_latitud inválido'),
    body('origen_longitud').isFloat().withMessage('origen_longitud inválido'),
    body('destino_latitud').isFloat().withMessage('destino_latitud inválido'),
    body('destino_longitud').isFloat().withMessage('destino_longitud inválido'),
    body('salida_en').notEmpty().withMessage('salida_en requerido'),
    body('asientos_totales').isInt({ min: 1 }).withMessage('asientos_totales >= 1')
  ],
  handleValidation,
  ctrl.crear
);

router.put('/:id', [param('id').isUUID().withMessage('id inválido')], handleValidation, ctrl.actualizar);
router.patch('/:id', [param('id').isUUID().withMessage('id inválido')], handleValidation, ctrl.actualizarParcial);
router.delete('/:id', [param('id').isUUID().withMessage('id inválido')], handleValidation, ctrl.eliminar);

module.exports = router;
