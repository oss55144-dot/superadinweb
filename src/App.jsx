import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Play, Pause, Download, Volume2, Mic, Settings, Search, Loader2, AlertCircle, Laptop } from 'lucide-react';
import './App.css';

// Added Rachel with the specific ID provided by the user
const STARTER_VOICE = {
  voice_id: '6AUOG2nbfr0yFEeI0784',
  name: 'Rachel',
  category: 'Premium',
  description: 'High-quality AI Voice'
};

function App() {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState([STARTER_VOICE]);
  const [selectedVoice, setSelectedVoice] = useState(STARTER_VOICE);
  const [apiKey, setApiKey] = useState('sk_1ddb09f1b42c13fa43bbf08761d59839c3a833cdf48c49e5');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingVoices, setIsFetchingVoices] = useState(true);
  const [voiceError, setVoiceError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const audioRef = useRef(null);

  const fetchVoices = async (key) => {
    setIsFetchingVoices(true);
    setVoiceError(null);
    setIsDemoMode(false);
    try {
      const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': key || apiKey
        }
      });
      if (response.data && response.data.voices) {
        setVoices(response.data.voices);
        if (response.data.voices.length > 0) {
          // If our specific Rachel is in the list, select it, otherwise select the first one
          const rachel = response.data.voices.find(v => v.voice_id === '6AUOG2nbfr0yFEeI0784');
          setSelectedVoice(rachel || response.data.voices[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch voices, reverting to Rachel (ID: 6AUOG2nbfr0yFEeI0784)", error);
      // We keep Rachel in the list so the user can still try to generate
      setVoices([STARTER_VOICE]);
      setSelectedVoice(STARTER_VOICE);

      let msg = "Could not fetch voice list.";
      if (error.response?.status === 401) {
        msg = "Invalid API Key. Please check your ElevenLabs settings.";
      } else if (error.response?.data?.detail?.message?.includes("voices_read")) {
        msg = "API Key missing 'voices_read' permission. Showing Rachel (6AUOG2nbfr) manual entry.";
      }
      setVoiceError(msg);
    } finally {
      setIsFetchingVoices(false);
    }
  };

  const enableDemoMode = () => {
    setVoiceError(null);
    setIsDemoMode(true);
    const systemVoices = window.speechSynthesis.getVoices();
    const formattedVoices = systemVoices
      .filter(v => v.lang.startsWith('en'))
      .map(v => ({
        voice_id: v.name,
        name: v.name.replace('Google ', '').replace('Microsoft ', ''),
        category: 'System Voice',
        isSystem: true,
        raw: v
      }));
    setVoices(formattedVoices);
    if (formattedVoices.length > 0) setSelectedVoice(formattedVoices[0]);
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('elevenlabs_api_key');
    const keyToUse = savedKey || apiKey;
    if (savedKey) setApiKey(savedKey);
    fetchVoices(keyToUse);

    window.speechSynthesis.onvoiceschanged = () => {
      if (isDemoMode) enableDemoMode();
    };
  }, []);

  const handleApiKeyChange = (e) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    localStorage.setItem('elevenlabs_api_key', newKey);
    if (newKey.length > 30) {
      fetchVoices(newKey);
    }
  };

  const generateAudio = async () => {
    if (!text) return alert('Please enter some text');

    if (isDemoMode) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = selectedVoice.raw;
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      return;
    }

    if (!apiKey) return alert('Please enter your ElevenLabs API Key');
    if (!selectedVoice) return alert('Please select a voice');

    setIsLoading(true);
    setAudioUrl(null);

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice.voice_id}`,
        {
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'blob',
        }
      );

      const url = URL.createObjectURL(response.data);
      setAudioUrl(url);
    } catch (error) {
      console.error('Error generating audio:', error);
      let errMsg = "Generation Failed.";
      if (error.response) {
        try {
          const textData = await error.response.data.text();
          const json = JSON.parse(textData);
          if (json?.detail?.message) errMsg = json.detail.message;
        } catch (e) { }
      }
      alert(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = `voice-${selectedVoice.name}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <Volume2 size={32} className="logo-icon" />
          <h1>Vocalize {isDemoMode && <span className="demo-badge">Free Browser Mode</span>}</h1>
        </div>
        <div className="api-key-container">
          <Settings size={18} className="settings-icon" />
          <input
            type="password"
            placeholder="Paste ElevenLabs Key"
            value={apiKey}
            onChange={handleApiKeyChange}
            className="api-input"
          />
        </div>
      </header>

      <main className="main-content">
        <section className="input-section">
          <div className="input-header">
            <Mic size={20} />
            <h2>Enter Text</h2>
          </div>
          <textarea
            placeholder="What should I say?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="text-input"
            rows={5}
          />
        </section>

        <section className="voice-section">
          <div className="section-header">
            <Search size={20} />
            <h2>Select Voice Agent</h2>
          </div>

          <div className="voice-grid">
            {isFetchingVoices ? (
              <div className="status-box">
                <Loader2 className="animate-spin" size={32} />
                <p>Connecting to ElevenLabs...</p>
              </div>
            ) : (
              <>
                {voiceError && !isDemoMode && (
                  <div className="voice-error-inline">
                    <AlertCircle size={16} />
                    <span>{voiceError}</span>
                    <button onClick={enableDemoMode} className="inline-demo-link">Switch to Free Voices</button>
                  </div>
                )}
                {voices.map((voice) => (
                  <div
                    key={voice.voice_id}
                    className={`voice-card ${selectedVoice?.voice_id === voice.voice_id ? 'selected' : ''}`}
                    onClick={() => setSelectedVoice(voice)}
                  >
                    <div className="voice-avatar">{voice.name[0]}</div>
                    <div className="voice-info">
                      <h3>{voice.name}</h3>
                      <p>{voice.category}</p>
                    </div>
                    {selectedVoice?.voice_id === voice.voice_id && <div className="selected-indicator"></div>}
                  </div>
                ))}
              </>
            )}
          </div>
        </section>

        <section className="action-section">
          <button
            className="generate-btn"
            onClick={generateAudio}
            disabled={isLoading || isFetchingVoices || !text || (!isDemoMode && !apiKey) || !selectedVoice}
          >
            {isLoading ? (
              <><Loader2 className="animate-spin" size={20} /> Generating...</>
            ) : (
              <><Play size={20} fill="currentColor" /> {isDemoMode ? 'Speak Now' : 'Generate Speech'}</>
            )}
          </button>

          {audioUrl && !isDemoMode && (
            <div className="audio-controls">
              <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
              <button className="control-btn play" onClick={togglePlay}>
                {isPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
              </button>
              <button className="control-btn download" onClick={handleDownload}>
                <Download size={20} /> Download
              </button>
            </div>
          )}

          {isDemoMode && isPlaying && (
            <button onClick={() => window.speechSynthesis.cancel()} className="control-btn" style={{ background: 'var(--error)', color: 'white' }}>Stop</button>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
