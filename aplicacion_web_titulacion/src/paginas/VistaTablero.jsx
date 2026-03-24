import { useEffect, useState, useContext, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { ComponenteDinamico } from '../componentes/ComponenteDinamico';
import { ToolBar } from '../componentes/ToolBar';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, getDoc, updateDoc } from 'firebase/firestore';
import { UserContext } from '../providers/UserProvider';
import { ModalEditarComponente } from '../componentes/ModalEditarComponente';
import { HerramientaML } from '../componentes/HerramientaML';
import { FaCog, FaTrash, FaPlay, FaPause } from "react-icons/fa";
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { AccesoRestringido } from '../componentes/AccesoRestringido';
import Swal from 'sweetalert2';

const COLORES_GRAFICOS = [
  '#5470C6', // Azul (Default)
  '#91CC75', // Verde claro
  '#FAC858', // Amarillo
  '#EE6666', // Rojo suave
  '#73C0DE', // Azul cielo
  '#3BA272', // Verde bosque
  '#FC8452', // Naranja
  '#9A60B4', // Morado
  '#EA7CCC', // Rosa
  '#2563EB', // Azul fuerte
  '#D97706'  // Ámbar
];

export const VistaTablero = () => {
  const { idTablero } = useParams();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [diapositivas, setDiapositivas] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [componenteEditando, setComponenteEditando] = useState(null);
  const [reiniciarSubscripciones, setReiniciarSubscripciones] = useState(false);

  const diapositivaActual = diapositivas[indiceActual];

  const subscripcionesActivas = useRef({});
  const actualizacionesRef = useRef({});
  const componentesRef = useRef([]);

  const [runTutorial, setRunTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    componentesRef.current = diapositivaActual?.componentes || [];
  }, [diapositivaActual?.componentes]);

  useEffect(() => {
    return () => {
      Object.values(subscripcionesActivas.current).forEach(unsub => unsub());
      subscripcionesActivas.current = {};
    };
  }, []);

  const steps = [
    {
      target: 'body',
      content: (
        <div className="text-left">
          <h3 className="font-bold text-lg mb-2">Editor de tableros</h3>
          <p>Bienvenido, vamos a configurar tu primer gráfico paso a paso.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    { target: '.tour-modal-dispositivo', content: 'Primero, selecciona cuál de tus sensores enviará los datos.', disableBeacon: true },
    { target: '.tour-modal-campo', content: 'Luego, elige la variable que quieres ver (ej. Temperatura).', disableBeacon: true },
    { target: '.tour-modal-titulo', content: 'El título se ha rellenado automáticamente, pero puedes editarlo si quieres.', disableBeacon: true },
    { target: '.tour-modal-miny', content: 'Define el valor mínimo que mostrará el eje vertical (Ej. 0).', disableBeacon: true },
    { target: '.tour-modal-maxy', content: 'Define el valor máximo del eje vertical (Ej. 100).', disableBeacon: true },
    { target: '.tour-modal-descy', content: 'Escribe la unidad de medida (ej. Watts, °C).', disableBeacon: true },
    { target: '.tour-modal-color', content: 'Puedes personalizar el color de la línea o barra.', disableBeacon: true },
    { target: '.tour-modal-cantidad', content: 'Controla cuántos puntos se ven a la vez en el gráfico.', disableBeacon: true },
    { target: '.tour-modal-guardar', content: 'Cuando termines, guarda los cambios para verlos reflejados.', disableBeacon: true },
    { target: '.tour-btn-graficos', content: 'Usa este botón para agregar más gráficos.', disableBeacon: true },
    { target: '.tour-btn-texto', content: 'Agrega títulos y notas para organizar tu tablero.', disableBeacon: true },
    { target: '.tour-btn-formas', content: 'Usa formas para crear diagramas visuales.', disableBeacon: true },
    { target: '.tour-slides-bar', content: 'Aquí gestionas tus diapositivas.', disableBeacon: true },
    { target: '.tour-btn-fullscreen', content: 'Usa esto para ver tu tablero en pantalla completa.', disableBeacon: true },
    { target: '.tour-btn-ayuda', content: 'Si necesitas ver este tutorial de nuevo, haz clic aquí.', disableBeacon: true }
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
      setComponenteEditando(null);
      if (user?.uid) {
        const docRef = doc(db, 'usuarios', user.uid);
        updateDoc(docRef, { tutorialTableroVisto: true }).catch(console.error);
      }
      return;
    }

    if (type === EVENTS.STEP_AFTER || action === ACTIONS.CLOSE) {
      if (index === 0 && action === ACTIONS.NEXT) {
        const primerComp = diapositivaActual?.componentes?.[0];
        if (primerComp) {
          setComponenteEditando({ id: primerComp.id, comp: primerComp });
          setTimeout(() => setStepIndex(1), 300);
        } else {
          setStepIndex(10);
        }
      }
      else if (index === 9 && action === ACTIONS.NEXT) {
        setComponenteEditando(null);
        setTimeout(() => setStepIndex(10), 300);
      }
      else if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      }
      else if (action === ACTIONS.PREV) {
        if (index === 10) {
          const primerComp = diapositivaActual?.componentes?.[0];
          if (primerComp) {
            setComponenteEditando({ id: primerComp.id, comp: primerComp });
            setTimeout(() => setStepIndex(9), 300);
          }
        }
        else if (index === 1) {
          setComponenteEditando(null);
          setTimeout(() => setStepIndex(0), 300);
        }
        else {
          setStepIndex(index - 1);
        }
      }
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);
    document.addEventListener('msfullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
      document.removeEventListener('msfullscreenchange', handleFullScreenChange);
    };
  }, []);

  useEffect(() => {
    const verificarTutorial = async () => {
      if (user?.uid) {
        try {
          const docRef = doc(db, 'usuarios', user.uid);
          const docSnap = await getDoc(docRef);
          const debeMostrar = !docSnap.exists() || !docSnap.data().tutorialTableroVisto;
          if (debeMostrar) {
            setStepIndex(0);
            setRunTutorial(true);
          }
        } catch (error) {
          console.error("Error tutorial:", error);
        }
      }
    };
    verificarTutorial();
  }, [user]);

  useEffect(() => {
    if (!user || !idTablero || !diapositivaActual) return;

    const idsActuales = diapositivaActual.componentes.map(c => c.id);
    Object.keys(subscripcionesActivas.current).forEach(idSus => {
      const comp = diapositivaActual.componentes.find(c => c.id === idSus);
      const existe = idsActuales.includes(idSus);
      const pausado = comp?.config?.modoTiempoReal === false;

      if (!existe || pausado) {
        if (subscripcionesActivas.current[idSus]) {
          subscripcionesActivas.current[idSus]();
          delete subscripcionesActivas.current[idSus];
        }
      }
    });

    diapositivaActual.componentes.forEach((comp) => {
      const config = comp.config;
      const esMultiple = comp.tipo === 'grafico-area-stack' || comp.tipo === 'grafico-linea-multiple';

      if (comp.tipo === 'texto' || comp.tipo?.startsWith('forma')) return;
      if (config.modoTiempoReal === false) return;
      if (subscripcionesActivas.current[comp.id]) return;

      if (esMultiple && Array.isArray(config.fuentes)) {
        const unsubs = [];
        config.fuentes.forEach((fuente) => {
          const { id_dispositivo, campo } = fuente;
          if (!id_dispositivo || !campo) return;

          const tieneDatosPrevios = config.series && Object.keys(config.series).length > 0;

          if (!tieneDatosPrevios) {
            const qHist = query(
              collection(db, 'mediciones'),
              where('id_dispositivo', '==', id_dispositivo),
              orderBy('timestamp', 'desc'),
              limit(config?.cantidadMaxima || 20)
            );

            getDocs(qHist).then((snapshot) => {
              const nuevosValores = snapshot.docs.reverse().map(doc => doc.data()?.datos?.[campo]).filter(v => v !== undefined);
              const nuevasEtiquetas = snapshot.docs.reverse().map(doc => new Date(doc.data().timestamp.toDate()).toLocaleTimeString());

              setDiapositivas((prev) =>
                prev.map((slide) => {
                  if (!slide.componentes.some((c) => c.id === comp.id)) return slide;
                  return {
                    ...slide,
                    componentes: slide.componentes.map((c) => {
                      if (c.id !== comp.id) return c;
                      const nuevaConfig = { ...c.config };
                      if (!nuevaConfig.series) nuevaConfig.series = {};
                      const fuenteMatch = config.fuentes.find(f => f.id_dispositivo === id_dispositivo && f.campo === campo);
                      const nombreSerie = `${fuenteMatch?.nombre_dispositivo || id_dispositivo} - ${campo}`;
                      nuevaConfig.series[nombreSerie] = nuevosValores;
                      nuevaConfig.etiquetas = nuevasEtiquetas;
                      return { ...c, config: nuevaConfig };
                    })
                  };
                })
              );
            });
          }

          const unsub = onSnapshot(
            query(collection(db, 'mediciones'), where('id_dispositivo', '==', id_dispositivo), orderBy('timestamp', 'desc'), limit(1)),
            (snapshot) => {
              snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' || change.type === 'modified') {
                  const data = change.doc.data();
                  const timestampDato = data.timestamp?.toDate?.().getTime?.();
                  const actualizado = componentesRef.current.find(c => c.id === comp.id);

                  const fechaResume = actualizado?.config?.timestampResume;
                  if (fechaResume && timestampDato && timestampDato < fechaResume) return;

                  const valor = data.datos?.[campo];
                  const etiqueta = new Date().toLocaleTimeString();

                  if (valor !== undefined) {
                    const clave = `${comp.id}-${id_dispositivo}-${campo}-${timestampDato}`;
                    if (actualizacionesRef.current[clave]) return;
                    actualizacionesRef.current[clave] = true;

                    setDiapositivas((prev) =>
                      prev.map((slide) => {
                        if (!slide.componentes.some((c) => c.id === comp.id)) return slide;
                        return {
                          ...slide,
                          componentes: slide.componentes.map((c) => {
                            if (c.id !== comp.id) return c;
                            const nuevaConfig = { ...c.config };
                            if (!nuevaConfig.series) nuevaConfig.series = {};

                            const fuenteMatch = config.fuentes.find(f => f.id_dispositivo === id_dispositivo && f.campo === campo);
                            const nombreSerie = `${fuenteMatch?.nombre_dispositivo || id_dispositivo} - ${campo}`;

                            if (!nuevaConfig.series[nombreSerie]) nuevaConfig.series[nombreSerie] = [];
                            const max = config?.cantidadMaxima || 20;

                            nuevaConfig.series[nombreSerie] = [...nuevaConfig.series[nombreSerie], valor].slice(-max);
                            nuevaConfig.etiquetas = [...(nuevaConfig.etiquetas || []), etiqueta].slice(-max);

                            return { ...c, config: nuevaConfig };
                          })
                        };
                      })
                    );
                  }
                }
              });
            }
          );
          unsubs.push(unsub);
        });
        subscripcionesActivas.current[comp.id] = () => unsubs.forEach(u => u());

      } else if (['grafico-line', 'grafico-bar', 'grafico-area'].includes(comp.tipo)) {
        const { id_dispositivo, campo } = config;
        if (!id_dispositivo || !campo) return;

        const tieneDatosPrevios = config.valores && config.valores.length > 0;

        if (!tieneDatosPrevios) {
          const qHist = query(
            collection(db, 'mediciones'),
            where('id_dispositivo', '==', id_dispositivo),
            orderBy('timestamp', 'desc'),
            limit(config?.cantidadMaxima || 20)
          );

          getDocs(qHist).then((snapshot) => {
            const nuevosValores = snapshot.docs.reverse().map(doc => doc.data()?.datos?.[campo]).filter(v => v !== undefined);
            const nuevasEtiquetas = snapshot.docs.reverse().map(doc => new Date(doc.data().timestamp.toDate()).toLocaleTimeString());

            setDiapositivas((prev) =>
              prev.map((slide) => {
                if (!slide.componentes.some((c) => c.id === comp.id)) return slide;
                return {
                  ...slide,
                  componentes: slide.componentes.map((c) =>
                    c.id === comp.id ? { ...c, config: { ...c.config, valores: nuevosValores, etiquetas: nuevasEtiquetas } } : c
                  )
                };
              })
            );
          });
        }

        const unsub = onSnapshot(
          query(collection(db, 'mediciones'), where('id_dispositivo', '==', id_dispositivo), orderBy('timestamp', 'desc'), limit(1)),
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added' || change.type === 'modified') {
                const data = change.doc.data();
                const timestampDato = data.timestamp?.toDate?.().getTime?.();
                const actualizado = componentesRef.current.find(c => c.id === comp.id);

                const fechaResume = actualizado?.config?.timestampResume;
                if (fechaResume && timestampDato && timestampDato < fechaResume) return;

                const valor = data.datos?.[campo];
                const etiqueta = new Date().toLocaleTimeString();

                if (valor !== undefined) {
                  const clave = `${comp.id}-${id_dispositivo}-${campo}-${timestampDato}`;
                  if (actualizacionesRef.current[clave]) return;
                  actualizacionesRef.current[clave] = true;

                  setDiapositivas((prev) =>
                    prev.map((slide) => {
                      if (!slide.componentes.some((c) => c.id === comp.id)) return slide;
                      return {
                        ...slide,
                        componentes: slide.componentes.map((c) => {
                          if (c.id !== comp.id) return c;
                          const nuevaConfig = { ...c.config };
                          const max = config?.cantidadMaxima || 20;

                          nuevaConfig.valores = [...(nuevaConfig.valores || []), valor].slice(-max);
                          nuevaConfig.etiquetas = [...(nuevaConfig.etiquetas || []), etiqueta].slice(-max);

                          return { ...c, config: nuevaConfig };
                        })
                      };
                    })
                  );
                }
              }
            });
          }
        );
        subscripcionesActivas.current[comp.id] = unsub;

      } else if (comp.tipo.includes('gauge')) {
        const { id_dispositivo, campo } = config;
        if (!id_dispositivo || !campo) return;

        const unsub = onSnapshot(
          query(collection(db, 'mediciones'), where('id_dispositivo', '==', id_dispositivo), orderBy('timestamp', 'desc'), limit(1)),
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added' || change.type === 'modified') {
                const data = change.doc.data();
                const valor = data.datos?.[campo];
                if (valor !== undefined) {
                  setDiapositivas((prev) =>
                    prev.map((slide) => {
                      if (!slide.componentes.some((c) => c.id === comp.id)) return slide;
                      return {
                        ...slide,
                        componentes: slide.componentes.map((c) =>
                          c.id === comp.id ? { ...c, config: { ...c.config, valor } } : c
                        )
                      };
                    })
                  );
                }
              }
            });
          }
        );
        subscripcionesActivas.current[comp.id] = unsub;
      }
    });

  }, [
    user,
    idTablero,
    indiceActual,
    reiniciarSubscripciones,
    diapositivaActual?.componentes.map(c => `${c.id}-${c.config.modoTiempoReal}`).join('|')
  ]);

  useEffect(() => {
    const cargarDiapositivas = async () => {
      if (!user || !idTablero) return;

      // Verificar si existe el Tablero primero
      const docRefTablero = doc(db, 'tableros', user.uid, 'misTableros', idTablero);
      const docSnapTablero = await getDoc(docRefTablero);

      if (!docSnapTablero.exists()) {
        navigate('/dashboard');
        return;
      }

      const ref = collection(db, 'tableros', user.uid, 'misTableros', idTablero, 'diapositivas');
      const snapshot = await getDocs(ref);
      const slides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (slides.length > 0) {
        setDiapositivas(slides);
      } else {
        const idGraficoInicial = `grafico-line-${Date.now()}`;
        const anchoVentana = window.innerWidth;
        const altoVentana = window.innerHeight;
        const centroX = Math.max(0, (anchoVentana - 500) / 2);
        const centroY = Math.max(0, (altoVentana - 350 - 100) / 2);

        const graficoInicial = {
          id: idGraficoInicial,
          tipo: 'grafico-line',
          x: centroX,
          y: centroY,
          width: 500,
          height: 350,
          config: {
            titulo: 'Nuevo Gráfico',
            id_dispositivo: '',
            campo: '',
            valores: [],
            etiquetas: [],
            descripcionX: 'Tiempo (s)',
            minY: 0,
            maxY: 100,
            color: COLORES_GRAFICOS[0], // Color por defecto
            modoTiempoReal: true,
            sinSombra: false
          }
        };
        const slideInicial = { id: 'slide-1', nombre: '1', componentes: [graficoInicial] };
        setDiapositivas([slideInicial]);
        setComponenteEditando({ id: idGraficoInicial, comp: graficoInicial });
      }
    };
    cargarDiapositivas();
  }, [user, idTablero]);

  useEffect(() => {
    const guardarDiapositivas = async () => {
      if (!user || !idTablero || diapositivas.length === 0) return;
      for (const slide of diapositivas) {
        if (!slide.id) continue;
        const ref = doc(db, 'tableros', user.uid, 'misTableros', idTablero, 'diapositivas', slide.id);
        await setDoc(ref, slide);
      }
    };
    const timer = setTimeout(guardarDiapositivas, 2000);
    return () => clearTimeout(timer);
  }, [diapositivas, user, idTablero]);

  // --- NAVEGACIÓN CON TECLADO (FLECHAS) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar si hay un modal abierto o si está escribiendo en un input
      if (componenteEditando || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowLeft') {
        setIndiceActual((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setIndiceActual((prev) => Math.min(diapositivas.length - 1, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [diapositivas.length, componenteEditando]);

  const actualizarPosicionComponentePorId = (id, data) => {
    setDiapositivas((prev) => {
      const copia = [...prev];
      copia[indiceActual].componentes = copia[indiceActual].componentes.map(comp =>
        comp.id === id ? { ...comp, ...data } : comp
      );
      return copia;
    });
  };

  const actualizarComponentePorId = (id, nuevaConfig) => {
    setDiapositivas((prev) => {
      const copia = [...prev];
      const compActual = copia[indiceActual].componentes.find(c => c.id === id);

      // Lógica para detectar cambio de fuente de datos y limpiar
      let configParaGuardar = JSON.parse(JSON.stringify(nuevaConfig));

      if (compActual) {
        const cambioDispositivo = compActual.config.id_dispositivo !== nuevaConfig.id_dispositivo;
        const cambioCampo = compActual.config.campo !== nuevaConfig.campo;

        if (cambioDispositivo || cambioCampo) {
          // Limpiar datos antiguos para evitar mezclas
          configParaGuardar.valores = [];
          configParaGuardar.etiquetas = [];
          configParaGuardar.series = {}; // Para gráficos múltiples

          // Forzar cierre de subscripción antigua si existe
          if (subscripcionesActivas.current[id]) {
            subscripcionesActivas.current[id]();
            delete subscripcionesActivas.current[id];
          }
        }
      }

      copia[indiceActual].componentes = copia[indiceActual].componentes.map(comp =>
        comp.id === id ? { ...comp, config: configParaGuardar } : comp
      );
      return copia;
    });
  };

  const eliminarComponentePorId = (id) => {
    Swal.fire({ title: '¿Eliminar componente?', text: 'Esta acción no se puede deshacer.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' }).then((result) => {
      if (!result.isConfirmed) return;
      setDiapositivas((prev) => {
        const copia = [...prev];
        copia[indiceActual].componentes = copia[indiceActual].componentes.filter(comp => comp.id !== id);
        return copia;
      });
      Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
    });
  };

  const agregarComponente = (tipo) => {
    // ELEGIMOS UN COLOR AL AZAR DE LA LISTA
    const colorAleatorio = COLORES_GRAFICOS[Math.floor(Math.random() * COLORES_GRAFICOS.length)];

    const configInicial = {
      'texto': { contenido: 'Texto de ejemplo', color: '#000000', fontSize: 18, fontFamily: 'Arial', alineacion: 'center', sinSombra: true },
      'grafico-line': { titulo: 'Nuevo Gráfico', id_dispositivo: '', campo: '', valores: [], etiquetas: [], descripcionX: 'Tiempo (s)', minY: 0, maxY: 100, modoTiempoReal: true, color: colorAleatorio },
      'forma-cuadro': { colorRelleno: '#D1D5DB', colorBorde: '#111827', grosorBorde: 2, rotacion: 0 },
      'forma-rectangulo': { colorRelleno: '#D1D5DB', colorBorde: '#111827', grosorBorde: 2, rotacion: 0 },
      'forma-circulo': { colorRelleno: '#D1D5DB', colorBorde: '#111827', grosorBorde: 2, rotacion: 0 },
      'forma-triangulo': { colorRelleno: '#D1D5DB', colorBorde: '#111827', grosorBorde: 2, rotacion: 0 },
      'forma-linea': { colorBorde: '#111827', grosorBorde: 2, rotacion: 0 },
      'forma-flecha': { colorBorde: '#111827', grosorBorde: 2, rotacion: 0 },
      'forma-flecha-doble': { colorBorde: '#111827', grosorBorde: 2, rotacion: 0 },
      'grafico-gauge': { titulo: 'Nuevo Gauge', id_dispositivo: '', campo: '', valor: 0, minY: 0, maxY: 100, modoTiempoReal: true, color: colorAleatorio },
      'grafico-bar': { titulo: 'Gráfico de Barras', fuentes: [], valores: [], modoTiempoReal: true, color: colorAleatorio },
      'grafico-linea-multiple': { titulo: 'Múltiples Sensores', fuentes: [], series: {}, etiquetas: [], modoTiempoReal: true },
      'grafico-area-stack': { titulo: 'Área Apilada', fuentes: [], series: {}, etiquetas: [], modoTiempoReal: true, color: colorAleatorio }
    };

    const nuevo = {
      id: `${tipo}-${Date.now()}`,
      tipo,
      x: 200,
      y: 200,
      width: 400,
      height: 300,
      config: configInicial[tipo] || { titulo: '', fuentes: [] }
    };

    setDiapositivas((prev) => {
      const copia = [...prev];
      copia[indiceActual].componentes.push(nuevo);
      return copia;
    });

    // --- ESTA LÍNEA ABRE EL MODAL AUTOMÁTICAMENTE ---
    setComponenteEditando({ id: nuevo.id, comp: nuevo });
  };

  const toggleFullScreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) { elem.requestFullscreen().then(() => setIsFullScreen(true)); } else { document.exitFullscreen().then(() => setIsFullScreen(false)); }
  };

  const agregarNuevaDiapositiva = () => {
    const nueva = { id: `slide-${Date.now()}`, nombre: `${diapositivas.length + 1}`, componentes: [] };
    setDiapositivas((prev) => [...prev, nueva]);
    setIndiceActual(diapositivas.length);
  };

  const eliminarDiapositiva = async (index) => {
    const result = await Swal.fire({ title: '¿Eliminar diapositiva?', text: 'Esta acción no se puede deshacer.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
    if (!result.isConfirmed) return;
    const diapositivaAEliminar = diapositivas[index];
    setDiapositivas((prev) => { const copia = [...prev]; copia.splice(index, 1); return copia; });
    setIndiceActual((prev) => { if (index === prev && prev > 0) return prev - 1; if (index < prev) return prev - 1; return prev; });
    if (user && idTablero && diapositivaAEliminar?.id) { const ref = doc(db, 'tableros', user.uid, 'misTableros', idTablero, 'diapositivas', diapositivaAEliminar.id); await deleteDoc(ref); }
    Swal.fire({ icon: 'success', title: 'Diapositiva Eliminada', timer: 1200, showConfirmButton: false });
  };

  if (!user) return <AccesoRestringido />;

  return (
    <div className={`flex flex-col bg-white h-screen ${isFullScreen ? 'bg-white' : ''}`}>
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
            zIndex: 10005,
            primaryColor: '#2563EB',
            textColor: '#1F2937',
            backgroundColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.6)',
            arrowColor: '#ffffff',
            width: 380,
            spotlightPadding: 10,
            beaconSize: 0,
          },
          beacon: {
            display: 'none',
          },
          beaconInner: {
            display: 'none',
          },
          tooltip: {
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            padding: '24px',
          },
          buttonNext: {
            backgroundColor: '#2563EB',
            color: '#fff',
            borderRadius: '8px',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
          },
          buttonBack: { color: '#6B7280', marginRight: '15px', fontWeight: '500' },
          buttonSkip: { color: '#EF4444', fontWeight: '500' },
          spotlight: { borderRadius: '12px' }
        }}
        locale={{ back: 'Atrás', close: 'Cerrar', last: 'Finalizar', next: `Siguiente (${stepIndex + 1} de ${steps.length})`, skip: 'Omitir' }}
      />

      {!isFullScreen && (
        <ToolBar
          onAgregar={agregarComponente}
          zoomPercent={zoomPercent}
          isFullScreen={isFullScreen}
          onToggleFullScreen={toggleFullScreen}
          todasLasDiapositivas={diapositivas}
          onAyuda={() => {
            setStepIndex(0);
            setRunTutorial(true);
          }}
        />
      )}

      <div className="flex-1 relative overflow-auto bg-white border border-gray-50 rounded-lg">
        {[...(diapositivaActual?.componentes || [])]
          .sort((a, b) => {
            if (a.tipo?.startsWith('forma') && !b.tipo?.startsWith('forma')) return -1;
            if (!a.tipo?.startsWith('forma') && b.tipo?.startsWith('forma')) return 1;
            return 0;
          })
          .map((comp, i) => (
            <Rnd
              key={comp.id || i}
              style={{ zIndex: comp.tipo?.startsWith('forma') ? 1 : 10 }}
              default={{ x: comp.x, y: comp.y, width: comp.width, height: comp.height }}
              minWidth={comp.tipo?.startsWith('grafico') || comp.tipo?.includes('gauge') ? 225 : 20}
              minHeight={comp.tipo?.startsWith('grafico') || comp.tipo?.includes('gauge') ? 225 : 20}
              className="absolute group"
              onDragStop={(e, d) => actualizarPosicionComponentePorId(comp.id, { ...comp, x: d.x, y: d.y })}
              onResizeStop={(e, direction, ref, delta, position) => {
                actualizarPosicionComponentePorId(comp.id, {
                  ...comp,
                  width: parseInt(ref.style.width),
                  height: parseInt(ref.style.height),
                  ...position
                });
              }}
            >
              <div
                className={`bg-transparent ${comp.config?.sinSombra ? '' : 'shadow-md'} rounded-lg h-full w-full p-2 pt-4 relative`}
                style={{ transform: `rotate(${comp.config?.rotacion || 0}deg)` }}
              >
                {comp.tipo === 'herramienta-ml' ? (
                  <HerramientaML ancho={comp.width} alto={comp.height} config={comp.config} />
                ) : (
                  <ComponenteDinamico componente={comp} />
                )}

                <button
                  onClick={() => eliminarComponentePorId(comp.id)}
                  className="absolute top-1 right-1 bg-red-500 cursor-pointer hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition"
                  title="Eliminar gráfico"
                >
                  <FaTrash size={10} />
                </button>

                <button
                  onClick={() => setComponenteEditando({ id: comp.id, comp })}
                  className="absolute top-1 right-8 bg-gray-200 cursor-pointer hover:bg-gray-300 text-black rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                  title="Editar gráfico"
                >
                  <FaCog size={12} />
                </button>

                {comp.tipo === 'grafico-line' && (
                  <button
                    onClick={() => {
                      const ahora = Date.now();
                      const estabaActivo = comp.config.modoTiempoReal;
                      const reiniciar = !estabaActivo;

                      const nuevaConfig = {
                        ...comp.config,
                        modoTiempoReal: reiniciar,
                        timestampResume: reiniciar ? ahora : comp.config.timestampResume
                      };
                      actualizarComponentePorId(comp.id, nuevaConfig);
                    }}
                    className="absolute top-1 right-16 bg-blue-500 hover:bg-blue-600 cursor-pointer text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition"
                    title={comp.config?.modoTiempoReal ? "Pausar" : "Reanudar"}
                  >
                    {comp.config?.modoTiempoReal ? <FaPause size={10} /> : <FaPlay size={10} />}
                  </button>
                )}
              </div>
            </Rnd>
          ))}
      </div>

      {!isFullScreen && (
        <div className="tour-slides-bar flex gap-2 justify-center items-center p-3 mb-2 ml-1 mr-1 bg-white rounded-xl shadow-lg border border-gray-300">
          {diapositivas.map((slide, index) => (
            <div
              key={slide.id}
              onClick={() => setIndiceActual(index)}
              className={`relative w-16 h-12 border-2 rounded flex items-center justify-center cursor-pointer text-xs select-none transition-all duration-200 ${index === indiceActual ? 'border-blue-500 bg-white' : 'border-gray-300 bg-gray-50'} group`}
              title={`Diapositiva ${index + 1}`}
            >
              🖥️ {index + 1}
              {diapositivas.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarDiapositiva(index);
                  }}
                  className="absolute -top-1.5 -right-1.5 cursor-pointer bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shadow hover:bg-red-700 opacity-0 group-hover:opacity-100 transition"
                  title="Eliminar diapositiva"
                >
                  <FaTrash size={9} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={agregarNuevaDiapositiva}
            className="w-10 h-12 bg-white border border-gray-300 cursor-pointer rounded hover:bg-gray-200 text-xl"
          >
            +
          </button>
        </div>
      )}

      {componenteEditando && (
        <ModalEditarComponente
          componente={componenteEditando.comp}
          onClose={() => setComponenteEditando(null)}
          onGuardar={(nuevaConfig) => {
            actualizarComponentePorId(componenteEditando.comp.id, nuevaConfig);
            setComponenteEditando(null);
            setReiniciarSubscripciones(prev => !prev);
          }}
        />
      )}
    </div>
  );
};