import React, { useEffect, useState, useContext, useRef } from "react";
import { TablaTiempoReal } from "../componentes/TablaTiempoReal";
import { ModalEditarComponente } from "../componentes/ModalEditarComponente";
import { FaCog, FaPlay, FaPause, FaTrash, FaQuestion } from "react-icons/fa";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { UserContext } from "../providers/UserProvider";
import ReactECharts from "echarts-for-react";
import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { AccesoDenegado } from '../componentes/AccesoDenegado'; 

export const PrediccionTiempoReal = () => {
  const { user } = useContext(UserContext);
  const [config, setConfig] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cargando, setCargando] = useState(true);

  const [runTutorial, setRunTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const tablaRef = useRef(null);
  const [seriesDatos, setSeriesDatos] = useState([]);

  const steps = [
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2">Predicción en tiempo real</h3>
          <p>Aquí se verá como el modelo de IA predice la energía basándose en los datos en tiempo real.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-btn-pausa',
      content: 'Usa este botón para pausar o reanudar la recepción de datos en tiempo real.',
    },
    {
      target: '.tour-btn-limpiar',
      content: 'Si quieres reiniciar la gráfica y la tabla desde cero, usa este botón.',
    },
    {
      target: '.tour-btn-config',
      content: 'Aquí configuras que sensores alimentan al modelo.',
    },
    {
      target: '.tour-modal-titulo',
      content: 'Puedes cambiar el nombre que aparece arriba de la tabla.',
    },
    {
      target: '.tour-modal-columnas',
      content: 'Aquí defines las columnas,cada columna debe estar asociada a un sensor real.',
    },
    {
      target: '.tour-modal-variables',
      content: 'IMPORTANTE: Debes asignar que columna corresponde a cada variable que espera el modelo de Machine Learning.',
    },
    {
      target: '.tour-modal-guardar',
      content: 'Al terminar, guarda los cambios para aplicarlos.',
    },
    {
      target: '.tour-chart-container',
      content: 'Aquí verás la gráfica de la predicción de potencia generándose segundo a segundo.',
    },
    {
      target: '.tour-table-container',
      content: 'Y aquí tendrás el detalle numérico, el cálculo de energía y el ahorro estimado en dólares.',
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
        updateDoc(docRef, { tutorialPrediccionVisto: true }).catch(console.error);
      }
      return;
    }

    if (type === EVENTS.STEP_AFTER || action === ACTIONS.CLOSE) {
   
      if (index === 3 && action === ACTIONS.NEXT) {
        setMostrarModal(true);
        setTimeout(() => setStepIndex(4), 500); 
      }
      else if (index === 7 && action === ACTIONS.NEXT) {
        setMostrarModal(false);
        setTimeout(() => setStepIndex(8), 500); 
      }
      else if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      }
      else if (action === ACTIONS.PREV) {
        if (index === 8) {
           setMostrarModal(true);
           setTimeout(() => setStepIndex(7), 500);
        } 
        else if (index === 4) {
           setMostrarModal(false);
           setTimeout(() => setStepIndex(3), 500);
        } else {
           setStepIndex(index - 1);
        }
      }
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    const verificarTutorial = async () => {
      setCargando(true);
      const ref = doc(db, "usuarios", user.uid, "configuraciones", "prediccionTiempoReal");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setConfig(snap.data());
      } else {
        setConfig({ columnas: [], modoTiempoReal: true });
      }
      setCargando(false);

      const userRef = doc(db, "usuarios", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && !userSnap.data().tutorialPrediccionVisto) {
         setRunTutorial(true);
      }
    };
    verificarTutorial();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !config) return;
    const guardarConfig = async () => {
      const ref = doc(db, "usuarios", user.uid, "configuraciones", "prediccionTiempoReal");
      await setDoc(ref, config);
    };
    guardarConfig();
  }, [config, user?.uid]);

  const toggleTiempoReal = () => {
    setConfig((prev) => ({ ...prev, modoTiempoReal: !prev.modoTiempoReal }));
  };

  const handleNuevaPrediccion = (timestamp, prediccion) => {
    setSeriesDatos((prev) => [...prev, [timestamp, Number(prediccion)]]);
  };

  const handleLimpiarGlobal = () => {
    setSeriesDatos([]);
    if (tablaRef.current) {
        tablaRef.current.limpiarDatosInternos();
    }
  };

  if (!user) {
    return <AccesoDenegado />;
  }

  if (cargando || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-lg">Cargando configuración...</div>
      </div>
    );
  }

  const metricas = config.metricasModelo ?? {
    modelo: "Random Forest",
    mae: 6.0685,
    mse: 659.1507,
    r2: 0.9971,
    unidad: "mW",
  };
  const showMetricas = metricas && (metricas.modelo || metricas.mae != null);

  return (
    <div className="min-h-screen bg-white dark:bg-black p-4 flex flex-col items-center">
      
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

      <div className="relative w-full max-w-6xl">
        
        <div className="absolute top-0 right-0 z-10 flex items-center gap-2 m-2">
            
            <button
            onClick={toggleTiempoReal}
            className={`tour-btn-pausa px-3 py-1.5 rounded text-sm font-medium cursor-pointer flex items-center gap-2 shadow-sm transition-colors ${
                config.modoTiempoReal
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200"
                : "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200"
            }`}
            title={config.modoTiempoReal ? "Pausar actualización" : "Reanudar actualización"}
            >
            {config.modoTiempoReal ? <FaPause size={12}/> : <FaPlay size={12}/>}
            {config.modoTiempoReal ? "Pausar" : "Reanudar"}
            </button>

            <button
            onClick={handleLimpiarGlobal}
            className="tour-btn-limpiar px-3 py-1.5 bg-red-50 text-red-600 cursor-pointer hover:bg-red-100 border border-red-200 rounded text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
            title="Limpiar datos"
            >
            <FaTrash size={12} />
            Limpiar
            </button>

            <button
            onClick={() => setMostrarModal(true)}
            className="tour-btn-config p-2 text-gray-500 hover:text-gray-700 cursor-pointer hover:bg-gray-100 rounded-full transition-colors"
            title="Editar configuración"
            >
            <FaCog size={20} />
            </button>

        </div>

        <div className="tour-table-container">
            <TablaTiempoReal
            ref={tablaRef}
            config={config}
            onNuevaPrediccion={handleNuevaPrediccion}
            />
        </div>
      </div>

      <div className="tour-chart-container relative mt-8 w-full max-w-6xl shadow-lg bg-white p-4 rounded-lg">
        {showMetricas && (
          <div className="absolute top-2 right-2 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-gray-300 dark:border-zinc-700 rounded-lg px-4 py-2 shadow-md text-xs leading-tight max-w-[320px] pointer-events-none">
            <p className="font-bold text-gray-800 dark:text-gray-100 mb-1">
              Resultados de la evaluación del modelo de ML
            </p>
            <p className="text-gray-700 dark:text-gray-200">
              <span className="font-semibold">Modelo:</span> {metricas.modelo}
            </p>
            <p className="text-gray-700 dark:text-gray-200">
              <span className="font-semibold">MAE:</span> {metricas.mae} {metricas.unidad}
            </p>
            <p className="text-gray-700 dark:text-gray-200">
              <span className="font-semibold">R²:</span> {metricas.r2}
            </p>
          </div>
        )}

        <ReactECharts
          style={{ height: "320px" }}
          option={{
            title: { text: "Predicción de potencia (mW)", left: "center", top: 10, textStyle: { fontSize: 16 } },
            legend: { top: 40, data: ["Predicción"] },
            tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
            grid: { left: "70px", right: "30px", bottom: "50px", top: "120px" },
            xAxis: { type: "time", name: "Hora" },
            yAxis: { type: "value", name: "mW" },
            series: [{ name: "Predicción", type: "line", data: seriesDatos, smooth: true, showSymbol: false }]
          }}
        />
      </div>

      {mostrarModal && (
        <ModalEditarComponente
          componente={{ tipo: "tabla-ml-tiempo-real", config }}
          onClose={() => setMostrarModal(false)}
          onGuardar={(nuevaConfig) => {
            setConfig(nuevaConfig);
            setMostrarModal(false);
          }}
        />
      )}

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