ARCHIVO="UsoCPU_Memoria_GestionSensores.csv"

if [ ! -f "$ARCHIVO" ]; then
    echo "Fecha_Hora,Nombre_Contenedor,CPU_Porcentaje,Memoria_Uso,Memoria_Porcentaje" > "$ARCHIVO"
fi

echo "--- MONITOR INICIADO ---"
echo "Grabando métricas individuales y TOTALES en: $ARCHIVO"
echo "Presiona [CTRL+C] para detener."

while true; do
    TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
    
    docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}}" > /tmp/docker_stats_snap.txt
    
    cat /tmp/docker_stats_snap.txt | tr -d '%' | while read line; do
        echo "$TIMESTAMP,$line" >> "$ARCHIVO"
    done
    
    TOTAL_LINE=$(awk -F, '{ 
        gsub("%","",$2); 
        gsub("%","",$4); 
        sum_cpu += $2; 
        sum_mem += $4; 
    } END { 
        printf "TOTAL_DOCKER,%.2f,N/A,%.2f", sum_cpu, sum_mem 
    }' /tmp/docker_stats_snap.txt)
    
    echo "$TIMESTAMP,$TOTAL_LINE" >> "$ARCHIVO"

    sleep 1
done