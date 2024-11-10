# 🎙️ Bangla Text-to-Speech Converter

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://banglatts.onrender.com/)
[![Python](https://img.shields.io/badge/python-3.9-blue)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/flask-2.0-lightgrey)](https://flask.palletsprojects.com/)
[![Edge TTS](https://img.shields.io/badge/edge--tts-latest-orange)](https://github.com/rany2/edge-tts)

A modern web application that converts Bangla text into natural-sounding speech using Microsoft Edge's Text-to-Speech engine.

## ✨ Features

- 🔊 High-quality Bangla text-to-speech conversion
- 👥 Multiple voice options (Male/Female)
- 🎛️ Playback controls (Play, Pause, Speed, Volume)
- 🔄 Loop functionality
- 💾 Download audio as MP3
- 📋 Copy text functionality
- 🌓 Dark/Light mode
- 📱 Responsive design
- ⚡ Real-time processing

## 🚀 Live Demo

Try the live application here: [Bangla TTS](https://banglatts.onrender.com/)

## 🛠️ Technologies Used

- **Frontend:**
  - HTML5
  - CSS3 (Tailwind CSS)
  - JavaScript
  - Material Icons

- **Backend:**
  - Python
  - Flask
  - Edge-TTS

## 🏗️ Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bangla-tts.git
cd bangla-tts
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```
4. Run the application:
```bash
python app.py
```

5. Open `http://localhost:5000` in your browser

## 📦 Deployment

The application is deployed on [Render](https://render.com). To deploy your own instance:

1. Fork this repository
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Use the following settings:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`

## 🎯 Usage

1. Enter or paste Bangla text in the input area
2. Select your preferred voice (Nabanita/Pradeep)
3. Click "Generate Speech" to convert text to speech
4. Use the audio player controls to:
   - Play/Pause audio
   - Adjust volume
   - Change playback speed
   - Toggle loop mode
   - Download the audio file

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

Mamun Abdullah - [GitHub Profile](https://github.com/memamun)

## 🙏 Acknowledgments

- Microsoft Edge TTS for providing the text-to-speech engine
- Tailwind CSS for the beautiful UI components
- Material Icons for the icon set

---

<p align="center">Made with ❤️ for the Bangla community</p>
