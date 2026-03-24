from pydantic import BaseModel
from typing import List

class DatosEntrada(BaseModel):
    hora: int
    lux: float
    temperatura: float
    humedad: float
    nubosidad: float

class DatosEntradaMultiple(BaseModel):
    datos: List[DatosEntrada]

class RespuestaPrediccion(BaseModel):
    potencia_predicha_mW: float

class RespuestaMultiple(BaseModel):
    predicciones: List[float]