import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Play, Pause, Download, Volume2, Mic, Settings, Search, Loader2, AlertCircle, X, Terminal, Clock, LogIn, LogOut, Bell } from 'lucide-react';
import './App.css';

const DEFAULT_VOICE_ID = '6AUOG2nbfr0yFEeI0784'; // Rachel

function App() {
  // --- TTS State ---
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

  // --- Clock & Tracker State ---
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loginTime, setLoginTime] = useState(null);
  const [dutyHours, setDutyHours] = useState(8);
  const [logoutTime, setLogoutTime] = useState(null);
  const [shiftAlert, setShiftAlert] = useState(false);
  const [isShiftActive, setIsShiftActive] = useState(false);

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

    // Clock Interval
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // --- Shift Logic ---
  useEffect(() => {
    if (isShiftActive && logoutTime) {
      const timeRemaining = logoutTime - currentTime;
      const twoMinutesInMs = 2 * 60 * 1000;

      // Ring alert at 2 minutes left
      if (timeRemaining <= twoMinutesInMs && timeRemaining > 0 && !shiftAlert) {
        setShiftAlert(true);
        playAlertSound();
      }

      // Auto logout if time is up
      if (timeRemaining <= 0) {
        setIsShiftActive(false);
        setShiftAlert(false);
        alert("Shift Complete. Please log out.");
      }
    }
  }, [currentTime, isShiftActive, logoutTime, shiftAlert]);

  const handleLogin = () => {
    const now = new Date();
    setLoginTime(now);
    const logout = new Date(now.getTime() + dutyHours * 60 * 60 * 1000);
    setLogoutTime(logout);
    setIsShiftActive(true);
    setShiftAlert(false);
  };

  const playAlertSound = () => {
    const audioContent = "Attention. Two minutes remaining in your shift. Prepare for logout.";
    // Using the free browser TTS to announce the alert
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(audioContent);
    window.speechSynthesis.speak(utterance);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getRemainingTime = () => {
    if (!logoutTime) return "00:00:00";
    const diff = logoutTime - currentTime;
    if (diff <= 0) return "00:00:00";

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- TTS Logic ---
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
          <span>CYBER-VOCAL v2.0</span>
        </div>
        <div className="api-key-container">
          <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
            {showSettings ? <X size={20} /> : <Settings size={20} />}
          </button>
          {showSettings && (
            <div className="settings-popup">
              <span className="section-label">Config Node</span>
              <input
                type="password"
                placeholder="ENCRYPTED API KEY"
                value={apiKey}
                onChange={handleApiKeyChange}
                className="api-input-minimal"
              />
              <div style={{ marginTop: '1rem' }}>
                <span className="section-label">Duty Cycle (Hours)</span>
                <input
                  type="number"
                  value={dutyHours}
                  onChange={(e) => setDutyHours(e.target.value)}
                  className="api-input-minimal"
                  style={{ marginTop: '5px' }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* --- Clock & Tracker Section --- */}
      <section className="dashboard-section">
        <div className="clock-box">
          <Clock size={16} color="var(--primary)" />
          <span className="time-display">{formatTime(currentTime)}</span>
        </div>
        <div className={`shift-card ${isShiftActive ? 'active' : ''} ${shiftAlert ? 'alert' : ''}`}>
          <div className="shift-info">
            {isShiftActive ? (
              <>
                <div className="countdown-group">
                  <span className="section-label">Shift Ends In:</span>
                  <div className="countdown-value">{getRemainingTime()}</div>
                </div>
                <div className="shift-details">
                  <div>Login: {formatTime(loginTime)}</div>
                  <div>Logout: {formatTime(logoutTime)}</div>
                </div>
              </>
            ) : (
              <div className="shift-offline">SYSTEM READY FOR DUTY</div>
            )}
          </div>
          <button className={`shift-btn ${isShiftActive ? 'logout' : 'login'}`} onClick={isShiftActive ? () => setIsShiftActive(false) : handleLogin}>
            {isShiftActive ? <LogOut size={18} /> : <LogIn size={18} />}
            {isShiftActive ? 'END SHIFT' : 'START SHIFT'}
          </button>
        </div>
      </section>

      <div className="input-group">
        <span className="section-label">Speech Buffer</span>
        <textarea
          placeholder="ENTER TEXT SEQUENCE..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="text-input"
        />
      </div>

      <div className="voice-section">
        <span className="section-label">Neural Core Selection</span>
        {isFetchingVoices ? (
          <div className="status-text pulse">SYNCING VOICES...</div>
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
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} color="#000" />}
          {isLoading ? 'INITIATING...' : 'EXECUTE VOICE'}
        </button>

        {audioUrl && (
          <div className="audio-player-minimal">
            <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
            <button className="play-btn-small" onClick={() => isPlaying ? audioRef.current.pause() : audioRef.current.play()}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
            </button>
            <span className="status-text neon">BUFFER LOADED</span>
            <button className="download-btn-small" onClick={() => {
              const a = document.createElement('a'); a.href = audioUrl; a.download = 'vocal_log.mp3'; a.click();
            }}>
              <Download size={20} />
            </button>
          </div>
        )}
      </div>

      {shiftAlert && (
        <div className="warning-banner">
          <Bell size={18} className="shake" />
          <span>TERMINAL WARNING: 2 MIN REMAINING</span>
        </div>
      )}
    </div>
  );
}

export default App;
