import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_DIR = os.path.join(BASE_DIR, "modelo")

MODEL_PATH = os.path.join(MODEL_DIR, "random_forest_model.pkl")
SCALER_X_PATH = os.path.join(MODEL_DIR, "scaler_X.pkl")
SCALER_Y_PATH = os.path.join(MODEL_DIR, "scaler_y.pkl")