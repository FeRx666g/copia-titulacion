// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const datosRoutes = require('./routes/datos.routes');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend Recolector MVC funcionando 🚀');
});

app.use('/api/datos', datosRoutes);

app.listen(PORT, () => {
  console.log(`Servidor MVC escuchando en el puerto ${PORT}`);
});