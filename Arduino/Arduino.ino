#include <Arduino.h>
#include <ArduinoJson.h>
#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <WebSocketsClient.h>
#include <Hash.h>
#include <map>
using namespace std;

///////////////////////////////////////////////////////

const char *ssid = "FTC Arena";
const char *password = "****************";
const char *websocketServerIp = "192.168.1.2";
const int websocketServerPort = 8080;
const int fieldNum = 1;
const long blinkInterval = 600;
const bool debug = false;

const int PIN_RED = D0;
const int PIN_BLUE = D1;
const int PIN_GREEN = D3;
const int PIN_AMBER = D4;

///////////////////////////////////////////////////////

ESP8266WiFiMulti WiFiMulti;
WebSocketsClient webSocket;
typedef std::function<void(int index)> TimeoutCallback;
class Led
{
public:
  int pin = 0;
  bool isTimeoutRunning;
  int timeoutStart;
  int timeoutSeconds;
  TimeoutCallback timeoutCallback;
  bool isBlink;
  long previousMillis = 0;
  Led(int _pin)
  {
    pin = _pin;
  }
  void turnOn()
  {
    digitalWrite(pin, LOW);
  }
  void turnOff()
  {
    digitalWrite(pin, HIGH);
  }
  void toggle()
  {
    digitalWrite(pin, !digitalRead(pin));
  }
};
Led leds[] = {Led(PIN_RED), Led(PIN_BLUE), Led(PIN_GREEN), Led(PIN_AMBER)};

void ledEvent(const String color, const String state, int seconds)
{
  int index;
  if (color == "red")
    index = 0;
  if (color == "blue")
    index = 1;
  if (color == "green")
    index = 2;
  if (color == "amber")
    index = 3;

  leds[index].isTimeoutRunning = false;

  if (state == "on")
  {
    leds[index].turnOn();
    leds[index].isBlink = false;
    if (seconds > 0)
    {
      leds[index].timeoutStart = millis();
      leds[index].timeoutSeconds = seconds;
      leds[index].timeoutCallback = [](int index) -> void {
        leds[index].turnOff();
      };
      leds[index].isTimeoutRunning = true;
    }
  }
  else if (state == "off")
  {
    if (seconds > 0)
    {
      leds[index].timeoutStart = millis();
      leds[index].timeoutSeconds = seconds;
      leds[index].timeoutCallback = [](int index) -> void {
        leds[index].isBlink = false;
        leds[index].turnOff();
      };
      leds[index].isTimeoutRunning = true;
    }
    else
    {
      leds[index].isBlink = false;
      leds[index].turnOff();
    }
  }
  else if (state == "blink")
  {
    leds[index].isBlink = true;
    if (seconds > 0)
    {
      leds[index].timeoutStart = millis();
      leds[index].timeoutSeconds = seconds;
      leds[index].timeoutCallback = [](int index) -> void {
        leds[index].isBlink = false;
        leds[index].turnOff();
      };
      leds[index].isTimeoutRunning = true;
    }
  }
}

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length)
{
  switch (type)
  {
  case WStype_DISCONNECTED:
  {
    Serial.println("[WS] Disconnected!");
    ledEvent("red", "blink", 0);
    ledEvent("blue", "off", 0);
    ledEvent("green", "off", 0);
    ledEvent("amber", "off", 0);
    break;
  }
  case WStype_CONNECTED:
    Serial.println("[WS] Connected!");
    break;
  case WStype_TEXT:
  {
    Serial.printf("[WS] %s\n", payload);
    DynamicJsonDocument json(1024);
    deserializeJson(json, payload);
    const String color = json[0];
    const int field = json[1];
    const String state = json[2];
    int seconds = json[3];
    if (field == fieldNum)
    {
      ledEvent(color, state, seconds);
    }
    break;
  }
  case WStype_PING:
    // Pong will be send automatically
    Serial.println("[WS] Got ping");
    break;
  case WStype_PONG:
    // Got an answer to a ping we send
    Serial.println("[WS] Got pong");
    break;
  }
}

void setup()
{
  Serial.begin(9600);
  Serial.setDebugOutput(debug);

  for (uint8_t t = 4; t > 0; t--)
  {
    Serial.printf("[SETUP] BOOT WAIT %d...\n", t);
    Serial.flush();
    delay(1000);
  }

  WiFiMulti.addAP(ssid, password);

  while (WiFiMulti.run() != WL_CONNECTED)
  {
    delay(100);
  }
  Serial.printf("\nWelcome to field #%d!\n\n", fieldNum);

  for (Led led : leds)
  {
    pinMode(led.pin, OUTPUT); // LED pin as output
    led.turnOff();
  }

  webSocket.begin(websocketServerIp, websocketServerPort, "/");
  webSocket.setReconnectInterval(5000);
  webSocket.onEvent(webSocketEvent);
}

void loop()
{
  webSocket.loop();
  unsigned long currentMillis = millis();

  for (int i = 0; i < 4; i++)
  {
    if (leds[i].isTimeoutRunning && ((millis() - leds[i].timeoutStart) >= leds[i].timeoutSeconds * 1000))
    {
      leds[i].isTimeoutRunning = false; // // prevent this code being run more then once
      leds[i].timeoutCallback(i);
    }

    if (leds[i].isBlink && currentMillis - leds[i].previousMillis >= blinkInterval)
    {
      leds[i].previousMillis = currentMillis;
      leds[i].toggle();
    }
  }
}
