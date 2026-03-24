# publicador-backend.py
import paho.mqtt.client as mqtt
import requests
import threading
import time
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

MQTT_BROKER = "localhost"
MQTT_TOPIC_SENSORES = "arduino/controlador"
MQTT_TOPIC_NUBOSIDAD = "esp32cam/controlador"

BACKEND_URL = "https://backend-519521736458.us-central1.run.app/api/datos"
API_KEY = "jnY1z0Ir87LrWxSJQ42cqa3dU2DIF68s"

try:
    cred = credentials.Certificate("credencial.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase inicializado correctamente.")
except Exception as e:
    print(f"Error al inicializar Firebase: {e}")
    try:
        db = firestore.client()
    except:
        print("Error fatal obteniendo cliente Firestore")

sensor_a_dispositivo = {}
sensor_lock = threading.Lock()

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

def on_snapshot(doc_snapshot, changes, read_time):
    global sensor_a_dispositivo
    for doc in doc_snapshot:
        datos = doc.to_dict()
        with sensor_lock:
            sensor_a_dispositivo = datos
        print(f"Configuracion de sensores actualizada ({len(sensor_a_dispositivo)} sensores)")

try:
    doc_ref = db.collection("configuracion").document("sensores_ids")
    doc_ref.on_snapshot(on_snapshot)
    print("Escuchando cambios en configuracion/sensores_ids...")
except Exception as e:
    print(f"Error configurando listener de Firestore: {e}")

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

def publicar_backend():
    global ultimo_valor_nubosidad
    while True:
        with buffer_lock:
            if ultimo_valor_nubosidad is not None:
                buffer_sensores["nubosidad"] = ultimo_valor_nubosidad

            if not buffer_sensores:
                time.sleep(1)
                continue

            mediciones = []
            
            with sensor_lock:
                mapeo_actual = sensor_a_dispositivo.copy()

            for clave_sensor, valor in buffer_sensores.items():
                if clave_sensor not in mapeo_actual:
                    continue

                id_dispositivo = mapeo_actual[clave_sensor]
                
                if not id_dispositivo: 
                    continue

                mediciones.append({
                    "id_dispositivo": id_dispositivo,
                    "datos": {
                        clave_sensor: valor
                    }
                })

            if mediciones:
                try:
                    response = requests.post(
                        BACKEND_URL,
                        json={"mediciones": mediciones},
                        headers={
                            "Content-Type": "application/json",
                            "x-api-key": API_KEY
                        },
                        timeout=5
                    )
                    if response.status_code == 200:
                        print(f"Publicado al backend ({len(mediciones)} mediciones)")
                    else:
                        print(f"Error HTTP: {response.status_code} - {response.text}")
                except Exception as e:
                    print(f"Error al conectarse al backend: {e}")

            buffer_sensores.clear()
        time.sleep(1)

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

cliente = mqtt.Client()
cliente.on_message = on_message
cliente.connect(MQTT_BROKER, 1883, 60)
cliente.subscribe(MQTT_TOPIC_SENSORES)
cliente.subscribe(MQTT_TOPIC_NUBOSIDAD)

threading.Thread(target=publicar_backend, daemon=True).start()

print("Escuchando MQTT y publicando datos...")
print("MQTT topics:")
print("  -", MQTT_TOPIC_SENSORES)
print("  -", MQTT_TOPIC_NUBOSIDAD)

cliente.loop_forever()


