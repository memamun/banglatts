from flask import Flask, render_template, request, send_file
import asyncio
import edge_tts

app = Flask(__name__)

VOICE = "bn-BD-NabanitaNeural"
OUTPUT_FILE = "static/output.mp3"
WEBVTT_FILE = "static/output.vtt"

async def generate_tts(text: str):
    communicate = edge_tts.Communicate(text, VOICE)
    submaker = edge_tts.SubMaker()
    with open(OUTPUT_FILE, "wb") as file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                submaker.create_sub((chunk["offset"], chunk["duration"]), chunk["text"])
    with open(WEBVTT_FILE, "w", encoding="utf-8") as file:
        file.write(submaker.generate_subs())

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        text = request.form['text']
        asyncio.run(generate_tts(text))
        return render_template('index.html', audio_generated=True)
    return render_template('index.html', audio_generated=False)

@app.route('/download_audio')
def download_audio():
    return send_file(OUTPUT_FILE, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
