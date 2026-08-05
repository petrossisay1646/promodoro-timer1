// App State & Configurations
const DEFAULT_SETTINGS = {
  pomodoro: 25,     // in minutes
  shortBreak: 5,    // in minutes
  longBreak: 15,    // in minutes
  ticking: false,
  volume: 50
};

let settings = { ...DEFAULT_SETTINGS };
let currentMode = 'pomodoro'; // 'pomodoro', 'shortBreak', 'longBreak'
let isRunning = false;
let timerId = null;
let timeRemaining = 0; // in seconds
let totalDuration = 0; // in seconds
let expectedEndTime = null;

// Audio context (initialized on first user interaction)
let audioCtx = null;

// Safe LocalStorage wrapper to handle restricted environments (e.g. iframe sandbox, private browsing)
const safeStorage = {
  memoryStore: {},
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return this.memoryStore[key] || null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      this.memoryStore[key] = String(value);
    }
  }
};

// Safe Lucide initialization helper
function safeCreateIcons() {
  try {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (e) {
    console.warn('Lucide failed to initialize icons:', e);
  }
}

// DOM Elements (declared globally, populated on init)
let bodyEl, timeDisplayEl, statusTextEl, nextUpTextEl, playPauseBtn, playIconEl, resetBtn, settingsBtn, themeToggleBtn;
let settingsModal, closeSettingsBtn, saveSettingsBtn, resetDefaultsBtn, inputPomodoro, inputShort, inputLong, inputTicking, inputVolume;
let statsSessionsEl, statsTimeEl, progressRingFill;
let confirmModal, cancelClearBtn, confirmClearBtn;

// Circumference of SVG circle (r = 88)
const CIRCUMFERENCE = 2 * Math.PI * 88;

function initElements() {
  bodyEl = document.body;
  timeDisplayEl = document.getElementById('time-display');
  statusTextEl = document.getElementById('timer-status-text');
  nextUpTextEl = document.getElementById('next-up-text');
  playPauseBtn = document.getElementById('play-pause-btn');
  playIconEl = document.getElementById('play-icon');
  resetBtn = document.getElementById('reset-btn');
  settingsBtn = document.getElementById('settings-btn');
  themeToggleBtn = document.getElementById('theme-toggle');

  settingsModal = document.getElementById('settings-modal');
  closeSettingsBtn = document.getElementById('close-settings-btn');
  saveSettingsBtn = document.getElementById('save-settings-btn');
  resetDefaultsBtn = document.getElementById('reset-defaults-btn');
  inputPomodoro = document.getElementById('input-pomodoro');
  inputShort = document.getElementById('input-short');
  inputLong = document.getElementById('input-long');
  inputTicking = document.getElementById('input-ticking');
  inputVolume = document.getElementById('input-volume');

  statsSessionsEl = document.getElementById('stats-sessions');
  statsTimeEl = document.getElementById('stats-time');
  progressRingFill = document.getElementById('timer-progress');

  confirmModal = document.getElementById('confirm-modal');
  cancelClearBtn = document.getElementById('cancel-clear-btn');
  confirmClearBtn = document.getElementById('confirm-clear-btn');

  if (progressRingFill) {
    progressRingFill.style.strokeDasharray = CIRCUMFERENCE;
  }
}

// Load initial settings and statistics from LocalStorage
function init() {
  initElements();
  loadSettings();
  loadStats();
  applyTheme();
  setMode(currentMode);
  setupEventListeners();
  updateProgressRing();
}

// Load configurations
function loadSettings() {
  const saved = safeStorage.getItem('aura_pomodoro_settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        settings = { ...DEFAULT_SETTINGS, ...parsed };
      } else {
        settings = { ...DEFAULT_SETTINGS };
      }
    } catch (e) {
      settings = { ...DEFAULT_SETTINGS };
    }
  } else {
    settings = { ...DEFAULT_SETTINGS };
  }
  // Sync back to form
  syncSettingsForm();
}

function saveSettings() {
  safeStorage.setItem('aura_pomodoro_settings', JSON.stringify(settings));
}

function syncSettingsForm() {
  inputPomodoro.value = settings.pomodoro;
  inputShort.value = settings.shortBreak;
  inputLong.value = settings.longBreak;
  inputTicking.checked = settings.ticking;
  inputVolume.value = settings.volume;
}

// Load statistics
function loadStats() {
  const sessions = safeStorage.getItem('aura_completed_sessions') || '0';
  const minutesVal = parseFloat(safeStorage.getItem('aura_focus_minutes') || '0');
  if (isNaN(minutesVal)) {
    statsTimeEl.textContent = '0m';
  } else {
    const minutesFormatted = minutesVal % 1 === 0 ? minutesVal.toString() : minutesVal.toFixed(1);
    statsTimeEl.textContent = `${minutesFormatted}m`;
  }
  statsSessionsEl.textContent = sessions;
}

function incrementStats(focusMinutesAdded) {
  let sessions = parseInt(safeStorage.getItem('aura_completed_sessions') || '0', 10);
  let minutes = parseFloat(safeStorage.getItem('aura_focus_minutes') || '0');
  
  if (isNaN(sessions)) sessions = 0;
  if (isNaN(minutes)) minutes = 0;
  
  if (currentMode === 'pomodoro') {
    sessions += 1;
    minutes += (focusMinutesAdded || 0);
    safeStorage.setItem('aura_completed_sessions', sessions.toString());
    safeStorage.setItem('aura_focus_minutes', minutes.toString());
    loadStats();
  }
}

// Audio Engine (Web Audio API)
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq, startTime, duration, volumeFactor = 1.0) {
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  const volume = (settings.volume / 100) * volumeFactor;
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  
  gainNode.gain.setValueAtTime(0, startTime);
  // Linear rise for attack
  gainNode.gain.linearRampToValueAtTime(volume * 0.4, startTime + 0.02);
  // Exponential decay for decay
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playChime() {
  initAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  
  // Elegant arpeggiated chord chime: E5, G5, B5, E6
  const notes = [659.25, 783.99, 987.77, 1318.51];
  notes.forEach((freq, i) => {
    playTone(freq, now + i * 0.12, 0.8, 0.7);
  });
}

function playTick() {
  if (!settings.ticking) return;
  initAudio();
  if (!audioCtx) return;
  
  const now = audioCtx.currentTime;
  // High-pass styled fast click sound
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  const volume = (settings.volume / 100) * 0.08; // extremely quiet tick
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, now);
  
  gainNode.gain.setValueAtTime(volume, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  osc.start(now);
  osc.stop(now + 0.03);
}

// Timer Logic
function setMode(mode) {
  // Update mode classes on body to change visual gradients
  bodyEl.classList.remove('mode-pomodoro', 'mode-shortBreak', 'mode-longBreak');
  bodyEl.classList.add(`mode-${mode}`);
  currentMode = mode;
  
  // Highlight tab buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  // Update status labels
  if (mode === 'pomodoro') {
    statusTextEl.textContent = 'Focus Time';
    nextUpTextEl.textContent = 'Next: Short Break';
    totalDuration = settings.pomodoro * 60;
  } else if (mode === 'shortBreak') {
    statusTextEl.textContent = 'Short Break';
    nextUpTextEl.textContent = 'Next: Focus Time';
    totalDuration = settings.shortBreak * 60;
  } else if (mode === 'longBreak') {
    statusTextEl.textContent = 'Long Break';
    nextUpTextEl.textContent = 'Next: Focus Time';
    totalDuration = settings.longBreak * 60;
  }
  
  timeRemaining = totalDuration;
  updateDisplay();
  updateProgressRing();
}

function updateDisplay() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');
  
  const timeString = `${formattedMinutes}:${formattedSeconds}`;
  timeDisplayEl.textContent = timeString;
  
  // Update browser tab title
  const modeLabel = currentMode === 'pomodoro' ? 'Focus' : 'Break';
  document.title = `(${timeString}) ${modeLabel} - Aura`;
}

function updateProgressRing() {
  const fraction = timeRemaining / totalDuration;
  // Circular outline offset
  const offset = CIRCUMFERENCE * (1 - fraction);
  progressRingFill.style.strokeDashoffset = offset;
}

function startTimer() {
  if (isRunning) return;
  
  initAudio();
  isRunning = true;
  updatePlayPauseButton();
  
  expectedEndTime = Date.now() + timeRemaining * 1000;
  
  timerId = setInterval(() => {
    const elapsed = Date.now();
    const remaining = Math.max(0, Math.ceil((expectedEndTime - elapsed) / 1000));
    
    if (remaining !== timeRemaining) {
      timeRemaining = remaining;
      updateDisplay();
      updateProgressRing();
      playTick();
      
      if (timeRemaining === 0) {
        handleTimerEnd();
      }
    }
  }, 100); // Poll frequently to prevent lag / out-of-sync seconds
}

function pauseTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerId);
  timerId = null;
  updatePlayPauseButton();
  document.title = `(Paused) Aura`;
}

function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function resetTimer() {
  pauseTimer();
  timeRemaining = totalDuration;
  updateDisplay();
  updateProgressRing();
}

function handleTimerEnd() {
  pauseTimer();
  playChime();
  
  // Save stats
  if (currentMode === 'pomodoro') {
    incrementStats(settings.pomodoro);
  }
  
  // Shake / animate the visual container briefly on completion
  const container = document.querySelector('.timer-visual-wrapper');
  container.classList.add('pulse-alert');
  setTimeout(() => container.classList.remove('pulse-alert'), 1000);
  
  // Auto-switch mode
  setTimeout(() => {
    if (currentMode === 'pomodoro') {
      // Switch to short break (or long break if stats show multiple of 4 completed)
      const completedSessions = parseInt(safeStorage.getItem('aura_completed_sessions') || '0', 10);
      if (completedSessions > 0 && completedSessions % 4 === 0) {
        setMode('longBreak');
      } else {
        setMode('shortBreak');
      }
    } else {
      setMode('pomodoro');
    }
  }, 1200);
}

function updatePlayPauseButton() {
  if (isRunning) {
    playPauseBtn.setAttribute('aria-label', 'Pause Timer');
    playPauseBtn.innerHTML = '<i data-lucide="pause" id="play-icon"></i>';
  } else {
    playPauseBtn.setAttribute('aria-label', 'Start Timer');
    playPauseBtn.innerHTML = '<i data-lucide="play" id="play-icon"></i>';
  }
  safeCreateIcons();
}

// Modal Settings Controls
function openSettings() {
  syncSettingsForm();
  settingsModal.classList.add('open');
  settingsModal.setAttribute('aria-hidden', 'false');
}

function closeSettings() {
  settingsModal.classList.remove('open');
  settingsModal.setAttribute('aria-hidden', 'true');
}

function applySettings() {
  const p = Math.max(0.1, Math.min(60, parseFloat(inputPomodoro.value) || DEFAULT_SETTINGS.pomodoro));
  const s = Math.max(0.1, Math.min(30, parseFloat(inputShort.value) || DEFAULT_SETTINGS.shortBreak));
  const l = Math.max(0.1, Math.min(60, parseFloat(inputLong.value) || DEFAULT_SETTINGS.longBreak));
  
  // Check if any duration changed
  const durationChanged = (settings.pomodoro !== p || settings.shortBreak !== s || settings.longBreak !== l);
  
  settings.pomodoro = p;
  settings.shortBreak = s;
  settings.longBreak = l;
  settings.ticking = inputTicking.checked;
  settings.volume = parseInt(inputVolume.value, 10);
  
  saveSettings();
  closeSettings();
  
  // If the durations changed, pause and reset the timer state to the new configuration
  if (durationChanged) {
    pauseTimer();
    setMode(currentMode);
  } else if (!isRunning) {
    // If only preferences changed and we are paused, just sync the current mode values
    setMode(currentMode);
  }
}

function resetSettingsToDefault() {
  settings = { ...DEFAULT_SETTINGS };
  syncSettingsForm();
}

function openConfirmModal() {
  confirmModal.classList.add('open');
  confirmModal.setAttribute('aria-hidden', 'false');
}

function closeConfirmModal() {
  confirmModal.classList.remove('open');
  confirmModal.setAttribute('aria-hidden', 'true');
}

function clearStats() {
  openConfirmModal();
}

function executeClearStats() {
  safeStorage.setItem('aura_completed_sessions', '0');
  safeStorage.setItem('aura_focus_minutes', '0');
  loadStats();
  closeConfirmModal();
  closeSettings();
}

// Theme Controller
function applyTheme() {
  const activeTheme = safeStorage.getItem('aura_theme') || 'dark';
  bodyEl.setAttribute('data-theme', activeTheme);
  
  const icon = activeTheme === 'light' ? 'moon' : 'sun';
  themeToggleBtn.innerHTML = `<i data-lucide="${icon}"></i>`;
  safeCreateIcons();
}

function toggleTheme() {
  const currentTheme = bodyEl.getAttribute('data-theme');
  const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
  safeStorage.setItem('aura_theme', nextTheme);
  applyTheme();
}

// Event Listeners setup
function setupEventListeners() {
  // Mode switcher tab click events
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      pauseTimer();
      setMode(e.target.dataset.mode);
    });
  });
  
  // Buttons
  playPauseBtn.addEventListener('click', toggleTimer);
  resetBtn.addEventListener('click', resetTimer);
  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  saveSettingsBtn.addEventListener('click', applySettings);
  resetDefaultsBtn.addEventListener('click', resetSettingsToDefault);
  themeToggleBtn.addEventListener('click', toggleTheme);
  
  const clearStatsBtn = document.getElementById('clear-stats-btn');
  if (clearStatsBtn) {
    clearStatsBtn.addEventListener('click', clearStats);
  }

  // Confirm modal buttons
  if (cancelClearBtn) {
    cancelClearBtn.addEventListener('click', closeConfirmModal);
  }
  if (confirmClearBtn) {
    confirmClearBtn.addEventListener('click', executeClearStats);
  }

  // Close confirm modal when clicking outside
  if (confirmModal) {
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) {
        closeConfirmModal();
      }
    });
  }

  // Close settings modal when clicking outside content card
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettings();
    }
  });
  
  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Skip keyboard hotkeys if user is editing settings input
    if (document.activeElement.tagName === 'INPUT') {
      return;
    }
    
    switch(e.key.toLowerCase()) {
      case ' ':
        e.preventDefault();
        toggleTimer();
        break;
      case 'escape':
        e.preventDefault();
        resetTimer();
        break;
      case 's':
        e.preventDefault();
        if (settingsModal.classList.contains('open')) {
          closeSettings();
        } else {
          openSettings();
        }
        break;
    }
  });
}

// Initialize the App
document.addEventListener('DOMContentLoaded', init);
// Run init immediately if DOMContentLoaded already fired
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  init();
}
