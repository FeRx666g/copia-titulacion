# =============================================
# RED NEURONAL MLP 
# =============================================

import pandas as pd
import numpy as np
import time
import matplotlib.pyplot as plt

from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from keras.models import Sequential
from keras.layers import Dense
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

sc_y = load(ruta_base + 'scaler_y.pkl')

# =============================================
# PASO 2: Definir y entrenar modelo MLP
# =============================================

print("\nEntrenando modelo MLP...\n")

mlp_model = Sequential([
    Dense(50, activation='relu', input_shape=(X_train.shape[1],)),
    Dense(30, activation='relu'),
    Dense(1, activation='linear')
])

mlp_model.compile(optimizer=Adam(learning_rate=0.001),
                  loss='mean_squared_error',
                  metrics=['mae'])

start_time = time.time()
history = mlp_model.fit(
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

y_pred_scaled = mlp_model.predict(X_test)
y_test_inv = sc_y.inverse_transform(y_test)
y_pred_inv = sc_y.inverse_transform(y_pred_scaled)

mae = mean_absolute_error(y_test_inv, y_pred_inv)
mse = mean_squared_error(y_test_inv, y_pred_inv)
rmse = np.sqrt(mse)
r2 = r2_score(y_test_inv, y_pred_inv)

resultados_mlp = {
    "Modelo": "MLP 13-50-30-1",
    "MAE": round(mae, 4),
    "MSE": round(mse, 4),
    "RMSE": round(rmse, 4),
    "R2": round(r2, 4),
    "Tiempo (s)": round(training_time, 2)
}

print("\nMétricas del modelo MLP:")
for k, v in resultados_mlp.items():
    print(f"{k}: {v}")

# =============================================
# PASO 4: Visualización de resultados
# =============================================

plt.figure(figsize=(8, 4))
plt.scatter(y_test_inv, y_pred_inv, alpha=0.3)
plt.plot(
    [y_test_inv.min(), y_test_inv.max()],
    [y_test_inv.min(), y_test_inv.max()],
    'r--'
)
plt.title('Potencia real vs predicha (MLP)')
plt.xlabel('Potencia real')
plt.ylabel('Potencia predicha')
plt.grid(True)
plt.tight_layout()
plt.show()

plt.figure(figsize=(12, 5))
plt.plot(y_test_inv, label='Potencia real', color='blue', linewidth=2)
plt.plot(y_pred_inv, label='Potencia predicha', color='orange', linestyle='--', linewidth=2)
plt.title('Potencia real vs predicha (líneas) - MLP')
plt.xlabel('Índice de muestra')
plt.ylabel('Potencia (mW)')
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()

plt.figure(figsize=(12, 4))
plt.plot(y_test_inv, label='Potencia real', color='blue')
plt.title('Potencia real')
plt.xlabel('Índice de muestra')
plt.ylabel('Potencia (mW)')
plt.grid(True)
plt.tight_layout()
plt.show()

plt.figure(figsize=(12, 4))
plt.plot(y_pred_inv, label='Potencia predicha por RF', color='orange')
plt.title('Potencia predicha por MLP')
plt.xlabel('Índice de muestra')
plt.ylabel('Potencia (mW)')
plt.grid(True)
plt.tight_layout()
plt.show()

#mlp_model.save(ruta_base + 'mlp_model.h5')
#print("Modelo entrenado y guardado exitosamente.")

