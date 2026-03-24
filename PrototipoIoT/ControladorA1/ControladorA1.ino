/* Trabajo de Titulación */
/* Arduino Recolector de Datos - Versión Corregida (Long Lux & Buffer Seguro) */

// --- Librerias a utilizar ---//
#include <Wire.h>             // Para I2C
#include <BH1750.h>           // Para el sensor de luz BH1750
#include <TaskScheduler.h>    // Para la programación de tareas
#include <String.h>           // Para strings
#include <SoftwareSerial.h>   // Para la comunicación
#include <dht11.h>            // Para el sensor de humedad DHT11
#include <Servo.h>            // Para los servomotores
#include <Adafruit_INA219.h>  // Para el sensor de corriente y voltaje.
#include <EEPROM.h>           // Para la memoria EEPROM
int manual = 0;

//----------------------------------------------//
//----- Clases para el manejo de mensajes ------//
//----------------------------------------------//

//Clase para el mensaje.
class Mensaje {
  char mensaje[160]; // Aumentado para seguridad
public:
  //Método constructor.
  Mensaje(const char* msg) {
    strncpy(mensaje, msg, sizeof(mensaje) - 1);  //Copia el mensaje a la variable.
    mensaje[sizeof(mensaje) - 1] = '\0';         //Termina la cadena.
  }
  //Método para obtener el mensaje.
  const char* getMensaje() const {
    return mensaje;
  }
};  //Fin de la clase Mensaje.

//Clase que construye el mensaje.
class MensajeBuilder {
private:
  char mensaje[160]; // AUMENTADO DE 125 A 160 PARA EVITAR DESBORDAMIENTO DE MEMORIA
  int indice;
public:
  MensajeBuilder()
    : indice(0) {
    mensaje[0] = '\0';
  }
  //Junta los valores de todos los sensores.
  void agregar(const char* componente, const char* valor) {
    if (indice > 0) {
      indice += snprintf(mensaje + indice, sizeof(mensaje) - indice, ";");
      if (indice >= sizeof(mensaje)) {  //Siempre revisar.
        goto truncar;
      }
    }
    indice += snprintf(mensaje + indice, sizeof(mensaje) - indice, "%s%s", componente, valor);

    if (indice >= sizeof(mensaje)) {
truncar:
      Serial.println("¡Error!  Mensaje demasiado largo.  Truncando...");
      mensaje[sizeof(mensaje) - 1] = '\0';
      indice = sizeof(mensaje) - 1;
    }
  }
  // Método para construir el mensaje final y devolver un objeto Mensaje.
  Mensaje construir() {
    // Construimos el mensaje paso a paso.
    char resultado[170];                                          //Variable un poco más grande para guardar el mensaje final.
    snprintf(resultado, sizeof(resultado), "#;%s", mensaje);  //Agrega '#;' al inicio

    strcat(resultado, ";$%");  // Agrega el final del mensaje
    return Mensaje(resultado);
  }

  // Método para limpiar el mensaje.
  void limpiar() {
    indice = 0;
    mensaje[0] = '\0';
  }

};  //Fin de la clase MensajeBuilder.

//-----------------------//
//----- Interfaces ------//
//-----------------------//

//Interfaz para el movimiento.
class IMovimiento {
public:
  virtual ~IMovimiento() {}
};

//Interfaz para el patrón Strategy.
class ICalculadorAngulo {
public:
  virtual int calcularAngulo(int L, int R, int D, int U) = 0;
  virtual ~ICalculadorAngulo() {}
};


// Interfaz para inicializar los componentes.
class IInicializador {
public:
  virtual void init() = 0;
  virtual ~IInicializador() {}
};

// Interfaz para el Observador en el patrón Observator.
class Observador {
public:
  virtual void update(const char* sensor, const char* valor) = 0;
  virtual ~Observador() {}
};

//Interfaz para el controlador del servo motor.
class IControladorServo {
public:
  virtual void actualizarMovimiento() = 0;
  virtual ~IControladorServo() {}
};

// Interfaz para el Sujeto en el patrón Observator.
class Sujeto {
private:
  Observador* observadores[5];  // Array de punteros a Observador
  int numObservadores = 0;      // Contador de observadores

public:
  //Método para ejecutar la notificación de todos lso componentes.
  virtual void componenteNotificar() = 0;
  // Método para agregar un observador.
  void agregarObservador(Observador* observador) {
    if (numObservadores < 10) {
      observadores[numObservadores++] = observador;
    } else {
      Serial.println("Limite de observadores alcanzado.");
    }
  }

  // Método para quitar el observador.
  void quitarObservador(Observador* observador) {
    for (int i = 0; i < numObservadores; i++) {
      if (observadores[i] == observador) {
        for (int j = i; j < numObservadores - 1; j++) {
          observadores[j] = observadores[j + 1];
        }
        numObservadores--;
        break;
      }
    }
  }

protected:
  // Método para notificar el valor de los sensores.
  void notificar(const char* sensor, const char* valor) {
    for (int i = 0; i < numObservadores; i++) {

      observadores[i]->update(sensor, valor);
    }
  }
};  //Fin de la clase Sujeto.


/*--------------------------*/
/*----- Controladores ------*/
/*--------------------------*/

//---------------------------------------//
//----- Clase para el sensor de luz -----//
//---------------------------------------//
class BH1750Component : public Sujeto, public IInicializador {
private:
  BH1750 sensor;  // Variable para el sensor.
public:
  // Método para inicializar el sensor.
  void init() {
    sensor.begin();  // Inicialización del sensor.
  }

  //Función get para devolver el valor de lux. 
  // CORRECCIÓN: Usamos 'long' para evitar desbordamiento por encima de 32767.
  long getLux() {
    float lectura = sensor.readLightLevel();
    if (lectura < 0) {
      return -999; 
    }
    // Al castear a (long) se eliminan automáticamente los decimales (.00)
    return (long)lectura; 
  }

  // Método para leer el valor del sensor y notificar a los observadores.
  void componenteNotificar() override {
    long valorLux = getLux(); // Usamos long
    valorLux = abs(valorLux);
    char valor[20]; // Buffer un poco más grande
    
    // CORRECCIÓN: Usamos ltoa (long to ascii) en lugar de itoa
    ltoa(valorLux, valor, 10); 
    
    notificar("L:", valor);    // Notificación a los observadores.
  }
};  // Fin de la clase BH1750Component.

//-----------------------------------------------------//
//----- Clase para el sensor de temperatura DHT11 -----//
//-----------------------------------------------------//
class TemperaturaComponent : public Sujeto, public IInicializador {
private:
  dht11 sensor;   // Variable para el sensor.
  const int pin;  // Pin del sensor.
public:
  //Método constructor.
  TemperaturaComponent(int pinSensor)
    : pin(pinSensor) {}

  // Método para inicializar el sensor.
  void init() override {
    // No se necesita inicialización adicional para el DHT11
  }

  //Función get para devolver el valor de la temperatura en entero.
  int getTemperatura() {
    int chk = sensor.read(pin);
    if (chk != DHTLIB_OK) {
      return -999;  // Representa NaN
    }
    return sensor.temperature;
  }

  //Método para el valor de la temperatura.
  void componenteNotificar() override {
    int valorTemp = getTemperatura();
    char valor[20];
    if (valorTemp == -999) {
      strcpy(valor, "NaN");
    } else {
      itoa(valorTemp, valor, 10);
    }
    notificar("T:", valor);
  }
};  //Fin de la clase TemperaturaComponent.

//-------------------------------------------------//
//----- Clase para el sensor de humedad DHT11 -----//
//-------------------------------------------------//
class HumedadComponent : public Sujeto, public IInicializador {
private:
  dht11 sensor;   // Variable para el sensor.
  const int pin;  // Pin del sensor.
public:
  //Método constructor.
  HumedadComponent(int pinSensor)
    : pin(pinSensor) {}

  // Método para inicializar el sensor.
  void init() override {
    // No se necesita inicialización adicional para el DHT11
  }

  //Función get para devolver el valor de la humedad en entero.
  int getHumedad() {
    delay(25);
    int chk = sensor.read(pin);
    if (chk != DHTLIB_OK) {
      return -999;  // Representa NaN
    }
    return sensor.humidity;
  }

  //Método para el valor de la humedad.
  void componenteNotificar() override {
    int valorHum = getHumedad();
    char valor[20];
    if (valorHum == -999) {
      strcpy(valor, "NaN");
    } else {
      itoa(valorHum, valor, 10);
    }
    notificar("H:", valor);
  }
};  //Fin de la clase HumedadComponent.

//------------------------------------------------//
//----- Clase para el sensor de fotoresistor -----//
//------------------------------------------------//
class FotoresistorComponent : public Sujeto, public IInicializador {
private:
  const int pin;  // Pin del sensor
public:
  //Método constructor.
  FotoresistorComponent(int pinSensor)
    : pin(pinSensor) {}

  //Inicializador de los fotoresistores.
  void init() override {
  }
  //Función para obtener el valor del Fotoresistor.
  int getFotoresistor() {
    return analogRead(pin);
  }
  //Método para notificar.
  void componenteNotificar() override {
    char nombreSensor[10];
    char valor[32];
    snprintf(nombreSensor, sizeof(nombreSensor), "%d:", (pin-10));
    int lectura = getFotoresistor();
    snprintf(valor, sizeof(valor), "%d", lectura);
    notificar(nombreSensor, valor);
  }
};  //Fin de la clase FotoresistorComponent.

//-------------------------------//
//--- INA219 solo irradiancia ---//
//-------------------------------//
class INA219Component : public Sujeto, public IInicializador {
private:
  Adafruit_INA219 ina219;
  const float areaPanel = 0.011645;  // Área del panel en m² (137mm x 85mm)
  const float eficiencia = 0.15;     // Eficiencia del panel (15%)

public:
  INA219Component() {}

  void init() override {
    if (!ina219.begin()) {
      Serial.println("Sensor INA219 no encontrado.");
    }
  }

  // Función para obtener el voltaje
  float getVoltaje() {
    return ina219.getBusVoltage_V();
  }

  // Función para obtener la corriente
  float getCorriente() {
    float corriente = ina219.getCurrent_mA();
    if (corriente < 0) corriente = 0;  // Forzar a 0 si es negativa
    return corriente;
  }

  // Función para obtener la potencia generada
  float getPotencia() {
    return getVoltaje() * getCorriente();
    ;
  }

  // Función para estimar la irradiancia solar (W/m²)
  float getIrradiancia() {
    float potenciaEnW = getPotencia() / 1000.0;  
    return (potenciaEnW / (areaPanel * eficiencia));
  }

  // Método para notificar la irradiancia
  void componenteNotificar() override {
    char valor[20];
    float irradiancia = getIrradiancia();

    // Voltaje
    dtostrf(getVoltaje(), 4, 2, valor);
    notificar("V1:", valor);  // V: voltaje en voltios

    // Corriente
    dtostrf(getCorriente(), 4, 2, valor);
    notificar("C1:", valor);  // C: corriente en mA

    // Potencia
    dtostrf(getPotencia(), 4, 2, valor);
    notificar("P1:", valor);  // P: potencia en mW

    dtostrf(irradiancia, 4, 2, valor);  // Formato con 2 decimales
    notificar("I:", valor);            // "Ir:" para irradiancia
  }
};  // Fin de la clase INA219Component.

//-------------------------------------------//
//------- Clase para los servomotores -------//
//-------------------------------------------//
class ServoComponent : public Sujeto, public IInicializador {
private:
  Servo servo;
  const int pin;
  const int eepromAddr;  // Dirección en EEPROM para guardar el ángulo

public:
  //Método constructor con dirección EEPROM
  ServoComponent(int pinServo, int addr)
    : pin(pinServo), eepromAddr(addr) {}

  //Inicializador de los servomotores
  void init() override {
    servo.attach(pin);
    // Leer el último ángulo guardado
    int ultimoAngulo = EEPROM.read(eepromAddr);
    servo.write(ultimoAngulo);
  }

  //Método para mover el servo
  void moverServo(int angulo) {
    servo.write(angulo);
    // Guardar el nuevo ángulo en EEPROM
    EEPROM.write(eepromAddr, angulo);
  }

  //Función get para devolver el valor del angulo del servo.
  int getAngulo() {
    return servo.read();
  }

  //Método para leer y notificar.
  void componenteNotificar() override {
    char nombreSensor[15];
    char valor[20];
    snprintf(nombreSensor, sizeof(nombreSensor), "S%d:", pin);
    itoa(getAngulo(), valor, 10);
    notificar(nombreSensor, valor);
  }
};  //Fin de la clase ServoComponent.


//-----------------------------------------------//
//----- Clases para el cálculo de movimiento -----//
//-----------------------------------------------//

//Clase para calcular el ángulo con fuerzas vectoriales.
class CalcularAnguloFuerzas : public ICalculadorAngulo {
public:
  int calcularAngulo(int L, int R, int D, int U) override {
    int X_resultante = L - R;  //Fuerza en X.
    int Y_resultante = U - D;  //Fuerza en Y.

    float anguloRadianes = atan2(Y_resultante, X_resultante);   //Ángulo obtenido en radianes.
    float anguloGrados = (int)(anguloRadianes * (180.0 / PI));  //Ángulo obtenido en grados.

    // Convertir ángulos negativos a positivos (0 a 360)
    if (anguloGrados < 0) {
      anguloGrados += 360;
    }
    // Aplicar lógica para corregir los ángulos extremos.
    if (anguloGrados > 180 && anguloGrados <= 270) {
      anguloGrados = 180;  // Si está entre 180° y 270°, se ajusta a 180°.
    } else if (anguloGrados > 270 && anguloGrados <= 360) {
      anguloGrados = 0;  // Si está entre 270° y 360°, se ajusta a 0°.
    }
    return (int)anguloGrados;  //Devolver el angulo, y castear a entero.
  }

};  //Fin de la clase CalcularAnguloFuerzas.

//Clase para calcular el ángulo con Desviación Estandar y cantidad de luz.
class CalcularAnguloDesviacion : public ICalculadorAngulo {
private:
  BH1750Component& sensorLuz;  // Instancia del sensor.
public:
  //Método constructor y referencia al sensor de luz.
  CalcularAnguloDesviacion(BH1750Component& sensorLuz)
    : sensorLuz(sensorLuz) {}

  //Función que calcula el ángulo.
  int calcularAngulo(int L, int R, int D, int U) override {
    float media = (L + R + D + U) / 4.0;  //Obtener la media
    float sumaCuadrados = pow(U - media, 2) + pow(D - media, 2) + pow(L - media, 2) + pow(R - media, 2);
    float desviacionEstandar = sqrt(sumaCuadrados / 4.0);            //Obtener la desviación estándar
    desviacionEstandar = constrain(desviacionEstandar, 0, 500);      //Limitar la desviación entre 0 y 500.
    int desviacionMapeada = map(desviacionEstandar, 0, 500, 0, 90);  //Mapeo para obtener el ángulo.
    
    // NOTA: Aquí getLux devuelve long, pero para los cálculos internos del movimiento 
    // se puede manejar como float o int, ya que para la lógica de movimiento la precisión extrema no rompe el flujo.
    float lux = abs(sensorLuz.getLux());
    
    float intensidad;
    if (lux > 20000) {
      intensidad = 0.0;
    } else {
      intensidad = map(lux, 0, 20000, 20, 0);  //Mapeo del valor entre 20 y 0.
    }
    intensidad = constrain(intensidad, 0, 3);  //Limita la intensidad a valores entre 0 y 3.

    int anguloVertical = (int)((desviacionMapeada * intensidad) * 3);  //Multiplica la desviación por la intesidad.
    //La intensidad ayuda a multiplicar el ángulo cuando la cantidad de luz es muy baja.
    anguloVertical = constrain(anguloVertical, 0, 90);
    return anguloVertical;
  }
};  //Fin de la clase CalcularAnguloDesviacion.

//Clase para controlar el movimiento con PID.
class ControladorPID : public IControladorServo {
private:
  ServoComponent& servoMotor;           // Instancia del servo horizontal.
  ICalculadorAngulo& calculadorAngulo;  // Instancia del calculador de ángulo.
  int resolucion;                       //Variable para la resolución de respuestas.
  //Variables para el controlador PID.
  double kp, ki, kd;
  double integral, prevError;
  long prevTime = 0;
  int umbral;
  // Referencia a los Fotoresistores.
  FotoresistorComponent* fotoresistores[4];

public:

  //Método constructor.
  ControladorPID(ServoComponent& servo, ICalculadorAngulo& calculador,
                 int resolucion, double kp, double ki, double kd, int umbral,
                 FotoresistorComponent* fr[4])
    : servoMotor(servo), calculadorAngulo(calculador), resolucion(resolucion),
      kp(kp), ki(ki), kd(kd), umbral(umbral), integral(0), prevError(0) {
    // Copia los punteros del array.
    for (int i = 0; i < 4; ++i) {
      fotoresistores[i] = fr[i];
    }
  }

  //Método para cambiar el calculador de ángulo.
  void setCalculadorAngulo(ICalculadorAngulo& nuevoCalculador) {
    calculadorAngulo = nuevoCalculador;
  }

  //Método que realiza los cálculos PID.
  void actualizarMovimiento() override {
    //Leer los fotoresistores.
    int L = fotoresistores[0]->getFotoresistor();
    int R = fotoresistores[1]->getFotoresistor();
    int D = fotoresistores[2]->getFotoresistor();
    int U = fotoresistores[3]->getFotoresistor();

    //Calcular el ángulo deseado.
    int anguloDeseado = calculadorAngulo.calcularAngulo(L, R, D, U);
    int anguloActual = servoMotor.getAngulo();
    double error = anguloDeseado - anguloActual;
    // Verificar si el error absoluto es mayor que el umbral.
    if (abs(error) > umbral) {  // Solo mover si el error es mayor al umbra.
                                //Calcular el valor obtenido por PID.
      double movimiento = calcularSalidaPID(error);
      movimiento = constrain(movimiento, -resolucion, resolucion);  //Mantiene el resultado PID dentro de la resoluación establecida.
                                                                    //Actualiza el movimiento del servo motor.
      anguloActual += (int)movimiento;
      anguloActual = constrain(anguloActual, 0, 180);
      servoMotor.moverServo(anguloActual);
    }  //Si el error es menor, no hace nada.
  }

private:
  //Función para calcular el valor PID.
  double calcularSalidaPID(double error) {
    long now = millis();                                        //Obtiene el valor del tiempo.
    double timeChange = (double)(now - prevTime) / 1000.0;  //Calcula el cambio de tiempo.
    //Revisa si el arduino recién encendio
    if (prevTime == 0) {
      prevTime = now;
      return 0.0;
    }

    double p = kp * error;
    integral += ki * error * timeChange;
    double d = kd * (error - prevError) / timeChange;

    prevError = error;
    prevTime = now;
    return p + d;
  }
};  //Fin de la clase ControladorPID.


//----------------------------//
//------- Observadores -------//
//----------------------------//

//Observador para recibir los datos y unirlos.
class MensajeObservador : public Observador {
private:
  MensajeBuilder builder;
public:
  // Recibe la notificación del sensor.
  void update(const char* componente, const char* valor) override {
    builder.agregar(componente, valor);  // Delega la construcción al builder.
  }

  // Método para obtener el mensaje completo (ya formateado).
  Mensaje getMensaje() {
    return builder.construir();  // Construye y devuelve el Mensaje.
  }

  void limpiar() {
    builder.limpiar();
  }
};  //Fin de la clase mensajeObservador.


//-----------------------//
//----- Instancias ------//
//-----------------------//
BH1750Component sensorLuz;  // Instancia del sensor.
INA219Component sensorINA219;
HumedadComponent sensorHumedad(7);                         // Instancia del sensor de humedad DHT11.
TemperaturaComponent sensorTemperatura(7);                 // Instancia del sensor de temperatura DHT11.
FotoresistorComponent fotoresistor0(A0);                   //Instancia del fotoresistor.
FotoresistorComponent fotoresistor1(A1);                   //Instancia del fotoresistor.
FotoresistorComponent fotoresistor2(A2);                   //Instancia del fotoresistor.
FotoresistorComponent fotoresistor3(A3);                   //Instancia del fotoresistor.
ServoComponent servoHorizontal(9, 0);                      //Instancia del servo horizontal.
ServoComponent servoVertical(10, 1);                       //Instancia del servo vertical.
MensajeObservador mensajeObservador;                       // Instancia del observador.
CalcularAnguloFuerzas calculadorFuerzas;                   //Instancia para calcular el ángulo del servo horizontal.
CalcularAnguloDesviacion calculadorDesviacion(sensorLuz);  //Instancia para calcular el ángulo del servo vertical.
Scheduler scheduler;                                       // Instancia del TaskScheduler.

// Arreglo de punteros a IInicializador
IInicializador* initObjects[] = {
  &sensorLuz,
  &sensorTemperatura,
  &sensorHumedad,
  &fotoresistor0,
  &fotoresistor1,
  &fotoresistor2,
  &fotoresistor3,
  &servoHorizontal,
  &servoVertical,
  &sensorINA219
};

// Arreglo de punteros a Sujeto
Sujeto* sujetoObjects[] = {
  &sensorLuz,
  &sensorTemperatura,
  &sensorHumedad,
  &fotoresistor0,
  &fotoresistor1,
  &fotoresistor2,
  &fotoresistor3,
  &servoHorizontal,
  &servoVertical,
  &sensorINA219
};

//Arreglo de punteros a FotoresistorComponent.
FotoresistorComponent* fotoresistores[] = { &fotoresistor0, &fotoresistor1, &fotoresistor2, &fotoresistor3 };

//Instancias de los controladores.
ControladorPID controladorPIDH(servoHorizontal, calculadorFuerzas, 25, 1, 0.1, 0.1, 0, fotoresistores);   // Instancia del controlador PID horizontal
ControladorPID controladorPIDV(servoVertical, calculadorDesviacion, 25, 1, 0.1, 0.1, 0, fotoresistores);  // Instancia del controlador PID vertical
IControladorServo* controladorHorizontal = &controladorPIDH;                                                              //Referencia al controlador PID horizontal.
IControladorServo* controladorVertical = &controladorPIDV;                                                                //Referencia al controlador PID vertical.

//--------------------------------//
//----- Definición de tareas -----//
//--------------------------------//

//Tarea para leer los sensores.
Task tareaLeerSensor(200, TASK_FOREVER, []() {
  static bool ejecutando = false;
  if (ejecutando) return;  // Evitar ejecuciones simultáneas

  ejecutando = true;
  mensajeObservador.limpiar();  // Limpiamos antes de construir el nuevo mensaje

  // Iterar sobre el arreglo y llamar al método que notifica a cada componente
  for (int i = 0; i < sizeof(sujetoObjects) / sizeof(sujetoObjects[0]); i++) {
    sujetoObjects[i]->componenteNotificar();
    delay(50);  // Pequeño delay entre lecturas
  }

  // Imprimir el mensaje completo.
  Mensaje mensaje = mensajeObservador.getMensaje();
  Serial.println(mensaje.getMensaje());
  ejecutando = false;
});

// Tarea para mover el panel solar (se ejecuta cada 5 segundos)
Task tareaMoverPanel(5000, TASK_FOREVER, []() {
  static bool servoOcupado = false;

  if (servoOcupado) return;  // Evitar ejecuciones simultáneas

  servoOcupado = true;

  // Primero actualizamos el controlador horizontal
  controladorHorizontal->actualizarMovimiento();
  delay(100);  // Esperamos un momento para estabilidad

  // Luego actualizamos el controlador vertical
  controladorVertical->actualizarMovimiento();

  servoOcupado = false;
});

//-------------------------//
//----- Función Setup -----//
//-------------------------//
void setup() {
  // Inicializar comunicación
  Wire.begin();
  Serial.begin(9600);

  // Inicializar los componentes con delay entre inicializaciones
  for (int i = 0; i < sizeof(initObjects) / sizeof(initObjects[0]); i++) {
    initObjects[i]->init();
    delay(100);  // Delay entre inicializaciones
  }

  // Agregar observadores
  for (int i = 0; i < sizeof(sujetoObjects) / sizeof(sujetoObjects[0]); i++) {
    sujetoObjects[i]->agregarObservador(&mensajeObservador);
  }


  // Configurar el scheduler
  scheduler.init();
  scheduler.addTask(tareaLeerSensor);
  scheduler.addTask(tareaMoverPanel);

  // Habilitar primero la tarea de lectura de sensores
  tareaLeerSensor.enable();

  // Habilitar la tarea de movimiento del panel
  tareaMoverPanel.enable();
}
//--------------------------------//
//--------- Función Loop ---------//
//--------------------------------//

void loop() {
  if (Serial.available() > 0) {  // Verifica si hay datos nuevos
    String data = Serial.readStringUntil('\n');
    if (data[0] == 'T') {  // Verifica si el primer carácter es 'T'
      manual = 1;
      // Extrae los valores numéricos
      String anguloHorizontal = data.substring(1, 4);  // Obtiene los 3 dígitos para el servo horizontal
      String anguloVertical = data.substring(4);       // Obtiene los dígitos restantes para el servo vertical

      // Convierte los strings a números
      int anguloH = anguloHorizontal.toInt();
      int anguloV = anguloVertical.toInt();

      // Aquí puedes usar anguloH y anguloV para controlar tus servos
      if (anguloH <= 180 && anguloH >= 0) {
        servoHorizontal.moverServo(anguloH);
      }
      if (anguloV <= 90 && anguloV >= 0) {
        servoVertical.moverServo(anguloV);
      }

      //tareaLeerSensor.enable();
      tareaMoverPanel.disable();
    } else if (data[0] == 'F') {
      manual = 0;
      tareaLeerSensor.enable();
      tareaMoverPanel.enable();
    }
  }
  scheduler.execute();  // Se ejecuta continuamente en el loop
}