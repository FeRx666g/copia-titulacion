# -*- coding: utf-8 -*-

# =============================================
# RED NEURONAL LSTM 
# =============================================

import pandas as pd
import numpy as np
import time
import matplotlib.pyplot as plt

from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from keras.models import Sequential
from keras.layers import LSTM, Dense, Dropout
from keras.optimizers import Adam
from joblib import load

# =============================================
# PASO 1: Cargar y preparar los datos
# =============================================

ruta_base = r'C:\Users\ferx666g\Desktop\Software\TitulacionModelos\RedesNeuronales\\'

X_train = pd.read_csv(ruta_base + 'X_train.csv').values
X_test = pd.read_csv(ruta_base + 'X_test.csv').values
y_train = pd.read_csv(ruta_base + 'y_train.csv').values
y_test = pd.read_csv(ruta_base + 'y_test.csv').values

X_train = X_train.reshape((X_train.shape[0], 1, X_train.shape[1]))
X_test = X_test.reshape((X_test.shape[0], 1, X_test.shape[1]))

sc_y = load(ruta_base + 'scaler_y.pkl')

# =============================================
# PASO 2: Definir y entrenar modelo LSTM
# =============================================

print("\nEntrenando modelo LSTM...\n")

lstm_model = Sequential([
    LSTM(128, return_sequences=True, input_shape=(1, X_train.shape[2])),
    Dropout(0.2),
    LSTM(64),
    Dropout(0.2),
    Dense(32, activation='relu'),
    Dense(1, activation='linear')
])

lstm_model.compile(optimizer=Adam(learning_rate=0.001),
                   loss='mean_squared_error',
                   metrics=['mae'])

start_time = time.time()
history = lstm_model.fit(
    X_train, y_train,
    epochs=50,
    batch_size=32,
    validation_split=0.2,
    verbose=1
)
training_time = time.time() - start_time

# =============================================
# PASO 3: Evaluación del modelo
# =============================================

y_pred_scaled = lstm_model.predict(X_test)
y_test_inv = sc_y.inverse_transform(y_test)
y_pred_inv = sc_y.inverse_transform(y_pred_scaled)

mae = mean_absolute_error(y_test_inv, y_pred_inv)
mse = mean_squared_error(y_test_inv, y_pred_inv)
rmse = np.sqrt(mse)
r2 = r2_score(y_test_inv, y_pred_inv)

resultados_lstm = {
    "Modelo": "LSTM",
    "MAE": round(mae, 4),
    "MSE": round(mse, 4),
    "RMSE": round(rmse, 4),
    "R2": round(r2, 4),
    "Tiempo (s)": round(training_time, 2)
}

print("\nMétricas del modelo LSTM:")
for k, v in resultados_lstm.items():
    print(f"{k}: {v}")

# =============================================
# PASO 4: Visualización de resultados
# =============================================

plt.figure(figsize=(10, 4))
plt.plot(history.history['loss'], label='Entrenamiento')
plt.plot(history.history['val_loss'], label='Validación')
plt.title('Pérdida MSE - Entrenamiento vs Validación (LSTM)')
plt.xlabel('Épocas')
plt.ylabel('Pérdida')
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()

plt.figure(figsize=(8, 4))
plt.scatter(y_test_inv, y_pred_inv, alpha=0.3)
plt.plot([y_test_inv.min(), y_test_inv.max()], [y_test_inv.min(), y_test_inv.max()], 'r--')
plt.title('Potencia real vs predicha (LSTM)')
plt.xlabel('Potencia real')
plt.ylabel('Potencia predicha')
plt.grid(True)
plt.tight_layout()
plt.show()

plt.figure(figsize=(12, 5))
plt.plot(y_test_inv, label='Potencia real', color='blue', linewidth=2)
plt.plot(y_pred_inv, label='Potencia predicha', color='orange', linestyle='--', linewidth=2)
plt.title('Potencia real vs predicha (líneas)')
plt.xlabel('Índice de muestra')
plt.ylabel('Potencia (W)')
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()

plt.figure(figsize=(12, 4))
plt.plot(y_test_inv, label='Potencia real', color='blue')
plt.title('Potencia real')
plt.xlabel('Índice de muestra')
plt.ylabel('Potencia (W)')
plt.grid(True)
plt.tight_layout()
plt.show()

plt.figure(figsize=(12, 4))
plt.plot(y_pred_inv, label='Potencia predicha', color='orange')
plt.title('Potencia predicha por la red LSTM')
plt.xlabel('Índice de muestra')
plt.ylabel('Potencia (W)')
plt.grid(True)
plt.tight_layout()
plt.show()
