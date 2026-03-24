import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, setDoc, deleteDoc, doc, updateDoc, Timestamp, onSnapshot, query, orderBy, limit, where, getDoc } from 'firebase/firestore';
import { UserContext } from '../providers/UserProvider';
import { nanoid } from 'nanoid';
import { PiDevicesLight } from 'react-icons/pi';
import { FaTrash, FaEdit, FaQuestion } from 'react-icons/fa';
import { ModalEditarDispositivo } from '../componentes/ModalEditarDispositivo';
import { ModalAgregarDispositivo } from '../componentes/ModalAgregarDispositivo';
import Swal from 'sweetalert2';
import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { AccesoDenegado } from '../componentes/AccesoDenegado';

export const Dispositivos = () => {
  const [ultimasMediciones, setUltimasMediciones] = useState({});
  const [copiadoId, setCopiadoId] = useState(null);
  const { user } = useContext(UserContext);
  const [dispositivoEditando, setDispositivoEditando] = useState(null);
  const [dispositivos, setDispositivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoDispositivo, setNuevoDispositivo] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'Sensor',
    imagen: '',
    valorMinimo: '',
    valorMaximo: '',
    unidad: ''
  });

  const [runTutorial, setRunTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2">Gestión de sensores</h3>
          <p>Aquí podrás administrar tus sensores IoT conectados a la aplicación web.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-btn-add',
      content: 'Haz clic aquí para registrar un nuevo sensor en tu cuenta.',
    },
    {
      target: '.tour-modal-add-window',
      content: 'Completa este formulario con los datos de tu equipo.',
      placement: 'center',
    },
    {
      target: '.tour-modal-add-name',
      content: 'Asigna un nombre fácil de identificar (ej. Sensor Invernadero).',
    },
    {
      target: '.tour-modal-add-type',
      content: 'El tipo está bloqueado en "Sensor".',
    },
    {
      target: '.tour-modal-add-desc',
      content: 'Puedes agregar una descripción opcional para dar más detalles.',
    },
    {
      target: '.tour-modal-add-save',
      content: 'Finalmente, guarda el sensor para generar su ID único.',
    },
    {
      target: '.tour-device-card',
      content: 'Así se ve un sensor registrado. Aquí verás sus datos en tiempo real.',
    },
    {
      target: '.tour-device-id',
      content: 'Este ID es único. Cópialo para configurar tu hardware para que envíe datos aquí.',
    },
    {
      target: '.tour-btn-edit',
      content: 'Si necesitas cambiar el nombre o descripción, usa este botón.',
    },
    {
      target: '.tour-btn-delete',
      content: 'Usa este botón para eliminar el dispositivo permanentemente.',
    }
  ];

  const stepsFiltrados = steps.filter(step => {
    if (step.target === '.tour-device-card' || step.target === '.tour-device-id' || step.target === '.tour-btn-edit' || step.target === '.tour-btn-delete') {
      return dispositivos.length > 0;
    }
    return true;
  });

  const handleJoyrideCallback = (data) => {
    const { action, index, status, type } = data;

    if (action === ACTIONS.CLOSE) {
      setRunTutorial(false);
      setStepIndex(0);
      setMostrarFormulario(false);
      return;
    }

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTutorial(false);
      setStepIndex(0);
      setMostrarFormulario(false);

      if (user?.uid) {
        const docRef = doc(db, 'usuarios', user.uid);
        updateDoc(docRef, { tutorialDispositivosVisto: true }).catch(console.error);
      }
      return;
    }

    if (type === EVENTS.STEP_AFTER || action === ACTIONS.CLOSE) {
      if (index === 1 && action === ACTIONS.NEXT) {
        setMostrarFormulario(true);
        setTimeout(() => setStepIndex(2), 400);
      }
      else if (index === 6 && action === ACTIONS.NEXT) {
        setMostrarFormulario(false);
        setTimeout(() => setStepIndex(7), 400);
      }
      else if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      }
      else if (action === ACTIONS.PREV) {
        if (index === 7) {
          setMostrarFormulario(true);
          setTimeout(() => setStepIndex(6), 400);
        } else if (index === 2) {
          setMostrarFormulario(false);
          setTimeout(() => setStepIndex(1), 400);
        } else {
          setStepIndex(index - 1);
        }
      }
    }
  };

  useEffect(() => {
    if (user) cargarDispositivos();
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
      const verificarTutorial = async () => {
        try {
          const docRef = doc(db, 'usuarios', user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            if (!docSnap.data().tutorialDispositivosVisto) {
              setStepIndex(0);
              setRunTutorial(true);
            }
          } else {
            setStepIndex(0);
            setRunTutorial(true);
          }
        } catch (error) {
          console.error("Error tutorial:", error);
        }
      };
      verificarTutorial();
    }
  }, [user]);

  const cargarDispositivos = async () => {
    setLoading(true);
    const ref = collection(db, 'usuarios', user.uid, 'dispositivos');
    const q = query(ref, orderBy('creado', 'desc'));
    const snapshot = await getDocs(q);
    const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setDispositivos(lista);
    setLoading(false);
  };

  useEffect(() => {
    if (!user || dispositivos.length === 0) return;
    const unsubscribeFns = [];
    dispositivos.forEach((disp) => {
      const q = query(
        collection(db, 'mediciones'),
        where('id_dispositivo', '==', disp.id_dispositivo),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setUltimasMediciones(prev => ({
            ...prev,
            [disp.id_dispositivo]: data
          }));
        }
      });
      unsubscribeFns.push(unsubscribe);
    });
    return () => {
      unsubscribeFns.forEach(fn => fn());
    };
  }, [user, dispositivos]);

  const manejarCambio = (e) => {
    setNuevoDispositivo({
      ...nuevoDispositivo,
      [e.target.name]: e.target.value
    });
  };

  const crearDispositivo = async () => {
    const idDispositivo = nanoid(10);
    const datosDispositivo = {
      ...nuevoDispositivo,
      creado: Timestamp.now(),
      id_dispositivo: idDispositivo,
      activo: true,
      uid: user.uid
    };
    const refUsuario = collection(db, 'usuarios', user.uid, 'dispositivos');
    await addDoc(refUsuario, datosDispositivo);
    const refGlobal = doc(db, 'dispositivos', idDispositivo);
    await setDoc(refGlobal, datosDispositivo);
    setNuevoDispositivo({
      nombre: '',
      descripcion: '',
      tipo: 'Sensor',
      imagen: '',
      valorMinimo: '',
      valorMaximo: '',
      unidad: ''
    });
    setMostrarFormulario(false);
    cargarDispositivos();
  };

  const eliminarDispositivo = async (id) => {
    const confirmar = await Swal.fire({
      title: '¿Eliminar este sensor?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmar.isConfirmed) return;

    try {
      const refUsuario = doc(db, 'usuarios', user.uid, 'dispositivos', id);
      const snap = await getDoc(refUsuario);

      if (!snap.exists()) {
        Swal.fire({
          icon: 'error',
          title: 'Sensor no encontrado',
          text: 'El sensor no existe o ya fue eliminado.',
        });
        return;
      }

      const data = snap.data();
      const idDispositivoGlobal = data.id_dispositivo;

      await deleteDoc(refUsuario);
      await deleteDoc(doc(db, 'dispositivos', idDispositivoGlobal));

      await Swal.fire({
        icon: 'success',
        title: 'Eliminado',
        text: 'El sensor ha sido eliminado correctamente.'
      });

      cargarDispositivos();
    } catch (error) {
      console.error("Error al eliminar dispositivo:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al eliminar el sensor.'
      });
    }
  };

  const editarDispositivo = (disp) => {
    setDispositivoEditando(disp);
  };

  const guardarEdicion = async (dispositivoActualizado) => {
    await updateDoc(doc(db, 'usuarios', user.uid, 'dispositivos', dispositivoActualizado.id), {
      nombre: dispositivoActualizado.nombre,
      tipo: dispositivoActualizado.tipo,
      descripcion: dispositivoActualizado.descripcion,
      imagen: dispositivoActualizado.imagen,
      valorMinimo: dispositivoActualizado.valorMinimo || '',
      valorMaximo: dispositivoActualizado.valorMaximo || '',
      unidad: dispositivoActualizado.unidad || ''
    });
    setDispositivoEditando(null);
    cargarDispositivos();
  };

  if (!user) {
    return <AccesoDenegado />
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">

      <Joyride
        steps={stepsFiltrados}
        run={runTutorial}
        stepIndex={stepIndex}
        continuous={true}
        showSkipButton={true}
        showProgress={false}
        callback={handleJoyrideCallback}
        disableOverlayClose={true}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#2563EB',
            textColor: '#1F2937',
            backgroundColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.6)',
            arrowColor: '#ffffff',
            width: 400,
          },
          tooltip: {
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            padding: '20px',
            fontSize: '15px',
          },
          buttonNext: {
            backgroundColor: '#2563EB',
            color: '#fff',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            outline: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          },
          buttonBack: {
            color: '#6B7280',
            marginRight: '15px',
            fontSize: '14px',
            fontWeight: '500',
          },
          buttonSkip: {
            color: '#EF4444',
            fontSize: '14px',
          },
          title: {
            fontSize: '20px',
            fontWeight: '700',
            marginBottom: '10px',
            textAlign: 'left',
            color: '#111827',
          },
          content: {
            textAlign: 'left',
            lineHeight: '1.6',
          }
        }}
        locale={{
          back: 'Atrás',
          close: 'Cerrar',
          last: 'Finalizar',
          next: `Siguiente (${stepIndex + 1} de ${stepsFiltrados.length})`,
          skip: 'Omitir'
        }}
      />

      <div className="flex items-center justify-center gap-4 mb-6">
        <PiDevicesLight className="text-4xl text-sky-600 animate-pulse" />
        <h1 className="text-4xl font-extrabold text-sky-600 drop-shadow-sm">Mis Sensores</h1>
      </div>

      <button
        onClick={() => setMostrarFormulario(!mostrarFormulario)}
        className="tour-btn-add mb-10 px-131 justify-center py-2 bg-green-600 cursor-pointer hover:bg-green-700 text-white font-semibold rounded-full shadow transition"
      >
        {mostrarFormulario ? 'Cancelar' : '+ Agregar sensor'}
      </button>

      {mostrarFormulario && (
        <ModalAgregarDispositivo
          nuevoDispositivo={nuevoDispositivo}
          manejarCambio={manejarCambio}
          crearDispositivo={crearDispositivo}
          onClose={() => setMostrarFormulario(false)}
        />
      )}

      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-300 py-10 animate-pulse">
          Cargando sensores...
        </div>
      ) : dispositivos.length === 0 ? (
        <div className="bg-gray-50 dark:bg-zinc-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 italic">Aún no tienes sensores registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8 justify-center">
          {dispositivos.map((disp) => (
            <div
              key={disp.id}
              className="tour-device-card bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 p-4 flex flex-col"
            >
              <h2 className="text-xl font-bold text-gray-800 dark:text:white">{disp.nombre}</h2>

              <div className="tour-device-id flex items-center justify-between mt-2 mb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ID: <span className="font-mono">{disp.id_dispositivo}</span>
                </p>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(disp.id_dispositivo);
                    setCopiadoId(disp.id);
                    setTimeout(() => setCopiadoId(null), 1500);
                  }}
                  title="Copiar ID"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition cursor-pointer"
                >
                  {copiadoId === disp.id ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>

              <p className="text-sm text-blue-600 font-semibold mb-1">{disp.tipo}</p>

              <p className="text-sm text-gray-600 dark:text-gray-300">{disp.descripcion}</p>

              <div className="text-xs text-gray-400 mt-2 flex flex-col gap-1">
                {/* Fila de Unidad */}
                {disp.unidad && (
                  <span>Unidad: <span className="font-medium text-gray-400 dark:text-gray-300">{disp.unidad}</span></span>
                )}

                {/* Fila de Rango */}
                {(disp.valorMinimo || disp.valorMaximo) && (
                  <span>Rango: <span className="font-medium text-gray-400 dark:text-gray-300">{disp.valorMinimo} - {disp.valorMaximo}</span></span>
                )}
              </div>

              <div className="text-sm mt-2 text-gray-700 dark:text-white mb-4">
                {ultimasMediciones[disp.id_dispositivo] ? (
                  <>
                    <p><strong>Última medición:</strong></p>
                    {Object.entries(ultimasMediciones[disp.id_dispositivo]?.datos || {}).map(([clave, valor]) => (
                      <p key={clave}>
                        {clave}: <span className="font-mono">{valor}</span>
                      </p>
                    ))}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(ultimasMediciones[disp.id_dispositivo].timestamp.toDate()).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p className="italic text-gray-400">Sin datos aún</p>
                )}
              </div>

              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => editarDispositivo(disp)}
                  className="tour-btn-edit flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-md text-sm font-semibold transition cursor-pointer"
                >
                  <FaEdit />
                  Editar
                </button>
                <button
                  onClick={() => eliminarDispositivo(disp.id)}
                  className="tour-btn-delete flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition cursor-pointer"
                >
                  <FaTrash />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {
        dispositivoEditando && (
          <ModalEditarDispositivo
            dispositivo={dispositivoEditando}
            onClose={() => setDispositivoEditando(null)}
            onGuardar={guardarEdicion}
          />
        )
      }

      <button
        onClick={() => {
          setStepIndex(0);
          setRunTutorial(true);
        }}
        className="fixed bottom-6 right-6 w-12 h-12 bg-white text-blue-600 rounded-full cursor-pointer shadow-lg border border-blue-100 flex items-center justify-center text-xl hover:bg-blue-50 hover:scale-110 transition-all duration-300 z-[60] group"
        title="Ver ayuda"
      >
        <FaQuestion />
      </button>

    </div>
  );
};