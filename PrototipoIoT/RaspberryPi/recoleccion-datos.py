import paho.mqtt.client as mqtt
import threading
import time
import psycopg2
from datetime import datetime

# ConfiguraciÃ³n MQTT
MQTT_BROKER = "localhost"
MQTT_TOPIC_SENSORES = "arduino/controlador"
MQTT_TOPIC_NUBOSIDAD = "esp32cam/controlador"

# ConfiguraciÃ³n PostgreSQL
DB_CONFIG = {
    "dbname": "proyecto_titulacion",
    "user": "ferx666g",
    "password": "Fdgq666",
    "host": "localhost",
    "port": 5432
}

ID_DISPOSITIVO = 1
ID_UBICACION = 1

mqtt_to_sensor = {
    "l": "lux",
    "t": "temperatura",
    "h": "humedad",
    "4": "fotoresistor14",
    "5": "fotoresistor15",
    "6": "fotoresistor16",
    "7": "fotoresistor17",
    "s9": "servo9",
    "s10": "servo10",
    "v1": "voltaje_producido",
    "c1": "corriente_producida",
    "p1": "potencia_producida",
    "i": "irradiancia",
    "v": "voltaje_bateria",
    "c": "corriente_bateria",
    "p": "potencia_bateria",
    "nubosidad": "nubosidad"
}

# ConexiÃ³n
conn = psycopg2.connect(**DB_CONFIG)
cursor = conn.cursor()

# Buffer y Lock globales
buffer_sensores = {}
buffer_lock = threading.Lock()

# Variable global permanente de nubosidad
ultimo_valor_nubosidad = None

# Parseador de mensajes tipo arduino/controlador
def parsear_mensaje(mensaje):
    datos = {}
    mensaje = mensaje.replace("#;#;", "").replace("$%", "")
    bloques = mensaje.split("$:")
    for bloque in bloques:
        for par in bloque.split(";"):
            if ":" in par:
                k, v = par.split(":")
                try:
                    datos[k.lower()] = float(v)
                except:
                    datos[k.lower()] = None
    return datos

# Hilo que guarda los datos del buffer cada segundo exacto
def guardar_datos_buffer():
    global buffer_sensores, ultimo_valor_nubosidad
    while True:
        now = datetime.now().replace(microsecond=0)

        cursor.execute("SELECT id FROM tiempo WHERE timestamp = %s", (now,))
        tiempo_row = cursor.fetchone()
        if not tiempo_row:
            cursor.execute("""
                INSERT INTO tiempo (timestamp, anio, mes, dia, hora, minuto, segundo)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (now, now.year, now.month, now.day, now.hour, now.minute, now.second))
            conn.commit()
            cursor.execute("SELECT id FROM tiempo WHERE timestamp = %s", (now,))
            tiempo_row = cursor.fetchone()
        tiempo_id = tiempo_row[0]

        with buffer_lock:
            # ðŸ’¡ Siempre agregar el Ãºltimo valor de nubosidad antes de guardar
            if ultimo_valor_nubosidad is not None:
                buffer_sensores["nubosidad"] = ultimo_valor_nubosidad

            for clave, valor in buffer_sensores.items():
                if clave not in mqtt_to_sensor:
                    continue
                nombre_sensor = mqtt_to_sensor[clave]
                cursor.execute("SELECT id FROM sensor WHERE nombre = %s", (nombre_sensor,))
                sensor_row = cursor.fetchone()
                if not sensor_row:
                    print("âŒ Sensor no encontrado:", nombre_sensor)
                    continue
                sensor_id = sensor_row[0]

                cursor.execute("""
                    INSERT INTO sensor_valor (id_tiempo, id_dispositivo, id_ubicacion, id_sensor, valor)
                    VALUES (%s, %s, %s, %s, %s)
                """, (tiempo_id, ID_DISPOSITIVO, ID_UBICACION, sensor_id, valor))
                print(f"âœ… Guardado: {nombre_sensor} = {valor} ({now})")

            conn.commit()
            buffer_sensores.clear()

        time.sleep(1 - (time.time() % 1))

# Al recibir mensajes MQTT
def on_message(client, userdata, msg):
    global ultimo_valor_nubosidad
    payload = msg.payload.decode().strip()

    if msg.topic == MQTT_TOPIC_SENSORES:
        datos = parsear_mensaje(payload)
        with buffer_lock:
            buffer_sensores.update(datos)

    elif msg.topic == MQTT_TOPIC_NUBOSIDAD:
        if "nubosidad:" in payload:
            try:
                valor = float(payload.replace("nubosidad:", "").strip())
                print(f"ðŸŸ¢ Nubosidad recibida: {valor}% (actualizada en memoria)")
                ultimo_valor_nubosidad = valor  # âœ… Solo actualiza la memoria
            except:
                print("âŒ Error al parsear nubosidad:", payload)

# ConfiguraciÃ³n MQTT
cliente = mqtt.Client()
cliente.on_message = on_message
cliente.connect(MQTT_BROKER, 1883, 60)
cliente.subscribe(MQTT_TOPIC_SENSORES)
cliente.subscribe(MQTT_TOPIC_NUBOSIDAD)

# Lanzar hilo para guardar buffer cada segundo exacto
threading.Thread(target=guardar_datos_buffer, daemon=True).start()

print("âœ… Escuchando MQTT en:")
print("-", MQTT_TOPIC_SENSORES)
print("-", MQTT_TOPIC_NUBOSIDAD)

cliente.loop_forever()
