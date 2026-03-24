/*
Arduino 2, Trabajo de Titulación 
*/

// Librerías
#include <Ethernet.h>
#include <PubSubClient.h>
#include <SoftwareSerial.h>
#include <TaskScheduler.h>
#include <Adafruit_INA219.h>

// Definir pines
#define serialPort Serial1  // RX1 = pin 19, TX1 = pin 18 

class MensajeBuilder {
private:
    char mensaje[250]; 
    size_t indice = 0;

public:
    MensajeBuilder() {
        limpiar();
    }

    void agregar(const char* componente, const char* valor) {
        if (indice > 0 && indice < sizeof(mensaje) - 1) {
            mensaje[indice++] = ';';
        }

        int espacio = sizeof(mensaje) - indice;
        int escrito = snprintf(mensaje + indice, espacio, "%s:%s", componente, valor);

        if (escrito < 0 || escrito >= espacio) {
            mensaje[sizeof(mensaje) - 1] = '\0';
            return;
        }
        indice += escrito;
    }

    void construir() {
        if (indice > 0 && mensaje[0] != '#') { 
            if (indice < sizeof(mensaje) - 4) { 
                memmove(mensaje + 2, mensaje, indice + 1);
                mensaje[0] = '#';
                mensaje[1] = ';';
                indice += 2;
                snprintf(mensaje + indice, sizeof(mensaje) - indice, ";$%%");
            }
        }
    }

    const char* getMensaje() const {
        return mensaje;
    }

    void limpiar() {
        indice = 0;
        mensaje[0] = '\0';
    }
    
    bool tieneDatos() {
        return indice > 0;
    }
};

class IInicializador {
public:
    virtual void init() = 0;
    virtual ~IInicializador() {}
};

class Observador {
public:
    virtual void update(const char* sensor, const char* valor) = 0;
    virtual ~Observador() {}
};

class Sujeto {
private:
    Observador* observadores[5];
    int numObservadores = 0;

public:
    virtual void componenteNotificar() = 0;
    
    void agregarObservador(Observador* observador) {
        if (numObservadores < 5) {
            observadores[numObservadores++] = observador;
        }
    }

protected:
    void notificar(const char* sensor, const char* valor) {
        for (int i = 0; i < numObservadores; i++) {
            observadores[i]->update(sensor, valor);
        }
    }
};

// ---------------------------------------------------------
// COMPONENTES (Ethernet, Serial, MQTT, INA219)
// ---------------------------------------------------------

class EthernetInicializador : public IInicializador {
    private:
        byte mac[6];
        IPAddress ip;
        bool automatico;
        EthernetClient& client;
    public:
        EthernetInicializador(byte macArray[], IPAddress ipAddr, EthernetClient& _client, bool esAutomatico) : client(_client) {
            for (int i = 0; i < 6; i++) { mac[i] = macArray[i]; }
            ip = ipAddr;
            automatico = esAutomatico;
        }
        void init() override {
            if (automatico) {
                if (Ethernet.begin(mac) == 0) {
                    Serial.println(F("Fallo DHCP Ethernet"));
                    Ethernet.begin(mac, ip); 
                }
            } else {
                Ethernet.begin(mac, ip);
            }
            delay(1000); 
            Serial.print(F("IP Ethernet: "));
            Serial.println(Ethernet.localIP());
        }
};

class SerialMonitorSujeto : public Sujeto, public IInicializador {
    private:
        char buffer[105];
        int bufferIndex = 0;
        
    public:
        SerialMonitorSujeto(){ limpiarBuffer(); }
        
        void init() override {
            limpiarBuffer();
            while (serialPort.available()) { serialPort.read(); }
        }

        void limpiarBuffer() {
            memset(buffer, 0, sizeof(buffer));
            bufferIndex = 0;
        }

        void componenteNotificar() override {
            while (serialPort.available() > 0) {
                char c = serialPort.read();
                if (c == '#') {
                    limpiarBuffer();
                    buffer[bufferIndex++] = c;
                } else if (c == '%' && bufferIndex > 0 && buffer[0] == '#') {
                    buffer[bufferIndex] = '\0'; 
                    notificar(buffer, ""); 
                    limpiarBuffer();
                } else if (bufferIndex < sizeof(buffer) - 1) {
                    buffer[bufferIndex++] = c;
                } else {
                    limpiarBuffer(); 
                }
            }
        }
};

class MQTTSujeto : public Sujeto, public IInicializador {
    private:
        const char* topic = "arduino/manual";
        PubSubClient& client;
        IPAddress mqttServer;
        
    public:
        MQTTSujeto(PubSubClient& _client, IPAddress _mqttServer) : client(_client), mqttServer(_mqttServer) {
            client.setCallback(callback);
        }
        
        void init() override {
        }

        void componenteNotificar() override {
        } 
    
        static void callback(char* topic, byte* payload, unsigned int length) {
            for (int i = 0; i < length; i++) {
                serialPort.write((char)payload[i]);
            }
            serialPort.println();
        }    
};

// --- INA219 ACTIVADO ---
class INA219Component : public Sujeto, public IInicializador {
private:
    Adafruit_INA219 ina219;
public:
    INA219Component() {}
    void init() override {
        if (!ina219.begin()) { 
            Serial.println("INA219 no encontrado"); 
        } else {
            Serial.println("INA219 Iniciado Correctamente");
        }
    }
    float getVoltaje() { return ina219.getBusVoltage_V(); }
    float getCorriente() { return ina219.getCurrent_mA(); }
    float getPotencia() { return getVoltaje() * getCorriente(); }

    void componenteNotificar() override {
        char valor[20];
        dtostrf(getVoltaje(), 4, 2, valor);
        notificar("V", valor);
        dtostrf(getCorriente(), 4, 2, valor);
        notificar("C", valor);
        dtostrf(getPotencia(), 4, 2, valor);
        notificar("P", valor);
    }
};

MensajeBuilder mensajeBuilder;

class MQTTObservador : public Observador, public IInicializador {
    private:
        const char* topicPub = "arduino/controlador";
        const char* topicSub = "arduino/manual";
        const char* clientID = "ArduinoMega_Client";
        PubSubClient& client;
        IPAddress mqttServer;

    public:
        MQTTObservador(PubSubClient& _client, IPAddress _mqttServer) : client(_client), mqttServer(_mqttServer) {}

        void init() override {
            client.setServer(mqttServer, 1883);
        }

        void update(const char* mensaje, const char* valor) override {
            if (client.connected()) {
                client.publish(topicPub, mensaje);
            }
        }

        void checkConnection() {
            if (!client.connected()) {
                Serial.print(F("Conectando MQTT..."));
                if (client.connect(clientID)) {
                    Serial.println(F("Conectado!"));
                    client.subscribe(topicSub); 
                } else {
                    Serial.print(F("Error MQTT, rc="));
                    Serial.println(client.state());
                }
            }
            client.loop(); 
        }
};

class SerialMonitorObservador : public Observador {
    private:
        MensajeBuilder& builder;
    public:
        SerialMonitorObservador(MensajeBuilder& builder) : builder(builder) {}
        void update(const char* componente, const char* valor) override {
            builder.agregar(componente, valor); 
        }
};

// ---------------------------------------------------------
// INSTANCIAS GLOBALES
// ---------------------------------------------------------

SerialMonitorSujeto sujetoSerial;
INA219Component sensorINA219; 
SerialMonitorObservador serialMonitorObservador(mensajeBuilder); 

byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };
IPAddress ip(192, 168, 31, 100);
IPAddress mqttServer(192, 168, 31, 177); 

EthernetClient clientEthernet;
PubSubClient mqttClient(clientEthernet);
EthernetInicializador ethernetComponent(mac, ip, clientEthernet, true);
MQTTObservador mqttObservador(mqttClient, mqttServer);
MQTTSujeto mqttSujeto(mqttClient, mqttServer);
Scheduler scheduler;

// Arrays de Inicialización (INA219 AGREGADO)
IInicializador* initObjects[] = {
    &sujetoSerial,
    &ethernetComponent,
    &mqttObservador,
    &mqttSujeto,
    &sensorINA219  // <--- Activado
};

// ---------------------------------------------------------
// TAREAS (SCHEDULER)
// ---------------------------------------------------------

// Tarea 1: Lectura de Serial (10ms)
Task tareaLeerSerial(10, TASK_FOREVER, []() {
    sujetoSerial.componenteNotificar();
});

// Tarea 2: Lectura Sensor + Envío MQTT (500ms)
Task tareaEnviarMQTT(500, TASK_FOREVER, []() {
    // 1. Verificar conexión
    mqttObservador.checkConnection();

    // 2. Lee sensores
    sensorINA219.componenteNotificar();

    // 3. Revisar si hay datos acumulados
    if (mensajeBuilder.tieneDatos()) {
        mensajeBuilder.construir();
        const char* mensaje = mensajeBuilder.getMensaje();

        if (mensaje[0] == '#' && strlen(mensaje) > 5) {
            mqttObservador.update(mensaje, "");
        }
        
        // 4. Limpiar después del envío
        mensajeBuilder.limpiar();
    }
});


// ---------------------------------------------------------
// SETUP Y LOOP
// ---------------------------------------------------------

void setup() {
    Serial.begin(9600);
    serialPort.begin(9600);
    
    Serial.println(F("Arduino Mega - Sistema Iniciado"));
    
    for (int i = 0; i < sizeof(initObjects) / sizeof(initObjects[0]); i++) {
        initObjects[i]->init();
        delay(100); 
    }

    sujetoSerial.agregarObservador(&serialMonitorObservador);
    
    // Conectar INA219 al constructor de mensajes
    sensorINA219.agregarObservador(&serialMonitorObservador);

    scheduler.init();
    scheduler.addTask(tareaLeerSerial);
    scheduler.addTask(tareaEnviarMQTT);
    
    tareaLeerSerial.enable();
    tareaEnviarMQTT.enable();
}

void loop() {
    scheduler.execute();
}