import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import Swal from 'sweetalert2';
import { FaPlus, FaDownload, FaTrashAlt, FaPlay, FaQuestion } from 'react-icons/fa';
import Joyride, { STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserContext } from '../providers/UserProvider';

const generarNombreCSV = (tituloPorDefecto = 'resultados_prediccion') => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');

  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());

  const base = tituloPorDefecto
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  return `${base}_${yyyy}-${mm}-${dd}_${hh}-${min}.csv`;
};

const nombresVariables = [
  'dia', 'hora', 'minuto',
  'lux', 'temperatura', 'humedad', 'nubosidad'
];

const etiquetasVariables = {
  dia: 'Día',
  hora: 'Hora',
  minuto: 'Minuto',
  lux: 'Lux',
  temperatura: 'Temperatura',
  humedad: 'Humedad',
  nubosidad: 'Nubosidad',
};

const rangosVariables = {
  dia: '(1–31)',
  hora: '(6–18)',
  minuto: '(0–59)',
  lux: '(0–65535)',
  temperatura: '(0–50) °C',
  humedad: '(0–100) %',
  nubosidad: '(0–100) %',
};

export const HerramientaML = ({ ancho = 500, alto = 300, config = {}, onResultados }) => {
  const { user } = useContext(UserContext);

  const baseUrl = '/ml';
  const crearFilaVacia = () =>
    Object.fromEntries(nombresVariables.map(v => [v, '']));

  const [filas, setFilas] = useState([crearFilaVacia()]);
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensajeDeduplicacion, setMensajeDeduplicacion] = useState('');

  const [runTutorial, setRunTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const colPredCls =
    "bg-sky-50 dark:bg-sky-900/30 text-black dark:text-sky-100 font-bold ring-1 ring-sky-200/70 dark:ring-sky-700/40 border-l-2 border-r-2 border-sky-200 dark:border-sky-700";

  const steps = [
    {
      target: 'body',
      content: (
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2">Herramienta de predicción manual</h3>
          <p>Aquí puedes ingresar datos climáticos manualmente para obtener predicciones de energía.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-table-main',
      content: 'En esta tabla ingresas las variables (Día, Hora, Lux, etc.). Asegúrate de respetar los rangos indicados en cada columna.',
    },
    {
      target: '.tour-btn-add',
      content: 'Usa este botón para agregar más filas y realizar múltiples predicciones a la vez.',
    },
    {
      target: '.tour-btn-predict',
      content: 'Cuando tengas los datos listos, haz clic aquí para procesarlos con el modelo de Machine Learning.',
    },
    {
      target: '.tour-results-area',
      content: 'Aquí aparecerán los resultados numéricos: Potencia estimada, Energía y Ahorro económico.',
    },
    {
      target: '.tour-chart-static',
      content: 'Además, aquí abajo se generará automáticamente un gráfico visualizando los resultados de la predicción.',
    },
    {
      target: '.tour-btn-export',
      content: 'Puedes descargar todos los resultados generados en un archivo CSV.',
    },
    {
      target: '.tour-btn-clean',
      content: 'Si quieres borrar todo y empezar de cero, usa este botón.',
    },
    {
      target: '.tour-btn-delete-row',
      content: 'También puedes eliminar filas individuales si cometiste un error.',
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
        updateDoc(docRef, { tutorialHerramientaMLVisto: true }).catch(console.error);
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
          if (!docSnap.data().tutorialHerramientaMLVisto) {
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

  const agregarFila = () => setFilas([...filas, crearFilaVacia()]);

  const limpiarDuplicadosDiaHoraMinuto = (filasOriginales, resultadosOriginales) => {
    const seen = new Set();
    const indicesAConservar = [];

    filasOriginales.forEach((fila, idx) => {
      const { dia, hora, minuto } = fila;

      if (
        dia === '' || dia == null ||
        hora === '' || hora == null ||
        minuto === '' || minuto == null
      ) {
        indicesAConservar.push(idx);
        return;
      }

      const key = `${dia}-${hora}-${minuto}`;
      if (!seen.has(key)) {
        seen.add(key);
        indicesAConservar.push(idx);
      }
    });

    const nuevasFilas = indicesAConservar.map(i => filasOriginales[i]);
    const nuevosResultados = indicesAConservar.map(i => resultadosOriginales[i]).filter(r => r !== undefined);

    const huboCambios = nuevasFilas.length !== filasOriginales.length;
    return { nuevasFilas, nuevosResultados, huboCambios };
  };

  const mostrarMensajeDeduplicacion = () => {
    setMensajeDeduplicacion('Eliminando datos con día, hora y minutos duplicados...');
    setTimeout(() => {
      setMensajeDeduplicacion('');
    }, 2500);
  };

  const actualizarValor = (idx, campo, valor) => {
    const nuevas = [...filas];
    let v = parseFloat(valor);

    if (isNaN(v)) {
      v = '';
    } else {
      if (campo === 'dia') {
        if (v < 1) v = 1;
        if (v > 31) v = 31;
      } else if (campo === 'hora') {
        if (v < 6) v = 6;
        if (v > 18) v = 18;
      } else if (campo === 'minuto') {
        if (v < 0) v = 0;
        if (v > 59) v = 59;
      } else if (campo === 'lux') {
        if (v < 0) v = 0;
        if (v > 65535) v = 65535;
      } else if (campo === 'temperatura') {
        if (v < 0) v = 0;
        if (v > 50) v = 50;
      } else if (campo === 'humedad' || campo === 'nubosidad') {
        if (v < 0) v = 0;
        if (v > 100) v = 100;
      }
    }

    nuevas[idx][campo] = v;

    let filasActualizadas = nuevas;
    let resultadosActualizados = resultados;

    if (campo === 'dia' || campo === 'hora' || campo === 'minuto') {
      const { nuevasFilas, nuevosResultados, huboCambios } =
        limpiarDuplicadosDiaHoraMinuto(nuevas, resultados);

      filasActualizadas = nuevasFilas;
      resultadosActualizados = nuevosResultados;

      if (huboCambios) {
        mostrarMensajeDeduplicacion();
      }
    }

    setFilas(filasActualizadas);
    setResultados(resultadosActualizados);
  };

  const eliminarFila = (idx) => {
    const nuevas = filas.filter((_, i) => i !== idx);
    setFilas(nuevas);
    setResultados(prev => prev.filter((_, i) => i !== idx));
  };

  const limpiarTodo = () => {
    setFilas([crearFilaVacia()]);
    setResultados([]);
    if (onResultados) onResultados([], []);
  };

  const predecir = async () => {
    const datos = filas.map(f => nombresVariables.map(v => parseFloat(f[v])));
    if (datos.some(arr => arr.some(v => isNaN(v)))) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Llena todos los campos válidos.',
      });
      return;
    }

    try {
      setCargando(true);
      let response;

      if (filas.length === 1) {
        const f0 = filas[0];
        const body = {
          hora: parseFloat(f0.hora),
          lux: parseFloat(f0.lux),
          temperatura: parseFloat(f0.temperatura),
          humedad: parseFloat(f0.humedad),
          nubosidad: parseFloat(f0.nubosidad)
        };

        response = await axios.post(
          `${baseUrl}/predecir`,
          body
        );

        const potencia = response.data.potencia_predicha_mW;
        const areaModelo = 0.137 * 0.085;
        const eficienciaModelo = 15;
        const anchoPanel = config.ancho ?? 137;
        const altoPanel = config.alto ?? 85;
        const eficiencia = config.eficiencia ?? 15;
        const costoKWh = config.costoKWh ?? 0.10;
        const areaPanel = (anchoPanel / 1000) * (altoPanel / 1000);
        const escala = (areaPanel / areaModelo) * (eficiencia / eficienciaModelo);
        const potenciaAjustada_mW = potencia * escala;
        const potenciaWatts = potenciaAjustada_mW / 1000;
        const energia_kWh = potenciaWatts / 60000;
        const CAPACIDAD_BATERIA_KWH = 0.0148;
        const baterias = energia_kWh / CAPACIDAD_BATERIA_KWH;

        const resultado = [{
          hora: f0.hora,
          minuto: f0.minuto,
          potencia,
          potenciaWatts,
          energia: energia_kWh,
          baterias,
        }];

        setResultados(resultado);
        if (onResultados) onResultados(resultado, filas);

      } else {
        const payload = filas.map(f => ({
          hora: parseFloat(f.hora),
          lux: parseFloat(f.lux),
          temperatura: parseFloat(f.temperatura),
          humedad: parseFloat(f.humedad),
          nubosidad: parseFloat(f.nubosidad)
        }));

        response = await axios.post(
          `${baseUrl}/predecir-multiple`,
          { datos: payload }
        );

        const predicciones = response.data.predicciones;
        const areaModelo = 0.137 * 0.085;
        const eficienciaModelo = 15;
        const anchoPanel = config.ancho ?? 137;
        const altoPanel = config.alto ?? 85;
        const eficiencia = config.eficiencia ?? 15;
        const costoKWh = config.costoKWh ?? 0.10;
        const areaPanel = (anchoPanel / 1000) * (altoPanel / 1000);
        const escala = (areaPanel / areaModelo) * (eficiencia / eficienciaModelo);

        const nuevosResultados = predicciones.map((potencia, idx) => {
          const fila = filas[idx];

          const potenciaAjustada_mW = potencia * escala;
          const potenciaWatts = potenciaAjustada_mW / 1000;
          const energia_kWh = potenciaWatts / 60000;
          const CAPACIDAD_BATERIA_KWH = 0.0148;
          const baterias = energia_kWh / CAPACIDAD_BATERIA_KWH;

          return {
            hora: fila.hora,
            minuto: fila.minuto,
            potencia,
            potenciaWatts,
            energia: energia_kWh,
            baterias,
          };
        });

        setResultados(nuevosResultados);
        if (onResultados) onResultados(nuevosResultados, filas);
      }

    } catch (err) {
      console.error('Error en la predicción:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error de predicción',
        text: 'No se pudo conectar al modelo.',
      });
    } finally {
      setCargando(false);
    }
  };

  const exportarCSV = () => {
    if (filas.length === 0 || resultados.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos insuficientes',
        text: 'No hay datos para exportar.',
      });
      return;
    }

    const datosExportar = filas.map((fila, idx) => ({
      dia: fila.dia,
      hora: fila.hora,
      minuto: fila.minuto,
      lux: fila.lux,
      temperatura: fila.temperatura,
      humedad: fila.humedad,
      nubosidad: fila.nubosidad,
      potencia_predicha_mW: resultados[idx]?.potencia ?? '',
      potencia_W: resultados[idx]?.potenciaWatts ?? '',
      energia_kWh: resultados[idx]?.energia ?? '',
      baterias_4000mAh: resultados[idx]?.baterias ?? '',
    }));

    const csv = Papa.unparse(datosExportar);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;

    const nombreArchivo = generarNombreCSV(config.titulo || 'resultados_prediccion');
    link.setAttribute('download', nombreArchivo);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="bg-white rounded-2xl p-4 shadow-2xl overflow-hidden flex flex-col"
      style={{ width: ancho, height: alto }}
    >
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

      <h2 className="text-2xl font-semibold text-center mb-4 text-zinc-800">
        {config.titulo || 'Herramienta de Predicción'}
      </h2>

      {mensajeDeduplicacion && (
        <div className="mb-2 ml-2 mr-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-1 self-start shadow-sm">
          {mensajeDeduplicacion}
        </div>
      )}

      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex gap-2">
          <button
            onClick={agregarFila}
            className="tour-btn-add flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg shadow text-sm"
          >
            <FaPlus className="text-base" />
            <span>Agregar fila</span>
          </button>

          <button
            onClick={exportarCSV}
            className="tour-btn-export flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg shadow text-sm"
          >
            <FaDownload className="text-base" />
            <span>Exportar CSV</span>
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={limpiarTodo}
            className="tour-btn-clean flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow text-sm"
          >
            <FaTrashAlt className="text-base" />
            <span>Limpiar</span>
          </button>

          <button
            onClick={predecir}
            disabled={cargando}
            className={`tour-btn-predict flex items-center gap-2 px-4 py-2 rounded-lg shadow text-white text-sm ${cargando ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              }`}
          >
            {cargando ? (
              <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FaPlay className="text-base" />
            )}
            {cargando ? 'Prediciendo…' : 'Predecir'}
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          className={`tour-table-main flex-grow overflow-y-auto px-2 max-h-[400px] transition-all duration-300 ${cargando ? "blur-sm opacity-60 pointer-events-none" : ""
            }`}
        >
          <table className="table-auto w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white shadow">
              <tr className="bg-gray-100 text-gray-700">
                {nombresVariables.map((nombre) => (
                  <th key={nombre} className="tour-inputs-area px-2 py-1">
                    <div className="flex flex-col">
                      <span>{etiquetasVariables[nombre] ?? nombre}</span>
                      {rangosVariables[nombre] && (
                        <span className="text-[0.65rem] text-gray-500">
                          {rangosVariables[nombre]}
                        </span>
                      )}
                    </div>
                  </th>
                ))}

                <th className={`tour-results-area px-2 py-1 ${colPredCls}`}>
                  <div className="flex flex-col">
                    <span>Predicción Potencia Producida (mW)</span>
                  </div>
                </th>

                <th className="tour-results-area px-2 py-1">
                  <div className="flex flex-col">
                    <span>Potencia (W)</span>
                  </div>
                </th>

                <th className="tour-results-area px-2 py-1">
                  <div className="flex flex-col">
                    <span>Energía (kWh)</span>
                  </div>
                </th>

                <th className="tour-results-area px-2 py-1">
                  <div className="flex flex-col">
                    <span>Baterías (4000mAh)</span>
                  </div>
                </th>

                <th className="px-2 py-1">🗑️</th>
              </tr>
            </thead>

            <tbody>
              {filas.map((fila, filaIdx) => (
                <tr key={filaIdx} className="text-center">
                  {nombresVariables.map((campo) => (
                    <td key={campo} className="border px-1 py-1">
                      <input
                        type="number"
                        value={fila[campo]}
                        onChange={(e) => actualizarValor(filaIdx, campo, e.target.value)}
                        className="w-full bg-white rounded px-1 py-0.5 border border-gray-300 text-sm"
                      />
                    </td>
                  ))}

                  <td className={`border px-2 py-1 font-semibold ${colPredCls}`}>
                    {resultados[filaIdx]?.potencia !== undefined
                      ? resultados[filaIdx].potencia.toFixed(2)
                      : '—'}
                  </td>

                  <td className="border px-2 py-1">
                    {resultados[filaIdx]?.potenciaWatts !== undefined
                      ? resultados[filaIdx].potenciaWatts.toFixed(4)
                      : '—'}
                  </td>

                  <td className="border px-2 py-1">
                    {resultados[filaIdx]?.energia !== undefined
                      ? resultados[filaIdx].energia.toFixed(4)
                      : '—'}
                  </td>
                  <td className="border px-2 py-1">
                    {resultados[filaIdx]?.baterias !== undefined
                      ? resultados[filaIdx].baterias.toFixed(6)
                      : '—'}
                  </td>

                  <td className="border px-1 py-1">
                    <button
                      onClick={() => eliminarFila(filaIdx)}
                      className="tour-btn-delete-row text-red-500 hover:text-red-700 font-bold text-lg"
                      title="Eliminar esta fila"
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot className="sticky bottom-0 z-10 bg-gray-100 shadow font-semibold text-center">
              <tr>
                <td colSpan={nombresVariables.length}>Totales</td>

                <td className={colPredCls}>
                  {(() => {
                    const sum = resultados.reduce((acc, r) => acc + (r?.potencia ?? 0), 0);
                    return Number.isFinite(sum) ? sum.toFixed(2) : '0.00';
                  })()}
                </td>

                <td>
                  {(() => {
                    const sum = resultados.reduce((acc, r) => acc + (r?.potenciaWatts ?? 0), 0);
                    return Number.isFinite(sum) ? sum.toFixed(4) : '0.0000';
                  })()}
                </td>

                <td>
                  {(() => {
                    const sum = resultados.reduce((acc, r) => acc + (r?.energia ?? 0), 0);
                    return Number.isFinite(sum) ? sum.toFixed(4) : '0.0000';
                  })()}
                </td>

                <td>
                  {(() => {
                    const sum = resultados.reduce((acc, r) => acc + (r?.baterias ?? 0), 0);
                    return Number.isFinite(sum) ? sum.toFixed(6) : '0.000000';
                  })()}
                </td>

                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {cargando && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white/90 dark:bg-black/80 px-6 py-4 rounded-xl shadow-xl flex flex-col items-center gap-3 border border-gray-300 dark:border-gray-700">
              <div className="h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-800 dark:text-gray-200 font-semibold text-lg">
                Cargando…
              </span>
            </div>
          </div>
        )}
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
    </div>
  );
};