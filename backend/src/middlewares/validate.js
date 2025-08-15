const { validationResult } = require('express-validator');
exports.handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array().map(e => ({ field: e.param, msg: e.msg })) });
  }
  next();
};
