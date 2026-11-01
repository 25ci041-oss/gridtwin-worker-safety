/**
 * GRIDTWIN Toll-Free Webphone & Dialpad Controller
 * 
 * Handles:
 * - DTMF tone generation & keypress dispatch
 * - Browser Web Speech API (Tamil, English, Hindi TTS)
 * - Live tower telemetry synchronization
 * - Call transcript logging
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
const callStatusLabel = document.getElementById("callStatusLabel");
const callTimer = document.getElementById("callTimer");
const speakerVisualizer = document.getElementById("speakerVisualizer");
const speechBubble = document.getElementById("speechBubble");
const chkAudioSpeech = document.getElementById("chkAudioSpeech");
const transcriptLog = document.getElementById("transcriptLog");
const towerCardsContainer = document.getElementById("towerCardsContainer");
const btnRefreshTowers = document.getElementById("btnRefreshTowers");
const btnClearLog = document.getElementById("btnClearLog");
const btnCopyWebhook = document.getElementById("btnCopyWebhook");
const webhookUrlSpan = document.getElementById("webhookUrl");

// DTMF Frequencies (Row & Col)
const DTMF_FREQS = {
  "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
  "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
  "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
  "*": [941, 1209], "0": [941, 1336], "#": [941, 1477],
};

// Play DTMF beep sound in browser
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
  speakerVisualizer.classList.remove("speaking");
  speechBubble.textContent = "Voice speaker ready";
}

function playRealVoice(audioUrl, fallbackText, lang = "en-IN", callback = null) {
  if (!chkAudioSpeech.checked) {
    if (callback) callback();
    return;
  }

  stopAllAudio();

  speakerVisualizer.classList.add("speaking");
  speechBubble.textContent = `Speaking (${lang})...`;

  if (audioUrl) {
    const audio = new Audio(audioUrl);
    currentAudioPlayer = audio;

    audio.onended = () => {
      speakerVisualizer.classList.remove("speaking");
      speechBubble.textContent = "Voice speaker ready";
      currentAudioPlayer = null;
      if (callback) callback();
    };

    audio.onerror = (e) => {
      console.warn("Audio file failed to play, falling back to browser TTS:", e);
      speakAloudBrowser(fallbackText, lang, callback);
    };

    audio.play().catch(err => {
      console.warn("Audio play() blocked, falling back to browser TTS:", err);
      speakAloudBrowser(fallbackText, lang, callback);
    });
  } else {
    speakAloudBrowser(fallbackText, lang, callback);
  }
}

// Fallback Browser Speech Synthesis
function speakAloudBrowser(text, lang = "en-IN", callback = null) {
  if (!('speechSynthesis' in window)) {
    if (callback) callback();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  utterance.pitch = 1.0;
  utterance.lang = lang;

  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(v => v.lang === lang || v.lang.startsWith(lang.split('-')[0]));
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  utterance.onend = () => {
    speakerVisualizer.classList.remove("speaking");
    speechBubble.textContent = "Voice speaker ready";
    if (callback) callback();
  };

  utterance.onerror = () => {
    speakerVisualizer.classList.remove("speaking");
    speechBubble.textContent = "Voice speaker ready";
    if (callback) callback();
  };

  window.speechSynthesis.speak(utterance);
}

// Pre-load voices
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

// Add Transcript Entry
function addTranscript(type, msg) {
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
  callTimer.textContent = "00:00";
  clearInterval(callTimerInterval);
  callTimerInterval = setInterval(() => {
    callDurationSec++;
    const m = String(Math.floor(callDurationSec / 60)).padStart(2, '0');
    const s = String(callDurationSec % 60).padStart(2, '0');
    callTimer.textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(callTimerInterval);
}

// ──────────────────────────────────────────────
// Call Lifecycle Actions
// ──────────────────────────────────────────────

async function startCall() {
  try {
    addTranscript("caller", "📞 Dialing 1800-419-GRID (Toll-Free)...");
    callStatusLabel.textContent = "Connecting...";
    callStatusLabel.className = "call-status active";
    btnStartCall.disabled = true;
    btnHangup.disabled = false;

    const res = await fetch("/api/simulator/call", { method: "POST" });
    const data = await res.json();

    callActive = true;
    startTimer();
    callStatusLabel.textContent = "Call Connected (Toll-Free)";
    currentStage = "LANGUAGE_SELECTION";
    phoneDisplayText.textContent = data.display_text;

    addTranscript("ivr", "Connected to GRIDTWIN 24/7 Hotline.");
    addTranscript("ivr", "Prompt: 1 for Tamil | 2 for English | 3 for Hindi");

    // Speak initial prompts sequentially using real neural audio
    if (chkAudioSpeech.checked && data.speech_prompts) {
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
  
  callStatusLabel.textContent = "Call Ended";
  callStatusLabel.className = "call-status";
  phoneDisplayText.textContent = "Call ended.\nClick 'Call Toll-Free' to start a new call.";
  
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
      phoneDisplayText.textContent = result.display_text;
      addTranscript("alert", result.display_text);
      if (result.speech) {
        playRealVoice(result.audio_url, result.speech.text, result.speech.lang);
      }
      return;
    }

    // Process State Changes
    currentStage = result.stage;
    if (result.lang) selectedLanguage = result.lang;

    phoneDisplayText.textContent = result.display_text;
    addTranscript("ivr", result.display_text);

    // Speak speech prompt with Real Neural Audio
    if (result.speech) {
      playRealVoice(result.audio_url, result.speech.text, result.speech.lang);
    }

    // If call ended by menu
    if (currentStage === "CALL_ENDED") {
      setTimeout(hangupCall, 4000);
    }

    // Refresh towers display if tower was inspected
    if (result.tower_data) {
      fetchTowersStatus();
    }

  } catch (err) {
    console.error("DTMF error:", err);
    addTranscript("alert", "Error processing DTMF: " + err.message);
  }
}

// ──────────────────────────────────────────────
// Live Towers Telemetry Polling
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
  if (!towers || Object.keys(towers).length === 0) return;

  const isolatedList = [];
  const activeList = [];
  for (const [num, t] of Object.entries(towers)) {
    if (t.is_isolated) {
      isolatedList.push(`Tower ${num} (${t.tower_id})`);
    } else {
      activeList.push(`T${num}`);
    }
  }

  // Update Grid Summary Banner
  const alertBar = document.getElementById("gridStatusAlertBar");
  const alertIcon = document.getElementById("gridAlertIcon");
  const alertText = document.getElementById("gridAlertText");
  const alertTag = document.getElementById("gridAlertTag");
  if (alertBar && alertText) {
    if (isolatedList.length > 0) {
      alertBar.className = "grid-status-alert-bar has-isolation";
      if (alertIcon) alertIcon.textContent = "🚨";
      alertText.innerHTML = `<strong>FAULT ISOLATION DETECTED:</strong> ${isolatedList.join(", ")} is currently ISOLATED. Power supply is cut off. Live telemetry in sync with 3D Twin.`;
      if (alertTag) alertTag.textContent = `${isolatedList.length} ISOLATED`;
    } else {
      alertBar.className = "grid-status-alert-bar all-normal";
      if (alertIcon) alertIcon.textContent = "⚡";
      alertText.innerHTML = `<strong>ALL TOWERS NORMAL:</strong> 5/5 towers active and transmitting power. Normal line flow.`;
      if (alertTag) alertTag.textContent = `5/5 ACTIVE`;
    }
  }

  let html = "";
  for (const [num, t] of Object.entries(towers)) {
    const isIsolated = t.is_isolated;
    const cardClass = isIsolated ? "isolated" : "normal";
    const badgeClass = isIsolated ? "badge-isolated" : "badge-normal";
    const badgeText = isIsolated ? "🚨 ISOLATED" : "⚡ ACTIVE";
    const currentHtml = isIsolated 
      ? `<strong style="color: #ef4444; font-weight: 800;">0.0 mA (CUT OFF)</strong>`
      : `<strong style="color: #10b981; font-weight: 800;">${t.current_ma} mA (FLOWING)</strong>`;
    const statusNote = isIsolated
      ? `<div style="font-size: 11px; color: #f87171; margin-top: 4px; font-weight: 600;">⚠️ Power Line Cut Off / Isolated</div>`
      : `<div style="font-size: 11px; color: #34d399; margin-top: 4px;">✔ Live Transmission Active</div>`;

    const toggleBtnText = isIsolated ? "⚡ Restore" : "🚫 Isolate";
    const toggleBtnClass = isIsolated ? "restore-btn" : "isolate-btn";

    html += `
      <div class="tower-card ${cardClass}" id="card-tower-${num}">
        <div class="tower-card-top">
          <span class="tower-title">Tower ${t.tower_number} (${t.tower_id})</span>
          <span class="tower-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="tower-metric">
          Line Current: ${currentHtml}
        </div>
        <div class="tower-metric">
          Bus Voltage: <strong>${t.voltage_v} V</strong>
        </div>
        ${statusNote}
        <div class="tower-metric" style="font-size: 10px; color: var(--text-muted); margin-top: 6px;">
          Telemetry Source: ${t.source} (${t.device_status})
        </div>
        <div class="tower-card-actions">
          <button class="tower-card-btn btn-card-dial" onclick="quickDialTower('${num}')" title="Call Toll-Free hotline and query Tower ${num}">
            📞 Dial T${num}
          </button>
          <button class="tower-card-btn btn-card-toggle ${toggleBtnClass}" onclick="toggleTowerIsolation('${t.tower_id}', ${isIsolated})" title="2-way toggle isolation with 3D Twin">
            ${toggleBtnText}
          </button>
        </div>
      </div>
    `;
  }
  towerCardsContainer.innerHTML = html;
}

// 2-Way Command Dispatch from Toll-Free UI to Digital Twin
async function toggleTowerIsolation(towerId, currentIsIsolated) {
  const endpoint = currentIsIsolated ? `/api/towers/${towerId}/restore` : `/api/towers/${towerId}/isolate`;
  try {
    const res = await fetch(endpoint, { method: "POST" });
    const result = await res.json();
    addTranscript("system", `[2-WAY SYNC] Tower ${towerId} ${currentIsIsolated ? "RESTORED" : "ISOLATED"} from Toll-Free UI -> Sent to Digital Twin.`);
    fetchTowersStatus();
  } catch (e) {
    console.error("Toggle error:", e);
    addTranscript("alert", `Failed to command Tower ${towerId}: ${e.message}`);
  }
}

// Shortcut to dial tower immediately on webphone
function quickDialTower(towerNum) {
  if (!callActive) {
    startCall().then(() => {
      // Step 1: select English
      setTimeout(() => handleKeyPress("2"), 500);
      // Step 2: query tower
      setTimeout(() => handleKeyPress(towerNum), 1200);
    });
  } else {
    handleKeyPress(towerNum);
  }
}

// Make functions accessible to window for inline onclick handlers
window.toggleTowerIsolation = toggleTowerIsolation;
window.quickDialTower = quickDialTower;

// ──────────────────────────────────────────────
// Event Listeners
// ──────────────────────────────────────────────

btnStartCall.addEventListener("click", startCall);
btnHangup.addEventListener("click", hangupCall);

document.querySelectorAll(".key-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-key");
    handleKeyPress(key);
  });
});

// Keyboard number shortcuts
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

btnRefreshTowers.addEventListener("click", fetchTowersStatus);
btnClearLog.addEventListener("click", () => {
  transcriptLog.innerHTML = `<div class="log-entry system"><span class="time">--:--</span><span class="msg">Log cleared.</span></div>`;
});

btnCopyWebhook.addEventListener("click", () => {
  const url = window.location.origin + "/ivr/welcome";
  navigator.clipboard.writeText(url).then(() => {
    btnCopyWebhook.textContent = "Copied!";
    setTimeout(() => { btnCopyWebhook.textContent = "Copy"; }, 2000);
  });
});

// Update webhook url text to current host
if (webhookUrlSpan) {
  webhookUrlSpan.textContent = window.location.origin + "/ivr/welcome";
}

// Initial Load and Fast 1.5s Live Sync with Digital Twin
fetchTowersStatus();
setInterval(fetchTowersStatus, 1500);

