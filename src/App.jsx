import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Play, Pause, Download, Volume2, Mic, Settings, Search, Loader2, AlertCircle, X, Terminal } from 'lucide-react';
import './App.css';

const DEFAULT_VOICE_ID = '6AUOG2nbfr0yFEeI0784'; // Rachel

function App() {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [apiKey, setApiKey] = useState('sk_1ddb09f1b42c13fa43bbf08761d59839c3a833cdf48c49e5');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingVoices, setIsFetchingVoices] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const fetchVoices = async (key) => {
    setIsFetchingVoices(true);
    try {
      const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': key || apiKey }
      });
      if (response.data?.voices) {
        setVoices(response.data.voices);
        const savedVoiceId = localStorage.getItem('selected_voice_id') || DEFAULT_VOICE_ID;
        const initial = response.data.voices.find(v => v.voice_id === savedVoiceId) || response.data.voices[0];
        setSelectedVoice(initial);
      }
    } catch (error) {
      console.error("Fetch failed", error);
      setVoices([{ voice_id: DEFAULT_VOICE_ID, name: 'Rachel Agent' }]);
      setSelectedVoice({ voice_id: DEFAULT_VOICE_ID, name: 'Rachel Agent' });
    } finally {
      setIsFetchingVoices(false);
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('elevenlabs_api_key');
    if (savedKey) setApiKey(savedKey);
    fetchVoices(savedKey || apiKey);
  }, []);

  const handleApiKeyChange = (e) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    localStorage.setItem('elevenlabs_api_key', newKey);
    if (newKey.length > 30) fetchVoices(newKey);
  };

  const handleVoiceChange = (e) => {
    const voice = voices.find(v => v.voice_id === e.target.value);
    setSelectedVoice(voice);
    localStorage.setItem('selected_voice_id', voice.voice_id);
  };

  const generateAudio = async () => {
    if (!text) return;
    setIsLoading(true);
    setAudioUrl(null);

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice.voice_id}`,
        { text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
        { headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }, responseType: 'blob' }
      );
      setAudioUrl(URL.createObjectURL(response.data));
    } catch (error) {
      alert('Neural link failed. Check API key/credits.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <Terminal size={22} color="#00f2ff" />
          <span>CYBER-VOCAL</span>
        </div>
        <div className="api-key-container">
          <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
            {showSettings ? <X size={20} /> : <Settings size={20} />}
          </button>
          {showSettings && (
            <input
              type="password"
              placeholder="ENCRYPTED API KEY"
              value={apiKey}
              onChange={handleApiKeyChange}
              className="api-input-minimal"
            />
          )}
        </div>
      </header>

      <div className="input-group">
        <span className="section-label">Input Terminal</span>
        <textarea
          placeholder="ENTER TEXT SEQUENCE..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="text-input"
        />
      </div>

      <div className="voice-section">
        <span className="section-label">Voice Core</span>
        {isFetchingVoices ? (
          <div className="status-text">SYNCING VOICES...</div>
        ) : (
          <select
            className="voice-select-minimal"
            value={selectedVoice?.voice_id}
            onChange={handleVoiceChange}
          >
            {voices.map(v => (
              <option key={v.voice_id} value={v.voice_id}>{v.name.toUpperCase()}</option>
            ))}
          </select>
        )}
      </div>

      <div className="action-section">
        <button
          className="generate-btn"
          onClick={generateAudio}
          disabled={isLoading || !text}
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
          {isLoading ? 'INITIATING...' : 'EXECUTE VOICE'}
        </button>

        {audioUrl && (
          <div className="audio-player-minimal">
            <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
            <button className="play-btn-small" onClick={() => isPlaying ? audioRef.current.pause() : audioRef.current.play()}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
            </button>
            <span className="status-text">AUDIO READY</span>
            <button className="download-btn-small" onClick={() => {
              const a = document.createElement('a'); a.href = audioUrl; a.download = 'cyber_vocal.mp3'; a.click();
            }}>
              <Download size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
