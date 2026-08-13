"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { C, FONT } from "@/lib/constants";

type LiveValues = {
  rpm: number;
  speed: number;
  throttle: number;
  coolant: number;
  voltage: number;
};

const EMPTY_VALUES: LiveValues = { rpm: 0, speed: 0, throttle: 0, coolant: 0, voltage: 0 };

type SerialPortLike = {
  readable?: ReadableStream<Uint8Array> | null;
  writable?: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
};

const cardStyle: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 20,
};

function Metric({ label, value, unit, hot = false }: { label: string; value: string | number; unit: string; hot?: boolean }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontFamily: FONT.body, color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
        <span style={{ fontFamily: FONT.display, fontSize: 48, lineHeight: 1, color: hot ? C.accent : C.text }}>{value}</span>
        <span style={{ fontFamily: FONT.mono, color: C.muted, fontSize: 12 }}>{unit}</span>
      </div>
    </div>
  );
}

function cleanElmResponse(raw: string) {
  return raw
    .replace(/SEARCHING\.\.\./gi, "")
    .replace(/NO DATA/gi, "")
    .replace(/STOPPED/gi, "")
    .replace(/>/g, "")
    .replace(/\r|\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bytesForPid(raw: string, pid: string): number[] | null {
  const cleaned = cleanElmResponse(raw).toUpperCase().replace(/[^0-9A-F ]/g, " ");
  const bytes = cleaned.split(/\s+/).filter(Boolean);
  const wanted = pid.toUpperCase();
  for (let i = 0; i < bytes.length - 2; i++) {
    if (bytes[i] === "41" && bytes[i + 1] === wanted) {
      return bytes.slice(i + 2).map((x) => Number.parseInt(x, 16)).filter(Number.isFinite);
    }
  }
  return null;
}

export function LiveDataScreen() {
  const [values, setValues] = useState<LiveValues>(EMPTY_VALUES);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "demo" | "error">("idle");
  const [message, setMessage] = useState("Connect a compatible ELM327 OBD-II adapter to begin.");
  const [supported, setSupported] = useState(true);
  const portRef = useRef<SerialPortLike | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const pollingRef = useRef(false);
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && !!(navigator as any).serial);
    return () => {
      pollingRef.current = false;
      if (demoTimerRef.current) clearInterval(demoTimerRef.current);
      readerRef.current?.cancel().catch(() => undefined);
      writerRef.current?.releaseLock();
      portRef.current?.close().catch(() => undefined);
    };
  }, []);

  const readUntilPrompt = useCallback(async (timeoutMs = 1800) => {
    const reader = readerRef.current;
    if (!reader) throw new Error("Serial reader is unavailable.");
    const decoder = new TextDecoder();
    let output = "";
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const remaining = Math.max(50, deadline - Date.now());
      const result = await Promise.race([
        reader.read(),
        new Promise<{ timeout: true }>((resolve) => setTimeout(() => resolve({ timeout: true }), remaining)),
      ]);
      if ("timeout" in result) break;
      if (result.done) break;
      output += decoder.decode(result.value, { stream: true });
      if (output.includes(">")) break;
    }
    return output;
  }, []);

  const command = useCallback(async (cmd: string, timeoutMs?: number) => {
    const writer = writerRef.current;
    if (!writer) throw new Error("Serial writer is unavailable.");
    await writer.write(new TextEncoder().encode(`${cmd}\r`));
    return readUntilPrompt(timeoutMs);
  }, [readUntilPrompt]);

  const poll = useCallback(async () => {
    while (pollingRef.current) {
      try {
        const rpmRaw = await command("010C");
        const speedRaw = await command("010D");
        const throttleRaw = await command("0111");
        const coolantRaw = await command("0105");
        const voltageRaw = await command("0142");

        const rpmBytes = bytesForPid(rpmRaw, "0C");
        const speedBytes = bytesForPid(speedRaw, "0D");
        const throttleBytes = bytesForPid(throttleRaw, "11");
        const coolantBytes = bytesForPid(coolantRaw, "05");
        const voltageBytes = bytesForPid(voltageRaw, "42");

        setValues((previous) => ({
          rpm: rpmBytes?.length && rpmBytes.length >= 2 ? Math.round(((rpmBytes[0] * 256) + rpmBytes[1]) / 4) : previous.rpm,
          speed: speedBytes?.length ? speedBytes[0] : previous.speed,
          throttle: throttleBytes?.length ? Math.round((throttleBytes[0] * 100) / 255) : previous.throttle,
          coolant: coolantBytes?.length ? coolantBytes[0] - 40 : previous.coolant,
          voltage: voltageBytes?.length && voltageBytes.length >= 2 ? Number((((voltageBytes[0] * 256) + voltageBytes[1]) / 1000).toFixed(1)) : previous.voltage,
        }));
      } catch (error) {
        pollingRef.current = false;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Lost connection to the OBD adapter.");
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }, [command]);

  const disconnect = useCallback(async () => {
    pollingRef.current = false;
    if (demoTimerRef.current) {
      clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    try { await readerRef.current?.cancel(); } catch {}
    try { readerRef.current?.releaseLock(); } catch {}
    try { writerRef.current?.releaseLock(); } catch {}
    readerRef.current = null;
    writerRef.current = null;
    try { await portRef.current?.close(); } catch {}
    portRef.current = null;
    setValues(EMPTY_VALUES);
    setStatus("idle");
    setMessage("Disconnected. Connect an OBD-II adapter to begin.");
  }, []);

  const connect = useCallback(async () => {
    if (!(navigator as any).serial) {
      setStatus("error");
      setMessage("Web Serial is not available. Open Racers Arena in the latest Chrome or Edge on desktop.");
      return;
    }

    try {
      setStatus("connecting");
      setMessage("Choose your OBD-II serial / COM adapter…");
      const port = await (navigator as any).serial.requestPort() as SerialPortLike;
      await port.open({ baudRate: 38400 });
      portRef.current = port;
      if (!port.readable || !port.writable) throw new Error("The selected adapter did not expose a readable serial connection.");
      readerRef.current = port.readable.getReader();
      writerRef.current = port.writable.getWriter();

      await command("ATZ", 3000);
      await command("ATE0");
      await command("ATL0");
      await command("ATS0");
      await command("ATH0");
      await command("ATSP0", 3000);
      const test = await command("0100", 4000);
      if (/UNABLE TO CONNECT|NO DATA/i.test(test)) throw new Error("Adapter connected, but no ECU response. Turn the ignition on and check the OBD connection.");

      setStatus("connected");
      setMessage("ECU connected — live telemetry is streaming.");
      pollingRef.current = true;
      void poll();
    } catch (error) {
      pollingRef.current = false;
      try { readerRef.current?.releaseLock(); } catch {}
      try { writerRef.current?.releaseLock(); } catch {}
      try { await portRef.current?.close(); } catch {}
      readerRef.current = null;
      writerRef.current = null;
      portRef.current = null;
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not connect to the OBD adapter.");
    }
  }, [command, poll]);

  const startDemo = useCallback(() => {
    if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    setStatus("demo");
    setMessage("Demo mode — simulated ECU data. Connect an adapter for real readings.");
    const startedAt = Date.now();
    demoTimerRef.current = setInterval(() => {
      const t = (Date.now() - startedAt) / 1000;
      const wave = (Math.sin(t * 0.8) + 1) / 2;
      setValues({
        rpm: Math.round(850 + wave * 5150),
        speed: Math.round(wave * 148),
        throttle: Math.round(8 + wave * 78),
        coolant: Math.round(88 + Math.sin(t * 0.2) * 4),
        voltage: Number((13.8 + Math.sin(t * 0.5) * 0.25).toFixed(1)),
      });
    }, 180);
  }, []);

  const active = status === "connected" || status === "demo";

  return (
    <div style={{ padding: "24px 0 48px" }}>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: FONT.body, color: C.accent, fontWeight: 700, fontSize: 11, letterSpacing: 3, marginBottom: 5 }}>DESKTOP TELEMETRY</div>
          <h1 style={{ fontFamily: FONT.display, fontSize: 44, letterSpacing: 3, lineHeight: 1 }}>LIVE DATA</h1>
          <p style={{ fontFamily: FONT.body, color: C.muted, marginTop: 8, maxWidth: 620 }}>
            Read live OBD-II engine data through a compatible ELM327 serial / COM adapter. Keep your eyes on the road — use this dashboard with a passenger or while safely stationary.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, border: `1px solid ${active ? C.green : C.border}`, borderRadius: 999, padding: "8px 13px", color: active ? C.green : C.muted, fontFamily: FONT.mono, fontSize: 11 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? C.green : C.dim }} />
          {status === "connected" ? "ECU LIVE" : status === "demo" ? "DEMO" : status === "connecting" ? "CONNECTING" : "OFFLINE"}
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: FONT.body, fontWeight: 700, letterSpacing: 1.5, color: status === "error" ? C.accent : C.text }}>{message}</div>
          <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.muted, marginTop: 5 }}>
            {supported ? "Supported browser detected." : "Use Chrome or Edge on a desktop/laptop with Web Serial support."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {!active && (
            <button onClick={connect} disabled={status === "connecting"} style={{ background: C.accent, color: C.white, border: 0, borderRadius: 9, padding: "11px 18px", cursor: "pointer", fontFamily: FONT.body, fontWeight: 700, letterSpacing: 1.5 }}>
              {status === "connecting" ? "CONNECTING…" : "CONNECT OBD"}
            </button>
          )}
          {!active && (
            <button onClick={startDemo} style={{ background: "transparent", color: C.text, border: `1px solid ${C.border}`, borderRadius: 9, padding: "11px 18px", cursor: "pointer", fontFamily: FONT.body, fontWeight: 700, letterSpacing: 1.5 }}>
              TRY DEMO
            </button>
          )}
          {active && (
            <button onClick={disconnect} style={{ background: "transparent", color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 9, padding: "11px 18px", cursor: "pointer", fontFamily: FONT.body, fontWeight: 700, letterSpacing: 1.5 }}>
              DISCONNECT
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
        <Metric label="ENGINE SPEED" value={values.rpm.toLocaleString()} unit="RPM" hot={values.rpm >= 5500} />
        <Metric label="VEHICLE SPEED" value={values.speed} unit="KM/H" hot={values.speed >= 160} />
        <Metric label="THROTTLE" value={values.throttle} unit="%" />
        <Metric label="COOLANT" value={values.coolant} unit="°C" hot={values.coolant >= 105} />
        <Metric label="CONTROL MODULE" value={values.voltage.toFixed(1)} unit="V" />
      </div>

      <div style={{ marginTop: 18, padding: "15px 18px", border: `1px solid ${C.border}`, borderRadius: 12, color: C.muted, fontFamily: FONT.body, fontSize: 12, lineHeight: 1.6 }}>
        <strong style={{ color: C.text }}>Adapter note:</strong> this first version targets ELM327-compatible adapters exposed as a serial/COM device. PID availability depends on the vehicle. Bluetooth-only adapters that do not appear as a serial device may require a later desktop companion.
      </div>
    </div>
  );
}
