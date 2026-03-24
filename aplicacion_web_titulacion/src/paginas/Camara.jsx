//Camara.jsx
import React, { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot} from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

export const Camara = () => {
  // Estado que indica si el stream de la cámara está activo o no
  const [streamActivo, setStreamActivo] = useState(false);

  // Estado para la posición actual del servo de la cámara (h = horizontal, v = vertical)
  const [servoCam, setServoCam] = useState({ h: 90, v: 45 });

  // Estado para la posición actual del servo del panel solar (h = horizontal, v = vertical)
  const [servoPanel, setServoPanel] = useState({ h: 90, v: 45 });

  // Estado para habilitar/deshabilitar el modo manual de la cámara
  const [modoManualCam, setModoManualCam] = useState(false);

  // Estado para habilitar/deshabilitar el modo manual del panel solar
  const [modoManualPanel, setModoManualPanel] = useState(false);

  // Resolución de movimiento horizontal de la cámara (cuántos grados por paso)
  const [resCamH, setResCamH] = useState(5);

  // Resolución de movimiento vertical de la cámara (cuántos grados por paso)
  const [resCamV, setResCamV] = useState(5);

  // Resolución de movimiento horizontal del panel solar
  const [resPanelH, setResPanelH] = useState(5);

  // Resolución de movimiento vertical del panel solar
  const [resPanelV, setResPanelV] = useState(5);

  // URL pública del servidor ngrok donde está disponible el stream de la ESP32-CAM
  const [urlNgrok, setUrlNgrok] = useState('');

  useEffect(() => {
    const docRef = doc(db, 'configuracion', 'camara');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUrlNgrok(data.urlNgrok);
      }
    });

    return () => unsubscribe();
  }, []);

  // Función que envía un comando al documento en Firestore que escucha el ESP32/panel
  const enviarComando = async (target, comando) => {
    // Construye el payload con el prefijo (cam o panel) y el comando
    const payload = `${target === 'camara' ? 'cam' : 'panel'}:${comando}`;
    // Actualiza el documento en Firestore con el nuevo mensaje y timestamp
    await setDoc(doc(db, 'control', 'servos'), {
      mensaje: payload,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  };

  // Función para formatear un comando con las posiciones h y v a formato Txxxxyyyy
  const formatearComando = (h, v) => {
    // Rellena los números con ceros a la izquierda hasta completar 3 dígitos
    const pad = (n, size) => n.toString().padStart(size, '0');
    return `T${pad(h, 3)}${pad(v, 3)}`;
  };

  // Componente ControlBox: Controla la cámara o el panel solar en modo manual
  const ControlBox = ({ label, target, modoManual, setModoManual, resH, setResH, resV, setResV }) => {
    // Estado para resaltar el botón presionado (highlight visual)
    const [highlight, setHighlight] = useState('');

    // Obtiene el estado actual del servo y su setter según el target (camara o panel)
    const servo = target === 'camara' ? servoCam : servoPanel;
    const setServo = target === 'camara' ? setServoCam : setServoPanel;

    // Función para mover el servo en horizontal o vertical
    const mover = (eje, dir) => {
      if (!modoManual) return; // Solo se puede mover en modo manual

      const paso = eje === 'h' ? resH : resV;              // Resuelve resolución horizontal o vertical
      const limite = eje === 'h' ? 180 : 90;              // Limita el rango de movimiento
      const direccion = dir === 'mas' ? 1 : -1;           // Determina si aumenta o disminuye
      const nuevoValor = Math.max(0, Math.min(limite, servo[eje] + direccion * paso)); // Calcula nuevo valor dentro de los límites

      const nuevo = { ...servo, [eje]: nuevoValor };      // Crea nuevo estado del servo
      setServo(nuevo);                                    // Actualiza el estado
      const comando = formatearComando(nuevo.h, nuevo.v); // Formatea el comando
      enviarComando(target, comando);                     // Envía el comando a Firestore
    };

    // Activa el modo manual y centra los servos en posición inicial
    const activarManual = () => {
      const comando = formatearComando(90, 45);
      setServo({ h: 90, v: 45 });
      enviarComando(target, comando);
      setModoManual(true);
    };

    // Desactiva el modo manual y envía comando para volver a automático
    const desactivarManual = () => {
      const payload = `${target === 'camara' ? 'cam' : 'panel'}:F`;
      setModoManual(false);
      setDoc(doc(db, 'control', 'servos'), {
        mensaje: payload,
        updated_at: new Date().toISOString(),
      }, { merge: true });
    };

    // Manejador para movimientos con teclado
    const handleKey = (e) => {
      if (!modoManual) return;

      if (target === 'camara') {
        if (e.key === 'w') { mover('v', 'menos'); setHighlight('up'); }
        if (e.key === 's') { mover('v', 'mas'); setHighlight('down'); }
        if (e.key === 'a') { mover('h', 'mas'); setHighlight('left'); }
        if (e.key === 'd') { mover('h', 'menos'); setHighlight('right'); }
      } else {
        if (e.key === '8') { mover('v', 'menos'); setHighlight('up'); }
        if (e.key === '5') { mover('v', 'mas'); setHighlight('down'); }
        if (e.key === '4') { mover('h', 'mas'); setHighlight('left'); }
        if (e.key === '6') { mover('h', 'menos'); setHighlight('right'); }
      }
      // Quita el highlight tras 150ms
      setTimeout(() => setHighlight(''), 150);
    };

    // Registra y elimina el listener de teclado
    useEffect(() => {
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    });

    // Botón individual para los controles de dirección
    const ControlButton = ({ onClick, Icon, name }) => (
      <button
        onClick={() => { onClick(); setHighlight(name); setTimeout(() => setHighlight(''), 150); }}
        className={`w-12 h-12 flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white rounded-full shadow transition cursor-pointer ${highlight === name ? 'ring-4 ring-cyan-300' : ''}`}
      >
        <Icon size={20} />
      </button>
    );

    return (
      <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-cyan-500 shadow-md flex flex-col items-center space-y-4 w-fit">
        {/* Título del control */}
        <h3 className="text-lg font-semibold text-black dark:text-white">{label}</h3>

        {/* Controles de dirección en una cuadrícula */}
        <div className="grid grid-cols-3 grid-rows-3 gap-2">
          <div></div>
          <ControlButton onClick={() => mover('v', 'menos')} Icon={ArrowUp} name="up" />
          <div></div>

          <ControlButton onClick={() => mover('h', 'mas')} Icon={ArrowLeft} name="left" />
          <div className="w-12 h-12" />
          <ControlButton onClick={() => mover('h', 'menos')} Icon={ArrowRight} name="right" />

          <div></div>
          <ControlButton onClick={() => mover('v', 'mas')} Icon={ArrowDown} name="down" />
          <div></div>
        </div>

        {/* Sliders para ajustar la resolución horizontal y vertical */}
        <div className="flex flex-col space-y-4 w-full mt-4">
          <div className="text-sm text-black dark:text-white">
            Resolución H: <span className="font-semibold">{resH}</span>
            <input
              type="range"
              min={1}
              max={180}
              value={resH}
              onChange={(e) => setResH(Number(e.target.value))}
              className="w-full mt-1 accent-cyan-500"
            />
          </div>
          <div className="text-sm text-black dark:text-white">
            Resolución V: <span className="font-semibold">{resV}</span>
            <input
              type="range"
              min={1}
              max={90}
              value={resV}
              onChange={(e) => setResV(Number(e.target.value))}
              className="w-full mt-1 accent-cyan-500"
            />
          </div>
        </div>

        {/* Botón para activar o desactivar el modo manual */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={modoManual ? desactivarManual : activarManual}
            className={`px-3 py-1 text-white rounded cursor-pointer transition ${modoManual ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {modoManual ? 'Desactivar Manual' : 'Activar Manual'}
          </button>
        </div>
      </div>
    );
  };

  return (
    // Contenedor principal, pantalla completa con fondo adaptable claro/oscuro
    <div className="flex flex-col items-center justify-center p-6 space-y-8 bg-white dark:bg-zinc-900 min-h-screen transition-colors duration-500">

      {/* Título principal de la página */}
      <h2 className="text-2xl font-bold text-center text-black dark:text-white">
        ESP32-CAM en Tiempo Real
      </h2>

      {/* Si el stream aún no está activo, muestra botón para iniciarlo */}
      {!streamActivo ? (
        <div className="w-[640px] h-[480px] bg-gray-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center shadow-lg border border-dashed border-gray-400 dark:border-zinc-500">

          {/* Botón para activar el stream */}
          <button
            onClick={() => setStreamActivo(true)}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded shadow cursor-pointer"
          >
            Iniciar Cámara
          </button>
        </div>

      ) : (
        // Si el stream está activo, muestra los controles y el stream en vivo
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6">

          {/* ControlBox para la cámara */}
          <ControlBox
            label="Control Cámara"
            target="camara"
            modoManual={modoManualCam}
            setModoManual={setModoManualCam}
            resH={resCamH}
            setResH={setResCamH}
            resV={resCamV}
            setResV={setResCamV}
          />

          {/* Sección central con el stream */}
          <div className="flex flex-col items-center">
            {/* Llama a la ruta /activar-stream en segundo plano para activar la cámara */}
            <iframe src={`${urlNgrok}/activar-stream`} style={{ display: 'none' }} />

            {/* Muestra el stream en un iframe principal */}
            <iframe
              src={urlNgrok}
              title="Stream ESP32-CAM"
              className="w-[640px] h-[480px] border-4 border-gray-300 rounded-lg shadow-lg object-fill"
              allow="autoplay"
            />

            {/* Botón para detener el stream */}
            <button
              onClick={() => setStreamActivo(false)}
              className="mt-4 px-5 py-2 rounded text-white text-lg bg-red-600 hover:bg-red-700 cursor-pointer"
            >
              Detener cámara
            </button>
          </div>

          {/* ControlBox para el panel solar */}
          <ControlBox
            label="Control Panel Solar"
            target="panel"
            modoManual={modoManualPanel}
            setModoManual={setModoManualPanel}
            resH={resPanelH}
            setResH={setResPanelH}
            resV={resPanelV}
            setResV={setResPanelV}
          />
        </div>
      )}
    </div>
  );
};
