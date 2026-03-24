import requests
import random
import time

# Configuración de la API
API_KEY = "4AcIv_N8OI7l550EGCz1M8qhHFl723O4"
URL = "https://backend-519521736458.us-central1.run.app/api/datos"

# Mapa de dispositivos
dispositivos = {
    "-e47AyTILT": "lux",
    "Synqbh4COb": "temperatura",
    "bpCgdAYLaz": "humedad",
    "PnRqoCSPIY": "nubosidad"
} 

""" dispositivos = {
    "YN33edT7T1": "lux",
    "ERIyvDLVQw": "temperatura",
    "oWiZxhAUmc": "humedad",
    "jEZG5P20k1": "nubosidad"
} """

# Generar valor según tipo
def generar_valor(sensor):
    if sensor == "temperatura":
        return round(random.uniform(15.0, 15.0), 2)
    elif sensor == "humedad":
        return round(random.uniform(100.0, 100.0), 2)
    elif sensor == "lux":
        return random.randint(65000, 65000)
    elif sensor == "nubosidad":
        return random.randint(100, 100)
    else:
        return 0

# Configuración de las cabeceras
headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

print("Enviando mediciones por dispositivo cada segundo... (Ctrl+C para detener)")

# Bucle para enviar datos continuamente
try:
    while True:
        mediciones = []
        print("Datos enviados:")

        # Generar mediciones para cada dispositivo
        for dispositivo, variable in dispositivos.items():
            valor = generar_valor(variable)
            print(f"  - {dispositivo} | {variable}: {valor}")
            mediciones.append({
                "id_dispositivo": dispositivo,
                "datos": {
                    variable: valor
                }
            })

        # Preparar el payload
        payload = {
            "mediciones": mediciones
        }

        # Enviar la solicitud POST
        response = requests.post(URL, json=payload, headers=headers)

        # Imprimir la respuesta del servidor
        print("Estado:", response.status_code, response.text)
        print("Esperando...\n")
        time.sleep(1)

except KeyboardInterrupt:
    print("Detenido por el usuario.")
