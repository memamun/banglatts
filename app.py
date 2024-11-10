from flask import Flask, render_template, request, send_file, jsonify, send_from_directory
import asyncio
import edge_tts
import os
import base64
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

VOICE = "bn-BD-NabanitaNeural"

async def generate_audio_data(text: str, voice: str):
    try:
        communicate = edge_tts.Communicate(text, voice)
        audio_data = bytearray()
        
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.extend(chunk["data"])
        
        return audio_data
    except Exception as e:
        raise Exception(f"Failed to generate audio: {str(e)}")

@app.route('/api/tts', methods=['POST'])
def generate_speech():
    try:
        if not request.is_json and not request.form:
            return jsonify({'error': 'Invalid request format'}), 400

        text = request.json.get('text') if request.is_json else request.form.get('text')
        voice = request.json.get('voice', VOICE) if request.is_json else request.form.get('voice', VOICE)
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Run async function in sync context
        audio_data = asyncio.run(generate_audio_data(text, voice))
        
        # Convert to base64
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        return jsonify({
            'success': True,
            'audio_data': audio_base64,
            'text': text
        })
    except Exception as e:
        app.logger.error(f"Error in generate_speech: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    return render_template('index.html')

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

# Add favicon route
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, 'static'),
        'favicon.ico',
        mimetype='image/vnd.microsoft.icon'
    )

# Create a simple favicon if it doesn't exist
def create_default_favicon():
    favicon_path = os.path.join(app.root_path, 'static', 'favicon.ico')
    if not os.path.exists(favicon_path):
        # Create an empty favicon
        with open(favicon_path, 'wb') as f:
            f.write(b'\x00\x00\x01\x00\x01\x00\x01\x01\x00\x00\x01\x00\x18\x00\x00\x00\x00\x00\x00\x00\x00\x00')

# Call this when app starts
create_default_favicon()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
