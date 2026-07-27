import React, { useState, useEffect, useRef } from 'react';

// ponytail: lightweight telemetry history item
interface HistoryEntry {
  id: string;
  timestamp: string;
  username: string;
  tweetContent: string;
  tokenAddress: string | null;
  status: 'scanned' | 'spotted' | 'swapping' | 'swapped' | 'failed' | 'not_bullish';
  details?: string;
  txSignature?: string;
}

// Browser Sound Synthesizer via Web Audio API
class Synthesizer {
  private ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playClick() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.08);
    
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playSuccess() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);
      
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  }
}

const synth = new Synthesizer();

export default function App() {
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  // Bot Telemetry State
  const [isRunning, setIsRunning] = useState(false);
  const [wallet, setWallet] = useState({ publicKey: '', balance: 0, network: '' });
  const [config, setConfig] = useState({ username: '', solAmount: 0.001 });
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Form Inputs
  const [targetInput, setTargetInput] = useState('');
  const [amountInput, setAmountInput] = useState('0.001');

  // Settings Modal State
  const [formRpc, setFormRpc] = useState('');
  const [formPrivateKey, setFormPrivateKey] = useState('');
  const [formOpenaiKey, setFormOpenaiKey] = useState('');
  const [formRapidapiKey, setFormRapidapiKey] = useState('');

  // UI Toast & Modal
  const [showSettings, setShowSettings] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const historyRef = useRef<HistoryEntry[]>([]);
  const isInitialLoaded = useRef(false);

  // Concentric Optical Circles Canvas Animation
  useEffect(() => {
    const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rotation = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const animate = () => {
      ctx.fillStyle = '#EFEFE8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      const centerX = -50;
      const centerY = canvas.height * 0.5;
      rotation += 0.002;

      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);

      const numCircles = 22;
      const maxRadius = Math.min(canvas.width, canvas.height) * 0.7;

      for (let i = 1; i <= numCircles; i++) {
        const radius = (i / numCircles) * maxRadius;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.lineWidth = (i % 2 === 0) ? 14 : 4;
        ctx.strokeStyle = (i % 2 === 0) ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.03)';
        ctx.stroke();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Poll server telemetry every 2 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        setIsRunning(data.config.isRunning);
        setWallet(data.wallet);
        setConfig(data.config);
        
        // ponytail: initialize default input only once to prevent overwriting user input while typing
        if (!isInitialLoaded.current && data.config.username) {
          setTargetInput(data.config.username);
          setAmountInput(String(data.config.solAmount));
          isInitialLoaded.current = true;
        }

        const oldHistory = historyRef.current;
        const newHistory: HistoryEntry[] = data.history || [];
        setHistory(newHistory);
        historyRef.current = newHistory;

        if (oldHistory.length > 0 && newHistory.length > 0) {
          const newest = newHistory[0];
          const hasNewSwap = !oldHistory.some(h => h.id === newest.id) && newest.status === 'swapped';
          if (hasNewSwap && audioEnabled) {
            synth.playSuccess();
            speak(`Spotted token from ${newest.username}. Swap complete!`);
            showToast(`🚀 Swapped for spotted token!`);
          }
        }
      } catch (err) {
        console.error('Error fetching status:', err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [audioEnabled]);

  const speak = (msg: string) => {
    if (audioEnabled && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const toggleAudio = () => {
    if (!audioEnabled) {
      synth.init();
      synth.playClick();
      setAudioEnabled(true);
      speak('Audio enabled.');
      showToast('🔊 Audio Enabled');
    } else {
      setAudioEnabled(false);
      showToast('🔇 Audio Muted');
    }
  };

  const toggleBot = async () => {
    if (audioEnabled) synth.playClick();
    const endpoint = isRunning ? '/api/stop' : '/api/start';
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsRunning(!isRunning);
        if (audioEnabled) speak(isRunning ? 'Bot offline' : 'Bot online. Scanning target user');
        showToast(isRunning ? '🔴 Bot stopped' : '🟢 Bot scanning active');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message);
    }
  };

  const triggerInstantScan = async () => {
    if (audioEnabled) synth.playClick();
    try {
      const res = await fetch('/api/scan-now', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('⚡ Instant scan started!');
        if (audioEnabled) speak('Instant tweet scan initiated');
      }
    } catch (err: any) {
      showToast('Scan request failed');
    }
  };

  const updateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (audioEnabled) synth.playClick();

    let cleanHandle = targetInput.trim();
    const urlMatch = cleanHandle.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})/i);
    if (urlMatch && urlMatch[1]) {
      cleanHandle = urlMatch[1];
    } else {
      cleanHandle = cleanHandle.replace(/^@/, '').trim();
    }

    setTargetInput(cleanHandle);
    // ponytail: update active target badge instantly in local React state
    setConfig(prev => ({ ...prev, username: cleanHandle }));

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanHandle,
          solAmount: parseFloat(amountInput)
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Target set to @${cleanHandle}`);
        if (audioEnabled) speak(`Target set to ${cleanHandle}`);
      }
    } catch (err: any) {
      showToast('Update failed');
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (audioEnabled) synth.playClick();
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: targetInput,
          solAmount: parseFloat(amountInput),
          rpcUrl: formRpc,
          privateKey: formPrivateKey,
          openaiKey: formOpenaiKey,
          rapidapiKey: formRapidapiKey
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowSettings(false);
        showToast('Settings saved!');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  return (
    <>
      <canvas id="bg-canvas"></canvas>

      <div className="app-container">
        
        {/* Header */}
        <header className="dashboard-header">
          <div className="logo-container">
            <div className="logo-text-wrapper">
              <span className="logo-text-bg">SOL SWAP BOT</span>
              <span className="logo-text">SOL SWAP BOT</span>
            </div>
          </div>
          
          <div className="header-right">
            <button 
              className="audio-btn" 
              onClick={toggleAudio}
              title={audioEnabled ? 'Mute Audio' : 'Enable Audio & Voice'}
            >
              {audioEnabled ? '🔊' : '🔇'}
            </button>

            <button 
              className="btn-secondary" 
              onClick={() => { if (audioEnabled) synth.playClick(); setShowSettings(true); }}
            >
              ⚙ Settings
            </button>

            <div className="status-badge">
              <span className={`status-pulse ${isRunning ? 'active' : 'inactive'}`}></span>
              <span>{isRunning ? 'Scanning' : 'Idle'}</span>
            </div>
          </div>
        </header>

        {/* Section 1: Username & Scan Controls */}
        <section className="neo-card">
          <div className="card-header">
            <h2 className="card-title">Target Username & Scanner Control</h2>
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
              SOL Balance: <span style={{ color: 'var(--neon-lime)', background: '#000', padding: '0.2rem 0.5rem' }}>{wallet.balance.toFixed(4)} SOL</span>
            </span>
          </div>

          <form onSubmit={updateTarget} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', alignItems: 'end' }}>
            <div className="control-group" style={{ margin: 0 }}>
              <label className="control-label">Target Twitter Username</label>
              <input 
                type="text" 
                className="control-input"
                value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                placeholder="Enter username (e.g. solana, elonmusk)"
                required
              />
            </div>

            <div className="control-group" style={{ margin: 0 }}>
              <label className="control-label">Swap Trade Size (SOL)</label>
              <input 
                type="number"
                step="0.0001" 
                className="control-input"
                value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button type="submit" className="btn-secondary" style={{ flex: 1 }}>
                Set Username
              </button>
              <button 
                type="button" 
                className={`btn-primary ${isRunning ? 'stop' : 'start'}`}
                onClick={toggleBot}
                style={{ flex: 1 }}
              >
                {isRunning ? 'Stop' : 'Start'}
              </button>
              {isRunning && (
                <button 
                  type="button"
                  className="btn-secondary" 
                  onClick={triggerInstantScan}
                  style={{ width: 'auto', padding: '0.75rem 1rem', background: 'var(--neon-lime)' }}
                  title="Instant Scan Now"
                >
                  ⚡
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Section 2: Scan Results & Spotted Tokens */}
        <section className="neo-card">
          <div className="card-header">
            <h2 className="card-title">Scan Results & Spotted Tokens</h2>
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
              Active Target: <span style={{ background: 'var(--neon-lime)', padding: '0.2rem 0.5rem', border: '1px solid #000' }}>@{config.username || 'Not set'}</span>
            </span>
          </div>

          <div className="table-container">
            {history.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>
                No scan results yet. Enter a username above and click Set Username & Start!
              </div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Target Username</th>
                    <th>Spotted Token Address</th>
                    <th>Result Status</th>
                    <th>Solscan Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id} className="history-row">
                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {new Date(row.timestamp).toLocaleTimeString()}
                      </td>
                      <td style={{ fontWeight: 800 }}>@{row.username}</td>
                      <td>
                        {row.tokenAddress ? (
                          <a 
                            href={`https://solscan.io/token/${row.tokenAddress}`}
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="history-address"
                          >
                            {row.tokenAddress}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>No Token Found</span>
                        )}
                      </td>
                      <td>
                        <span className={`history-status ${row.status}`}>
                          {row.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {row.txSignature ? (
                          <a 
                            href={`https://solscan.io/tx/${row.txSignature}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="history-address"
                            style={{ background: '#000', color: '#FFF' }}
                          >
                            View Tx
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Settings Modal */}
        {showSettings && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="card-title" style={{ margin: 0 }}>Configure API Keys</h2>
                <button 
                  onClick={() => { if (audioEnabled) synth.playClick(); setShowSettings(false); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1.8rem', fontWeight: 900, cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={saveSettings}>
                <div className="control-group">
                  <label className="control-label">RPC URL</label>
                  <input 
                    type="text" 
                    className="control-input" 
                    placeholder="Solana RPC URL"
                    value={formRpc} 
                    onChange={e => setFormRpc(e.target.value)} 
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">Private Key (Base58)</label>
                  <input 
                    type="password" 
                    className="control-input" 
                    placeholder="Solana Private Key"
                    value={formPrivateKey} 
                    onChange={e => setFormPrivateKey(e.target.value)} 
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">OpenAI API Key</label>
                  <input 
                    type="password" 
                    className="control-input" 
                    placeholder="OpenAI API Key"
                    value={formOpenaiKey} 
                    onChange={e => setFormOpenaiKey(e.target.value)} 
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">RapidAPI Key</label>
                  <input 
                    type="password" 
                    className="control-input" 
                    placeholder="RapidAPI Key"
                    value={formRapidapiKey} 
                    onChange={e => setFormRapidapiKey(e.target.value)} 
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => { if (audioEnabled) synth.playClick(); setShowSettings(false); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary start" style={{ padding: '0.75rem' }}>
                    Save Keys
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {toastMessage && (
          <div className="toast">
            {toastMessage}
          </div>
        )}
      </div>
    </>
  );
}
