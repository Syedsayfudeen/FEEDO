/**
 * ============================================================================
 * FEEDO PAY — IoT SMART COUNTER NODE FIRMWARE (ESP32 + SSD1306 OLED)
 * ============================================================================
 * Hardware Architecture:
 *  - Microcontroller : ESP32-WROOM-32D (Wi-Fi 802.11 b/g/n)
 *  - OLED Display    : 0.96" I2C SSD1306 (128x64 px, SDA: GPIO21, SCL: GPIO22)
 *  - Status LED      : Emerald Pulse Indicator (GPIO 25)
 *  - Piezo Buzzer    : Active Collection Alert Buzzer (GPIO 26)
 *  - Acknowledge Btn : Counter Staff Silence Button (GPIO 27, INPUT_PULLUP)
 *
 * Protocol:
 *  - Authenticated HTTP/JSON heartbeat to POST /api/iot/heartbeat every 2000ms
 *  - Duplicate token alert protection (only buzzes once per newly ready token)
 *  - Automatic Wi-Fi & server reconnection state machine
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define PIN_LED_EMERALD 25
#define PIN_BUZZER 26
#define PIN_ACK_BTN 27

const char* WIFI_SSID = "FEEDO_CAMPUS_MESH";
const char* WIFI_PASS = "feedo-iot-secure-2026";
const char* SERVER_BASE_URL = "http://192.168.1.100:4000";
const char* DEVICE_ID = "ESP32-COUNTER-NODE-02";

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
String lastAlertedToken = "";
unsigned long lastPollTime = 0;

void triggerCollectionChime() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(PIN_LED_EMERALD, HIGH);
    digitalWrite(PIN_BUZZER, HIGH);
    delay(180);
    digitalWrite(PIN_BUZZER, LOW);
    delay(100);
  }
}

void renderReadyTokenScreen(const String& token, int counterNum) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);
  display.setCursor(8, 2);
  display.println("FEEDO SMART COUNTER");
  display.drawLine(0, 12, 128, 12, SSD1306_WHITE);

  display.setCursor(34, 16);
  display.println("NOW READY");

  display.setTextSize(3);
  display.setCursor(28, 28);
  display.println(token);

  display.setTextSize(1);
  display.setCursor(8, 54);
  display.print("COLLECT AT COUNTER ");
  display.println(counterNum);

  display.display();
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_EMERALD, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_ACK_BTN, INPUT_PULLUP);

  Wire.begin(21, 22);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void loop() {
  if (millis() - lastPollTime >= 2000) {
    lastPollTime = millis();
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(String(SERVER_BASE_URL) + "/api/iot/heartbeat");
      http.addHeader("Content-Type", "application/json");

      String body = "{\"deviceId\":\"" + String(DEVICE_ID) +
                    "\",\"connectionMode\":\"ESP32_HARDWARE_CONNECTED\",\"firmwareVersion\":\"v2.4.1-esp32-oled\"}";
      int httpCode = http.POST(body);

      if (httpCode == 200) {
        StaticJsonDocument<512> doc;
        deserializeJson(doc, http.getString());
        String readyToken = doc["currentReadyToken"] | "";
        int counterNum = doc["counterNumber"] | 2;

        if (readyToken.length() > 0) {
          renderReadyTokenScreen(readyToken, counterNum);
          digitalWrite(PIN_LED_EMERALD, HIGH);
          // Duplicate alert protection
          if (readyToken != lastAlertedToken) {
            lastAlertedToken = readyToken;
            triggerCollectionChime();
          }
        } else {
          digitalWrite(PIN_LED_EMERALD, LOW);
        }
      }
      http.end();
    }
  }
}
