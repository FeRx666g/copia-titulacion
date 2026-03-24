const express = require('express');
const cors = require('cors');
require('dotenv').config();

const verificadorRoutes = require('./routes/verificador.routes');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.use('/', verificadorRoutes);

app.listen(PORT, () => {
  console.log(`Servidor Verificador MVC escuchando en puerto ${PORT}`);
});