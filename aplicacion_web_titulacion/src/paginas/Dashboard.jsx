import { ModalAgregarDispositivo } from '../componentes/ModalAgregarDispositivo';
import { ModalEditarDispositivo } from '../componentes/ModalEditarDispositivo';
import { onSnapshot, query, orderBy, limit, where, collection, getDocs, addDoc, setDoc, deleteDoc, doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { useEffect, useState, useContext } from 'react';
import { FaTrash, FaEdit, FaCopy, FaQuestion } from 'react-icons/fa';
import { nanoid } from 'nanoid';
import { SidebarDashboard } from '../componentes/SidebarDashboard';
import { UserContext } from '../providers/UserProvider';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { AccesoDenegado } from '../componentes/AccesoDenegado';


export const Dashboard = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [mostrarModalDispositivos, setMostrarModalDispositivos] = useState(false);
  const [nuevoDispositivo, setNuevoDispositivo] = useState({ nombre: '', descripcion: '', tipo: 'Sensor', imagen: '', valorMinimo: '', valorMaximo: '', unidad: '' });
  const [dispositivos, setDispositivos] = useState([]);
  const [ultimasMediciones, setUltimasMediciones] = useState({});
  const [dispositivoEditando, setDispositivoEditando] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableros, setTableros] = useState([]);
  const [menuVisible, setMenuVisible] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);
  const [redirigiendo, setRedirigiendo] = useState(false);

  const [runTutorial, setRunTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2">Gestión de tableros</h3>
          <p>En esta sección se hará un recorrido rápido para aprender a gestionar los tableros.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-agregar-dispositivo',
      content: 'Aquí podrás registrar tus sensores para empezar a recibir datos.',
    },
    {
      target: '.tour-crear-tablero',
      content: 'Crea tableros personalizados para visualizar tus gráficas y controles en tiempo real.',
    },
    {
      target: '.tour-mis-tableros',
      content: 'Aparecerán todos tus tableros creados. Haz clic en uno para poder entrar.',
    },
    {
      target: '.tour-mis-dispositivos',
      content: 'Aquí verás la lista de tus sensores registrados y su estado actual.',
    }
  ];

  useEffect(() => {
    const verificarTutorial = async () => {
      if (user?.uid) {
        try {
          const docRef = doc(db, 'usuarios', user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            if (!docSnap.data().tutorialDashboardVisto) {
              setStepIndex(0);
              setRunTutorial(true);
            }
          } else {
            setStepIndex(0);
            setRunTutorial(true);
          }
        } catch (error) {
          console.error("Error verificando tutorial:", error);
        }
      }
    };
    verificarTutorial();
  }, [user]);

  const handleJoyrideCallback = async (data) => {
    const { status, index, type, action } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTutorial(false);
      setStepIndex(0);

      if (user?.uid) {
        try {
          const docRef = doc(db, 'usuarios', user.uid);
          await setDoc(docRef, { tutorialDashboardVisto: true }, { merge: true });
        } catch (error) {
          console.error("Error guardando estado tutorial:", error);
        }
      }
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(nextIndex);
    }
  };

  useEffect(() => {
    if (user) {
      cargarDispositivos();
      cargarTableros();
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

  const cargarTableros = async () => {
    const ref = collection(db, 'tableros', user.uid, 'misTableros');
    const q = query(ref, orderBy('creado', 'desc'));
    const snapshot = await getDocs(q);
    const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTableros(datos);
  };

  const crearTablero = async () => {
    const nombre = await Swal.fire({
      title: 'Crear nuevo tablero',
      input: 'text',
      inputLabel: 'Nombre del tablero',
      inputPlaceholder: 'Ej. Panel Solar Principal',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return 'El nombre no puede estar vacío.';
        return null;
      }
    });

    if (!nombre.isConfirmed) return;
    const nombreTablero = nombre.value.trim();

    const existe = tableros.some(tab => tab.nombre.toLowerCase() === nombreTablero.toLowerCase());
    if (existe) {
      Swal.fire({ icon: 'error', title: 'Nombre duplicado', text: 'Ya tienes un tablero con ese nombre.' });
      return;
    }

    const idTablero = nanoid(10);
    const ref = doc(db, 'tableros', user.uid, 'misTableros', idTablero);

    await setDoc(ref, {
      nombre: nombreTablero,
      creado: Timestamp.now()
    });

    await Swal.fire({
      icon: 'success',
      title: 'Tablero creado',
      text: `Se ha creado el tablero "${nombreTablero}" correctamente.`,
      timer: 1000,
      showConfirmButton: false
    });

    setRedirigiendo(true);
    setTimeout(() => {
      navigate(`/tablero/${idTablero}`);
    }, 2000);
  };

  const editarTablero = async (id, nombreActual) => {
    const nuevoNombre = prompt("Nuevo nombre para el tablero:", nombreActual);
    if (!nuevoNombre || nuevoNombre.trim() === '' || nuevoNombre === nombreActual) return;
    const ref = doc(db, 'tableros', user.uid, 'misTableros', id);
    await updateDoc(ref, { nombre: nuevoNombre.trim() });
    cargarTableros();
  };

  const eliminarTablero = async (id) => {
    const confirmar = await Swal.fire({
      title: '¿Eliminar este tablero?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmar.isConfirmed) return;
    const ref = doc(db, 'tableros', user.uid, 'misTableros', id);
    await deleteDoc(ref);
    cargarTableros();
  };

  const abrirTablero = (idTablero) => {
    setRedirigiendo(true);
    setTimeout(() => {
      navigate(`/tablero/${idTablero}`);
    }, 1500);
  };

  useEffect(() => {
    if (!user || dispositivos.length === 0) return;
    const unsubscribes = dispositivos.map((disp) => {
      const q = query(
        collection(db, 'mediciones'),
        where('id_dispositivo', '==', disp.id_dispositivo),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setUltimasMediciones(prev => ({ ...prev, [disp.id_dispositivo]: data }));
        }
      });
    });
    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, dispositivos]);

  const manejarCambioDispositivo = (e) => {
    setNuevoDispositivo({ ...nuevoDispositivo, [e.target.name]: e.target.value });
  };

  const crearDispositivoDesdeDashboard = async () => {
    try {
      if (!nuevoDispositivo.nombre || !nuevoDispositivo.tipo) {
        Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Debes completar nombre y tipo.' });
        return;
      }
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
      setNuevoDispositivo({ nombre: '', descripcion: '', tipo: 'Sensor', imagen: '', valorMinimo: '', valorMaximo: '', unidad: '' });
      setMostrarModalDispositivos(false);
      cargarDispositivos();
    } catch (error) {
      console.error("Error:", error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo crear el dispositivo.' });
    }
  };

  const eliminarDispositivo = async (id) => {
    const confirmar = await Swal.fire({
      title: '¿Eliminar este sensor?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar'
    });
    if (!confirmar.isConfirmed) return;
    await deleteDoc(doc(db, 'usuarios', user.uid, 'dispositivos', id));
    cargarDispositivos();
  };

  const editarDispositivo = (disp) => setDispositivoEditando(disp);

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
    <div className="pl-60 pr-8 pt-6">
      <SidebarDashboard />

      <Joyride
        steps={steps}
        run={runTutorial}
        stepIndex={stepIndex}
        continuous={true}
        showSkipButton={true}
        showProgress={false}
        callback={handleJoyrideCallback}

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
          next: `Siguiente (${stepIndex + 1} de ${steps.length})`,
          skip: 'Omitir tutorial'
        }}
      />

      <div className="flex flex-col gap-3 mb-6 items-end">
        <button
          onClick={() => setMostrarModalDispositivos(true)}

          className="cursor-pointer tour-agregar-dispositivo px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition"
        >
          + Agregar sensor
        </button>

        <button
          onClick={crearTablero}
          className="cursor-pointer tour-crear-tablero px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition"
        >
          + Crear nuevo tablero
        </button>
      </div>

      {mostrarModalDispositivos && (
        <ModalAgregarDispositivo
          nuevoDispositivo={nuevoDispositivo}
          manejarCambio={manejarCambioDispositivo}
          crearDispositivo={crearDispositivoDesdeDashboard}
          onClose={() => setMostrarModalDispositivos(false)}
        />
      )}

      <div className="w-full max-w-7xl mx-auto mb-10">

        <h2 className="tour-mis-tableros text-xl font-bold text-gray-800 dark:text-white mb-4">Mis Tableros</h2>

        {tableros.length === 0 ? (
          <div className="bg-gray-50 dark:bg-zinc-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 italic">Aún no existen tableros registrados.</p>
          </div>
        ) : (
          tableros.map((tablero) => (
            <div
              key={tablero.id}
              className="mb-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 px-6 py-4 rounded-xl shadow hover:shadow-lg transition relative"
            >
              <div
                onClick={() => abrirTablero(tablero.id)}
                className="cursor-pointer mb-1 bg-white dark:bg-zinc-900 px-6 py-4 transition relative"
              >
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{tablero.nombre}</h2>
              </div>
              <div className="absolute top-4 right-4  flex gap-2">
                <button onClick={() => editarTablero(tablero.id, tablero.nombre)} className="text-yellow-500 hover:text-yellow-600 cursor-pointer">
                  <FaEdit />
                </button>
                <button onClick={() => eliminarTablero(tablero.id)} className="text-red-600 hover:text-red-700 cursor-pointer">
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="w-full max-w-7xl mx-auto mt-10 pb-20">
        <h2 className="tour-mis-dispositivos text-xl font-bold text-sky-600 mb-4">
          Mis Sensores
        </h2>

        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-300 py-10 animate-pulse">
            Cargando sensores...
          </div>
        ) : dispositivos.length === 0 ? (
          <div className="bg-gray-50 dark:bg-zinc-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 italic">Aún no tienes sensores registrados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {dispositivos.map((disp) => (
              <div
                key={disp.id}
                className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 flex flex-col"
              >
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {disp.nombre}
                </h3>
                <p className="text-sm text-blue-600 font-semibold">{disp.tipo}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{disp.descripcion}</p>

                <div className="text-xs text-gray-400 mt-2 flex flex-col gap-1">
                  {disp.unidad && (
                    <span>Unidad: <span className="font-medium text-gray-400 dark:text-gray-300">{disp.unidad}</span></span>
                  )}
                  {(disp.valorMinimo || disp.valorMaximo) && (
                    <span>Rango: <span className="font-medium text-gray-400 dark:text-gray-300">{disp.valorMinimo} - {disp.valorMaximo}</span></span>
                  )}
                </div>

                <div className="text-xs text-gray-500 mt-2 mb-1">
                  ID: <span className="font-mono">{disp.id_dispositivo}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(disp.id_dispositivo);
                      setCopiadoId(disp.id);
                      setTimeout(() => setCopiadoId(null), 1500);
                    }}
                    className="ml-2 text-blue-500 hover:text-blue-700"
                  >
                    <FaCopy className="inline-block" /> {copiadoId === disp.id ? 'Copiado' : 'Copiar'}
                  </button>
                </div>

                <div className="text-sm mt-2 text-gray-700 dark:text-white mb-4">
                  {ultimasMediciones[disp.id_dispositivo] ? (
                    <>
                      <p><strong>Última medición:</strong></p>
                      {Object.entries(ultimasMediciones[disp.id_dispositivo].datos).map(([clave, valor]) => (
                        <p key={clave}>{clave}: <span className="font-mono">{valor}</span></p>
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
                    className="flex-1 flex items-center cursor-pointer justify-center gap-2 px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-md text-sm font-semibold transition"
                  >
                    <FaEdit /> Editar
                  </button>
                  <button
                    onClick={() => eliminarDispositivo(disp.id)}
                    className="flex-1 flex items-center cursor-pointer justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition"
                  >
                    <FaTrash /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {dispositivoEditando && (
          <ModalEditarDispositivo
            dispositivo={dispositivoEditando}
            onClose={() => setDispositivoEditando(null)}
            onGuardar={guardarEdicion}
          />
        )}
      </div>

      {redirigiendo && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-900/80 backdrop-blur-sm transition-all duration-300">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-zinc-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-white text-xl font-medium mt-6 animate-pulse tracking-wide">
            Preparando tu tablero...
          </h2>
          <p className="text-zinc-400 text-sm mt-2">
            Serás redirigido en un momento
          </p>
        </div>
      )}

      <button
        onClick={() => {
          setStepIndex(0);
          setRunTutorial(true);
        }}
        className="fixed bottom-6 right-6 w-12 h-12 bg-white text-blue-600 rounded-full cursor-pointer shadow-lg border border-blue-100 flex items-center justify-center text-xl hover:bg-blue-50 hover:scale-110 transition-all duration-300 z-40 group"
        title="Ver tutorial de ayuda"
      >
        <FaQuestion />

        <span className="absolute right-14 bg-gray-800 text-white text-xs px-2 py-1 cursor-pointer rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Ayuda
        </span>
      </button>
    </div>
  );
};