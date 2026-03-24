import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

export const TablaTiempoReal = forwardRef(({ config = {}, onNuevaPrediccion }, ref) => {

  const predColHeaderCls =
    "px-2 py-1 bg-blue-100/80 dark:bg-blue-900/40 text-black dark:text-blue-100 font-bold border-l-2 border-blue-300";
  const predColCellCls =
    "px-2 py-1 bg-blue-50/70 dark:bg-blue-900/30 text-black dark:text-blue-100 font-semibold border-l-2 border-blue-200";
  const predColFooterCls =
    "px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-black dark:text-blue-100 font-bold border-l-2 border-blue-300";

  const [filas, setFilas] = useState([]);
  const [valoresTiempoReal, setValoresTiempoReal] = useState({});
  const datosRef = useRef({});
  const [intervaloMs, setIntervaloMs] = useState(1000);
  const [totalesAcumulados, setTotalesAcumulados] = useState({
    prediccion: 0,
    potenciaWatts: 0,
    energiaKWh: 0,
    baterias: 0
  });
  const [cargando, setCargando] = useState(false);
  const primerDatoRef = useRef(false);

  const [inicioRecoleccion, setInicioRecoleccion] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const esConfigInvalida =
    !config || typeof config !== 'object' || !Array.isArray(config.columnas);

  const costoKWh = config.costoKWh ?? 0.10;

  useImperativeHandle(ref, () => ({
    limpiarDatosInternos: () => {
      setFilas([]);
      setTotalesAcumulados({
        prediccion: 0,
        potenciaWatts: 0,
        energiaKWh: 0,
        baterias: 0
      });
      primerDatoRef.current = false;

      if (config?.modoTiempoReal) {
        setInicioRecoleccion(new Date());
      } else {
        setInicioRecoleccion(null);
      }

      setUltimaActualizacion(null);
      setCargando(config?.modoTiempoReal ?? false);
    }
  }));

  useEffect(() => {
    if (config?.modoTiempoReal) {
      setInicioRecoleccion(new Date());
    }
  }, [config?.modoTiempoReal]);

  useEffect(() => {
    if (esConfigInvalida) return;

    const unsubscribers = [];

    config.columnas.forEach(({ campo, id_dispositivo }) => {
      if (!campo || !id_dispositivo) return;

      const q = query(
        collection(db, 'mediciones'),
        where('id_dispositivo', '==', id_dispositivo),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        snap.forEach((doc) => {
          const data = doc.data();
          const valor = data?.datos?.[campo] ?? null;

          datosRef.current[campo] = valor;

          setValoresTiempoReal((prev) => ({
            ...prev,
            [campo]: valor
          }));
        });
      });

      unsubscribers.push(unsubscribe);
    });

    const intervalo = setInterval(async () => {
      if (!config?.modoTiempoReal) return;

      const datosActuales = config.columnas.reduce((acc, col) => {
        if (!col.clave_modelo) return acc;
        acc[col.clave_modelo] = datosRef.current[col.campo] ?? null;
        return acc;
      }, {});

      const valores = Object.values(datosActuales);
      const todosNulos = valores.length > 0 ? valores.every(v => v === null) : true;
      const todosLlenos = valores.length > 0 ? valores.every(v => v !== null) : false;

      if (!todosNulos && !todosLlenos) return;
      if (todosNulos) return;

      datosActuales.hora = new Date().getHours();

      try {
        const response = await axios.post(config.prediccion?.endpoint, datosActuales);
        const prediccion = Number(response.data.potencia_predicha_mW ?? 0);
        const potenciaWatts = prediccion / 1000;
        const energiaKWh = (potenciaWatts * intervaloMs) / 3600000000;

        // 4000mAh * 3.7V = 14.8Wh = 0.0148kWh
        const CAPACIDAD_BATERIA_KWH = 0.0148;
        const baterias = energiaKWh / CAPACIDAD_BATERIA_KWH;

        const now = new Date();
        const timestampISO = now.toISOString();

        setUltimaActualizacion(now);

        const fila = {
          timestamp: now.toLocaleTimeString(),
          prediccion,
          potenciaWatts,
          energiaKWh,
          baterias,
        };

        config.columnas.forEach(col => {
          fila[col.campo] = datosRef.current[col.campo] ?? null;
        });

        setFilas(prev => {
          const nuevas = [fila, ...prev].slice(0, 30);
          if (!primerDatoRef.current && nuevas.length > 0) {
            primerDatoRef.current = true;
            setCargando(false);
          }
          return nuevas;
        });

        if (typeof onNuevaPrediccion === 'function') {
          onNuevaPrediccion(timestampISO, prediccion);
        }

        setTotalesAcumulados(prev => ({
          prediccion: prev.prediccion + (fila.prediccion ?? 0),
          potenciaWatts: prev.potenciaWatts + (fila.potenciaWatts ?? 0),
          energiaKWh: prev.energiaKWh + (fila.energiaKWh ?? 0),
          baterias: prev.baterias + (fila.baterias ?? 0)
        }));

      } catch (err) {
        console.error(err);
      }
    }, intervaloMs);

    return () => {
      unsubscribers.forEach(fn => fn && fn());
      clearInterval(intervalo);
    };
  }, [config.columnas, config.prediccion, config.modoTiempoReal, intervaloMs, costoKWh, onNuevaPrediccion, esConfigInvalida]);

  useEffect(() => {
    if (config?.modoTiempoReal) {
      setCargando(true);
      primerDatoRef.current = false;
    } else {
      setCargando(false);
    }
  }, [config?.modoTiempoReal]);

  const formatearFechaHora = (fecha) => {
    if (!fecha) return '--/--/-- --:--:--';
    return fecha.toLocaleString('es-ES', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-4 overflow-x-auto">
      {esConfigInvalida ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-red-600 text-center p-4 bg-red-100 rounded">
            Ingrese la configuración correspondiente para visualizar este componente.
          </div>
        </div>
      ) : (
        <>
          <div className="relative flex items-center mb-3 h-10">
            <div className="z-10 flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-200">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                Frecuencia de actualización:
              </span>
              <select
                id="frecuencia"
                className="bg-transparent border-none text-sm focus:ring-0 p-0 text-gray-700 cursor-pointer outline-none"
                value={intervaloMs}
                onChange={(e) => setIntervaloMs(parseInt(e.target.value))}
              >
                <option value={1000}>1s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={60000}>1m</option>
                <option value={300000}>5m</option>
                <option value={600000}>10m</option>
                <option value={900000}>15m</option>
                <option value={1800000}>30m</option>
                <option value={3600000}>1h</option>
              </select>
            </div>

            <h2 className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl font-bold text-gray-800 whitespace-nowrap">
              {config.titulo || 'Predicción Tiempo Real'}
            </h2>
          </div>

          <div className="relative max-h-[400px] overflow-y-auto">
            <table className="table-fixed min-w-full text-sm">
              <thead className="sticky top-0 bg-white z-20 shadow">
                <tr className="bg-gray-100 text-center">
                  <th className="px-2 py-1">Hora</th>

                  {config.columnas.map((col, idx) => (
                    <th key={idx} className="px-2 py-1">
                      {col.nombre} ({col.unidad})
                    </th>
                  ))}

                  <th className={predColHeaderCls}>Predicción Potencia (mW)</th>
                  <th>Potencia (W)</th>
                  <th>Energía (kWh)</th>
                  <th>Baterías (4000mAh)</th>
                </tr>
              </thead>

              <tbody>
                <tr className="bg-yellow-50 text-center font-semibold">
                  <td className="px-2 py-1"></td>



                </tr>

                {filas.map((fila, idx) => (
                  <tr key={idx} className="text-center">
                    <td className="px-2 py-1">{fila.timestamp}</td>

                    {config.columnas.map((col, j) => (
                      <td key={j} className="px-2 py-1">{fila[col.campo]}</td>
                    ))}

                    <td className={predColCellCls}>{fila.prediccion.toFixed(2)}</td>
                    <td className="px-2 py-1">{fila.potenciaWatts.toFixed(4)}</td>
                    <td className="px-2 py-1">{fila.energiaKWh.toFixed(8)}</td>
                    <td className="px-2 py-1 font-semibold text-green-600 dark:text-green-400">
                      {fila.baterias.toFixed(8)}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot className="sticky bottom-0 bg-white text-center shadow z-10 font-bold">
                <tr>
                  <td className="px-2 py-1 text-right" colSpan={config.columnas.length + 1}>
                    Total acumulado:
                  </td>

                  <td className={predColFooterCls}>
                    {totalesAcumulados.prediccion.toFixed(2)}
                  </td>
                  <td className="px-2 py-1">{totalesAcumulados.potenciaWatts.toFixed(4)}</td>
                  <td className="px-2 py-1">{totalesAcumulados.energiaKWh.toFixed(8)}</td>
                  <td className="px-2 py-1 font-bold text-green-700 dark:text-green-300">
                    {totalesAcumulados.baterias.toFixed(8)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {cargando && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
                <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-gray-700 font-medium text-sm">
                  Esperando predicción...
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-2 border-t border-gray-100 flex items-center justify-center text-xs text-gray-500 gap-2">
            <span className="font-semibold">Inicio Recolección:</span>
            <span>{formatearFechaHora(inicioRecoleccion)}</span>

            <span className="mx-2 text-gray-300">|</span>

            <span className="font-semibold">Última Actualización:</span>
            <span>{formatearFechaHora(ultimaActualizacion)}</span>
          </div>

        </>
      )}
    </div>
  );
});

TablaTiempoReal.displayName = "TablaTiempoReal";