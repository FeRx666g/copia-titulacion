import { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { UserContext } from '../providers/UserProvider';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FaAlignLeft, FaAlignCenter, FaAlignRight } from 'react-icons/fa';

export const ModalEditarComponente = ({ componente, onClose, onGuardar }) => {

  const baseUrl = '/ml';
  const { user } = useContext(UserContext);
  const location = useLocation();
  const esPrediccionTiempoRealPage = location.pathname === '/predicciontiemporeal';

  const MAX_CARACTERES = 25;

  const [titulo, setTitulo] = useState('');
  const [idDispositivo, setIdDispositivo] = useState('');
  const [campo, setCampo] = useState('');
  const [minY, setMinY] = useState('');
  const [maxY, setMaxY] = useState('');
  const [color, setColor] = useState('#5470C6');
  const [dispositivos, setDispositivos] = useState([]);
  const [camposPorDispositivo, setCamposPorDispositivo] = useState({});
  const [fuentes, setFuentes] = useState([]);
  const [descripcionX, setDescripcionX] = useState('');
  const [descripcionY, setDescripcionY] = useState('');
  const [cantidadMaxima, setCantidadMaxima] = useState(20);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [errorCampo, setErrorCampo] = useState('');

  const esMultiple = ['grafico-area-stack', 'grafico-linea-multiple'].includes(componente?.tipo);
  const esForma = componente?.tipo?.startsWith('forma');

  const [configTexto, setConfigTexto] = useState({
    contenido: '',
    color: '#000000',
    fontSize: 16,
    fontFamily: 'Arial',
    negrita: false,
    cursiva: false,
    subrayado: false,
    alineacion: 'left'
  });

  const [config, setConfig] = useState({});

  const [configLocal, setConfigLocal] = useState({
    ...(componente.config || {}),
    columnas: componente.config?.columnas || []
  });

  const [costoKWh, setCostoKWh] = useState(componente?.config?.costoKWh ?? 0.10);

  const CLAVES_ML = ['temperatura', 'humedad', 'lux', 'nubosidad'];

  useEffect(() => {
    if (componente?.config?.titulo) setTitulo(componente.config.titulo);
    if (componente?.config?.id_dispositivo) setIdDispositivo(componente.config.id_dispositivo);
    if (componente?.config?.campo) setCampo(componente.config.campo);
    if (componente?.config?.minY !== undefined) setMinY(componente.config.minY);
    if (componente?.config?.maxY !== undefined) setMaxY(componente.config.maxY);
    if (componente?.config?.color) setColor(componente.config.color);
    if (componente?.config?.fuentes) setFuentes(componente.config.fuentes);
    if (componente?.config?.descripcionX) setDescripcionX(componente.config.descripcionX);
    if (componente?.config?.descripcionY) setDescripcionY(componente.config.descripcionY);
    if (componente?.config?.cantidadMaxima) setCantidadMaxima(componente.config.cantidadMaxima);
    if (componente?.config?.fechaInicio) setFechaInicio(componente.config.fechaInicio);
    if (componente?.config?.fechaFin) setFechaFin(componente.config.fechaFin);

    if (componente?.tipo === 'texto') {
      setConfigTexto(prev => ({ ...prev, ...componente.config }));
    }
    if (esForma) {
      setConfig({
        colorRelleno: componente.config?.colorRelleno || '#D1D5DB',
        colorBorde: componente.config?.colorBorde || '#111827',
        grosorBorde: componente.config?.grosorBorde || 2,
        rotacion: componente.config?.rotacion ?? 0
      });
    }
    setConfigLocal(prev => ({
      ...prev,
      sinSombra: componente?.config?.sinSombra ?? false,
      columnas: componente?.config?.columnas || prev.columnas || []
    }));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const k = e.key;
      if (
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k) &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      ) {
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  useEffect(() => {
    const cargarCamposPorColumnas = async () => {
      const nuevo = { ...camposPorDispositivo };
      for (const col of configLocal.columnas || []) {
        const id = col.id_dispositivo;
        if (id && !nuevo[id]) {
          try {
            const qy = query(
              collection(db, 'mediciones'),
              where('id_dispositivo', '==', id),
              orderBy('timestamp', 'desc'),
              limit(1)
            );
            const snapshot = await getDocs(qy);
            if (!snapshot.empty) {
              const datos = snapshot.docs[0].data().datos;
              nuevo[id] = Object.keys(datos || {});
            } else {
              nuevo[id] = [];
            }
          } catch {
            nuevo[id] = [];
          }
        }
      }
      setCamposPorDispositivo(nuevo);
    };
    if (componente?.tipo === 'tabla-ml-tiempo-real') cargarCamposPorColumnas();
  }, [configLocal.columnas, componente?.tipo]);

  useEffect(() => {
    const cargarCamposDeDispositivo = async () => {
      if (!idDispositivo || camposPorDispositivo[idDispositivo]) return;
      try {
        const qy = query(
          collection(db, 'mediciones'),
          where('id_dispositivo', '==', idDispositivo),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const snapshot = await getDocs(qy);
        if (!snapshot.empty) {
          const datos = snapshot.docs[0].data().datos;
          setCamposPorDispositivo(prev => ({ ...prev, [idDispositivo]: Object.keys(datos || {}) }));
        }
      } catch {
        setCamposPorDispositivo(prev => ({ ...prev, [idDispositivo]: [] }));
      }
    };
    if (!esMultiple) cargarCamposDeDispositivo();
  }, [idDispositivo]);

  useEffect(() => {
    if (idDispositivo && !campo && camposPorDispositivo[idDispositivo]?.length > 0) {
      setCampo(camposPorDispositivo[idDispositivo][0]);
    }
  }, [idDispositivo, camposPorDispositivo]);

  useEffect(() => {
    const cargarDispositivos = async () => {
      const ref = collection(db, 'usuarios', user.uid, 'dispositivos');
      const snapshot = await getDocs(ref);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDispositivos(lista);
    };
    if (user) cargarDispositivos();
  }, [user]);

  useEffect(() => {
    const obtenerCamposPorFuente = async () => {
      const nuevo = { ...camposPorDispositivo };
      for (const fuente of fuentes) {
        if (fuente.id_dispositivo && !nuevo[fuente.id_dispositivo]) {
          try {
            const qy = query(
              collection(db, 'mediciones'),
              where('id_dispositivo', '==', fuente.id_dispositivo),
              orderBy('timestamp', 'desc'),
              limit(1)
            );
            const snapshot = await getDocs(qy);
            if (!snapshot.empty) {
              const datos = snapshot.docs[0].data().datos;
              nuevo[fuente.id_dispositivo] = Object.keys(datos || {});
            } else {
              nuevo[fuente.id_dispositivo] = [];
            }
          } catch {
            nuevo[fuente.id_dispositivo] = [];
          }
        }
      }
      setCamposPorDispositivo(nuevo);
    };
    if (esMultiple) obtenerCamposPorFuente();
  }, [fuentes, esMultiple]);

  useEffect(() => {
    if (componente?.tipo !== 'tabla-ml-tiempo-real') return;

    setConfigLocal(prev => {
      const cols = prev.columnas || [];
      let changed = false;
      const nuevas = cols.map(col => {
        const campos = camposPorDispositivo[col.id_dispositivo];
        if (col.id_dispositivo && !col.campo && campos?.length > 0) {
          changed = true;
          return { ...col, campo: campos[0] };
        }
        return col;
      });

      return changed ? { ...prev, columnas: nuevas } : prev;
    });
  }, [camposPorDispositivo]);

  const validarNumero = (valor, campo, soloEnteros = false) => {
    let regex = soloEnteros ? /[^0-9]/g : /[^0-9.-]/g;
    if (regex.test(valor)) {
      setErrorCampo(campo);
      setTimeout(() => setErrorCampo(''), 2000);
      return valor.replace(regex, '');
    }
    return valor;
  };

  const MensajeLimite = ({ longitud }) => {
    if (longitud >= MAX_CARACTERES) {
      return <p className="text-xs text-red-500 mt-1">⚠️ Máx. {MAX_CARACTERES} caracteres.</p>;
    }
    return null;
  };

  const MensajeErrorNumero = ({ campoActual }) => {
    if (errorCampo === campoActual) {
      return <p className="text-xs text-red-500 mt-1">Solo se permiten números</p>;
    }
    return null;
  };

  const guardarCambios = () => {
    if (componente?.tipo !== 'texto' && !esForma && (!cantidadMaxima || cantidadMaxima < 1 || cantidadMaxima > 5000)) {
      Swal.fire({
        icon: 'warning',
        title: 'Cantidad inválida',
        text: 'La cantidad de datos debe estar entre 1 y 5000.'
      });
      return;
    }

    if (componente?.tipo === 'herramienta-ml') {
      onGuardar({
        ...componente.config,
        titulo,
        sinSombra: configLocal.sinSombra ?? false,
        costoKWh,
        ancho: configLocal.ancho ?? 137,
        alto: configLocal.alto ?? 85,
        eficiencia: configLocal.eficiencia ?? 15
      });
      return;
    }

    if (componente?.tipo === 'texto') {
      onGuardar({
        ...configTexto,
        sinSombra: configLocal.sinSombra || false
      });
      return;
    }

    if (componente?.tipo === 'tabla-ml-tiempo-real') {
      const columnas = (configLocal.columnas || []).map(c => ({ ...c }));

      const incompletas = columnas.filter(col => !col.id_dispositivo || !col.campo || !col.nombre);
      if (incompletas.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Campos incompletos',
          text: 'Completa nombre, dispositivo y campo en todas las columnas.'
        });
        return;
      }

      const columnasConMl = columnas.filter(col => !!col.clave_modelo);
      const columnasSinMl = columnas.filter(col => !col.clave_modelo);

      if (columnasConMl.length > 0) {
        const clavesMlSeleccionadas = columnasConMl.map(c => c.clave_modelo);
        const sinDuplicados = [...new Set(clavesMlSeleccionadas)];
        const todasAsignadas = CLAVES_ML.every(clave => sinDuplicados.includes(clave));
        const cantidadExacta =
          sinDuplicados.length === CLAVES_ML.length &&
          columnasConMl.length === CLAVES_ML.length &&
          columnasSinMl.length === 0;

        if (!todasAsignadas || !cantidadExacta) {
          Swal.fire({
            icon: 'warning',
            title: 'Variables ML inválidas',
            text: 'Si usas Variables ML, debes asociar todas (temperatura, humedad, lux y nubosidad) exactamente una vez y no deben quedar columnas sin Variable ML.'
          });
          return;
        }
      }

      onGuardar({
        ...componente.config,
        titulo,
        columnas,
        modoTiempoReal: componente.config?.modoTiempoReal ?? true,
        sinSombra: configLocal.sinSombra ?? false,
        costoKWh,
        ancho: configLocal.ancho ?? 137,
        alto: configLocal.alto ?? 85,
        eficiencia: configLocal.eficiencia ?? 15,
        prediccion: {
          endpoint: `${baseUrl}/predecir`
        }
      });
      return;
    }

    if (esForma) {
      onGuardar({
        ...componente.config,
        ...config,
        sinSombra: configLocal.sinSombra || false
      });
      return;
    }

    if (esMultiple && Array.isArray(fuentes)) {
      const fuentesValidas = fuentes.filter(f => f.id_dispositivo?.trim() && f.campo?.trim());
      if (fuentesValidas.length !== fuentes.length) {
        Swal.fire({
          icon: 'warning',
          title: 'Campos incompletos',
          text: 'Completa todos los campos de las fuentes.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
    }

    onGuardar({
      ...componente.config,
      titulo,
      sinSombra: configLocal.sinSombra || false,
      minY: minY !== '' ? parseFloat(minY) : undefined,
      maxY: maxY !== '' ? parseFloat(maxY) : undefined,
      color,
      descripcionX: 'Tiempo (s)',
      descripcionY,
      cantidadMaxima: cantidadMaxima || 20,
      fechaInicio,
      fechaFin,
      ...(esMultiple
        ? {
          fuentes,
          series: componente.config?.series || {},
          etiquetas: componente.config?.etiquetas || []
        }
        : {
          id_dispositivo: idDispositivo,
          campo,
          valores: componente.config?.valores || [],
          etiquetas: componente.config?.etiquetas || []
        })
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto">
      <div className="tour-modal-window bg-white rounded-xl shadow-lg p-6 w-[600px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Configurar Gráfico</h2>

        {!['tabla-ml-tiempo-real', 'herramienta-ml', 'texto'].includes(componente?.tipo) && !esForma && !esMultiple && (
          <>
            <div className="tour-modal-dispositivo mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sensor
              </label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={idDispositivo}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setIdDispositivo(selectedId);
                  setCampo('');

                  // --- RELLENO AUTOMATICO DE TITULO Y METADATA ---
                  const deviceSeleccionado = dispositivos.find(d => (d.id_dispositivo || d.id) === selectedId);
                  if (deviceSeleccionado) {
                    setTitulo(deviceSeleccionado.nombre || ''); // <- AQUÍ SE RELLENA EL TÍTULO
                    if (deviceSeleccionado.valorMinimo) setMinY(deviceSeleccionado.valorMinimo);
                    if (deviceSeleccionado.valorMaximo) setMaxY(deviceSeleccionado.valorMaximo);
                    if (deviceSeleccionado.unidad) setDescripcionY(deviceSeleccionado.unidad);
                  }
                  // ------------------------------------------------
                }}
              >
                <option value="">Selecciona un sensor</option>
                {dispositivos.map((d) => (
                  <option
                    key={d.id_dispositivo || d.id}
                    value={d.id_dispositivo || d.id}
                  >
                    {d.nombre || d.id_dispositivo || d.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="tour-modal-campo mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campo a mostrar
              </label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={campo}
                onChange={(e) => setCampo(e.target.value)}
                disabled={
                  !idDispositivo ||
                  !(camposPorDispositivo[idDispositivo]?.length)
                }
              >
                <option value="">
                  {idDispositivo
                    ? (camposPorDispositivo[idDispositivo]?.length
                      ? 'Selecciona un campo'
                      : 'Este sensor aún no tiene mediciones')
                    : 'Selecciona primero un sensor'}
                </option>

                {(camposPorDispositivo[idDispositivo] || []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {componente?.tipo !== 'texto' && !esForma && (
          <div className="tour-modal-titulo mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título del gráfico
            </label>
            <input
              type="text"
              className={`w-full border rounded px-3 py-2 ${titulo.length >= MAX_CARACTERES ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`}
              value={titulo}
              maxLength={MAX_CARACTERES}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Predicción vs Sensores"
            />
            <MensajeLimite longitud={titulo.length} />
          </div>
        )}

        {esForma && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color Relleno</label>
              <input
                type="color"
                className="w-full h-10 border border-gray-300 rounded cursor-pointer"
                value={config.colorRelleno || '#D1D5DB'}
                onChange={(e) => setConfig({ ...config, colorRelleno: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color Borde</label>
              <input
                type="color"
                className="w-full h-10 border border-gray-300 rounded cursor-pointer"
                value={config.colorBorde || '#111827'}
                onChange={(e) => setConfig({ ...config, colorBorde: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grosor Borde</label>
              <input
                type="number"
                min="0"
                max="20"
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={config.grosorBorde || 0}
                onChange={(e) => setConfig({ ...config, grosorBorde: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rotación ({config.rotacion || 0}°)</label>
              <input
                type="range"
                min="0"
                max="360"
                className="w-full cursor-pointer accent-blue-600"
                value={config.rotacion || 0}
                onChange={(e) => setConfig({ ...config, rotacion: Number(e.target.value) })}
              />
            </div>
          </div>
        )}

        {componente?.tipo === 'texto' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Contenido del texto</label>
              <textarea
                className="w-full border border-gray-300 rounded px-3 py-2 min-h-[80px]"
                value={configTexto.contenido}
                onChange={(e) => setConfigTexto({ ...configTexto, contenido: e.target.value })}
                placeholder="Escribe tu texto aquí..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="color"
                  className="w-full h-10 border border-gray-300 rounded cursor-pointer"
                  value={configTexto.color}
                  onChange={(e) => setConfigTexto({ ...configTexto, color: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño (px)</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={configTexto.fontSize}
                  onChange={(e) => {
                    const val = validarNumero(e.target.value, 'fontSize', true);
                    setConfigTexto({ ...configTexto, fontSize: Number(val) });
                  }}
                />
                <MensajeErrorNumero campoActual="fontSize" />
              </div>
            </div>

            <div className="flex gap-2 mb-4 bg-gray-100 p-2 rounded">
              <button
                className={`p-2 rounded font-bold ${configTexto.negrita ? 'bg-blue-200' : 'hover:bg-gray-200'}`}
                onClick={() => setConfigTexto({ ...configTexto, negrita: !configTexto.negrita })}
                title="Negrita"
              >
                B
              </button>
              <button
                className={`p-2 rounded italic ${configTexto.cursiva ? 'bg-blue-200' : 'hover:bg-gray-200'}`}
                onClick={() => setConfigTexto({ ...configTexto, cursiva: !configTexto.cursiva })}
                title="Cursiva"
              >
                I
              </button>
              <button
                className={`p-2 rounded underline ${configTexto.subrayado ? 'bg-blue-200' : 'hover:bg-gray-200'}`}
                onClick={() => setConfigTexto({ ...configTexto, subrayado: !configTexto.subrayado })}
                title="Subrayado"
              >
                U
              </button>
              <div className="w-px bg-gray-300 mx-2"></div>
              {['left', 'center', 'right'].map((align) => (
                <button
                  key={align}
                  className={`p-2 rounded ${configTexto.alineacion === align ? 'bg-blue-200' : 'hover:bg-gray-200'}`}
                  onClick={() => setConfigTexto({ ...configTexto, alineacion: align })}
                  title={`Alinear ${align}`}
                >
                  {align === 'left' && <FaAlignLeft />}
                  {align === 'center' && <FaAlignCenter />}
                  {align === 'right' && <FaAlignRight />}
                </button>
              ))}
            </div>
          </>
        )}

        {componente?.tipo === 'tabla-ml-tiempo-real' && (
          <div className="tour-modal-columnas">
            <h3 className="font-semibold text-gray-700 mb-2">
              Columnas
            </h3>

            <div className="grid [grid-template-columns:1.6fr_1.6fr_1.6fr_1fr_1.6fr_0.4fr] gap-2 mb-2 text-xs font-semibold text-gray-500">
              <span>Sensor</span>
              <span>Campo</span>
              <span>Nombre</span>
              <span>Unidad</span>
              <span className="tour-modal-variables">Variable ML</span>
              <span></span>
            </div>

            {(configLocal.columnas || []).map((col, index) => {
              const yaUsadas = new Set(
                (configLocal.columnas || [])
                  .map((c, i) => (i !== index ? c.clave_modelo : null))
                  .filter(Boolean)
              );
              const opciones = CLAVES_ML.filter(k => !yaUsadas.has(k));

              return (
                <div
                  key={index}
                  className="grid [grid-template-columns:1.6fr_1.6fr_1.6fr_1fr_1.6fr_0.4fr] gap-2 items-center mb-2"
                >

                  <select
                    value={col.id_dispositivo || ''}
                    className="input-form"
                    onChange={(e) => {
                      const nuevas = [...configLocal.columnas];
                      const selectedId = e.target.value;
                      nuevas[index].id_dispositivo = selectedId;
                      nuevas[index].campo = '';

                      // --- AUTO-RELLENO ---
                      const deviceSeleccionado = dispositivos.find(d => (d.id_dispositivo || d.id) === selectedId);
                      if (deviceSeleccionado) {
                        nuevas[index].nombre = deviceSeleccionado.nombre || '';
                        nuevas[index].unidad = deviceSeleccionado.unidad || '';
                      }

                      // Auto-relleno de Campo (si existe data en caché)
                      if (camposPorDispositivo[selectedId] && camposPorDispositivo[selectedId].length > 0) {
                        nuevas[index].campo = camposPorDispositivo[selectedId][0];
                      }
                      // --------------------

                      setConfigLocal({ ...configLocal, columnas: nuevas });
                    }}
                  >
                    <option value="">Selecciona</option>
                    {dispositivos.map((d) => (
                      <option key={d.id_dispositivo || d.id} value={d.id_dispositivo || d.id}>
                        {d.nombre || d.id_dispositivo || d.id}
                      </option>
                    ))}
                  </select>

                  <select
                    value={col.campo || ''}
                    className="input-form"
                    onChange={(e) => {
                      const nuevas = [...configLocal.columnas];
                      nuevas[index].campo = e.target.value;
                      setConfigLocal({ ...configLocal, columnas: nuevas });
                    }}
                  >
                    <option value="">Selecciona</option>
                    {(camposPorDispositivo[col.id_dispositivo] || []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <div className="flex flex-col">
                    <input
                      type="text"
                      placeholder="Nombre"
                      maxLength={MAX_CARACTERES}
                      className={`input-form ${col.nombre?.length >= MAX_CARACTERES ? 'border-red-500' : ''}`}
                      value={col.nombre || ''}
                      onChange={(e) => {
                        const nuevas = [...configLocal.columnas];
                        nuevas[index].nombre = e.target.value;
                        setConfigLocal({ ...configLocal, columnas: nuevas });
                      }}
                    />
                    {col.nombre?.length >= MAX_CARACTERES && <span className="text-[10px] text-red-500 leading-none">Máx {MAX_CARACTERES}</span>}
                  </div>

                  <div className="flex flex-col">
                    <input
                      type="text"
                      placeholder="Unidad"
                      maxLength={MAX_CARACTERES}
                      className={`input-form text-center ${col.unidad?.length >= MAX_CARACTERES ? 'border-red-500' : ''}`}
                      value={col.unidad || ''}
                      onChange={(e) => {
                        const nuevas = [...configLocal.columnas];
                        nuevas[index].unidad = e.target.value;
                        setConfigLocal({ ...configLocal, columnas: nuevas });
                      }}
                    />
                    {col.unidad?.length >= MAX_CARACTERES && <span className="text-[10px] text-red-500 leading-none">Máx {MAX_CARACTERES}</span>}
                  </div>

                  <select
                    className="input-form"
                    value={col.clave_modelo || ''}
                    onChange={(e) => {
                      const nuevas = [...configLocal.columnas];
                      nuevas[index].clave_modelo = e.target.value;
                      setConfigLocal({ ...configLocal, columnas: nuevas });
                    }}
                  >
                    <option value="">Selecciona</option>
                    {opciones.map((clave) => (
                      <option key={clave} value={clave}>{clave}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      const nuevas = [...configLocal.columnas];
                      nuevas.splice(index, 1);
                      setConfigLocal({ ...configLocal, columnas: nuevas });
                    }}
                    className="text-red-500 text-lg hover:scale-110 cursor-pointer"
                    title="Eliminar columna"
                  >
                    ❌
                  </button>
                </div>
              );
            })}

            <button
              onClick={() =>
                setConfigLocal({
                  ...configLocal,
                  columnas: [
                    ...(configLocal.columnas || []),
                    { nombre: '', id_dispositivo: '', campo: '', unidad: '', clave_modelo: '' }
                  ]
                })
              }
              className="text-blue-600 hover:underline mt-2"
            >
              + Agregar columna
            </button>
          </div>
        )}

        {!['tabla-ml-tiempo-real', 'herramienta-ml', 'texto'].includes(componente?.tipo) && !esForma && (
          <>


            <div className="tour-modal-miny mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mínimo eje Y
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={minY}
                onChange={(e) => setMinY(validarNumero(e.target.value, 'minY', false))}
                placeholder="Ej. 0"
              />
              <MensajeErrorNumero campoActual="minY" />
            </div>

            <div className="tour-modal-maxy mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Máximo eje Y
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={maxY}
                onChange={(e) => setMaxY(validarNumero(e.target.value, 'maxY', false))}
                placeholder="Ej. 1000"
              />
              <MensajeErrorNumero campoActual="maxY" />
            </div>

            <div className="tour-modal-descy mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción eje Y (Unidad)
              </label>
              <input
                type="text"
                className={`w-full border rounded px-3 py-2 ${descripcionY.length >= MAX_CARACTERES ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`}
                value={descripcionY}
                maxLength={MAX_CARACTERES}
                onChange={(e) => setDescripcionY(e.target.value)}
                placeholder="Ej. Potencia (W)"
              />
              <MensajeLimite longitud={descripcionY.length} />
            </div>

            <div className="tour-modal-color mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color del gráfico
              </label>
              <input
                type="color"
                className="w-full h-10 border border-gray-300 cursor-pointer rounded px-3 py-2"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>

            <div className="tour-modal-cantidad mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad máxima de datos a mostrar
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={cantidadMaxima}
                onChange={(e) => {
                  const valorLimpio = validarNumero(e.target.value, 'cantidadMaxima', true);
                  if (valorLimpio === '') setCantidadMaxima('');
                  else setCantidadMaxima(Number(valorLimpio));
                }}
                placeholder="Ej. 20"
              />
              <MensajeErrorNumero campoActual="cantidadMaxima" />
            </div>
          </>
        )}

        {!esPrediccionTiempoRealPage && (
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              className="accent-blue-600"
              checked={configLocal.sinSombra || false}
              onChange={(e) => setConfigLocal({ ...configLocal, sinSombra: e.target.checked })}
            />
            <span className="text-sm text-gray-700">Quitar sombra (Estilo plano)</span>
          </label>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={guardarCambios}
            className="tour-modal-guardar px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};