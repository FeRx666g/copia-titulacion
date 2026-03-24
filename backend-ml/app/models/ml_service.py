import joblib
import numpy as np
from app.config.config import MODEL_PATH, SCALER_X_PATH, SCALER_Y_PATH

class MLService:
    def __init__(self):
        self.model = None
        self.scaler_x = None
        self.scaler_y = None
        self._load_model()

    def _load_model(self):
        try:
            self.model = joblib.load(MODEL_PATH)
            self.scaler_x = joblib.load(SCALER_X_PATH)
            self.scaler_y = joblib.load(SCALER_Y_PATH)
        except Exception as e:
            raise e

    def predecir(self, entrada_array: np.ndarray) -> np.ndarray:
        entrada_escalada = self.scaler_x.transform(entrada_array)
        pred_esc = self.model.predict(entrada_escalada).reshape(-1, 1)
        pred_mw = self.scaler_y.inverse_transform(pred_esc)
        return pred_mw

ml_service = MLService()