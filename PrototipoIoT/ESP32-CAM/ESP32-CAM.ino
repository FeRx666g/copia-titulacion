#include <WiFi.h>
#include <HTTPClient.h>
#include "esp_camera.h"
#include "esp_timer.h"
#include <WebServer.h>

WebServer server(80);

bool modoStream = false;
unsigned long ultimoFrame = 0;

// === CONFIGURA TU WIFI ===
const char* ssid = "Xiaomi_4C";
const char* password = "";

// === URL DEL SERVIDOR FASTAPI ===
const char* serverUrl = "http://192.168.31.177:8000/upload";

// === INICIALIZAR CÁMARA ===
void setupCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = 5;
  config.pin_d1 = 18;
  config.pin_d2 = 19;
  config.pin_d3 = 21;
  config.pin_d4 = 36;
  config.pin_d5 = 39;
  config.pin_d6 = 34;
  config.pin_d7 = 35;
  config.pin_xclk = 0;
  config.pin_pclk = 22;
  config.pin_vsync = 25;
  config.pin_href = 23;
  config.pin_sscb_sda = 26;
  config.pin_sscb_scl = 27;
  config.pin_pwdn = 32;
  config.pin_reset = -1;
  config.xclk_freq_hz = 8000000;  // XCLK
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_VGA;
  config.jpeg_quality = 4;  // Compresión media
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Error al iniciar cámara: 0x%x\n", err);
    return;
  }

  sensor_t* s = esp_camera_sensor_get();
  if (s != NULL) {
    s->set_quality(s, 4);
    s->set_brightness(s, -2);
    s->set_contrast(s, -2);
    s->set_saturation(s, -2);
    s->set_special_effect(s, 0);  // No efecto
    s->set_whitebal(s, 1);        // AWB activado
    s->set_awb_gain(s, 1);        // AWB Gain
    s->set_wb_mode(s, 0);         // WB Auto
    s->set_exposure_ctrl(s, 1);   // AEC SENSOR activado
    s->set_aec2(s, 0);            // AEC DSP desactivado
    s->set_ae_level(s, -2);       // AE Level bajo
    s->set_gain_ctrl(s, 1);       // AGC activado
    s->set_agc_gain(s, 2);        // Gain Ceiling (2x)
    s->set_bpc(s, 0);             // BPC desactivado
    s->set_wpc(s, 1);             // WPC activado
    s->set_raw_gma(s, 1);         // Raw GMA activado
    s->set_lenc(s, 1);            // Corrección lente
    s->set_hmirror(s, 0);         // No espejo horizontal
    s->set_vflip(s, 0);           // No flip vertical
    s->set_dcw(s, 1);             // Downsize activado
    s->set_colorbar(s, 0);        // No barra de color
  }

  Serial.println(" Cámara inicializada correctamente");
}

// === ENVÍA LA FOTO COMO UN SOLO HTTP POST ===
void enviarFoto() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println(" Error al capturar imagen");
    return;
  }

  String boundary = "----ESP32FormBoundary";
  String start = "--" + boundary + "\r\n"
                                   "Content-Disposition: form-data; name=\"file\"; filename=\"foto.jpg\"\r\n"
                                   "Content-Type: image/jpeg\r\n\r\n";
  String end = "\r\n--" + boundary + "--\r\n";

  int totalLen = start.length() + fb->len + end.length();
  uint8_t* payload = (uint8_t*)malloc(totalLen);
  if (!payload) {
    Serial.println(" Error: sin suficiente memoria");
    esp_camera_fb_return(fb);
    return;
  }

  memcpy(payload, start.c_str(), start.length());
  memcpy(payload + start.length(), fb->buf, fb->len);
  memcpy(payload + start.length() + fb->len, end.c_str(), end.length());

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
  http.setTimeout(10000);

  int code = http.POST(payload, totalLen);
  Serial.printf(" Código de respuesta: %d\n", code);

  http.end();
  free(payload);
  esp_camera_fb_return(fb);
}

// === SETUP GENERAL ===
void setup() {
  Serial.begin(115200);
  delay(1000);

  WiFi.begin(ssid, password);
  Serial.print(" Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n Conectado a WiFi");

  Serial.print("📡 IP local: ");
  Serial.println(WiFi.localIP());

  setupCamera();

  // Manejo de preflight CORS (para fetch desde navegador)
  server.onNotFound([]() {
    if (server.method() == HTTP_OPTIONS) {
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      server.sendHeader("Access-Control-Allow-Headers", "*");
      server.send(204);
    } else {
      server.send(404, "text/plain", "Recurso no encontrado");
    }
  });

  // === ACTIVAR STREAM ===
  server.on("/activar-stream", HTTP_GET, []() {
    modoStream = true;
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "text/plain", "Streaming activado");
  });

  // === DETENER STREAM ===
  server.on("/detener-stream", HTTP_GET, []() {
    modoStream = false;
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "text/plain", "Streaming detenido");
  });

  // === STREAM MJPEG PRINCIPAL ===
  server.on("/", HTTP_GET, []() {
    if (modoStream) {
      WiFiClient client = server.client();
      String response = "HTTP/1.1 200 OK\r\n"
                        "Access-Control-Allow-Origin: *\r\n"
                        "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n";
      client.print(response);

      while (client.connected() && modoStream) {
        camera_fb_t* fb = esp_camera_fb_get();
        if (!fb) {
          Serial.println(" Frame nulo");
          continue;
        }

        client.println("--frame");
        client.println("Content-Type: image/jpeg");
        client.println("Content-Length: " + String(fb->len));
        client.println();
        client.write(fb->buf, fb->len);
        client.println();

        esp_camera_fb_return(fb);
        delay(50);
        server.handleClient();
      }
    } else {
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(403, "text/plain", "Modo foto activo, no se permite stream");
    }
  });

  server.begin();
}

// === LOOP PRINCIPAL ===
void loop() {
  server.handleClient();

  if (!modoStream) {
    static unsigned long anterior = 0;
    if (millis() - anterior > 120000) {
      anterior = millis();
      enviarFoto();
    }
  }
}
