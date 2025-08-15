// src/routes/usuarios.routes.js
const router = require('express').Router();
const { body, param } = require('express-validator');
const { handleValidation } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const ctrl = require('../controllers/usuarios.controller');

// Helper: permitir acceder a /usuarios/:id solo si es el propio usuario o ADMIN
function selfOrAdmin(req, res, next) {
  const rol = String(req.user?.rol || '').toUpperCase();
  const isAdmin = rol === 'ADMINISTRADOR' || rol === 'ADMIN';
  if (isAdmin || req.user?.id === req.params.id) return next();
  return res.status(403).json({ error: 'No autorizado' });
}

/** ⚠️ /me debe ir ANTES de /:id */
router.get('/me', requireAuth, ctrl.me);

/** (Opcional) PATCH /me — el propio usuario puede actualizar su perfil sin ser admin */
router.patch(
  '/me',
  requireAuth,
  [
    body('correo').optional().isEmail().withMessage('Correo inválido'),
    body('rol').optional().isIn(['ADMINISTRADOR','CONDUCTOR','ESTUDIANTE']).withMessage('Rol inválido'),
    body('nombre_completo').optional().isLength({ min: 3 }).withMessage('Nombre muy corto'),
    body('telefono').optional().isString(),
    body('avatar_url').optional().isString(),
    body('latitud').optional().isFloat(),
    body('longitud').optional().isFloat(),
    body('info_vehiculo').optional().isString(),
  ],
  handleValidation,
  // Reutilizamos el handler general apuntando al propio id
  (req, res, next) => {
    req.params.id = req.user.id;
    return ctrl.actualizarParcial(req, res, next);
  }
);

/** Listar todos (solo ADMIN) */
router.get('/', requireAuth, authorize('ADMINISTRADOR'), ctrl.listar);

/** Obtener por id (propio o ADMIN) */
router.get(
  '/:id',
  requireAuth,
  [param('id').isUUID().withMessage('id inválido')],
  handleValidation,
  selfOrAdmin,
  ctrl.obtener
);

/**
 * Crear usuario — bloqueado aquí (usa /api/auth/register)
 * Evita pasar contraseñas en crudo por esta ruta.
 */
router.post('/', requireAuth, authorize('ADMINISTRADOR'), (_req, res) => {
  return res.status(405).json({ error: 'Usa /api/auth/register para crear usuarios' });
});

/** Actualizar (solo ADMIN) */
router.put(
  '/:id',
  requireAuth,
  authorize('ADMINISTRADOR'),
  [
    param('id').isUUID().withMessage('id inválido'),
    body('correo').optional().isEmail().withMessage('Correo inválido'),
    body('rol').optional().isIn(['ADMINISTRADOR','CONDUCTOR','ESTUDIANTE']).withMessage('Rol inválido'),
    body('nombre_completo').optional().isLength({ min: 3 }).withMessage('Nombre muy corto'),
    body('telefono').optional().isString(),
    body('avatar_url').optional().isString(),
    body('latitud').optional().isFloat(),
    body('longitud').optional().isFloat(),
    body('info_vehiculo').optional().isString(),
  ],
  handleValidation,
  ctrl.actualizar
);

/** Patch (solo ADMIN) — mismos campos que PUT */
router.patch(
  '/:id',
  requireAuth,
  authorize('ADMINISTRADOR'),
  [
    param('id').isUUID().withMessage('id inválido'),
    body('correo').optional().isEmail().withMessage('Correo inválido'),
    body('rol').optional().isIn(['ADMINISTRADOR','CONDUCTOR','ESTUDIANTE']).withMessage('Rol inválido'),
    body('nombre_completo').optional().isLength({ min: 3 }).withMessage('Nombre muy corto'),
    body('telefono').optional().isString(),
    body('avatar_url').optional().isString(),
    body('latitud').optional().isFloat(),
    body('longitud').optional().isFloat(),
    body('info_vehiculo').optional().isString(),
  ],
  handleValidation,
  ctrl.actualizarParcial
);

/** Eliminar (solo ADMIN) */
router.delete(
  '/:id',
  requireAuth,
  authorize('ADMINISTRADOR'),
  [param('id').isUUID().withMessage('id inválido')],
  handleValidation,
  ctrl.eliminar
);

module.exports = router;
