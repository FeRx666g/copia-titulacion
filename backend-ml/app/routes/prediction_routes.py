from fastapi import APIRouter
from app.schemas.prediction_schemas import DatosEntrada, DatosEntradaMultiple, RespuestaPrediccion, RespuestaMultiple
from app.controllers.prediction_controller import predecir_individual, predecir_batch

router = APIRouter()

@router.post("/predecir", response_model=RespuestaPrediccion)
def endpoint_predecir(data: DatosEntrada):
    return predecir_individual(data)

@router.post("/predecir-multiple", response_model=RespuestaMultiple)
def endpoint_predecir_multiple(payload: DatosEntradaMultiple):
    return predecir_batch(payload)