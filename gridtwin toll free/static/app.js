/**
 * GRIDTWIN Toll-Free Webphone & Dialpad Controller
 * 
 * Handles:
 * - DTMF tone generation & keypress dispatch
 * - Browser Web Speech API & Real Edge Neural Voice (Tamil, English, Hindi)
 * - 2-Way Real-time Tower Telemetry & Isolation Sync with 3D Digital Twin
 * - Real-time call transcript & DTMF logging
 */

// Application State
let callActive = false;
let callTimerInterval = null;
let callDurationSec = 0;
let currentStage = "IDLE"; // IDLE, LANGUAGE_SELECTION, TOWER_SELECTION, MENU_OPTIONS, CALL_ENDED
let selectedLanguage = "en";
let audioContext = null;

// DOM Elements
const btnStartCall = document.getElementById("btnStartCall");
const btnHangup = document.getElementById("btnHangup");
const phoneDisplayText = document.getElementById("phoneDisplayText");
const callStatusText = document.getElementById("callStatusText");
const callStatusDot = document.getElementById("callStatusDot");
const callTimer = document.getElementById("callTimer");
const speakerVisualizer = document.getElementById("speakerVisualizer");
const speechBubble = document.getElementById("speechBubble");
const chkAudioSpeech = document.getElementById("chkAudioSpeech");
const transcriptLog = document.getElementById("transcriptLog");
const towerCardsContainer = document.getElementById("towerCardsContainer");
const btnClearLog = document.getElementById("btnClearLog");

// DTMF Frequencies (Row & Col)
const DTMF_FREQS = {
  "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
  "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
  "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
  "*": [941, 1209], "0": [941, 1336], "#": [941, 1477],
};

// Play DTMF dual tone in browser
function playDtmfTone(key) {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const freqs = DTMF_FREQS[key];
    if (!freqs) return;

    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc1.frequency.value = freqs[0];
    osc2.frequency.value = freqs[1];

    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioContext.destination);

    osc1.start();
    osc2.start();
    osc1.stop(audioContext.currentTime + 0.15);
    osc2.stop(audioContext.currentTime + 0.15);
  } catch (e) {
    console.debug("Audio tone error:", e);
  }
}

// Browser Text-to-Speech & Real Neural Voice Player
let currentAudioPlayer = null;

function stopAllAudio() {
  if (currentAudioPlayer) {
    try {
      currentAudioPlayer.pause();
      currentAudioPlayer.currentTime = 0;
    } catch (e) {}
    currentAudioPlayer = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (speakerVisualizer) speakerVisualizer.classList.remove("speaking");
  if (speechBubble) speechBubble.textContent = "Voice speaker ready";
}

function playRealVoice(audioUrl, fallbackText, lang = "en-IN", callback = null) {
  if (!chkAudioSpeech || !chkAudioSpeech.checked) {
    if (callback) callback();
    return;
  }

  stopAllAudio();

  if (speakerVisualizer) speakerVisualizer.classList.add("speaking");
  if (speechBubble) speechBubble.textContent = `Speaking (${lang.split('-')[0]})...`;

  if (audioUrl) {
    currentAudioPlayer = new Audio(audioUrl);
    currentAudioPlayer.onended = () => {
      stopAllAudio();
      if (callback) callback();
    };
    currentAudioPlayer.onerror = () => {
      console.warn("Real neural audio failed, falling back to Web Speech:", audioUrl);
      playFallbackWebSpeech(fallbackText, lang, callback);
    };
    currentAudioPlayer.play().catch(err => {
      console.warn("Audio autoplay blocked, falling back:", err);
      playFallbackWebSpeech(fallbackText, lang, callback);
    });
  } else {
    playFallbackWebSpeech(fallbackText, lang, callback);
  }
}

function playFallbackWebSpeech(text, lang = "en-IN", callback = null) {
  if (!('speechSynthesis' in window) || !chkAudioSpeech.checked) {
    stopAllAudio();
    if (callback) callback();
    return;
  }

  const cleanText = text.replace(/\[OPTIONS\].*$/, "").trim();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = lang;
  utterance.rate = 0.95;

  const voices = window.speechSynthesis.getVoices();
  const langPrefix = lang.split("-")[0];
  const matchedVoice = voices.find(v => v.lang.startsWith(langPrefix) || v.lang === lang);
  if (matchedVoice) utterance.voice = matchedVoice;

  utterance.onend = () => {
    stopAllAudio();
    if (callback) callback();
  };
  utterance.onerror = () => {
    stopAllAudio();
    if (callback) callback();
  };

  window.speechSynthesis.speak(utterance);
}

// ──────────────────────────────────────────────
// Call Transcript Logging
// ──────────────────────────────────────────────

function addTranscript(type, msg) {
  if (!transcriptLog) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="time">${timeStr}</span><span class="msg">${escapeHtml(msg)}</span>`;
  transcriptLog.appendChild(entry);
  transcriptLog.scrollTop = transcriptLog.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Timer Functions
function startTimer() {
  callDurationSec = 0;
  if (callTimer) callTimer.textContent = "(00:00)";
  clearInterval(callTimerInterval);
  callTimerInterval = setInterval(() => {
    callDurationSec++;
    const m = String(Math.floor(callDurationSec / 60)).padStart(2, '0');
    const s = String(callDurationSec % 60).padStart(2, '0');
    if (callTimer) callTimer.textContent = `(${m}:${s})`;
  }, 1000);
}

function stopTimer() {
  clearInterval(callTimerInterval);
  if (callTimer) callTimer.textContent = "";
}

// ──────────────────────────────────────────────
// Call Lifecycle Actions
// ──────────────────────────────────────────────

async function startCall() {
  try {
    addTranscript("caller", "📞 Dialing +1 573 859 5176 (Toll-Free)...");
    if (callStatusText) callStatusText.textContent = "Calling...";
    if (callStatusDot) callStatusDot.className = "status-dot-green pulsing";
    btnStartCall.disabled = true;
    btnHangup.disabled = false;

    const res = await fetch("/api/simulator/call", { method: "POST" });
    const data = await res.json();

    callActive = true;
    startTimer();
    if (callStatusText) callStatusText.textContent = "Call Connected";
    currentStage = "LANGUAGE_SELECTION";
    if (phoneDisplayText) phoneDisplayText.textContent = data.display_text;

    addTranscript("ivr", "Connected to GRIDTWIN 24/7 Hotline.");
    addTranscript("ivr", "Prompt: 1 for Tamil | 2 for English | 3 for Hindi");

    if (chkAudioSpeech && chkAudioSpeech.checked && data.speech_prompts) {
      playWelcomeSequence(data.speech_prompts);
    }

  } catch (err) {
    console.error("Call error:", err);
    addTranscript("alert", "Failed to connect to IVR server: " + err.message);
    hangupCall();
  }
}

function playWelcomeSequence(prompts) {
  if (!prompts || prompts.length === 0) return;
  function playNext(index) {
    if (index >= prompts.length || !callActive) return;
    const p = prompts[index];
    playRealVoice(p.audio_url, p.text, p.lang, () => {
      setTimeout(() => playNext(index + 1), 350);
    });
  }
  playNext(0);
}

function hangupCall() {
  callActive = false;
  stopTimer();
  stopAllAudio();
  
  if (callStatusText) callStatusText.textContent = "Ready to Call";
  if (callStatusDot) callStatusDot.className = "status-dot-green";
  if (phoneDisplayText) {
    phoneDisplayText.textContent = "Press the green \"Call Toll-Free\" button below to test the IVR system.";
  }
  
  btnStartCall.disabled = false;
  btnHangup.disabled = true;
  currentStage = "IDLE";
  
  addTranscript("system", "📴 Call disconnected.");
}

// Handle Dialpad Key Presses
async function handleKeyPress(key) {
  playDtmfTone(key);

  if (!callActive) {
    addTranscript("system", `Key [${key}] pressed while phone is on-hook.`);
    return;
  }

  addTranscript("caller", `👉 Caller pressed: [${key}]`);

  try {
    const payload = {
      digit: key,
      stage: currentStage,
      lang: selectedLanguage
    };

    const res = await fetch("/api/simulator/dtmf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (!result.success && result.error) {
      if (phoneDisplayText) phoneDisplayText.textContent = result.display_text;
      addTranscript("alert", result.display_text);
      if (result.speech) {
        playRealVoice(result.audio_url, result.speech.text, result.speech.lang);
      }
      return;
    }

    currentStage = result.stage;
    if (result.lang) selectedLanguage = result.lang;

    if (phoneDisplayText) phoneDisplayText.textContent = result.display_text;
    addTranscript("ivr", result.display_text);

    if (result.speech) {
      playRealVoice(result.audio_url, result.speech.text, result.speech.lang);
    }

    if (currentStage === "CALL_ENDED") {
      setTimeout(hangupCall, 4000);
    }

    if (result.tower_data) {
      fetchTowersStatus();
    }

  } catch (err) {
    console.error("DTMF error:", err);
    addTranscript("alert", "Error processing DTMF: " + err.message);
  }
}

// ──────────────────────────────────────────────
// SVG Transmission Tower Graphics (Lattice Pylon)
// ──────────────────────────────────────────────

function getTowerSvg(isIsolated) {
  if (isIsolated) {
    return `
      <svg class="pylon-graphic" viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g-mound-iso" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#7f1d1d" />
            <stop offset="100%" stop-color="#450a0a" />
          </linearGradient>
          <filter id="glow-iso" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <!-- Ground Base Mound (Red Alert) -->
        <ellipse cx="80" cy="112" rx="68" ry="7" fill="url(#g-mound-iso)" opacity="0.95" />
        <path d="M15 112 Q80 108 145 112" stroke="#ef4444" stroke-width="2.2" fill="none" opacity="0.85" />
        
        <!-- Disconnected Dashed Power Lines (Red) -->
        <path d="M0 45 L48 49" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,4" fill="none" opacity="0.9" />
        <path d="M112 49 L160 45" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,4" fill="none" opacity="0.9" />
        <path d="M0 65 L40 68" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,4" fill="none" opacity="0.9" />
        <path d="M120 68 L160 65" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,4" fill="none" opacity="0.9" />

        <!-- Tower Lattice Structure (Glowing Intense Red Pylon When Isolated) -->
        <g stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-iso)">
          <!-- Main Legs -->
          <line x1="56" y1="112" x2="74" y2="24" />
          <line x1="104" y1="112" x2="86" y2="24" />
          <!-- Peak -->
          <line x1="74" y1="24" x2="80" y2="8" />
          <line x1="86" y1="24" x2="80" y2="8" />
          <!-- Crossarms -->
          <line x1="48" y1="45" x2="112" y2="45" />
          <line x1="38" y1="65" x2="122" y2="65" />
          <!-- Cross Bracing -->
          <line x1="60" y1="96" x2="100" y2="96" />
          <line x1="60" y1="96" x2="96" y2="80" />
          <line x1="100" y1="96" x2="64" y2="80" />
          <line x1="64" y1="80" x2="96" y2="80" />
          <line x1="67" y1="65" x2="93" y2="65" />
          <line x1="70" y1="45" x2="90" y2="45" />
          <line x1="80" y1="8" x2="80" y2="45" stroke-width="1.6" opacity="0.8" />
        </g>

        <!-- Isolation Cut-Off Warning Badge -->
        <circle cx="80" cy="55" r="14" fill="#991b1b" stroke="#f87171" stroke-width="2" />
        <text x="80" y="60.5" text-anchor="middle" fill="#fee2e2" font-size="13" font-weight="900" font-family="sans-serif">✕</text>
      </svg>
    `;
  } else {
    return `
      <svg class="pylon-graphic" viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g-mound-act" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0284c7" />
            <stop offset="100%" stop-color="#082f49" />
          </linearGradient>
          <filter id="glow-act" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <!-- Ground Base Mound (Electric Blue Terrain) -->
        <ellipse cx="80" cy="112" rx="68" ry="7" fill="url(#g-mound-act)" opacity="0.9" />
        <path d="M15 112 Q80 108 145 112" stroke="#38bdf8" stroke-width="2.2" fill="none" opacity="0.85" />
        
        <!-- Continuous High-Voltage Power Lines (Cyan/Blue) -->
        <path d="M0 45 Q80 50 160 45" stroke="#38bdf8" stroke-width="2" fill="none" opacity="0.9" />
        <path d="M0 65 Q80 70 160 65" stroke="#38bdf8" stroke-width="2" fill="none" opacity="0.9" />

        <!-- Tower Lattice Structure (Electric Blue Pylon - Changes to Red on Isolation) -->
        <g stroke="#00d2ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-act)">
          <!-- Main Legs -->
          <line x1="56" y1="112" x2="74" y2="24" />
          <line x1="104" y1="112" x2="86" y2="24" />
          <!-- Peak -->
          <line x1="74" y1="24" x2="80" y2="8" />
          <line x1="86" y1="24" x2="80" y2="8" />
          <!-- Crossarms -->
          <line x1="48" y1="45" x2="112" y2="45" />
          <line x1="38" y1="65" x2="122" y2="65" />
          <!-- Cross Bracing Lattice -->
          <line x1="60" y1="96" x2="100" y2="96" />
          <line x1="60" y1="96" x2="96" y2="80" />
          <line x1="100" y1="96" x2="64" y2="80" />
          <line x1="64" y1="80" x2="96" y2="80" />
          <line x1="67" y1="65" x2="93" y2="65" />
          <line x1="70" y1="45" x2="90" y2="45" />
          <!-- Vertical center apex -->
          <line x1="80" y1="8" x2="80" y2="45" stroke-width="1.6" opacity="0.8" />
        </g>
      </svg>
    `;
  }
}

// ──────────────────────────────────────────────
// Live Towers Telemetry Polling (Every 1.5s)
// ──────────────────────────────────────────────

async function fetchTowersStatus() {
  try {
    const res = await fetch("/api/towers");
    const data = await res.json();
    renderTowerCards(data);
  } catch (err) {
    console.warn("Unable to fetch towers status:", err);
  }
}

function renderTowerCards(towers) {
  if (!towers || Object.keys(towers).length === 0 || !towerCardsContainer) return;

  const isolatedList = [];
  for (const [num, t] of Object.entries(towers)) {
    if (t.is_isolated) {
      isolatedList.push(`Tower ${num} (${t.tower_id})`);
    }
  }

  // Update Dynamic Grid Summary Alert Banner
  const alertBar = document.getElementById("gridStatusAlertBar");
  const alertIcon = document.getElementById("gridAlertIcon");
  const alertText = document.getElementById("gridAlertText");
  if (alertBar && alertText) {
    if (isolatedList.length > 0) {
      alertBar.className = "grid-status-alert-bar has-isolation";
      if (alertIcon) alertIcon.textContent = "🚨";
      alertText.textContent = `Fault Isolation Detected – ${isolatedList.join(", ")} is currently ISOLATED. Power supply is cut off. Real-time telemetry in sync with 3D Twin.`;
    } else {
      alertBar.className = "grid-status-alert-bar all-normal";
      if (alertIcon) alertIcon.textContent = "✔";
      alertText.textContent = "All Towers Normal – 5/5 towers active and transmitting power. Normal line flow.";
    }
  }

  let html = "";
  for (const [num, t] of Object.entries(towers)) {
    const isIsolated = t.is_isolated;
    const cardClass = isIsolated ? "isolated" : "normal";
    const badgeClass = isIsolated ? "badge-isolated" : "badge-normal";
    const badgeText = isIsolated ? "ISOLATED" : "ACTIVE";
    
    const currentVal = isIsolated ? "0 mA" : `${Math.round(t.current_ma)} mA`;
    const voltageVal = isIsolated ? "0 V" : `${Math.round(t.voltage_v)} V`;
    const statusText = isIsolated ? "✖ Line Cut Off (Isolated)" : "✔ Live Transmission";
    
    const toggleBtnText = isIsolated ? "⚡ Restore" : "⚙ Isolate";
    const toggleBtnClass = isIsolated ? "restore-btn" : "isolate-btn";

    html += `
      <div class="tower-card ${cardClass}" id="card-tower-${num}">
        <div class="tower-card-top">
          <span class="tower-title">Tower ${t.tower_number} (${t.tower_id})</span>
          <span class="tower-badge ${badgeClass}"><span class="badge-dot"></span>${badgeText}</span>
        </div>
        
        <div class="tower-graphic-box">
          ${getTowerSvg(isIsolated)}
        </div>

        <div class="tower-metrics-list">
          <div class="metric-row">
            <span class="metric-label">Line Current:</span>
            <span class="metric-value-current ${isIsolated ? 'isolated' : ''}">${currentVal}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Bus Voltage:</span>
            <span class="metric-value-volt">${voltageVal}</span>
          </div>
          <div class="transmission-status ${isIsolated ? 'isolated' : 'active'}">
            ${statusText}
          </div>
        </div>

        <div class="tower-card-actions">
          <button class="tower-card-btn btn-card-dial" onclick="quickDialTower('${num}')" title="Dial and query Tower ${num}">
            📞 Dial T${num}
          </button>
          <button class="tower-card-btn btn-card-toggle ${toggleBtnClass}" onclick="toggleTowerIsolation('${t.tower_id}', ${isIsolated})" title="2-way toggle with 3D Twin">
            ${toggleBtnText}
          </button>
        </div>
      </div>
    `;
  }
  towerCardsContainer.innerHTML = html;
}

// 2-Way Command Dispatch: Toll-Free UI -> Digital Twin Backend
async function toggleTowerIsolation(towerId, currentIsIsolated) {
  const endpoint = currentIsIsolated ? `/api/towers/${towerId}/restore` : `/api/towers/${towerId}/isolate`;
  const backendUrl = "https://gridtwin-backend.onrender.com/api/v1/hardware/" + (currentIsIsolated ? "restore" : "isolate") + "/" + towerId;
  try {
    await fetch(endpoint, { method: "POST" });
    fetch(backendUrl, { method: "POST" }).catch(() => {});
    addTranscript("system", `[2-WAY SYNC] Tower ${towerId} ${currentIsIsolated ? "RESTORED" : "ISOLATED"} from Toll-Free UI -> Sent to Digital Twin.`);
    fetchTowersStatus();
  } catch (e) {
    console.error("Toggle error:", e);
    addTranscript("alert", `Failed to command Tower ${towerId}: ${e.message}`);
  }
}

// One-click quick dial a specific tower on the hotline
function quickDialTower(towerNum) {
  if (!callActive) {
    startCall().then(() => {
      setTimeout(() => handleKeyPress("2"), 500);       // Select English
      setTimeout(() => handleKeyPress(towerNum), 1200);   // Select Tower
    });
  } else {
    handleKeyPress(towerNum);
  }
}

// Make accessible to window for inline onclick handlers
window.toggleTowerIsolation = toggleTowerIsolation;
window.quickDialTower = quickDialTower;

// ──────────────────────────────────────────────
// Event Listeners
// ──────────────────────────────────────────────

if (btnStartCall) btnStartCall.addEventListener("click", startCall);
if (btnHangup) btnHangup.addEventListener("click", hangupCall);

document.querySelectorAll(".key-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-key");
    handleKeyPress(key);
  });
});

window.addEventListener("keydown", (e) => {
  const allowed = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "*", "#"];
  if (allowed.includes(e.key)) {
    const btn = document.querySelector(`.key-btn[data-key="${e.key}"]`);
    if (btn) {
      btn.classList.add("active");
      setTimeout(() => btn.classList.remove("active"), 150);
    }
    handleKeyPress(e.key);
  }
});

if (btnClearLog) {
  btnClearLog.addEventListener("click", () => {
    if (transcriptLog) {
      transcriptLog.innerHTML = `<div class="log-entry system"><span class="time">&gt;</span><span class="msg">Log cleared.</span></div>`;
    }
  });
}

// Initial Load and Fast 1.5s Live Sync with Digital Twin
fetchTowersStatus();
setInterval(fetchTowersStatus, 1500);
