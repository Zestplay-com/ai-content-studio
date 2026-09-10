import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("VOICE_INPUTS_V1")) {
  console.log("Voice input options already installed.");
  process.exit(0);
}

text = text.replace(
  'import { useState } from "react";',
  'import { useRef, useState } from "react";'
);

const stateAnchor = '  const [voiceoverError, setVoiceoverError] = useState("");\n';
if (!text.includes(stateAnchor)) throw new Error("Voiceover state anchor was not found.");
text = text.replace(stateAnchor, stateAnchor + '  const [recordingScene, setRecordingScene] = useState<number | null>(null);\n  const [recordingSeconds, setRecordingSeconds] = useState(0);\n  const [recordingError, setRecordingError] = useState("");\n  const recorderRef = useRef<MediaRecorder | null>(null);\n  const recordingStreamRef = useRef<MediaStream | null>(null);\n  const recordingTimerRef = useRef<number | null>(null);\n');

const voiceState = '  const [voiceovers, setVoiceovers] = useState<Record<number, { audio_url: string; voice: string; voice_style: string }>>({});';
if (!text.includes(voiceState)) throw new Error("Voiceover state declaration was not found.");
text = text.replace(voiceState, '  const [voiceovers, setVoiceovers] = useState<Record<number, { audio_url: string; voice: string; voice_style: string; source?: string; file_name?: string }>>({});');

const resetAnchor = '    setVoiceovers({});\n    setVoiceoverError("");\n';
if (!text.includes(resetAnchor)) throw new Error("Voiceover reset anchor was not found.");
text = text.replace(resetAnchor, resetAnchor + '    setRecordingScene(null);\n    setRecordingSeconds(0);\n    setRecordingError("");\n');

const aiState = 'setVoiceovers((current) => ({ ...current, [scene.number]: { audio_url: data.audio_url, voice: data.voice, voice_style: data.voice_style } }));';
if (!text.includes(aiState)) throw new Error("AI voiceover state update was not found.");
text = text.replace(aiState, 'setVoiceovers((current) => ({ ...current, [scene.number]: { audio_url: data.audio_url, voice: data.voice, voice_style: data.voice_style, source: "ai", file_name: "AI generated voice" } }));');

const fnAnchor = "  return (\n";
if (!text.includes(fnAnchor)) throw new Error("Return anchor was not found.");

const functionBlock = `  async function audioFileToDataUrl(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read this audio file."));
      reader.readAsDataURL(file);
    });
  }

  async function importVoiceoverFile(sceneNumber: number, file: File) {
    if (!file.type.startsWith("audio/")) {
      setVoiceoverError("Please choose an audio file such as MP3, WAV, M4A, OGG, or AAC.");
      return;
    }
    setVoiceoverError("");
    setRecordingError("");
    try {
      const audioUrl = await audioFileToDataUrl(file);
      if (!audioUrl) throw new Error("The selected audio file was empty.");
      setVoiceovers((current) => ({
        ...current,
        [sceneNumber]: {
          audio_url: audioUrl,
          voice: "Imported audio",
          voice_style: "External file",
          source: "upload",
          file_name: file.name,
        },
      }));
    } catch (err) {
      setVoiceoverError(err instanceof Error ? err.message : "Could not import the audio file.");
    }
  }

  async function stopVoiceRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
  }

  async function recordVoiceover(sceneNumber: number) {
    if (recordingScene !== null) return;
    setRecordingError("");
    setVoiceoverError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError("Voice recording is not supported in this browser. You can upload an audio file instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorderRef.current = recorder;
      setRecordingScene(sceneNumber);
      setRecordingSeconds(0);
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onerror = () => setRecordingError("The browser could not complete the voice recording.");
      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
          if (!blob.size) throw new Error("No audio was recorded.");
          const audioUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Could not prepare the recording."));
            reader.readAsDataURL(blob);
          });
          setVoiceovers((current) => ({
            ...current,
            [sceneNumber]: {
              audio_url: audioUrl,
              voice: "My recorded voice",
              voice_style: "Recorded in studio",
              source: "recording",
              file_name: "My voice recording",
            },
          }));
        } catch (err) {
          setRecordingError(err instanceof Error ? err.message : "Could not save the recording.");
        } finally {
          recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
          recordingStreamRef.current = null;
          recorderRef.current = null;
          setRecordingScene(null);
          setRecordingSeconds(0);
        }
      };
      recorder.start(500);
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    } catch (err) {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      setRecordingScene(null);
      setRecordingError(err instanceof DOMException && err.name === "NotAllowedError" ? "Microphone permission was denied. Allow microphone access or upload an audio file instead." : "Could not access your microphone.");
    }
  }

  // VOICE_INPUTS_V1
`;
text = text.replace(fnAnchor, functionBlock + fnAnchor);

const controlsMarker = '                  {/* VOICEOVER_STAGE_PROVIDER_CONTROLS */}';
if (!text.includes(controlsMarker)) throw new Error("Voiceover provider controls marker was not found.");

const ui = `
                  <div style={{ marginBottom: 18, padding: 16, borderRadius: 14, background: "#081522", border: "1px solid #29476a" }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>Choose how you want to provide your voice</div>
                    <div style={{ color: "#8fa4bd", fontSize: 12, lineHeight: 1.55, marginTop: 5 }}>AI voice is optional. You can import a voice made in ElevenLabs or any other app, record your own voice here, or use our AI voice when it is available.</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 14 }}>
                      <div style={{ padding: 13, border: "1px solid #1d3048", borderRadius: 12, background: "#0b1b2c" }}>
                        <div style={{ fontWeight: 750 }}>🤖 AI Voice</div>
                        <div style={{ color: "#7186a0", fontSize: 11, marginTop: 4 }}>Use OpenAI, ElevenLabs, Gemini or xAI when configured.</div>
                      </div>
                      <div style={{ padding: 13, border: "1px solid #1d3048", borderRadius: 12, background: "#0b1b2c" }}>
                        <div style={{ fontWeight: 750 }}>📁 Import Voice</div>
                        <div style={{ color: "#7186a0", fontSize: 11, marginTop: 4 }}>Upload MP3, WAV, M4A, OGG, AAC and other browser-supported audio.</div>
                      </div>
                      <div style={{ padding: 13, border: "1px solid #1d3048", borderRadius: 12, background: "#0b1b2c" }}>
                        <div style={{ fontWeight: 750 }}>🎙️ Record My Voice</div>
                        <div style={{ color: "#7186a0", fontSize: 11, marginTop: 4 }}>Record directly from your phone or computer microphone.</div>
                      </div>
                    </div>
                    {recordingError && <div style={{ ...errorBox, marginTop: 12 }}>{recordingError}</div>}
                  </div>
`;
text = text.replace(controlsMarker, controlsMarker + ui);

const sceneArticleAnchor = '                        <article key={scene.number} style={{ border: "1px solid #1d3048", borderRadius: 14, padding: 14, background: "#091522" }}>';
if (!text.includes(sceneArticleAnchor)) throw new Error("Voiceover scene card anchor was not found.");

const sceneControls = `
                          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                            <label style={{ ...secondaryButton, cursor: "pointer", textAlign: "center" }}>
                              📁 Import Voice
                              <input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac" style={{ display: "none" }} onChange={(event) => { const file = event.target.files?.[0]; if (file) void importVoiceoverFile(scene.number, file); event.currentTarget.value = ""; }} />
                            </label>
                            <button type="button" onClick={() => recordingScene === scene.number ? void stopVoiceRecording() : void recordVoiceover(scene.number)} disabled={recordingScene !== null && recordingScene !== scene.number} style={{ ...secondaryButton, opacity: recordingScene !== null && recordingScene !== scene.number ? 0.45 : 1 }}>{recordingScene === scene.number ? "⏹ Stop Recording · " + recordingSeconds + "s" : "🎙️ Record My Voice"}</button>
                          </div>
`;
text = text.replace(sceneArticleAnchor, sceneArticleAnchor + sceneControls);

const audioMeta = 'Voice: {audio.voice} · Style: {audio.voice_style}';
if (!text.includes(audioMeta)) throw new Error("Voiceover audio metadata anchor was not found.");
text = text.replace(audioMeta, 'Source: {audio.source === "upload" ? "Imported file" : audio.source === "recording" ? "My recording" : "AI"} · {audio.file_name || audio.voice}');

writeFileSync(path, text);
console.log("Flexible voice input options installed successfully.");
