import { useEffect, useState, useContext } from 'react';
import { UserContext } from '../providers/UserProvider';
import { collection, getDocs, deleteDoc, doc, Timestamp, setDoc, getDoc, query, where, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { nanoid } from 'nanoid';
import { AccesoRestringido } from '../componentes/AccesoRestringido';
import SHA256 from 'crypto-js/sha256';
import Swal from 'sweetalert2';
import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { FaQuestion } from 'react-icons/fa';

export const APIKeysPage = () => {
  const { user } = useContext(UserContext);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const hoy = new Date().toISOString().split('T')[0];
  const ahora = new Date().toTimeString().slice(0, 5);
  const [fechaExpiracion, setFechaExpiracion] = useState(hoy);
  const [horaExpiracion, setHoraExpiracion] = useState(ahora);

  const [runTutorial, setRunTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2">Gestión de API Keys</h3>
          <p>Aquí podrás generar credenciales para que la aplicación web reciba los datos de los sensores.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-api-date',
      content: 'Primero, define una fecha y hora de expiración para tu nueva clave por seguridad.',
    },
    {
      target: '.tour-api-generate',
      content: 'Haz clic aquí para crear la clave. Se te mostrará una sola vez, así que asegúrate de copiarla.',
    },
    {
      target: '.tour-api-list',
      content: 'Aquí verás la lista de tus claves activas y podrás eliminarlas si ya no las necesitas.',
    }
  ];

  const handleJoyrideCallback = (data) => {
    const { action, index, status, type } = data;

    if (action === ACTIONS.CLOSE) {
      setRunTutorial(false);
      setStepIndex(0);
      return;
    }

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTutorial(false);
      setStepIndex(0);

      if (user?.uid) {
        const docRef = doc(db, 'usuarios', user.uid);
        updateDoc(docRef, { tutorialApiKeysVisto: true }).catch(console.error);
      }
      return;
    }

    if (type === EVENTS.STEP_AFTER || action === ACTIONS.CLOSE) {
      if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      }
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    const verificarTutorial = async () => {
      try {
        const docRef = doc(db, 'usuarios', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          if (!docSnap.data().tutorialApiKeysVisto) {
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
    };
    verificarTutorial();
  }, [user?.uid]);

  const fetchApiKeys = async () => {
    if (!user) return;
    const q = query(
      collection(db, 'api_keys'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const keysList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setApiKeys(keysList);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchApiKeys();
    }
  }, [user]);

  const generarAPIKey = async () => {
    if (!fechaExpiracion || !horaExpiracion) {
      Swal.fire({
        icon: 'warning',
        title: 'Fecha y hora requeridas',
        text: 'Por favor selecciona una fecha y hora de expiración válidas.'
      });
      return;
    }

    const expiracion = new Date(`${fechaExpiracion}T${horaExpiracion}:00`);

    if (isNaN(expiracion)) {
      Swal.fire({
        icon: 'error',
        title: 'Fecha u hora inválida',
        text: 'Por favor verifica los valores e intenta nuevamente.'
      });
      return;
    }

    const nuevaKey = nanoid(32);
    const hashKey = SHA256(nuevaKey).toString();
    const ahoraDate = new Date();
    const docRef = doc(db, 'api_keys', hashKey);
    const existe = await getDoc(docRef);

    if (existe.exists()) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ya existe una API Key igual. Intenta nuevamente.'
      });
      return;
    }

    await setDoc(docRef, {
      uid: user.uid,
      createdAt: Timestamp.fromDate(ahoraDate),
      expiresAt: Timestamp.fromDate(expiracion)
    });

    Swal.fire({
      icon: 'success',
      title: 'API Key generada',
      html: `
        <div>
            <strong id="apikey">${nuevaKey}</strong>
            <br><br>
            <button id="copiar" class="swal2-confirm swal2-styled" style="background-color:#3085d6;">
                Copiar
            </button>
            <br><br>
            <small>(Guárdala bien, no podrás verla después)</small>
        </div>
    `,
      confirmButtonText: 'Entendido',
      didOpen: () => {
        const botonCopiar = Swal.getPopup().querySelector('#copiar');
        const texto = Swal.getPopup().querySelector('#apikey').textContent;
        botonCopiar.addEventListener('click', () => {
          navigator.clipboard.writeText(texto);
          botonCopiar.textContent = 'Copiado ✔️';
          setTimeout(() => {
            botonCopiar.textContent = 'Copiar';
          }, 1500);
        });
      }
    });

    fetchApiKeys();
  };

  const eliminarAPIKey = async (hashKey) => {
    const confirmacion = await Swal.fire({
      title: '¿Eliminar API Key?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    await deleteDoc(doc(db, 'api_keys', hashKey));

    Swal.fire({
      icon: 'success',
      title: 'API Key eliminada',
      timer: 1500,
      showConfirmButton: false
    });

    fetchApiKeys();
  };

  if (!user) {
    return <AccesoRestringido />;
  }

  if (loading) {
    return <p className="text-center mt-10">Cargando API Keys...</p>;
  }

  return (
    <>
      <div className="max-w-5xl mx-auto mt-8 mb-6 p-8 bg-white/90 dark:bg-black/80 backdrop-blur-lg shadow-2xl rounded-2xl border text-center border-gray-200 dark:border-gray-700 relative">

        <Joyride
          steps={steps}
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
            next: `Siguiente (${stepIndex + 1} de ${steps.length})`,
            skip: 'Omitir'
          }}
        />

        <h1 className="text-3xl font-extrabold mb-6 text-gray-900 dark:text-white">Mis API Keys</h1>

        <div className="tour-api-date mb-6">
          <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
            Selecciona la fecha y hora de expiración de la API Key:
          </label>
          <div className="flex flex-col sm:flex-row gap-4 items-start justify-center sm:items-center">
            <input
              type="date"
              value={fechaExpiracion}
              onChange={(e) => setFechaExpiracion(e.target.value)}
              className="p-3 rounded-lg border dark:bg-zinc-800 dark:text-white dark:border-gray-600 transition-transform"
              min={hoy}
            />
            <input
              type="time"
              value={horaExpiracion}
              onChange={(e) => setHoraExpiracion(e.target.value)}
              className="p-3 rounded-lg border dark:bg-zinc-800 dark:text-white dark:border-gray-600 transition-transform"
            />
          </div>
        </div>

        <button
          onClick={generarAPIKey}
          className="tour-api-generate bg-gradient-to-r cursor-pointer from-sky-500 to-indigo-600 text-white px-6 py-3 mb-8 rounded-lg hover:scale-105 text-center transition-transform"
        >
          Generar nueva API Key
        </button>

        <div className="tour-api-list">
          {apiKeys.length > 0 ? (
            <ul className="space-y-4">
              {apiKeys.map((key) => (
                <li key={key.id} className="flex flex-col bg-gray-50 dark:bg-zinc-900 p-4 rounded-xl border border-gray-300 dark:border-zinc-600 shadow-md break-words">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-semibold">
                    ID: {key.id}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Expira: {key.expiresAt?.toDate ? key.expiresAt.toDate().toLocaleString() : 'Sin fecha'}
                  </div>
                  <div className="flex gap-2 mt-3 justify-center">
                    <button
                      onClick={() => eliminarAPIKey(key.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-center cursor-pointer hover:bg-red-700 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-300">No tienes API Keys generadas aún.</p>
          )}
        </div>
      </div>

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
    </>
  );
};