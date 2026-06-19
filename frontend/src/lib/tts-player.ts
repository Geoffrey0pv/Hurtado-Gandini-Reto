import { createParser } from "eventsource-parser";

export type TtsHandle = {
  stop: () => void;
  done: Promise<void>;
};

export function streamSpeech(text: string, voice = "alloy"): TtsHandle {
  const controller = new AbortController();
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new AudioCtx({ sampleRate: 24000 });
  const sources: AudioBufferSourceNode[] = [];
  let playhead = 0;
  let pending = new Uint8Array(0);
  let stopped = false;

  const playChunk = (incoming: Uint8Array) => {
    const bytes = new Uint8Array(pending.length + incoming.length);
    bytes.set(pending);
    bytes.set(incoming, pending.length);
    const usable = bytes.length - (bytes.length % 2);
    pending = bytes.slice(usable);
    if (usable === 0) return;
    const samples = new Int16Array(bytes.buffer, 0, usable / 2);
    const floats = Float32Array.from(samples, (s) => s / 32768);
    const buffer = ctx.createBuffer(1, floats.length, 24000);
    buffer.copyToChannel(floats, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    if (playhead === 0) {
      playhead = ctx.currentTime + 0.05;
    } else {
      playhead = Math.max(playhead, ctx.currentTime);
    }
    source.start(playhead);
    playhead += buffer.duration;
    sources.push(source);
  };

  const done = (async () => {
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(detail || `TTS failed: ${res.status}`);
    }

    const parser = createParser({
      onEvent(event) {
        if (stopped) return;
        let payload: { type: string; audio?: string };
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        if (payload.type !== "speech.audio.delta" || !payload.audio) return;
        const binary = atob(payload.audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        playChunk(bytes);
      },
    });

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    try {
      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        if (stopped) break;
        parser.feed(value);
      }
    } finally {
      await new Promise<void>((resolve) => {
        const remaining = Math.max(0, playhead - ctx.currentTime);
        setTimeout(resolve, remaining * 1000 + 100);
      });
      ctx.close().catch(() => {});
    }
  })();

  return {
    stop: () => {
      stopped = true;
      controller.abort();
      for (const s of sources) {
        try {
          s.stop();
        } catch {
          /* noop */
        }
      }
      ctx.close().catch(() => {});
    },
    done,
  };
}
