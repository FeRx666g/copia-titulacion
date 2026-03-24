// ComponenteDinamico.jsx
import React, { useRef, useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { db } from '../firebase';
import { TablaTiempoReal } from './TablaTiempoReal';
import { HerramientaML } from '../componentes/HerramientaML';
import { collection, getDocs, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

export const ComponenteDinamico = ({ componente }) => {
  const { tipo, config = {} } = componente;
  const chartRef = useRef();
  const claseSombra = config.sinSombra ? '' : 'shadow-xl';

  const [datos, setDatos] = useState([]);
  const [datosTiempoReal, setDatosTiempoReal] = useState({});

  useEffect(() => {
    if (tipo !== 'tabla-ml-tiempo-real' || !config?.columnas) return;

    const unsubscribes = [];

    config.columnas.forEach((col) => {
      if (!col.id_dispositivo || !col.campo) return;

      const q = query(
        collection(db, 'mediciones'),
        where('id_dispositivo', '==', col.id_dispositivo),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const datos = doc.data()?.datos || {};
          const valor = datos[col.campo];

          setDatosTiempoReal((prev) => ({
            ...prev,
            [col.nombre]: valor ?? 'N/A'
          }));
        }
      });

      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [tipo, config]);

  useEffect(() => {
    if (!config?.id_dispositivo) return;

    const modoTiempoReal = config.modoTiempoReal ?? false;
    const filtros = [where('id_dispositivo', '==', config.id_dispositivo)];

    if (config.fechaInicio) {
      const fechaInicioDate = new Date(config.fechaInicio);
      filtros.push(where('timestamp', '>=', fechaInicioDate));
    }

    if (config.fechaFin) {
      const fechaFinDate = new Date(config.fechaFin);
      filtros.push(where('timestamp', '<=', fechaFinDate));
    }

    const q = query(
      collection(db, 'mediciones'),
      ...filtros,
      orderBy('timestamp', 'asc'),
      ...(config?.cantidadMaxima ? [limit(config.cantidadMaxima)] : [])
    );

    let unsubscribe = () => { };

    if (modoTiempoReal) {
      unsubscribe = onSnapshot(q, (snapshot) => {
        const datos = snapshot.docs.map(doc => doc.data());
        setDatos(datos);
      });
    } else {
      getDocs(q).then((snapshot) => {
        const datos = snapshot.docs.map(doc => doc.data());
        setDatos(datos);
      });
    }

    return () => unsubscribe();
  }, [
    config.id_dispositivo,
    config.campo,
    config.fechaInicio,
    config.fechaFin,
    config.cantidadMaxima,
    config.modoTiempoReal
  ]);

  const etiquetas = datos.map((d) => {
    const date = new Date(d.timestamp?.toDate?.() || d.timestamp);
    return date.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  });

  const formatearTooltipFechaHora = (params) => {
    const p = Array.isArray(params) ? params[0] : params;

    // ESTRATEGIA DEFINITIVA: Leer del objeto de datos directamente
    // p.data ahora es { value: 123, formattedTime: '10:00:00' }
    const hora = p.data?.formattedTime || p.name || p.axisValue || '';
    const valor = p.data?.value !== undefined ? p.data.value : p.data;

    return `${hora}<br />${p.marker} ${valor}`;
  };

  // Preparamos los datos "Enriquecidos" con la hora pegada al valor
  const datosGraficoLine = (config.valores || []).map((valor, i) => ({
    value: valor,
    formattedTime: (config.etiquetas || etiquetas || [])[i] || ''
  }));


  const opcionesBase = {
    title: { text: config.titulo || 'Ejemplo' },
    tooltip: { trigger: 'axis' },
    grid: {
      top: 40,
      left: 65,
      right: 30,
      bottom: tipo.includes('gauge') ? 0 : 60,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      name: config.descripcionX || '',
      nameLocation: 'middle',
      nameGap: 40,
      data: config.etiquetas || etiquetas || ['Lun', 'Mar', 'Mié']
    },
    yAxis: {
      type: 'value',
      name: config.descripcionY || '',
      nameLocation: 'middle',
      nameGap: 50,
      min: config.minY ?? null,
      max: config.maxY ?? null
    }
  };

  const chartProps = {
    ref: chartRef,
    style: { height: '100%', width: '100%' },
    opts: { renderer: 'canvas' },
    notMerge: false,
    lazyUpdate: true
  };

  switch (tipo) {
    case 'grafico-bar':
      return (
        <ReactECharts
          key="grafico-bar"
          {...chartProps}
          option={{
            ...opcionesBase,
            tooltip: {
              trigger: 'axis',
              formatter: formatearTooltipFechaHora
            },
            xAxis: {
              ...opcionesBase.xAxis,
              data: config.etiquetas || etiquetas
            },
            series: [{
              type: 'bar',
              data: datosGraficoLine, // Usamos data enriquecida
              itemStyle: { color: config.color || '#5470C6' }
            }]
          }}
        />
      );

    case 'grafico-line':
      return (
        <ReactECharts
          key="grafico-line"
          {...chartProps}
          option={{
            ...opcionesBase,
            tooltip: {
              trigger: 'axis',
              formatter: formatearTooltipFechaHora
            },
            xAxis: {
              ...opcionesBase.xAxis,
              data: config.etiquetas || etiquetas
            },
            series: [{
              type: 'line',
              data: datosGraficoLine, // Usamos data enriquecida
              smooth: true,
              itemStyle: { color: config.color || '#5470C6' }
            }]
          }}
        />
      );

    case 'grafico-gauge':
      return (
        <ReactECharts
          {...chartProps}
          option={{
            title: { text: config.titulo, top: 10 },
            series: [{
              type: 'gauge',
              min: config.minY || 0,
              max: config.maxY || 100,
              radius: '95%',
              center: ['50%', '62%'],
              axisLine: {
                lineStyle: {
                  color: [[1, config.color || '#5470C6']],
                  width: 20
                }
              },
              detail: {
                formatter: '{value}',
                offsetCenter: [0, '40%'],
                fontSize: 20,
                color: 'auto'
              },
              data: [{ value: config.valor || 0, name: config.titulo }]
            }]
          }}
        />
      );

    case 'gauge-stage':
      return (
        <ReactECharts
          {...chartProps}
          option={{
            title: { text: config.titulo, top: 10 },
            series: [{
              type: 'gauge',
              startAngle: 180,
              endAngle: 0,
              min: config.minY || 0,
              max: config.maxY || 100,
              radius: '100%',
              center: ['50%', '70%'],
              axisLine: {
                lineStyle: {
                  width: 20,
                  color: [[0.3, '#58D9F9'], [0.7, '#FDDD60'], [1, '#FF6E76']]
                }
              },
              pointer: {
                icon: 'rect',
                length: '70%',
                width: 6,
                itemStyle: { color: 'auto' }
              },
              detail: {
                valueAnimation: true,
                formatter: '{value}',
                offsetCenter: [0, '40%'],
                fontSize: 20,
                color: 'auto'
              },
              data: [{ value: config.valor || 0, name: config.titulo }]
            }]
          }}
        />
      );

    case 'gauge-grade':
      return (
        <ReactECharts
          {...chartProps}
          option={{
            title: { text: config.titulo, top: 5 },
            series: [{
              type: 'gauge',
              startAngle: 225,
              endAngle: -45,
              min: config.minY || 0,
              max: config.maxY || 100,
              radius: '95%',
              center: ['50%', '59%'],
              axisLine: {
                lineStyle: {
                  width: 15,
                  color: [
                    [0.25, '#FF6E76'],
                    [0.5, '#FDDD60'],
                    [0.75, '#58D9F9'],
                    [1, '#7CFFB2']
                  ]
                }
              },
              axisLabel: {
                show: true,
                distance: 15,
                formatter: '{value}'
              },
              pointer: {
                icon: 'triangle',
                length: '60%',
                width: 8,
                itemStyle: { color: 'auto' }
              },
              detail: {
                formatter: '{value}',
                offsetCenter: [0, '60%'],
                fontSize: 30,
                color: 'auto'
              },
              data: [{ value: config.valor || 0, name: config.titulo }]
            }]
          }}
        />
      );

    case 'grafico-area':
      return (
        <ReactECharts
          {...chartProps}
          option={{
            ...opcionesBase,
            tooltip: {
              trigger: 'axis',
              formatter: formatearTooltipFechaHora
            },
            xAxis: {
              ...opcionesBase.xAxis,
              data: config.etiquetas || etiquetas
            },
            series: [{
              data: config.valores || [],
              type: 'line',
              areaStyle: {},
              smooth: true,
              itemStyle: { color: config.color || '#5470C6' }
            }]
          }}
        />
      );

    case 'grafico-area-stack':
      return (
        <ReactECharts
          {...chartProps}
          option={{
            ...opcionesBase,
            legend: { data: Object.keys(config.series || {}) },
            series: Object.keys(config.series || {}).map((nombre) => ({
              name: nombre,
              type: 'line',
              stack: 'Total',
              areaStyle: {},
              data: config.series[nombre],
              itemStyle: { color: config.colores?.[nombre] }
            }))
          }}
        />
      );

    case 'grafico-linea-multiple':
      return (
        <ReactECharts
          {...chartProps}
          option={{
            ...opcionesBase,
            legend: { data: Object.keys(config.series || {}) },
            series: Object.keys(config.series || {}).map((nombre) => ({
              name: nombre,
              type: 'line',
              smooth: true,
              data: config.series[nombre],
              itemStyle: { color: config.colores?.[nombre] }
            }))
          }}
        />
      );

    case 'texto':
      return (
        <div
          style={{
            color: config.color,
            fontSize: `${config.fontSize}px`,
            fontFamily: config.fontFamily,
            fontWeight: config.negrita ? 'bold' : 'normal',
            fontStyle: config.cursiva ? 'italic' : 'normal',
            textDecoration: config.subrayado ? 'underline' : 'none',
            textAlign: config.alineacion
          }}
        >
          {config.contenido}
        </div>
      );

    case 'forma-circulo':
      return (
        <div
          className={`w-full h-full rounded-full ${claseSombra}`}
          style={{
            backgroundColor: config.colorRelleno,
            border: `${config.grosorBorde}px solid ${config.colorBorde}`
          }}
        />
      );

    case 'forma-rectangulo':
      return (
        <div
          className={`w-full h-full ${claseSombra}`}
          style={{
            backgroundColor: config.colorRelleno,
            border: `${config.grosorBorde}px solid ${config.colorBorde}`
          }}
        />
      );

    case 'forma-cuadro':
      return (
        <div
          className={`aspect-square h-full ${claseSombra}`}
          style={{
            backgroundColor: config.colorRelleno,
            border: `${config.grosorBorde}px solid ${config.colorBorde}`
          }}
        />
      );

    case 'forma-triangulo':
      return (
        <div className={`w-full h-full flex justify-center items-center ${claseSombra}`}>
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '50px solid transparent',
              borderRight: '50px solid transparent',
              borderBottom: `100px solid ${config.colorRelleno}`
            }}
          />
        </div>
      );

    case 'forma-linea':
      return (
        <div
          className={`w-full h-full ${claseSombra}`}
          style={{
            borderTop: `${config.grosorBorde}px solid ${config.colorBorde}`
          }}
        />
      );

    case 'forma-flecha':
      return (
        <div className={`w-full h-full ${claseSombra}`}>
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <line
              x1="10"
              y1="50"
              x2="90"
              y2="50"
              stroke={config.colorBorde}
              strokeWidth={config.grosorBorde}
              markerEnd="url(#arrowhead)"
            />
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={config.colorBorde} />
              </marker>
            </defs>
          </svg>
        </div>
      );

    case 'forma-flecha-doble':
      return (
        <div className={`w-full h-full ${claseSombra}`}>
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <line
              x1="10"
              y1="50"
              x2="90"
              y2="50"
              stroke={config.colorBorde}
              strokeWidth={config.grosorBorde}
              markerStart="url(#arrowStart)"
              markerEnd="url(#arrowEnd)"
            />
            <defs>
              <marker id="arrowStart" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="10 0, 0 3.5, 10 7" fill={config.colorBorde} />
              </marker>
              <marker id="arrowEnd" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={config.colorBorde} />
              </marker>
            </defs>
          </svg>
        </div>
      );

    case 'herramienta-ml':
      return <HerramientaML key="herramienta-ml" />;

    case 'tabla-ml-tiempo-real':
      return <TablaTiempoReal key="tabla-ml-tiempo-real" config={config} datosTiempoReal={datosTiempoReal} />;

    default:
      return <div>No soportado</div>;
  }
};
