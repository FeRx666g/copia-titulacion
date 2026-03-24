// middleware/validarApiKey.js
const firestore = require('../config/firebase'); 
const SHA256 = require('crypto-js/sha256');

module.exports = async function validarApiKey(req, res, next) {
  const apiKeyRecibida = req.headers['x-api-key'];
  if (!apiKeyRecibida) return res.status(401).json({ error: 'API Key requerida' });
  
  try {
      const hash = SHA256(apiKeyRecibida).toString();
      const doc = await firestore.collection('api_keys').doc(hash).get();
      
      if (!doc.exists) return res.status(403).json({ error: 'API Key inválida' });
      
      const data = doc.data();
      if (new Date() > data.expiresAt.toDate()) return res.status(403).json({ error: 'API Key expirada' });
      
      req.id_usuario = data.uid;
      next();
  } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error interno' });
  }
};