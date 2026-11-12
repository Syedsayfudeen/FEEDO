import React, { useState } from 'react';
import {
  Cpu,
  Wifi,
  Volume2,
  VolumeX,
  CheckCircle2,
  RefreshCw,
  Code2,
  BellRing,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { useEcosystem } from '../context/EcosystemContext.tsx';

export const SmartCounterView: React.FC = () => {
  const {
    snapshot,
    apiFetch,
    showToast,
    isDemoActive,
    demoStep,
    setDemoStep,
  } = useEcosystem();

  const [showFirmwareCode, setShowFirmwareCode] = useState(false);

  if (!snapshot) return null;

  const counter = snapshot.smartCounter;
  const activeReadyToken = counter.currentReadyToken || 'F204';

  const handleSendHeartbeat = async () => {
    try {
      await apiFetch('/api/iot/heartbeat', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: counter.deviceId,
          connectionMode: 'SIMULATED_BROWSER_DEVICE',
          firmwareVersion: counter.firmwareVersion,
        }),
      });
      showToast(
        'ESP32 Heartbeat Synchronized',
        `Last seen updated • Duplicate alert guard active`,
        'emerald'
      );
    } catch (err: any) {
      showToast('Heartbeat Error', err.message, 'red');
    }
  };

  const handleSilenceBuzzer = async () => {
    await apiFetch('/api/iot/acknowledge-buzzer', { method: 'POST' });
    showToast('Counter Buzzer Silenced', 'OLED display remains active until collection', 'emerald');
  };

  const handleMarkCollectedFromCounter = async (tokenNumber: string) => {
    try {
      await apiFetch(`/api/orders/${tokenNumber}/collect`, { method: 'POST' });
      showToast(
        `Token ${tokenNumber} Collected at Counter!`,
        'Order marked COMPLETED across Customer, Chef & Manager dashboards.',
        'emerald'
      );
      if (isDemoActive && (demoStep === 11 || demoStep === 12)) {
        setDemoStep(13);
      }
    } catch (err: any) {
      showToast('Collection Error', err.message, 'red');
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-950 text-ivory-50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-charcoal-900 to-emerald-950 border border-emerald-800 p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900 border border-emerald-700 text-xs font-mono text-gold-300">
              <Cpu className="w-4 h-4" />
              <span>IOT SMART COUNTER MODULE • ESP32 + SSD1306 OLED SIMULATOR</span>
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
              Physical & Browser-Simulated Smart Token Collection Counter
            </h1>
            <p className="text-xs text-emerald-300 max-w-2xl">
              Explicitly labelled interactive browser hardware simulator + authenticated REST/WebSocket
              bridge for physical ESP32-WROOM-32D nodes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSendHeartbeat}
              className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ping ESP32 Heartbeat</span>
            </button>

            <button
              onClick={() => setShowFirmwareCode((prev) => !prev)}
              className="px-4 py-2.5 rounded-xl bg-charcoal-800 hover:bg-charcoal-900 border border-emerald-700 text-gold-300 text-xs font-semibold flex items-center gap-2"
            >
              <Code2 className="w-4 h-4" />
              <span>{showFirmwareCode ? 'Hide ESP32 Firmware' : 'Inspect ESP32 C++ Firmware'}</span>
            </button>
          </div>
        </div>

        {/* Main Simulator Enclosure & Telemetry Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 Columns: Realistic Physical ESP32 + OLED Hardware Enclosure */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-gradient-to-b from-charcoal-800 to-charcoal-950 p-6 sm:p-8 border-4 border-emerald-800/80 shadow-2xl space-y-6 relative">
              {/* Hardware Top Bezel */}
              <div className="flex items-center justify-between text-xs font-mono text-emerald-300">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  <span>NODE: {counter.deviceId}</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* LED Indicator */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-emerald-800">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        counter.currentReadyToken
                          ? 'bg-emerald-400 animate-ping shadow-[0_0_12px_#34d399]'
                          : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-[10px]">
                      LED: {counter.currentReadyToken ? 'GREEN PULSE' : 'STANDBY'}
                    </span>
                  </div>

                  {/* Piezo Buzzer Indicator */}
                  <button
                    onClick={handleSilenceBuzzer}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] ${
                      counter.buzzerActive
                        ? 'bg-gold-500 text-charcoal-950 font-bold border-gold-300 animate-bounce'
                        : 'bg-black/60 text-emerald-400 border-emerald-800'
                    }`}
                  >
                    {counter.buzzerActive ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>BUZZER CHIMING (Click to Silence)</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>BUZZER READY</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 128x64 SSD1306 OLED Screen Render */}
              <div className="rounded-2xl bg-black border-4 border-charcoal-800 p-8 sm:p-10 shadow-[inset_0_0_40px_rgba(16,185,129,0.2)] text-center font-mono space-y-4">
                <div className="text-xs sm:text-sm tracking-[0.25em] text-emerald-400 border-b border-emerald-900/90 pb-3 font-bold">
                  FEEDO SMART COUNTER
                </div>

                {counter.currentReadyToken ? (
                  <>
                    <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs sm:text-sm tracking-[0.2em] font-bold">
                      <BellRing className="w-4 h-4 text-gold-400 animate-pulse" />
                      <span>NOW READY</span>
                    </div>

                    <div className="text-6xl sm:text-7xl font-black tracking-widest text-gold-400 py-2 drop-shadow-[0_0_20px_rgba(234,185,62,0.45)]">
                      {counter.currentReadyToken}
                    </div>

                    <div className="text-sm sm:text-base tracking-[0.2em] text-emerald-300 font-bold pt-2 border-t border-emerald-900/90">
                      COLLECT AT COUNTER {counter.counterNumber || 2}
                    </div>
                    <div className="text-xs tracking-[0.3em] text-gold-300 font-bold uppercase">
                      ORDER READY
                    </div>
                  </>
                ) : (
                  <div className="py-10 space-y-3">
                    <div className="text-emerald-400 text-sm tracking-widest uppercase">
                      ALL READY TOKENS COLLECTED
                    </div>
                    <div className="text-xs text-emerald-600">
                      Monitoring Kitchen Command Center for next READY order (e.g. {activeReadyToken})...
                    </div>
                  </div>
                )}
              </div>

              {/* Hardware Bottom Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs font-mono text-emerald-300/80">
                <div>
                  Mode:{' '}
                  <strong className="text-gold-300">
                    {counter.connectionMode === 'SIMULATED_BROWSER_DEVICE'
                      ? 'BROWSER HARDWARE SIMULATOR'
                      : 'PHYSICAL ESP32 CONNECTED'}
                  </strong>
                </div>
                <div>
                  Last Heartbeat:{' '}
                  <strong className="text-white">
                    {new Date(counter.lastHeartbeat).toLocaleTimeString()}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Recent Counter Calls & Collection Verification */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-3xl bg-charcoal-900 border border-emerald-800 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
                <h3 className="font-display font-bold text-base text-white">
                  Smart Counter Token Call Log
                </h3>
                <span className="text-[11px] font-mono text-emerald-400">
                  Duplicate Alert Guard: ON
                </span>
              </div>

              <div className="space-y-3">
                {counter.recentCalls.map((call) => (
                  <div
                    key={call.tokenNumber}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                      !call.collected
                        ? 'bg-emerald-950/90 border-gold-400/70'
                        : 'bg-charcoal-950/60 border-emerald-900 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xl text-gold-400">
                          {call.tokenNumber}
                        </span>
                        <span className="text-xs font-semibold text-white">
                          Counter #{call.counterNumber}
                        </span>
                      </div>
                      <div className="text-xs text-emerald-200 mt-0.5">{call.itemsSummary}</div>
                      <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                        Customer: {call.customerName} • Called{' '}
                        {new Date(call.calledAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {!call.collected ? (
                      <button
                        onClick={() => handleMarkCollectedFromCounter(call.tokenNumber)}
                        className="px-3.5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-display font-extrabold text-xs shrink-0 shadow"
                      >
                        Simulate Handover
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-900 text-emerald-300 font-mono text-[10px] font-bold">
                        ✓ Collected
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Hardware Pinout & Spec Card */}
            <div className="rounded-3xl bg-charcoal-900 border border-emerald-800 p-5 space-y-2 text-xs">
              <div className="font-display font-bold text-sm text-gold-300">
                ESP32 Physical Wiring & Protocol Spec
              </div>
              <div className="font-mono text-[11px] text-emerald-200/90 space-y-1">
                <div>• MCU: ESP32-WROOM-32D (Wi-Fi 2.4GHz)</div>
                <div>• Display: 0.96&quot; I2C OLED SSD1306 (SDA: GPIO21, SCL: GPIO22)</div>
                <div>• Status LED: GPIO25 (Green Pulse on Ready)</div>
                <div>• Piezo Buzzer: GPIO26 (3x Chime with Duplicate Guard)</div>
                <div>• Endpoint: POST /api/iot/heartbeat (2000ms poll + WebSocket push)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Optional Embedded C++ Firmware Viewer */}
        {showFirmwareCode && (
          <div className="rounded-3xl bg-charcoal-900 border border-emerald-700 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-gold-300 font-bold">
                hardware/feedo_esp32_counter.ino (Physical ESP32 Firmware Included in Repo)
              </span>
              <button
                onClick={() => setShowFirmwareCode(false)}
                className="text-xs text-emerald-300 hover:text-white"
              >
                Close Viewer
              </button>
            </div>
            <pre className="p-4 rounded-2xl bg-black text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed">
{`// FEEDO PAY — ESP32 Smart Counter Display Firmware (SSD1306 OLED + LED + Buzzer)
void renderReadyTokenScreen(const String& token, int counterNum) {
  display.clearDisplay();
  display.setCursor(8, 2);   display.println("FEEDO SMART COUNTER");
  display.setCursor(34, 16); display.println("NOW READY");
  display.setTextSize(3);
  display.setCursor(28, 28); display.println(token); // e.g. F204
  display.setTextSize(1);
  display.setCursor(8, 54);  display.print("COLLECT AT COUNTER ");
  display.println(counterNum);
  display.display();
}`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
