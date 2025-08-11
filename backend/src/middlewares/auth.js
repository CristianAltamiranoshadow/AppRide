const jwt = require('jsonwebtoken');
function requireAuth(roles = []) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Sin token' });
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRETO); // { id, rol }
      if (roles.length && !roles.includes(payload.rol)) {
        return res.status(403).json({ error: 'Prohibido' });
      }
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Token inválido' });
    }
  };
}
module.exports = { requireAuth };
