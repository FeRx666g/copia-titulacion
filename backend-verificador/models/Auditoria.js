const { db, admin } = require('../config/firebase');

class Auditoria {
  static async registrar(datos) {
    try {
      await db.collection('auditoria_roles').add({
        ...datos,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error al guardar auditoría:', error);
    }
  }
}

module.exports = Auditoria;