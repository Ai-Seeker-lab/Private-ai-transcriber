"""Build the demo data: a real waveform, the real language list, a real transcript excerpt."""
import json
import subprocess
import sys
from pathlib import Path

out = Path(r"C:\Users\Mega Providers\OneDrive\Documents\Default Project\tannscribe")
CLIP = Path.home() / ("StreamClips/2026-11-19/gta-6/"
                      "carryislive__carryminati-plays-gta-vi-no-promotions/"
                      "01_carry-pulls-up-to-jack-of-hearts.mp4")

# ---------- 1. waveform: dB per 0.25 s, clamped so one silence does not flatten it ----------
cmd = [
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(CLIP),
    "-ac", "1", "-ar", "8000",
    "-af", "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-",
    "-f", "null", "-",
]
res = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
db = []
for line in (res.stdout + res.stderr).splitlines():
    if "RMS_level=" in line:
        try:
            db.append(float(line.split("RMS_level=")[1].split()[0]))
        except (IndexError, ValueError):
            pass

if not db:
    sys.exit("no RMS values captured")

FLOOR, CEIL = -30.0, -8.5
db = [min(CEIL, max(FLOOR, v)) for v in db]
BARS = 160
step = len(db) / BARS
bars = []
for i in range(BARS):
    lo = int(i * step)
    hi = max(int((i + 1) * step), lo + 1)
    peak = max(db[lo:hi])
    bars.append(round((peak - FLOOR) / (CEIL - FLOOR), 3))

print(f"db samples {len(db)}  range {min(db):.1f} to {max(db):.1f}")
print(f"bars {len(bars)}  min {min(bars)}  max {max(bars)}  "
      f"quiet {sum(1 for b in bars if b < 0.08)}")
(out / "bars.json").write_text(json.dumps(bars, separators=(",", ":")), encoding="utf-8")

# ---------- 2. the real language list, from the installed faster-whisper ----------
sys.path.insert(0, str(Path.home() / ".streamclips/venv/Lib/site-packages"))
try:
    from faster_whisper.tokenizer import _LANGUAGE_CODES
    langs = sorted({c for c in _LANGUAGE_CODES if len(c) == 2})
    print(f"\nlanguages from faster_whisper: {len(langs)}")
    print(", ".join(langs))
    (out / "languages.json").write_text(json.dumps(langs), encoding="utf-8")
except Exception as exc:  # noqa: BLE001
    print(f"\ncould not read faster_whisper: {exc}")
