# =============================================
# RANDOM FOREST REGRESSOR
# =============================================

import pandas as pd
import numpy as np
import time
import matplotlib.pyplot as plt
from joblib import load, dump  

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# =============================================
# PASO 1: Cargar los datos
# =============================================

ruta_base = r'C:\Users\ferx666g\Desktop\Software\TitulacionModelos\RedesNeuronales\\'

X_train = pd.read_csv(ruta_base + 'X_train.csv').values
X_test = pd.read_csv(ruta_base + 'X_test.csv').values
y_train = pd.read_csv(ruta_base + 'y_train.csv').values.ravel()
y_test = pd.read_csv(ruta_base + 'y_test.csv').values

sc_y = load(ruta_base + 'scaler_y.pkl')

# =============================================
# PASO 2: Entrenar el modelo
# =============================================

print("\nEntrenando modelo Random Forest...\n")

start_time = time.time()

rf_model = RandomForestRegressor(
    n_estimators=100,
    criterion='squared_error',
    random_state=42,
    n_jobs=-1
)

rf_model.fit(X_train, y_train)
training_time = time.time() - start_time

# =============================================
# PASO 3: Evaluar el modelo
# =============================================

y_pred_scaled = rf_model.predict(X_test).reshape(-1, 1)
y_test_inv = sc_y.inverse_transform(y_test)
y_pred_inv = sc_y.inverse_transform(y_pred_scaled)

mae = mean_absolute_error(y_test_inv, y_pred_inv)
mse = mean_squared_error(y_test_inv, y_pred_inv)
rmse = np.sqrt(mse)
r2 = r2_score(y_test_inv, y_pred_inv)

resultados_rf = {
    "Modelo": "Random Forest",
    "MAE": round(mae, 4),
    "MSE": round(mse, 4),
    "RMSE": round(rmse, 4),
    "R2": round(r2, 4),
    "Tiempo (s)": round(training_time, 2)
}

print("\nMétricas del modelo Random Forest:")
for k, v in resultados_rf.items():
    print(f"{k}: {v}")

# =============================================
# PASO 4: Guardar el modelo entrenado
# =============================================

ruta_modelo = ruta_base + 'random_forest_model.pkl'
dump(rf_model, ruta_modelo)
print(f"\n Modelo guardado en: {ruta_modelo}")
A
# =============================================
# PASO 5: Visualización de resultados
# =============================================

plt.figure(figsize=(8, 4))
plt.scatter(y_test_inv, y_pred_inv, alpha=0.3)
plt.plot(
    [y_test_inv.min(), y_test_inv.max()],
    [y_test_inv.min(), y_test_inv.max()],
    'r--'
)
plt.title('Potencia real vs predicha (Random Forest)')
plt.xlabel('Potencia real')
plt.ylabel('Potencia predicha')
plt.grid(True)
plt.tight_layout()
plt.show()

plt.figure(figsize=(12, 5))
plt.plot(y_test_inv, label='Potencia real', color='blue', linewidth=2)
plt.plot(y_pred_inv, label='Potencia predicha', color='orange', linestyle='--', linewidth=2)
plt.title('Potencia real vs predicha (líneas) - Random Forest')
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
plt.plot(y_pred_inv, label='Potencia predicha por RF', color='orange')
plt.title('Potencia predicha por Random Forest')
plt.xlabel('Índice de muestra')
plt.ylabel('Potencia (W)')
plt.grid(True)
plt.tight_layout()
plt.show()

