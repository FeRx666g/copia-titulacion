const express = require('express');
const router = express.Router();
const verificadorController = require('../controllers/verificadorController');
const verificarToken = require('../middleware/authMiddleware');

router.post('/configurar-verificador', verificadorController.configurarVerificador);

router.get('/verificar-rol', verificarToken, verificadorController.verificarRol);

module.exports = router;