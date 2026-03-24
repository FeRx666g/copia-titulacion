import React, { useState, useContext } from "react"; 
import { HerramientaMLCSV } from "../componentes/HerramientaMLCSV";
import ReactECharts from "echarts-for-react";
import { UserContext } from "../providers/UserProvider"; 
import { AccesoDenegado } from "../componentes/AccesoDenegado"; 

export const PrediccionEstaticaCSV = () => {
    const { user } = useContext(UserContext); 
    const [resultados, setResultados] = useState([]);
    const [filas, setFilas] = useState([]);

    const getHoraLabel = (idx) => {
        const fila = filas[idx] || {};
        const res = resultados[idx] || {};

        const hora = fila.hora ?? res.hora;
        const minuto = fila.minuto ?? res.minuto;

        const hh = hora !== undefined && hora !== null
            ? hora.toString().padStart(2, '0')
            : "--";
        const mm = minuto !== undefined && minuto !== null
            ? minuto.toString().padStart(2, '0')
            : "--";

        return `${hh}:${mm}`;
    };

    const getDia = (idx) => {
        const fila = filas[idx] || {};
        const res = resultados[idx] || {};
        return fila.dia ?? res.dia;
    };

    if (!user) {
        return <AccesoDenegado />;
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black p-4 m-2 flex flex-col items-center">

            <HerramientaMLCSV
                ancho={1200}
                alto={600}
                onResultados={(res, filasData) => {
                    if (res) setResultados(res);
                    if (filasData) setFilas(filasData);
                }}
            />

            <div className="tour-chart-csv relative mt-8 w-full max-w-7xl shadow-xl rounded-lg bg-white p-4">

                <div className="absolute top-2 right-2 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-gray-300 dark:border-zinc-700 rounded-lg px-4 py-2 shadow-md text-xs max-w-[320px] pointer-events-none">
                    <p className="font-bold text-gray-800 dark:text-gray-100 mb-1">Resultados de la evaluación del modelo de ML</p>
                    <p className="text-gray-700 dark:text-gray-200"><span className="font-semibold">Modelo:</span> Random Forest</p>
                    <p className="text-gray-700 dark:text-gray-200"><span className="font-semibold">MAE:</span> 6.0685 mW</p>
                    <p className="text-gray-700 dark:text-gray-200"><span className="font-semibold">MSE:</span> 659.1507 mW²</p>
                    <p className="text-gray-700 dark:text-gray-200"><span className="font-semibold">R²:</span> 0.9971</p>
                </div>

                <ReactECharts
                    option={{
                        backgroundColor: "#fff",
                        title: { text: "Potencia Predicha (mW)", left: "center" },
                        legend: { top: 30, data: ["Predicción (mW)"] },

                        tooltip: {
                            trigger: "axis",
                            formatter: (params) => {
                                if (!params || !params.length) return "";
                                const p = params[0];
                                const idx = p.dataIndex;

                                const dia = getDia(idx);
                                const horaLabel = getHoraLabel(idx);
                                const valor = p.data;

                                const valorTxt =
                                    valor == null || Number.isNaN(Number(valor))
                                        ? "—"
                                        : `${Number(valor).toFixed(2)} mW`;

                                const encabezado =
                                    dia !== undefined && dia !== null && dia !== ""
                                        ? `Día ${dia} - ${horaLabel}`
                                        : `Hora: ${horaLabel}`;

                                return `${encabezado}<br/>${p.seriesName}: ${valorTxt}`;
                            },
                        },

                        grid: {
                            left: 60,
                            right: 30,
                            bottom: 60,
                            top: 130,
                            containLabel: true,
                        },

                        xAxis: {
                            type: "category",
                            data: resultados.map((_, idx) => getHoraLabel(idx)),
                            name: "Hora",
                            nameLocation: "middle",
                            nameGap: 35,
                            axisLabel: { rotate: 30 },
                            axisLine: { lineStyle: { color: "#ccc" } },
                            nameTextStyle: { fontSize: 12, fontWeight: "bold" },
                        },

                        yAxis: {
                            type: "value",
                            name: "Potencia (mW)",
                            nameLocation: "middle",
                            nameGap: 50,
                            axisLine: { lineStyle: { color: "#ccc" } },
                            nameTextStyle: { fontSize: 12, fontWeight: "bold" },
                        },

                        graphic:
                            resultados.length === 0
                                ? [
                                    {
                                        type: "text",
                                        left: "center",
                                        top: "middle",
                                        style: {
                                            text: "Sin datos para mostrar.",
                                            fontSize: 16,
                                            fill: "#888",
                                            textAlign: "center",
                                        },
                                    },
                                ]
                                : [],

                        series: [
                            {
                                name: "Predicción (mW)",
                                data: resultados.map((r) =>
                                    r?.potencia !== undefined
                                        ? Number(Number(r.potencia).toFixed(2))
                                        : null
                                ),
                                type: "line",
                                smooth: false,
                                symbol: "circle",
                                symbolSize: 8,
                                lineStyle: { width: 2, color: "#3b82f6" },
                                itemStyle: { color: "#3b82f6" },
                            },
                        ],
                    }}
                    notMerge={true}
                    style={{ height: "500px", width: "100%", margin: "0 auto" }}
                />

            </div>
        </div>
    );
};