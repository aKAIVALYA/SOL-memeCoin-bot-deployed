import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

// Set up dotenv before loading modules
require('dotenv').config();

// Ensure fallbacks exist to prevent third-party code from crashing during module load
process.env.RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
process.env.OPENAI_KEY = process.env.OPENAI_KEY || 'mock-openai-key';
process.env.RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'mock-rapidapi-key';
process.env.TWITTER_USERNAME = process.env.TWITTER_USERNAME || 'solana';

if (!process.env.PRIVATE_KEY) {
  // Generate a valid temporary keypair so bs58.decode doesn't fail during import
  const tempKey = bs58.encode(Keypair.generate().secretKey);
  process.env.PRIVATE_KEY = tempKey;
}

// Load the bot modules now that fallbacks are active
const { getTweets } = require('./get-tweets');
const { getTokenFromLLM } = require('./get-token-from-llm');
const { swap } = require('./swap');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve React static frontend in production
const frontendDistPath = path.join(process.cwd(), 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// Types
export interface LogEntry {
  timestamp: string;
  type: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  username: string;
  tweetContent: string;
  tokenAddress: string | null;
  status: 'scanned' | 'spotted' | 'swapping' | 'swapped' | 'failed' | 'not_bullish';
  details?: string;
  txSignature?: string;
}

// Scan History Persistence
const HISTORY_FILE = path.join(process.cwd(), 'history.json');
export let scanHistory: HistoryEntry[] = [];

try {
  if (fs.existsSync(HISTORY_FILE)) {
    scanHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  }
} catch (e: any) {
  console.error("Failed to load history file:", e.message);
}

function saveHistory() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(scanHistory, null, 2), 'utf-8');
  } catch (e: any) {
    console.error("Failed to save history file:", e.message);
  }
}

// Bot State
let running = false;
let timeoutId: NodeJS.Timeout | null = null;
let currentUsername = process.env.TWITTER_USERNAME || 'solana';
let currentSolAmount = 0.001;

// Global Log Interceptor
// ponytail: intercepts standard stdout/stderr to capture logs from unmodified swap.ts
export const botLogs: LogEntry[] = [];
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function addLog(message: string, type: 'info' | 'warn' | 'error' | 'success') {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type,
    message
  };
  botLogs.push(entry);
  if (botLogs.length > 200) {
    botLogs.shift();
  }
}

console.log = (...args) => {
  originalLog(...args);
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  let type: 'info' | 'success' = 'info';
  
  if (message.toLowerCase().includes('success') || message.toLowerCase().includes('confirmed')) {
    type = 'success';
  }
  
  addLog(message, type);

  // Extract tx signature printed by swap.ts: e.g. "1 transaction sending..., txId: 3XyZ..."
  const txMatch = message.match(/txId:\s*([a-zA-Z0-9]+)/);
  if (txMatch) {
    const txId = txMatch[1];
    // Associate with the latest swapping history entry
    const entry = scanHistory.find(h => h.status === 'swapping');
    if (entry) {
      entry.status = 'swapped';
      entry.txSignature = txId;
      entry.details = 'Swap transaction confirmed successfully.';
      saveHistory();
    }
  }
};

console.error = (...args) => {
  originalError(...args);
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  addLog(message, 'error');
};

console.warn = (...args) => {
  originalWarn(...args);
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  addLog(message, 'warn');
};

// Bot Scanning Runner
async function runIteration() {
  if (!running) return;

  if (!currentUsername) {
    console.warn("No twitter username configured. Skipping scan.");
    scheduleNext(60000);
    return;
  }

  const targetHandle = cleanTwitterHandle(currentUsername);
  console.log(`Scanning tweets for @${targetHandle}...`);

  try {
    const newTweets = await getTweets(targetHandle);
    console.log(`Fetched ${newTweets.length} recent tweets.`);

    for (let tweet of newTweets) {
      const alreadyProcessed = scanHistory.some(h => h.id === tweet.id);
      if (alreadyProcessed) continue;

      console.log(`Processing tweet id ${tweet.id}: "${tweet.contents.substring(0, 50)}..."`);
      
      let tokenAddress = "null";
      try {
        tokenAddress = await getTokenFromLLM(tweet.contents);
      } catch (err: any) {
        console.error(`OpenAI analysis error: ${err.message}`);
      }

      let status: HistoryEntry['status'] = 'not_bullish';
      let details = 'Not a bullish post or no address found.';
      let addressToSave: string | null = null;

      if (tokenAddress !== "null" && tokenAddress.trim().length > 30) {
        addressToSave = tokenAddress.trim();
        console.log(`Bullish post spotted for token: ${addressToSave}! Starting swap...`);
        status = 'swapping';
        details = `Attempting swap for ${currentSolAmount} SOL...`;

        // Save pre-swap entry in history so interceptor can match the signature log
        const preSwapEntry: HistoryEntry = {
          id: tweet.id,
          timestamp: new Date().toISOString(),
          username: currentUsername,
          tweetContent: tweet.contents,
          tokenAddress: addressToSave,
          status,
          details
        };
        scanHistory.unshift(preSwapEntry);
        saveHistory();

        try {
          const lamports = Math.floor(currentSolAmount * LAMPORTS_PER_SOL);
          await swap(addressToSave, lamports);
          // Note: swap will log confirmations, which will trigger the console.log interceptor above to update status to 'swapped'
        } catch (swapErr: any) {
          console.error(`Swap execution failed: ${swapErr.message}`);
          const entry = scanHistory.find(h => h.id === tweet.id);
          if (entry) {
            entry.status = 'failed';
            entry.details = `Swap failed: ${swapErr.message}`;
            saveHistory();
          }
        }
        continue;
      }

      // No bullish token found
      const historyEntry: HistoryEntry = {
        id: tweet.id,
        timestamp: new Date().toISOString(),
        username: currentUsername,
        tweetContent: tweet.contents,
        tokenAddress: addressToSave,
        status,
        details
      };
      
      scanHistory.unshift(historyEntry);
      if (scanHistory.length > 200) {
        scanHistory.pop();
      }
      saveHistory();
    }
  } catch (err: any) {
    console.error(`Scan failed: ${err.message}`);
  }

  scheduleNext(300000);
}

function scheduleNext(ms: number) {
  if (running) {
    timeoutId = setTimeout(runIteration, ms);
  }
}

function startBot() {
  if (running) return;
  running = true;
  console.log("Bot engine started.");
  runIteration();
}

function stopBot() {
  if (!running) return;
  running = false;
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  console.log("Bot engine stopped.");
}

async function getWalletDetails() {
  const privateKeyEnv = process.env.PRIVATE_KEY;
  const rpcUrlEnv = process.env.RPC_URL;

  if (!privateKeyEnv || !rpcUrlEnv) {
    return {
      publicKey: 'Not configured',
      balance: 0,
      network: 'Not configured'
    };
  }

  try {
    const owner = Keypair.fromSecretKey(bs58.decode(privateKeyEnv));
    const connection = new Connection(rpcUrlEnv);
    const balance = await connection.getBalance(owner.publicKey);
    return {
      publicKey: owner.publicKey.toBase58(),
      balance: balance / LAMPORTS_PER_SOL,
      network: rpcUrlEnv.includes('mainnet') ? 'Mainnet Beta' : 'Devnet/Custom'
    };
  } catch (e: any) {
    return {
      publicKey: 'Error decoding key/connecting',
      balance: 0,
      network: rpcUrlEnv
    };
  }
}

// API Routes
app.get('/api/status', async (req, res) => {
  const config = {
    username: currentUsername,
    solAmount: currentSolAmount,
    isRunning: running
  };
  const wallet = await getWalletDetails();
  
  res.json({
    config,
    wallet,
    logs: botLogs,
    history: scanHistory
  });
});

app.post('/api/start', (req, res) => {
  startBot();
  res.json({ success: true, message: 'Bot started' });
});

app.post('/api/stop', (req, res) => {
  stopBot();
  res.json({ success: true, message: 'Bot stopped' });
});

function cleanTwitterHandle(input: string): string {
  if (!input) return '';
  let str = input.trim();
  const urlMatch = str.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  return str.replace(/^@/, '').trim();
}

app.post('/api/config', (req, res) => {
  const { username, solAmount, rpcUrl, privateKey, openaiKey, rapidapiKey } = req.body;
  
  if (username !== undefined && solAmount !== undefined) {
    const cleanUsername = cleanTwitterHandle(username);
    currentUsername = cleanUsername;
    currentSolAmount = Number(solAmount);
    console.log(`Bot configuration updated: Target @${cleanUsername}, Trade size ${solAmount} SOL`);
  }

  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    const vars: Record<string, string | undefined> = {
      TWITTER_USERNAME: username,
      RAPIDAPI_KEY: rapidapiKey,
      OPENAI_KEY: openaiKey,
      PRIVATE_KEY: privateKey,
      RPC_URL: rpcUrl,
    };

    let newEnv = envContent;
    for (const [key, value] of Object.entries(vars)) {
      if (value === undefined || value === '') continue;
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(newEnv)) {
        newEnv = newEnv.replace(regex, `${key}=${value}`);
      } else {
        newEnv = newEnv.trim() + `\n${key}=${value}`;
      }
    }
    
    fs.writeFileSync(envPath, newEnv.trim() + '\n', 'utf-8');
    
    if (username) process.env.TWITTER_USERNAME = username;
    if (rapidapiKey) process.env.RAPIDAPI_KEY = rapidapiKey;
    if (openaiKey) process.env.OPENAI_KEY = openaiKey;
    if (privateKey) process.env.PRIVATE_KEY = privateKey;
    if (rpcUrl) process.env.RPC_URL = rpcUrl;
    
    console.log("Config saved to .env and environment updated");
    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (e: any) {
    console.error(`Failed to write config: ${e.message}`);
    res.status(500).json({ success: false, message: `Failed to save config: ${e.message}` });
  }
});

app.post('/api/scan-now', async (req, res) => {
  console.log("Instant scan requested by user via dashboard.");
  // Run scan iteration asynchronously
  runIteration().catch(err => console.error(`Scan error: ${err.message}`));
  res.json({ success: true, message: 'Instant scan initiated' });
});

app.post('/api/manual-swap', (req, res) => {
  const { tokenAddress, amount } = req.body;
  if (!tokenAddress || typeof tokenAddress !== 'string' || tokenAddress.length < 32) {
    return res.status(400).json({ success: false, message: 'Invalid token address' });
  }

  const tradeAmount = Number(amount) || 0.001;
  const lamports = Math.floor(tradeAmount * LAMPORTS_PER_SOL);

  console.log(`Initiating manual swap of ${tradeAmount} SOL for ${tokenAddress}...`);

  // Add dummy history entry to trace it
  const manualEntry: HistoryEntry = {
    id: `manual-${Date.now()}`,
    timestamp: new Date().toISOString(),
    username: 'MANUAL_TRADE',
    tweetContent: `Manual Swap triggered for ${tokenAddress}`,
    tokenAddress,
    status: 'swapping',
    details: 'Executing manual transaction...'
  };
  scanHistory.unshift(manualEntry);
  saveHistory();

  // Run asynchronously
  swap(tokenAddress, lamports)
    .catch((err: any) => {
      console.error(`Manual swap failed: ${err.message}`);
      const entry = scanHistory.find(h => h.id === manualEntry.id);
      if (entry) {
        entry.status = 'failed';
        entry.details = `Swap failed: ${err.message}`;
        saveHistory();
      }
    });

  res.json({ success: true, message: 'Swap process started in background' });
});

// Fallback to React router for non-API requests
if (fs.existsSync(frontendDistPath)) {
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
  });
}

export default app;
