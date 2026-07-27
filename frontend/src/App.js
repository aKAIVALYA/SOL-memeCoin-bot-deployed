"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const react_1 = __importStar(require("react"));
// Browser Sound Synthesizer via Web Audio API
class Synthesizer {
    constructor() {
        this.ctx = null;
    }
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    playIntro() {
        this.init();
        if (!this.ctx)
            return;
        const now = this.ctx.currentTime;
        // Play chord rise: C3, G3, C4, E4
        const freqs = [130.81, 196.00, 261.63, 329.63];
        freqs.forEach((freq) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 2, now + 1.2);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.04, now + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 1.4);
        });
    }
    playClick() {
        if (!this.ctx)
            return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.08);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }
    playSuccess() {
        if (!this.ctx)
            return;
        const now = this.ctx.currentTime;
        // Happy chord: C5 -> E5 -> G5 -> C6
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.35);
        });
    }
    playError() {
        if (!this.ctx)
            return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.setValueAtTime(95, now + 0.12);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    }
}
const synth = new Synthesizer();
function App() {
    const [entered, setEntered] = (0, react_1.useState)(false);
    const [loadingProgress, setLoadingProgress] = (0, react_1.useState)(0);
    const [loadingText, setLoadingText] = (0, react_1.useState)('FETCHING BLOCKCHAIN VIBES...');
    // Bot states
    const [isRunning, setIsRunning] = (0, react_1.useState)(false);
    const [wallet, setWallet] = (0, react_1.useState)({ publicKey: '', balance: 0, network: '' });
    const [config, setConfig] = (0, react_1.useState)({ username: '', solAmount: 0.001 });
    const [logs, setLogs] = (0, react_1.useState)([]);
    const [history, setHistory] = (0, react_1.useState)([]);
    // Settings Form State
    const [formUsername, setFormUsername] = (0, react_1.useState)('');
    const [formSolAmount, setFormSolAmount] = (0, react_1.useState)('0.001');
    const [formRpc, setFormRpc] = (0, react_1.useState)('');
    const [formPrivateKey, setFormPrivateKey] = (0, react_1.useState)('');
    const [formOpenaiKey, setFormOpenaiKey] = (0, react_1.useState)('');
    const [formRapidapiKey, setFormRapidapiKey] = (0, react_1.useState)('');
    // Interactive Trade Box
    const [tradeAddress, setTradeAddress] = (0, react_1.useState)('');
    const [tradeAmount, setTradeAmount] = (0, react_1.useState)('0.001');
    // UI states
    const [activeTab, setActiveTab] = (0, react_1.useState)('history');
    const [showSettings, setShowSettings] = (0, react_1.useState)(false);
    const [toastMessage, setToastMessage] = (0, react_1.useState)('');
    const historyRef = (0, react_1.useRef)([]);
    const terminalEndRef = (0, react_1.useRef)(null);
    // Text loading simulation
    (0, react_1.useEffect)(() => {
        if (entered)
            return;
        const texts = [
            'TUNING OPENAI DETECTOR...',
            'CONNECTING SOLANA RPC NETWORK...',
            'CONFIGURING RAYDIUM POOLS...',
            'READY TO INITIATE EXPERIENCE'
        ];
        let currentIdx = 0;
        const interval = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                const next = prev + Math.floor(Math.random() * 15) + 5;
                if (next >= 100) {
                    setLoadingText('READY TO INITIATE EXPERIENCE');
                    return 100;
                }
                if (next > (currentIdx + 1) * 25) {
                    currentIdx = Math.min(currentIdx + 1, texts.length - 1);
                    setLoadingText(texts[currentIdx]);
                }
                return next;
            });
        }, 200);
        return () => clearInterval(interval);
    }, [entered]);
    // Canvas Blob Animation
    (0, react_1.useEffect)(() => {
        const canvas = document.getElementById('bg-canvas');
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        let animationFrameId;
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();
        const blobs = [
            { x: canvas.width * 0.25, y: canvas.height * 0.25, vx: 0.6, vy: 0.4, radius: 240, color: 'rgba(153, 69, 243, 0.15)' }, // Solana Purple
            { x: canvas.width * 0.75, y: canvas.height * 0.35, vx: -0.5, vy: 0.6, radius: 260, color: 'rgba(20, 241, 149, 0.12)' }, // Solana Green
            { x: canvas.width * 0.5, y: canvas.height * 0.75, vx: 0.4, vy: -0.5, radius: 300, color: 'rgba(255, 0, 122, 0.10)' }, // Neon Pink
            { x: canvas.width * 0.3, y: canvas.height * 0.8, vx: -0.3, vy: -0.4, radius: 180, color: 'rgba(204, 255, 0, 0.08)' } // Neon Lime
        ];
        const animate = () => {
            ctx.fillStyle = '#07050d';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'screen';
            blobs.forEach(blob => {
                blob.x += blob.vx;
                blob.y += blob.vy;
                if (blob.x - blob.radius < 0 || blob.x + blob.radius > canvas.width)
                    blob.vx *= -1;
                if (blob.y - blob.radius < 0 || blob.y + blob.radius > canvas.height)
                    blob.vy *= -1;
                const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
                gradient.addColorStop(0, blob.color);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
                ctx.fill();
            });
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);
    // Poll server status
    (0, react_1.useEffect)(() => {
        if (!entered)
            return;
        const fetchStatus = () => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const res = yield fetch('/api/status');
                const data = yield res.json();
                setIsRunning(data.config.isRunning);
                setWallet(data.wallet);
                setConfig(data.config);
                setLogs(data.logs);
                // Detect new transaction swaps for sound and voice alert
                const oldHistory = historyRef.current;
                const newHistory = data.history || [];
                setHistory(newHistory);
                historyRef.current = newHistory;
                if (oldHistory.length > 0 && newHistory.length > 0) {
                    const newest = newHistory[0];
                    const hasNewSwap = !oldHistory.some(h => h.id === newest.id) && newest.status === 'swapped';
                    if (hasNewSwap) {
                        synth.playSuccess();
                        speak(`Alert! Spotted token ${(_a = newest.tokenAddress) === null || _a === void 0 ? void 0 : _a.substring(0, 4)} from tweet by ${newest.username}. Swap complete!`);
                        showToast(`🚀 Swapped for spotted token!`);
                    }
                }
            }
            catch (err) {
                console.error('Error fetching status:', err);
            }
        });
        fetchStatus();
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, [entered]);
    // Auto-scroll logs console
    (0, react_1.useEffect)(() => {
        if (activeTab === 'logs' && terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, activeTab]);
    // Voice narration helper via HTML5 Speech API
    const speak = (msg) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(msg);
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    };
    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 4000);
    };
    const handleEnter = () => {
        synth.playIntro();
        setEntered(true);
        speak('Welcome to Solana Meme Coin Swapper. Connection active.');
    };
    const toggleBot = () => __awaiter(this, void 0, void 0, function* () {
        synth.playClick();
        const endpoint = isRunning ? '/api/stop' : '/api/start';
        try {
            const res = yield fetch(endpoint, { method: 'POST' });
            const data = yield res.json();
            if (data.success) {
                setIsRunning(!isRunning);
                speak(isRunning ? 'Bot offline' : 'Bot online. Initiating tweet analysis');
                showToast(isRunning ? '🔴 Bot stopped' : '🟢 Bot scanning active');
            }
        }
        catch (e) {
            synth.playError();
            showToast('Error toggle: ' + e.message);
        }
    });
    const saveSettings = (e) => __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        synth.playClick();
        try {
            const res = yield fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formUsername,
                    solAmount: parseFloat(formSolAmount),
                    rpcUrl: formRpc,
                    privateKey: formPrivateKey,
                    openaiKey: formOpenaiKey,
                    rapidapiKey: formRapidapiKey
                })
            });
            const data = yield res.json();
            if (data.success) {
                setShowSettings(false);
                showToast('Settings saved successfully!');
                speak('Configuration updated');
            }
            else {
                synth.playError();
                showToast('Failed to save config');
            }
        }
        catch (err) {
            synth.playError();
            showToast('Save error: ' + err.message);
        }
    });
    const triggerManualSwap = (e) => __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        synth.playClick();
        if (!tradeAddress || tradeAddress.length < 32) {
            synth.playError();
            showToast('Invalid token address');
            return;
        }
        try {
            const res = yield fetch('/api/manual-swap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tokenAddress: tradeAddress,
                    amount: parseFloat(tradeAmount)
                })
            });
            const data = yield res.json();
            if (data.success) {
                showToast('Manual swap transaction sent!');
                setTradeAddress('');
            }
        }
        catch (err) {
            synth.playError();
            showToast('Swap error: ' + err.message);
        }
    });
    const openSettingsModal = () => {
        synth.playClick();
        setFormUsername(config.username);
        setFormSolAmount(String(config.solAmount));
        setFormRpc(wallet.network || '');
        setFormPrivateKey('');
        setFormOpenaiKey('');
        setFormRapidapiKey('');
        setShowSettings(true);
    };
    return (<>
      <canvas id="bg-canvas"></canvas>
      
      {!entered && (<div className="loading-screen">
          <div className="loading-logo">SOL SWAP BOT</div>
          <div className="loading-bar-container">
            <div className="loading-bar" style={{ width: `${loadingProgress}%` }}></div>
          </div>
          <div className="loading-text">{loadingText}</div>
          {loadingProgress >= 100 && (<button className="enter-btn" onClick={handleEnter}>
              ENTER EXPERIENCE
            </button>)}
        </div>)}

      {entered && (<div className="app-container">
          <header className="dashboard-header">
            <div className="logo-container">
              <span className="logo-text">SOL SWAP BOT</span>
              <span className="logo-badge">Active Theory Style</span>
            </div>
            
            <div className="status-badge">
              <span className={`status-pulse ${isRunning ? 'active' : 'inactive'}`}></span>
              <span>{isRunning ? 'Scanning Active' : 'Idle'}</span>
            </div>
          </header>

          <main className="dashboard-grid">
            {/* Sidebar Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Bot Control Card */}
              <section className="glass-card">
                <h2 className="card-title">Bot Control</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <button className={`btn-primary ${isRunning ? 'stop' : 'start'}`} onClick={toggleBot}>
                    {isRunning ? 'Stop Scanning' : 'Start Scanning'}
                  </button>
                  
                  <div style={{ marginTop: '0.5rem' }}>
                    <div className="stat-row">
                      <span className="stat-label">Target User</span>
                      <span className="stat-value" style={{ color: 'var(--neon-lime)' }}>@{config.username}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Swap Amount</span>
                      <span className="stat-value">{config.solAmount} SOL</span>
                    </div>
                  </div>
                  
                  <button className="btn-secondary" onClick={openSettingsModal}>
                    Settings & Keys
                  </button>
                </div>
              </section>

              {/* Wallet Info Card */}
              <section className="glass-card">
                <h2 className="card-title">Wallet status</h2>
                <div className="stat-row">
                  <span className="stat-label">Address</span>
                  <span className="stat-value address" title={wallet.publicKey} onClick={() => {
                navigator.clipboard.writeText(wallet.publicKey);
                showToast('Copied address!');
                synth.playClick();
            }}>
                    {wallet.publicKey ? `${wallet.publicKey.substring(0, 6)}...${wallet.publicKey.substring(wallet.publicKey.length - 6)}` : 'Not Loaded'}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">SOL Balance</span>
                  <span className="stat-value" style={{ color: 'var(--sol-green)', fontSize: '1.2rem' }}>
                    {wallet.balance.toFixed(4)} SOL
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Network</span>
                  <span className="stat-value" style={{ color: 'var(--neon-pink)' }}>
                    {wallet.network}
                  </span>
                </div>
              </section>

              {/* Quick Trade Card */}
              <section className="glass-card">
                <h2 className="card-title">Manual Swap</h2>
                <form onSubmit={triggerManualSwap}>
                  <div className="control-group">
                    <label className="control-label">Token Mint Address</label>
                    <input type="text" className="control-input" placeholder="e.g. EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" value={tradeAddress} onChange={e => setTradeAddress(e.target.value)} required/>
                  </div>
                  <div className="control-group">
                    <label className="control-label">Amount (SOL)</label>
                    <input type="number" step="0.0001" className="control-input" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} required/>
                  </div>
                  <button type="submit" className="btn-secondary" style={{ width: '100%', borderColor: 'var(--sol-green)' }}>
                    Execute Purchase
                  </button>
                </form>
              </section>
            </div>

            {/* Main Area Tabs & Output */}
            <div className="glass-card" style={{ flex: 1 }}>
              <div className="tab-header">
                <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => { synth.playClick(); setActiveTab('history'); }}>
                  Spotting History
                </button>
                <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => { synth.playClick(); setActiveTab('logs'); }}>
                  Console Logs
                </button>
              </div>

              {/* Tab 1: Spotted History */}
              {activeTab === 'history' && (<div className="table-container">
                  {history.length === 0 ? (<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No scan history found. Start scanning or wait for spotted tokens.
                    </div>) : (<table className="history-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Username</th>
                          <th>Spotted Token</th>
                          <th>Status</th>
                          <th>Tx signature</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((row) => (<tr key={row.id} className="history-row">
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              {new Date(row.timestamp).toLocaleTimeString()}
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--neon-lime)' }}>@{row.username}</td>
                            <td>
                              {row.tokenAddress ? (<a href={`https://solscan.io/token/${row.tokenAddress}`} target="_blank" rel="noopener noreferrer" className="history-address">
                                  {`${row.tokenAddress.substring(0, 5)}...${row.tokenAddress.substring(row.tokenAddress.length - 5)}`}
                                </a>) : (<span style={{ color: 'var(--text-muted)' }}>—</span>)}
                            </td>
                            <td>
                              <span className={`history-status ${row.status}`}>
                                {row.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td>
                              {row.txSignature ? (<a href={`https://solscan.io/tx/${row.txSignature}`} target="_blank" rel="noopener noreferrer" className="history-address" style={{ color: 'var(--sol-purple)' }}>
                                  Link
                                </a>) : (<span style={{ color: 'var(--text-muted)' }}>—</span>)}
                            </td>
                          </tr>))}
                      </tbody>
                    </table>)}
                </div>)}

              {/* Tab 2: Console Log */}
              {activeTab === 'logs' && (<div className="terminal-view">
                  {logs.map((log, index) => (<div key={index} className={`terminal-line ${log.type}`}>
                      {log.message}
                    </div>))}
                  <div ref={terminalEndRef}></div>
                </div>)}
            </div>
          </main>

          {/* Settings Modal */}
          {showSettings && (<div className="modal-overlay">
              <div className="modal-content glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h2 className="card-title" style={{ margin: 0 }}>Configure Keys & Target</h2>
                  <button onClick={() => { synth.playClick(); setShowSettings(false); }} style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', fontSize: '1.5rem', cursor: 'pointer' }}>
                    ×
                  </button>
                </div>

                <form onSubmit={saveSettings}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                    <div className="control-group">
                      <label className="control-label">Twitter Target</label>
                      <input type="text" className="control-input" value={formUsername} onChange={e => setFormUsername(e.target.value)} required/>
                    </div>
                    <div className="control-group">
                      <label className="control-label">Trade Amount (SOL)</label>
                      <input type="number" step="0.0001" className="control-input" value={formSolAmount} onChange={e => setFormSolAmount(e.target.value)} required/>
                    </div>
                  </div>

                  <div className="control-group">
                    <label className="control-label">RPC URL</label>
                    <input type="text" className="control-input" placeholder="Solana RPC connection URL" value={formRpc} onChange={e => setFormRpc(e.target.value)}/>
                  </div>

                  <div className="control-group">
                    <label className="control-label">Private Key (Base58)</label>
                    <input type="password" className="control-input" placeholder="Required to sign swap transactions" value={formPrivateKey} onChange={e => setFormPrivateKey(e.target.value)}/>
                  </div>

                  <div className="control-group">
                    <label className="control-label">OpenAI API Key</label>
                    <input type="password" className="control-input" placeholder="Required for GPT evaluation" value={formOpenaiKey} onChange={e => setFormOpenaiKey(e.target.value)}/>
                  </div>

                  <div className="control-group">
                    <label className="control-label">RapidAPI Key</label>
                    <input type="password" className="control-input" placeholder="Required for fetching tweets" value={formRapidapiKey} onChange={e => setFormRapidapiKey(e.target.value)}/>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button type="button" className="btn-secondary" onClick={() => { synth.playClick(); setShowSettings(false); }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary start" style={{ padding: '0.8rem' }}>
                      Save changes
                    </button>
                  </div>
                </form>
              </div>
            </div>)}

          {toastMessage && (<div className="toast">
              {toastMessage}
            </div>)}
        </div>)}
    </>);
}
