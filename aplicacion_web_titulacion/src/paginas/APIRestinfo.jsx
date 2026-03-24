import React, { useState } from 'react';
import { FaCopy, FaCheck, FaPython, FaTerminal, FaKey, FaServer, FaCogs } from 'react-icons/fa';

export const APIRestinfo = () => {

  const CodeBlock = ({ title, code, language = 'python' }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="mb-6 rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-700 shadow-sm">
        <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-2 flex justify-between items-center border-b border-gray-200 dark:border-zinc-700">
          <span className="text-sm font-mono text-gray-600 dark:text-gray-300 font-semibold flex items-center gap-2">
            {language === 'python' ? <FaPython className="text-blue-500" /> : <FaTerminal className="text-gray-500" />}
            {title}
          </span>
          <button
            onClick={handleCopy}
            className="text-xs flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-zinc-600"
          >
            {copied ? <><FaCheck className="text-green-500" /> Copiado</> : <><FaCopy /> Copiar</>}
          </button>
        </div>
        <div className="bg-[#1e1e1e] p-4 overflow-x-auto">
          <pre className="text-sm font-mono text-gray-300 leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 text-black dark:text-white">

      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-4">
          Integración API REST
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Conecta tus dispositivos IoT y scripts externos a nuestra plataforma enviando datos en tiempo real mediante solicitudes HTTP estándar.
        </p>
      </div>

      {/* Pasos Preliminares */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="p-6 bg-white dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-700 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="flex items-start gap-4">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-xl text-yellow-600 dark:text-yellow-400 min-w-[50px] flex justify-center">
              <FaCogs size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2">1. Configura tu Sensor</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Crea un nuevo sensor en la sección <strong>Sensores</strong>. Una vez creado, obtendrás un <code>ID Único</code> que identifica el origen de los datos.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-700 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="flex items-start gap-4">
            <div className="bg-cyan-100 dark:bg-cyan-900/30 p-3 rounded-xl text-cyan-600 dark:text-cyan-400 min-w-[50px] flex justify-center">
              <FaKey size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2">2. Obtén tu API Key</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Genera una clave de acceso segura en la sección <strong>API Keys</strong>. Esta llave debe incluirse en los headers para autenticar tus peticiones.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-zinc-800 my-12"></div>

      {/* Guía de Implementación */}
      <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
        <FaPython className="text-yellow-500" />
        Ejemplo de Implementación en Python
      </h2>

      <div className="space-y-8">

        {/* Bloque 1: Configuración */}
        <section>
          <div className="flex items-center gap-4 mb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold text-sm">1</span>
            <h3 className="text-xl font-semibold">Configuración Inicial</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4 ml-12">
            Importa las librerías necesarias y define las constantes de conexión. Asegúrate de tener instalada la librería <code>requests</code> (`pip install requests`).
          </p>
          <div className="ml-12">
            <CodeBlock
              title="config.py"
              code={`import requests
import random
import time

# --- CONSTANTES DE CONEXIÓN ---
API_KEY = "PEGAR_TU_API_KEY_AQUI"
URL_BACKEND = "https://backend-519521736458.us-central1.run.app/api/datos"

# Headers obligatorios para autenticación
HEADERS = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}`}
            />
          </div>
        </section>

        {/* Bloque 2: Definición de Dispositivos */}
        <section>
          <div className="flex items-center gap-4 mb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold text-sm">2</span>
            <h3 className="text-xl font-semibold">Mapeo de Sensores</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4 ml-12">
            Define un diccionario que asocie los <strong>IDs de tus sensores</strong> (obtenidos en el paso 1) con el tipo de variable que miden.
          </p>
          <div className="ml-12">
            <CodeBlock
              title="dispositivos.py"
              code={`# Diccionario: { "ID_DEL_DISPOSITIVO": "VARIABLE_A_MEDIR" }
MIS_DISPOSITIVOS = {
    "ID_SENSOR_TEMP_001": "temperatura",
    "ID_SENSOR_VOLT_002": "voltaje",
    "ID_SENSOR_IRRA_003": "irradiancia"
}

def simular_lectura(tipo_variable):
    """Genera valores aleatorios realistas según el tipo de sensor."""
    if tipo_variable == "temperatura":
        return round(random.uniform(15.0, 35.0), 2)  # Entre 15 y 35 °C
    elif tipo_variable == "voltaje":
        return round(random.uniform(210.0, 230.0), 2) # Entre 210 y 230 V
    elif tipo_variable == "irradiancia":
        return random.randint(100, 1000)             # Watts/m2
    return 0`}
            />
          </div>
        </section>

        {/* Bloque 3: Bucle Principal */}
        <section>
          <div className="flex items-center gap-4 mb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold text-sm">3</span>
            <h3 className="text-xl font-semibold">Bucle de Envío de Datos</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4 ml-12">
            Crea un bucle infinito que lea los sensores, empaquete los datos en el formato JSON requerido y envíe la petición POST al servidor.
          </p>
          <div className="ml-12">
            <CodeBlock
              title="main.py"
              code={`print("📡 Iniciando transmisión de datos IoT...")

try:
    while True:
        lista_mediciones = []

        # 1. Recolectar datos de todos los sensores
        for id_disp, variable in MIS_DISPOSITIVOS.items():
            valor_leido = simular_lectura(variable)
            
            # Formato requerido por el backend
            lectura = {
                "id_dispositivo": id_disp,
                "datos": { 
                    variable: valor_leido 
                }
            }
            lista_mediciones.append(lectura)

        # 2. Crear payload final
        payload = { "mediciones": lista_mediciones }

        # 3. Enviar petición HTTP POST
        try:
            response = requests.post(URL_BACKEND, json=payload, headers=HEADERS)
            
            if response.status_code == 200:
                print(f"✅ Enviado: {len(lista_mediciones)} mediciones - {response.status_code}")
            else:
                print(f"⚠️ Error {response.status_code}: {response.text}")

        except Exception as e:
            print(f"❌ Error de conexión: {e}")

        # 4. Esperar antes del siguiente envío (ej. 5 segundos)
        time.sleep(5)

except KeyboardInterrupt:
    print("\\n🛑 Transmisión detenida por el usuario.")`}
            />
          </div>
        </section>

      </div>

      <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800 flex gap-4">
        <div className="min-w-[40px] text-blue-500">
          <FaServer size={30} />
        </div>
        <div>
          <h4 className="font-bold text-blue-700 dark:text-blue-300 mb-1">Estructura del JSON</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            El backend espera recibir un objeto con la propiedad <code>mediciones</code>, la cual es una lista de objetos. Cada objeto interno debe tener <code>id_dispositivo</code> (string) y <code>datos</code> (objeto clave-valor con la medición).
          </p>
        </div>
      </div>

    </div>
  );
};