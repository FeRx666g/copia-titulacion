#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// ====== Configuración de red WiFi ======
const char* ssid = "Xiaomi_4C";
const char* password = "";

// ====== Configuración del servidor MQTT ======
const char* mqtt_server = "192.168.31.177";
const int mqtt_port = 1883;

// Topics MQTT
const char* topic_automatico = "arduino/controlador";
const char* topic_manual = "esp32/manual";

// Cliente MQTT y WiFi
WiFiClient espClient;
PubSubClient client(espClient);

// ====== Pines para los servos ======
const int servoPin1 = 32;  // Servo horizontal
const int servoPin2 = 13;  // Servo vertical

Servo servo1;
Servo servo2;

// ====== Estado del modo manual y ángulos ======
bool modoManual = false;
int anguloH_actual = 0;
int anguloV_actual = 0;

// ====== Función para procesar mensajes automáticos ======
void procesarMensajeAutomatico(String mensaje) {
  if (modoManual) {
    Serial.println("Modo manual activo: se ignora el mensaje automático.");
    return;
  }

  int s9Index = mensaje.indexOf("S9:");
  int s10Index = mensaje.indexOf("S10:");

  if (s9Index != -1) {
    int s9Value = mensaje.substring(s9Index + 3, mensaje.indexOf(";", s9Index)).toInt();
    Serial.print("Servo1 (S9) = ");
    Serial.println(s9Value);
    servo1.write(s9Value);
    anguloH_actual = s9Value;
  }

  if (s10Index != -1) {
    int s10Value = mensaje.substring(s10Index + 4, mensaje.indexOf(";", s10Index)).toInt();
    Serial.print("Servo2 (S10) = ");
    Serial.println(s10Value);
    servo2.write(s10Value);
    anguloV_actual = s10Value;
  }
}

// ====== Función para procesar mensajes manuales ======
void procesarMensajeManual(String mensaje) {
  if (mensaje == "F") {
    Serial.println("Modo manual desactivado. Retornando al modo automático.");
    modoManual = false;
    return;
  }

  if (!mensaje.startsWith("T") || mensaje.length() < 7) {
    Serial.println("Mensaje manual inválido.");
    return;
  }

  modoManual = true;

  int anguloH = mensaje.substring(1, 4).toInt();
  int anguloV = mensaje.substring(4, 7).toInt();

  anguloH_actual = anguloH;
  anguloV_actual = anguloV;

  Serial.print("Modo manual activo. Ángulo horizontal: ");
  Serial.print(anguloH_actual);
  Serial.print(", vertical: ");
  Serial.println(anguloV_actual);

  servo1.write(anguloH_actual);
  servo2.write(anguloV_actual);
}

// ====== Callback MQTT ======
void callback(char* topic, byte* message, unsigned int length) {
  String mensaje = "";
  for (unsigned int i = 0; i < length; i++) {
    mensaje += (char)message[i];
  }

  Serial.print("Mensaje recibido en el topic ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.println(mensaje);

  if (String(topic) == topic_manual) {
    procesarMensajeManual(mensaje);
  } else if (String(topic) == topic_automatico) {
    procesarMensajeAutomatico(mensaje);
  }
}

// ====== Reconexión al broker MQTT ======
void reconnect() {
  while (!client.connected()) {
    Serial.print("Intentando conectar al broker MQTT...");
    if (client.connect("ESP32Cliente")) {
      Serial.println("Conectado al broker.");
      client.subscribe(topic_automatico);
      client.subscribe(topic_manual);
    } else {
      Serial.print("Fallo al conectar. Código de error: ");
      Serial.print(client.state());
      Serial.println(". Reintentando en 5 segundos.");
      delay(5000);
    }
  }
}

// ====== Setup general ======
void setup() {
  Serial.begin(115200);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Conectado a WiFi.");

  servo1.attach(servoPin1);
  servo2.attach(servoPin2);
  servo1.write(anguloH_actual);
  servo2.write(anguloV_actual);

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

// ====== Loop principal ======
void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Monitoreo periódico de los ángulos en modo manual
  static unsigned long anterior = 0;
  if (modoManual && millis() - anterior > 5000) {
    anterior = millis();
    Serial.print("Ángulos actuales (modo manual): H = ");
    Serial.print(anguloH_actual);
    Serial.print(", V = ");
    Serial.println(anguloV_actual);
  }
}
