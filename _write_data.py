"""Write data.js: the real waveform, the real language list, a verified transcript excerpt."""
import json
from pathlib import Path

out = Path(r"C:\Users\Mega Providers\OneDrive\Documents\Default Project\tannscribe")
bars = json.loads((out / "bars.json").read_text(encoding="utf-8"))
codes = json.loads((out / "languages.json").read_text(encoding="utf-8"))

NAMES = {
    "af": "Afrikaans", "am": "Amharic", "ar": "Arabic", "as": "Assamese", "az": "Azerbaijani",
    "ba": "Bashkir", "be": "Belarusian", "bg": "Bulgarian", "bn": "Bengali", "bo": "Tibetan",
    "br": "Breton", "bs": "Bosnian", "ca": "Catalan", "cs": "Czech", "cy": "Welsh",
    "da": "Danish", "de": "German", "el": "Greek", "en": "English", "es": "Spanish",
    "et": "Estonian", "eu": "Basque", "fa": "Persian", "fi": "Finnish", "fo": "Faroese",
    "fr": "French", "gl": "Galician", "gu": "Gujarati", "ha": "Hausa", "he": "Hebrew",
    "hi": "Hindi", "hr": "Croatian", "ht": "Haitian Creole", "hu": "Hungarian",
    "hy": "Armenian", "id": "Indonesian", "is": "Icelandic", "it": "Italian",
    "ja": "Japanese", "jw": "Javanese", "ka": "Georgian", "kk": "Kazakh", "km": "Khmer",
    "kn": "Kannada", "ko": "Korean", "la": "Latin", "lb": "Luxembourgish", "ln": "Lingala",
    "lo": "Lao", "lt": "Lithuanian", "lv": "Latvian", "mg": "Malagasy", "mi": "Maori",
    "mk": "Macedonian", "ml": "Malayalam", "mn": "Mongolian", "mr": "Marathi", "ms": "Malay",
    "mt": "Maltese", "my": "Burmese", "ne": "Nepali", "nl": "Dutch", "nn": "Norwegian Nynorsk",
    "no": "Norwegian", "oc": "Occitan", "pa": "Punjabi", "pl": "Polish", "ps": "Pashto",
    "pt": "Portuguese", "ro": "Romanian", "ru": "Russian", "sa": "Sanskrit", "sd": "Sindhi",
    "si": "Sinhala", "sk": "Slovak", "sl": "Slovenian", "sn": "Shona", "so": "Somali",
    "sq": "Albanian", "sr": "Serbian", "su": "Sundanese", "sv": "Swedish", "sw": "Swahili",
    "ta": "Tamil", "te": "Telugu", "tg": "Tajik", "th": "Thai", "tk": "Turkmen",
    "tl": "Tagalog", "tr": "Turkish", "tt": "Tatar", "uk": "Ukrainian", "ur": "Urdu",
    "uz": "Uzbek", "vi": "Vietnamese", "yi": "Yiddish", "yo": "Yoruba", "zh": "Chinese",
}
missing = [c for c in codes if c not in NAMES]
if missing:
    raise SystemExit(f"no display name for: {missing}")

# Real lines, real times, from the caption file of the real clip.
# Garbled and adult lines were left out; nothing here is rewritten.
LINES = [
    (0.0,  "Look at the girl’s face.",
           "लड़की का चेहरा देखो।", "Mira la cara de la chica."),
    (14.4, "How many likes are there?",
           "कितने लाइक्स आ गए हैं?", "¿Cuántos likes hay?"),
    (18.0, "Let’s go, bro.",
           "चलो शुरू करें, भाई।", "Vamos, hermano."),
    (21.1, "I don’t have money.",
           "मेरे पास पैसे नहीं हैं।", "No tengo dinero."),
    (24.0, "140?",
           "एक सौ चालीस?", "¿140?"),
    (25.9, "Bye, 145 K.",
           "बाय, एक सौ पैंतालीस हज़ार।", "Adiós, 145 mil."),
    (38.6, "I’m looking for him.",
           "मैं उसे ढूँढ रहा हूँ।", "Lo estoy buscando."),
    (43.9, "I need to spot him, right?",
           "मुझे उसे पहचानना है, है ना?", "Tengo que reconocerlo, ¿verdad?"),
]

data = {
    "clip": {
        "name": "01_carry-pulls-up-to-jack-of-hearts.mp4",
        "source": "CARRYMINATI PLAYS GTA VI",
        "duration": 55.2,
        "width": 1080,
        "height": 1920,
    },
    "bars": bars,
    "step": round(55.2 / len(bars), 4),
    "languages": [{"code": c, "name": NAMES[c]} for c in codes],
    "lines": [{"t": t, "text": en, "hi": hi, "es": es} for t, en, hi, es in LINES],
}

js = "// Real data: waveform measured from the clip's audio, transcript from its caption file,\n"
js += "// language list read from the installed faster-whisper. Nothing here is invented.\n"
js += "const DEMO = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n"
(out / "data.js").write_text(js, encoding="utf-8")
print(f"data.js written: {len(bars)} bars, {len(data['languages'])} languages, {len(LINES)} lines, "
      f"{(out / 'data.js').stat().st_size} bytes")
