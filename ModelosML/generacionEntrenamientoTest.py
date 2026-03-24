import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
import numpy as np
import joblib

archivo_entrada = r'C:\Users\ferx666g\Desktop\Software\TitulacionModelos\RedesNeuronales\Dataset_AbrilMayoJunio.csv'
carpeta_salida = r'C:\Users\ferx666g\Desktop\Software\TitulacionModelos\RedesNeuronales\\'

features = [
    'hora',
    'lux', 'temperatura', 'humedad',
    'nubosidad'
]
target = 'potencia_producida'

# =============================================
# PASO 1: Cargar y preparar datos
# =============================================

df = pd.read_csv(archivo_entrada)

df_clean = df[features + [target]].dropna()

# =============================================
# PASO 2: Limpieza de valores atípicos
# =============================================

df_clean = df_clean[df_clean['lux'] >= 0]

df_clean = df_clean[df_clean['humedad'] <= 100]

# =============================================
# PASO 3: Escalado y división de datos
# =============================================

X = df_clean[features].values
y = df_clean[target].values.reshape(-1, 1)

# Escalar con MinMaxScaler
sc_X = MinMaxScaler()
sc_y = MinMaxScaler()

X_scaled = sc_X.fit_transform(X)
y_scaled = sc_y.fit_transform(y)

# Dividir en entrenamiento y prueba
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y_scaled, test_size=0.2, random_state=42
)

# =============================================
# PASO 4: Guardar archivos
# =============================================

pd.DataFrame(X_train, columns=features).to_csv(f"{carpeta_salida}X_train.csv", index=False)
pd.DataFrame(X_test, columns=features).to_csv(f"{carpeta_salida}X_test.csv", index=False)
pd.DataFrame(y_train, columns=[target]).to_csv(f"{carpeta_salida}y_train.csv", index=False)
pd.DataFrame(y_test, columns=[target]).to_csv(f"{carpeta_salida}y_test.csv", index=False)

# Guardar escaladores
joblib.dump(sc_X, f"{carpeta_salida}scaler_X.pkl")
joblib.dump(sc_y, f"{carpeta_salida}scaler_y.pkl")

print("Preparación completada. Archivos exportados.")

# =============================================
# PASO 5: Mostrar resumen de cantidades
# =============================================

print(f"Total de registros después de la limpieza: {len(df_clean)}")
print(f"Registros en conjunto de entrenamiento: {len(X_train)}")
print(f"Registros en conjunto de prueba: {len(X_test)}")
