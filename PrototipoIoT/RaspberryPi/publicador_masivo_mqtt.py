import paho.mqtt.client as mqtt
import requests
import threading
import time
from datetime import datetime

NUM_USUARIOS = 384
BACKEND_URL = "https://backend-519521736458.us-central1.run.app/api/datos"
API_KEY = "jnY1z0Ir87LrWxSJQ42cqa3dU2DIF68s"

MQTT_BROKER = "localhost"
MQTT_TOPIC_SENSORES = "arduino/controlador"
MQTT_TOPIC_NUBOSIDAD = "esp32cam/controlador"

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

buffer_sensores = {}
buffer_lock = threading.Lock()
ultimo_valor_nubosidad = 0 

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

def on_message(client, userdata, msg):
    global buffer_sensores, ultimo_valor_nubosidad
    payload = msg.payload.decode().strip()
    
    datos = parsear_mensaje(payload)
    with buffer_lock:
        for k, v in datos.items():
            if k in mqtt_to_sensor:
                nombre_variable = mqtt_to_sensor[k]
                buffer_sensores[nombre_variable] = v
                if nombre_variable == "nubosidad":
                    ultimo_valor_nubosidad = v

def publicar_masivo_backend():
    global ultimo_valor_nubosidad
    
    print(f"Iniciando REPLICACIÓN MASIVA de datos para {NUM_USUARIOS} usuarios...")
    print(f"Escuchando broker en {MQTT_BROKER}...")

    while True:
        input_data = {}
        with buffer_lock:
            if ultimo_valor_nubosidad is not None:
                buffer_sensores["nubosidad"] = ultimo_valor_nubosidad
            
            if buffer_sensores:
                input_data = buffer_sensores.copy()
                buffer_sensores.clear()
            else:
                pass
        
        if not input_data:
            time.sleep(1)
            continue

        print(f"--- Ciclo de Envío: {datetime.now().strftime('%H:%M:%S')} ---")
        print(f"Datos recibidos reales: {input_data}")

        mediciones_batch = []
        
        for i in range(1, NUM_USUARIOS + 1):
            user_prefix = f"u{i}"
            
            for tipo_sensor, valor in input_data.items():
                
                if tipo_sensor in ["lux", "temperatura", "humedad", "nubosidad"]:
                    id_dispositivo = f"{user_prefix}_{tipo_sensor}"
                    
                    mediciones_batch.append({
                        "id_dispositivo": id_dispositivo,
                        "datos": {
                            tipo_sensor: valor
                        }
                    })

        if not mediciones_batch:
            print("No hay datos de sensores relevantes para replicar (solo datos extra).")
            time.sleep(1)
            continue

        chunk_size = 500
        total_chunks = [mediciones_batch[i:i + chunk_size] for i in range(0, len(mediciones_batch), chunk_size)]
        
        print(f"Replicando a {len(mediciones_batch)} dispositivos virtuales. Enviando en {len(total_chunks)} lotes...")

        for idx, chunk in enumerate(total_chunks):
            try:
                response = requests.post(
                    BACKEND_URL,
                    json={"mediciones": chunk},
                    headers={
                        "Content-Type": "application/json",
                        "x-api-key": API_KEY
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    print(f"  Lote {idx+1}/{len(total_chunks)}: OK")
                else:
                    print(f"  Lote {idx+1}/{len(total_chunks)}: ERROR {response.status_code} - {response.text}")
            
            except Exception as e:
                print(f"  Lote {idx+1}: Excepción de conexión: {e}")

        time.sleep(1)

cliente = mqtt.Client()
cliente.on_message = on_message

try:
    cliente.connect(MQTT_BROKER, 1883, 60)
    cliente.subscribe(MQTT_TOPIC_SENSORES)
    cliente.subscribe(MQTT_TOPIC_NUBOSIDAD)
    
    threading.Thread(target=publicar_masivo_backend, daemon=True).start()

    cliente.loop_forever()

except Exception as e:
    print(f"\nError conectando a MQTT ({MQTT_BROKER}): {e}")
    print("Asegúrate de que Mosquitto esté corriendo y los topics sean correctos.")
