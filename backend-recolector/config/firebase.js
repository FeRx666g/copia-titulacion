// config/firebase.js
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(
  __dirname,
  '../credenciales/proyecto-titulacion-9db38-firebase-adminsdk-fbsvc-6cdda561dd.json'
));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

module.exports = firestore;