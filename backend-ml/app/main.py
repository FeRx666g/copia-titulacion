from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.prediction_routes import router
import uvicorn
import os

app = FastAPI(
    title="API de Predicción Solar (MVC)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)