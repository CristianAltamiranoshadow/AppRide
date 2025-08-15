const router = require('express').Router();
const { body } = require('express-validator');
const { handleValidation } = require('../middlewares/validate');
const ctrl = require('../controllers/auth.controller');

router.post(
  '/register',
  [
    body('rol').isIn(['ESTUDIANTE','CONDUCTOR']).withMessage('Rol inválido'),
    body('nombre_completo').trim().isLength({ min: 3 }).withMessage('Nombre requerido'),
    body('correo').isEmail().withMessage('Correo inválido'),
    body('contrasena').isLength({ min: 6 }).withMessage('Contraseña mínima 6')
  ],
  handleValidation,
  ctrl.register
);

router.post(
  '/login',
  [
    body('correo').isEmail().withMessage('Correo inválido'),
    body('contrasena').notEmpty().withMessage('Contraseña requerida')
  ],
  handleValidation,
  ctrl.login
);

module.exports = router;
