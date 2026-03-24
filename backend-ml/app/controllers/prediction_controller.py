import numpy as np
from app.schemas.prediction_schemas import DatosEntrada, DatosEntradaMultiple
from app.models.ml_service import ml_service

def predecir_individual(data: DatosEntrada):
    entrada_raw = np.array([
        data.hora,
        data.lux,
        data.temperatura,
        data.humedad,
        data.nubosidad
    ]).reshape(1, -1)

    resultado_mw = ml_service.predecir(entrada_raw)

    return {
        "potencia_predicha_mW": round(float(resultado_mw[0][0]), 2)
    }

def predecir_batch(payload: DatosEntradaMultiple):
    matriz_raw = np.array([
        [d.hora, d.lux, d.temperatura, d.humedad, d.nubosidad]
        for d in payload.datos
    ])

    resultado_mw = ml_service.predecir(matriz_raw)

    predicciones = resultado_mw.flatten().tolist()
    predicciones_redondeadas = [round(p, 2) for p in predicciones]

    return {
        "predicciones": predicciones_redondeadas
    }