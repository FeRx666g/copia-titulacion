const { admin } = require('../config/firebase');

const verificarToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado o formato incorrecto' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid; 
    next();
  } catch (error) {
    console.error('Token inválido:', error);
    res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = verificarToken;