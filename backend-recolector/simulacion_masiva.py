import asyncio
import aiohttp
import random
import time
import json
import sys

NUM_USUARIOS = 3
PROJECT_ID = "proyecto-titulacion-9db38"
WEB_API_KEY = "AIzaSyBI4-LGNFSoqqiO9wnc5I6I2yRWjCo2daU"
COLLECTOR_API_KEY = "4AcIv_N8OI7l550EGCz1M8qhHFl723O4"
COLLECTOR_URL = "https://backend-519521736458.us-central1.run.app/api/datos"

TIPOS_SENSORES = [
    {"tipo": "temperatura", "nombre": "Sensor Temperatura", "unidad": "°C", "min": 15, "max": 35},
    {"tipo": "humedad", "nombre": "Sensor Humedad", "unidad": "%", "min": 30, "max": 90},
    {"tipo": "lux", "nombre": "Sensor Luz", "unidad": "Lux", "min": 0, "max": 65000},
    {"tipo": "nubosidad", "nombre": "Sensor Nubosidad", "unidad": "%", "min": 0, "max": 100}
]

async def get_id_token(session, email, password):
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={WEB_API_KEY}"
    payload = {"email": email, "password": password, "returnSecureToken": True}
    async with session.post(url, json=payload) as resp:
        if resp.status == 200:
            data = await resp.json()
            return data["idToken"], data["localId"]
        else:
            print(f"Error login {email}: {resp.status}")
            return None, None

async def crear_dispositivo_firestore(session, id_token, uid, dev_id, sensor_info):
    document_content = {
        "fields": {
            "id_dispositivo": {"stringValue": dev_id},
            "nombre": {"stringValue": sensor_info["nombre"]},
            "tipo": {"stringValue": "Sensor"},
            "descripcion": {"stringValue": f"Sensor simulado de {sensor_info['tipo']}"},
            "unidad": {"stringValue": sensor_info["unidad"]},
            "uid": {"stringValue": uid},
            "creado": {"timestampValue": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())},
            "activo": {"booleanValue": True},
            "sim_tipo": {"stringValue": sensor_info["tipo"]} 
        }
    }

    headers = {"Authorization": f"Bearer {id_token}"}

    url_global = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/dispositivos/{dev_id}"
    async with session.patch(url_global, json=document_content, headers=headers) as resp:
        if resp.status != 200:
            print(f"Error creando dispositivo global {dev_id}: {await resp.text()}")

    url_usuario = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/usuarios/{uid}/dispositivos/{dev_id}"
    async with session.patch(url_usuario, json=document_content, headers=headers) as resp:
        if resp.status != 200:
            print(f"Error creando dispositivo usuario {uid}: {await resp.text()}")

async def setup_usuario(session, user_index):
    email = f"test{user_index}@test.com"
    password = "clavetest"
    
    token, uid = await get_id_token(session, email, password)
    if not token:
        return

    tasks = []
    for sensor in TIPOS_SENSORES:
        dev_id = f"u{user_index}_{sensor['tipo']}"
        tasks.append(crear_dispositivo_firestore(session, token, uid, dev_id, sensor))
    
    await asyncio.gather(*tasks)
    if user_index % 10 == 0:
        print(f"Usuario {user_index} configurado.")

async def setup_masivo():
    print(f"Iniciando configuración de dispositivos para {NUM_USUARIOS} usuarios...")
    async with aiohttp.ClientSession() as session:
        batch_size = 50
        for i in range(1, NUM_USUARIOS + 1, batch_size):
            batch = range(i, min(i + batch_size, NUM_USUARIOS + 1))
            await asyncio.gather(*(setup_usuario(session, idx) for idx in batch))
    print(" Configuración finalizada.")

def generar_valor_simulado(tipo):
    if tipo == "temperatura":
        return round(random.uniform(15.0, 30.0), 2)
    elif tipo == "humedad":
        return round(random.uniform(40.0, 90.0), 2)
    elif tipo == "lux":
        return random.randint(100, 60000)
    elif tipo == "nubosidad":
        return random.randint(0, 100)
    return 0

async def enviar_batch_mediciones(session, batch_usuarios):
    mediciones = []
    
    for i in batch_usuarios:
        for sensor in TIPOS_SENSORES:
            dev_id = f"u{i}_{sensor['tipo']}"
            valor = generar_valor_simulado(sensor["tipo"])
            mediciones.append({
                "id_dispositivo": dev_id,
                "datos": {
                    sensor["tipo"]: valor
                }
            })
    
    payload = {"mediciones": mediciones}
    headers = {
        "Content-Type": "application/json",
        "x-api-key": COLLECTOR_API_KEY
    }
    
    try:
        async with session.post(COLLECTOR_URL, json=payload, headers=headers) as resp:
            if resp.status != 200:
                print(f"Error enviando batch: {resp.status}")
    except Exception as e:
        print(f"Excepción enviando batch: {e}")

async def simulacion_masiva():
    print(f"Iniciando simulación de tráfico para {NUM_USUARIOS * 4} sensores...")
    
    async with aiohttp.ClientSession() as session:
        while True:
            start_time = time.time()
            
            tasks = []
            batch_size = 50
            for i in range(1, NUM_USUARIOS + 1, batch_size):
                batch = range(i, min(i + batch_size, NUM_USUARIOS + 1))
                tasks.append(enviar_batch_mediciones(session, batch))
            
            await asyncio.gather(*tasks)
            
            elapsed = time.time() - start_time
            print(f"Ciclo completado en {elapsed:.2f}s. Enviados datos de {NUM_USUARIOS} usuarios.")
            
            await asyncio.sleep(max(0, 1.0 - elapsed))

if __name__ == "__main__":
    
    print("SELECCIONE MODO:")
    print("1. SETUP (Crear dispositivos en Firestore)")
    print("2. SIMULACIÓN (Enviar datos masivos)")
    print("3. AMBOS (Setup + Simulación)")
    
    modo = input("Opción: ")
    
    if modo == "1":
        asyncio.run(setup_masivo())
    elif modo == "2":
        asyncio.run(simulacion_masiva())
    elif modo == "3":
        asyncio.run(setup_masivo())
        time.sleep(2)
        asyncio.run(simulacion_masiva())
    else:
        print("Opción inválida")