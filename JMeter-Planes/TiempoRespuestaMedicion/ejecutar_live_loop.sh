#!/bin/bash

PLAN_JMX="Plan_PrediccionTiempoReal_Live.jmx"
RESULTADOS_DIR="resultados_live"
ITERACIONES=10 
INTERVALO_SEG=5 

mkdir -p "$RESULTADOS_DIR"

echo "=========================================="
echo "Iniciando ejecución en bucle de: $PLAN_JMX"
echo "Total iteraciones: $ITERACIONES"
echo "Resultados en: $RESULTADOS_DIR"
echo "=========================================="

for ((i=1; i<=ITERACIONES; i++))
do
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    ARCHIVO_RES="$RESULTADOS_DIR/resultado_iteracion_${i}_${TIMESTAMP}.jtl"
    ARCHIVO_LOG="$RESULTADOS_DIR/log_iteracion_${i}_${TIMESTAMP}.log"

    echo ""
    echo "[$(date '+%H:%M:%S')] Ejecutando iteración $i de $ITERACIONES..."
    
    ./jmeter -n -t "$PLAN_JMX" -l "$ARCHIVO_RES" -j "$ARCHIVO_LOG"

    echo "Iteración $i finalizada. Resultado guardado en $ARCHIVO_RES"

    if [ $i -lt $ITERACIONES ]; then
        echo "Esperando $INTERVALO_SEG segundos para la siguiente ejecución..."
        sleep $INTERVALO_SEG
    fi
done

echo ""
echo "=========================================="
echo "Fin del ciclo de pruebas."
echo "=========================================="
