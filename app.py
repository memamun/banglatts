from flask import Flask, render_template, request, send_file, jsonify
import asyncio
import edge_tts
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

VOICE = "bn-BD-NabanitaNeural"
OUTPUT_DIR = "static/audio"
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

class TTSError(Exception):
    pass

async def generate_tts(text: str, voice: str, filename: str):
    try:
        communicate = edge_tts.Communicate(text, voice)
        submaker = edge_tts.SubMaker()
        
        audio_path = os.path.join(OUTPUT_DIR, f"{filename}.mp3")
        vtt_path = os.path.join(OUTPUT_DIR, f"{filename}.vtt")
        
        with open(audio_path, "wb") as file:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    file.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    submaker.create_sub((chunk["offset"], chunk["duration"]), chunk["text"])
                    
        with open(vtt_path, "w", encoding="utf-8") as file:
            file.write(submaker.generate_subs())
            
        return audio_path, vtt_path
    except Exception as e:
        raise TTSError(f"Failed to generate TTS: {str(e)}")

@app.route('/api/tts', methods=['POST'])
def generate_speech():
    try:
        if not request.is_json and not request.form:
            return jsonify({'error': 'Invalid request format'}), 400

        # Get text from either JSON or form data
        text = request.json.get('text') if request.is_json else request.form.get('text')
        voice = request.json.get('voice', VOICE) if request.is_json else request.form.get('voice', VOICE)
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
            
        filename = secure_filename(f"tts_{os.urandom(8).hex()}")
        
        try:
            audio_path, vtt_path = asyncio.run(generate_tts(text, voice, filename))
        except TTSError as e:
            return jsonify({'error': str(e)}), 500
        
        return jsonify({
            'success': True,
            'audio_url': f"/static/audio/{os.path.basename(audio_path)}",
            'vtt_url': f"/static/audio/{os.path.basename(vtt_path)}"
        })
    except Exception as e:
        app.logger.error(f"Error in generate_speech: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# Error handlers
@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': 'File too large'}), 413

@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Not found'}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
