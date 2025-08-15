// src/routes/reservas.routes.js
const router = require('express').Router();
const { body, param } = require('express-validator');
const { handleValidation } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const authorize = require('../middlewares/authorize'); // export default
const ctrl = require('../controllers/reservas.controller');

// Helper: enum de estados válidos en tu BD
const ESTADOS_RESERVA = ['SOLICITADA', 'ACEPTADA', 'RECHAZADA', 'CANCELADA'];

/**
 * Listar reservas
 * - ADMINISTRADOR: todas
 * - CONDUCTOR: de sus viajes
 * - ESTUDIANTE: propias
 */
router.get(
  '/',
  requireAuth,
  authorize('ADMINISTRADOR', 'CONDUCTOR', 'ESTUDIANTE'),
  ctrl.listar
);

/** Obtener una reserva por id */
router.get(
  '/:id',
  requireAuth,
  [param('id').isUUID().withMessage('id inválido')],
  handleValidation,
  ctrl.obtener
);

/** Crear reserva (solo ESTUDIANTE) */
router.post(
  '/',
  requireAuth,
  authorize('ESTUDIANTE'),
  [
    body('id_viaje').isUUID().withMessage('id_viaje inválido'),
    // id_estudiante NO se recibe por body: sale del token
    body('recogida_latitud').optional().isFloat().withMessage('recogida_latitud inválida'),
    body('recogida_longitud').optional().isFloat().withMessage('recogida_longitud inválida')
  ],
  handleValidation,
  ctrl.crear
);

/**
 * Actualizar estado/coords de reserva (PUT/PATCH)
 * - CONDUCTOR / ADMINISTRADOR: pueden aceptar/rechazar, etc.
 * - ESTUDIANTE: puede cancelar su propia reserva (política adicional puedes reforzarla en el controller)
 */
router.put(
  '/:id',
  requireAuth,
  authorize('ADMINISTRADOR', 'CONDUCTOR'),
  [param('id').isUUID().withMessage('id inválido')],
  handleValidation,
  ctrl.actualizarEstado
);

router.patch(
  '/:id',
  requireAuth,
  authorize('ADMINISTRADOR', 'CONDUCTOR', 'ESTUDIANTE'),
  [
    param('id').isUUID().withMessage('id inválido'),
    body('estado').optional().isIn(ESTADOS_RESERVA).withMessage(`estado debe ser uno de: ${ESTADOS_RESERVA.join(', ')}`),
    body('recogida_latitud').optional().isFloat().withMessage('recogida_latitud inválida'),
    body('recogida_longitud').optional().isFloat().withMessage('recogida_longitud inválida')
  ],
  handleValidation,
  ctrl.actualizarEstado
);

/** Eliminar reserva (repone cupo si estaba activa) */
router.delete(
  '/:id',
  requireAuth,
  authorize('ADMINISTRADOR', 'CONDUCTOR', 'ESTUDIANTE'),
  [param('id').isUUID().withMessage('id inválido')],
  handleValidation,
  ctrl.eliminar
);

module.exports = router;
