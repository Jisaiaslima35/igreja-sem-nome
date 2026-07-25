#!/usr/bin/env python3
"""
Transcreve áudio PT-BR com faster-whisper.
Usado pela API de áudio da Rádio Louvor e Gratidão.
"""
import sys, warnings
warnings.filterwarnings("ignore")

def main():
    if len(sys.argv) < 2:
        print("", end="")
        sys.exit(0)
    audio_path = sys.argv[1]
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel("base", device="cpu", compute_type="int8")
        segments, info = model.transcribe(
            audio_path,
            language="pt",
            beam_size=3,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500},
        )
        text_parts = []
        for segment in segments:
            text_parts.append(segment.text.strip())
        result = " ".join([p for p in text_parts if p]).strip()
        print(result)
    except Exception as e:
        sys.stderr.write(f"[transcribe error] {e}\n")
        print("", end="")
        sys.exit(0)

if __name__ == "__main__":
    main()