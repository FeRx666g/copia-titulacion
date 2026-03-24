// routes/datos.routes.js
const express = require('express');
const router = express.Router();
const datosController = require('../controllers/datosController');
const validarApiKey = require('../middleware/validarApiKey');

router.post('/', validarApiKey, datosController.guardarDatos);

module.exports = router;