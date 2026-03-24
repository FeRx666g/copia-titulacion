# receptor-esp32cam.py
from fastapi import FastAPI, UploadFile, File
import shutil
import os
from datetime import datetime
import openai
import base64
import paho.mqtt.publish as publish

app = FastAPI()

# Inicializar cliente OpenAI
client = openai.OpenAI(api_key="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")

# ConfiguraciÃ³n MQTT
MQTT_BROKER = "localhost"
MQTT_TOPIC_NUBOSIDAD = "esp32cam/controlador"

@app.get("/")
def read_root():
    return {"mensaje": "FastAPI funcionando en Raspberry Pi - Publica nubosidad SOLO cuando recibe imagen"}

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    carpeta = "./imagenes"
    os.makedirs(carpeta, exist_ok=True)

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_path = os.path.join(carpeta, f"foto_{now}.jpg")

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    print(f"ðŸ“¸ Imagen guardada en: {save_path}")

    with open(save_path, "rb") as img_file:
        base64_image = base64.b64encode(img_file.read()).decode()

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Analiza la imagen enviada. Ignora muros, cables, Ã¡rboles u otros obstÃ¡culos. Analiza solo el cielo visible, aunque sea parcialmente bloqueado. Ten en cuenta que el cielo puede parecer uniforme, gris, verdoso o con poca luz debido a la cÃ¡mara. Esto puede indicar nubosidad alta aunque no haya patrones de nubes claramente definidos. Estima el porcentaje de nubosidad en el cielo visible como un nÃºmero entero entre 0 y 100. No incluyas texto adicional, solo el nÃºmero, y si detectas que la imagen es el interior de una habitacion, sala, estudio, aula, etc. o no logras reconocer la ubicacin de la imagen pon que la estimacion de porcentaje de nubosidad es del 100%",
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                            },
                        },
                    ],
                }
            ],
            max_tokens=10
        )

        nuevo_valor = response.choices[0].message.content.strip().replace("%", "")
        print(f"Porcentaje de nubosidad estimado: {nuevo_valor}%")

        # âœ… Publicar SOLO UNA VEZ cuando procesa imagen
        publish.single(MQTT_TOPIC_NUBOSIDAD, f"nubosidad:{nuevo_valor}", hostname=MQTT_BROKER, port=1883)
        print(f"Publicado en MQTT {MQTT_TOPIC_NUBOSIDAD}: nubosidad:{nuevo_valor}")

        return {
            "mensaje": "Imagen recibida y analizada",
            "ruta": save_path,
            "nubosidad_estimado": nuevo_valor
        }

    except Exception as e:
        print(f"Error al consultar OpenAI: {e}")
        return {
            "mensaje": "Imagen recibida, pero fallÃ³ el anÃ¡lisis con OpenAI",
            "ruta": save_path,
            "error": str(e)
        }
