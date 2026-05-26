const YIN_THRESHOLD = 0.15;

async function requestMicPermission(): Promise<boolean> {
  // Capacitor Android: pedir permiso nativo antes de getUserMedia
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { CapacitorHttp } = await import('@capacitor/core');
      void CapacitorHttp; // solo checar que el runtime está disponible
    }
  } catch { /* web, ignorar */ }

  // Verificar que el API existe
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('getUserMedia no disponible en este dispositivo');
  }

  // En Android Capacitor, primer intento puede fallar aunque el usuario dé permiso.
  // Reintentar una vez después de 800ms.
  const constraints = {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
    video: false,
  };

  try {
    return !!(await navigator.mediaDevices.getUserMedia(constraints));
  } catch {
    await new Promise(r => setTimeout(r, 800));
    return !!(await navigator.mediaDevices.getUserMedia(constraints));
  }
}

export class PitchDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private buffer = new Float32Array(2048);
  private stream: MediaStream | null = null;
  private rafId: number | null = null;

  constructor(private onPitch: (hz: number | null, rms: number) => void) {}

  async start(): Promise<void> {
    const constraints = {
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false as const,
    };

    // Primer intento
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      // Esperar y reintentar — fix para Capacitor Android
      await new Promise(r => setTimeout(r, 800));
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    }

    this.audioContext = new AudioContext();
    await this.audioContext.resume();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);
    this.loop();
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.source?.disconnect();
    this.stream?.getTracks().forEach(t => t.stop());
    this.audioContext?.close().catch(() => {});
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
  }

  private loop(): void {
    if (!this.analyser) return;
    this.analyser.getFloatTimeDomainData(this.buffer);
    const rms = this.rms(this.buffer);
    if (rms < 0.008) {
      this.onPitch(null, rms);
    } else {
      const hz = this.yin(this.buffer, this.audioContext!.sampleRate);
      this.onPitch(hz, rms);
    }
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private rms(buf: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  private yin(buffer: Float32Array, sampleRate: number): number | null {
    const half = Math.floor(buffer.length / 2);
    const d = new Float32Array(half);
    for (let tau = 1; tau < half; tau++) {
      for (let j = 0; j < half; j++) {
        const diff = buffer[j] - buffer[j + tau];
        d[tau] += diff * diff;
      }
    }
    d[0] = 1;
    let sum = 0;
    for (let tau = 1; tau < half; tau++) {
      sum += d[tau];
      d[tau] *= tau / sum;
    }
    let tau = 2;
    while (tau < half) {
      if (d[tau] < YIN_THRESHOLD) {
        while (tau + 1 < half && d[tau + 1] < d[tau]) tau++;
        const x0 = tau > 0 ? tau - 1 : 0;
        const x2 = tau < half - 1 ? tau + 1 : tau;
        if (x0 === tau) return sampleRate / (d[tau] <= d[x2] ? tau : x2);
        if (x2 === tau) return sampleRate / (d[tau] <= d[x0] ? tau : x0);
        const t = tau + (d[x2] - d[x0]) / (2 * (2 * d[tau] - d[x2] - d[x0]));
        return sampleRate / t;
      }
      tau++;
    }
    return null;
  }
}
