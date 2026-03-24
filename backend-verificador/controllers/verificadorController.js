const Usuario = require('../models/Usuario');
const Auditoria = require('../models/Auditoria');

let verificacionActiva = true;

const configurarVerificador = (req, res) => {
  const { comando } = req.body;

  if (comando === 'activar') {
    verificacionActiva = true;
  } else if (comando === 'desactivar') {
    verificacionActiva = false;
  } else {
    return res.status(400).json({ mensaje: 'Comando no válido' });
  }

  res.json({ 
    mensaje: `Verificación ${verificacionActiva ? 'activada' : 'desactivada'}`,
    estado_actual: verificacionActiva
  });
};

const verificarRol = async (req, res) => {
  
  if (!verificacionActiva) {
    return res.status(503).json({ error: 'Verificación desactivada temporalmente' });
  }

  try {
    const datosUsuario = await Usuario.obtenerPorId(req.uid);

    if (!datosUsuario) {
      return res.status(404).json({ error: 'Usuario no encontrado en base de datos' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'desconocido';

    await Auditoria.registrar({
      uid: req.uid,
      email: datosUsuario.email || null,
      rol: datosUsuario.rol,
      ip,
      userAgent
    });

    res.json({ rol: datosUsuario.rol });

  } catch (error) {
    console.error('Error en controlador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { configurarVerificador, verificarRol };