import { useEffect, useRef } from 'react';
import { useRestTimer } from '@/store/restTimer';
import { useSettings } from '@/store/settingsStore';
import { formatDuration } from '@/lib/labels';
import { vibrate } from '@/ui/feedback';

export function RestTimerBar() {
  const { running, secondsLeft, add, skip, tick } = useRestTimer();
  const { settings } = useSettings();
  const wasRunning = useRef(false);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => tick(), 250);
    return () => clearInterval(iv);
  }, [running, tick]);

  // Detecta o fim do descanso para feedback tatil/sonoro.
  useEffect(() => {
    if (wasRunning.current && !running) {
      vibrate([120, 60, 120], settings.vibration);
      if (settings.sound) beep();
    }
    wasRunning.current = running;
  }, [running, settings.vibration, settings.sound]);

  if (!running) return null;
  return (
    <div className="rest-bar">
      <button className="btn btn--sm" onClick={() => add(-15)}>-15s</button>
      <div className="row" style={{ gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>DESCANSO</span>
        <span className="rest-time">{formatDuration(secondsLeft)}</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn btn--sm" onClick={() => add(15)}>+15s</button>
        <button className="btn btn--sm" onClick={skip}>Pular</button>
      </div>
    </div>
  );
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
  } catch {}
}
