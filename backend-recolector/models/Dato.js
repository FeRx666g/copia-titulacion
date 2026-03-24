const firestore = require('../config/firebase');

class Dato {
  
  static async verificarDispositivo(idDispositivo) {
    try {
      const doc = await firestore.collection('dispositivos').doc(idDispositivo).get();
      return doc.exists;
    } catch (error) {
      throw error;
    }
  }

  static async guardar(data) {
    try {
      return await firestore.collection('mediciones').add(data);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Dato;