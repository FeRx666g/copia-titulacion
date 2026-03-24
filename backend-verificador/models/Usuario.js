const { db } = require('../config/firebase');

class Usuario {
  static async obtenerPorId(uid) {
    const doc = await db.collection('usuarios').doc(uid).get();
    if (!doc.exists) return null;
    return doc.data();
  }
}

module.exports = Usuario;