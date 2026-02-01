// DOM Elements
const timerDisplay = document.getElementById('timer-display');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnReset = document.getElementById('btn-reset');
const notifArea = document.getElementById('notification-area');
const toggleSoundBtn = document.getElementById('toggle-sound');
const toggleSoundIcon = toggleSoundBtn.querySelector('.icon');
const toggleThemeBtn = document.getElementById('toggle-theme');
const playersGrid = document.getElementById('players-grid');
const btnAddPlayer = document.getElementById('btn-add-player');

// Mode & Settings Elements
const modeUpBtn = document.getElementById('mode-up');
const modeDownBtn = document.getElementById('mode-down');
const settingUpTimer = document.getElementById('setting-uptimer');
const settingDownTimer = document.getElementById('setting-downtimer');

const notifyIntervalUpInput = document.getElementById('notify-interval-up');
const timerHoursInput = document.getElementById('timer-hours');
const timerMinutesInput = document.getElementById('timer-minutes');
const timerSecondsInput = document.getElementById('timer-seconds');
const notifyIntervalDownInput = document.getElementById('notify-interval-down');

const phaseDisplay = document.getElementById('phase-display');
const phasePrevBtn = document.getElementById('phase-prev');
const phaseNextBtn = document.getElementById('phase-next');


// State
let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;
let isRunning = false;
let isSoundOn = true;
let isDarkMode = true;
let playerCount = 0;
let initialDurationMs = 0;
let currentMode = 'UP'; // 'UP' or 'DOWN'

// Audio Context
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = new AudioContext();

function playTone(freq, duration, type = 'sine') {
    if (!isSoundOn) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.stop(audioCtx.currentTime + duration);
}

// Player / Score Logic 
function createPlayer(name = `プレイヤー ${playerCount + 1}`) {
    playerCount++;
    const playerCard = document.createElement('div');
    playerCard.className = 'player-card';
    playerCard.innerHTML = `
        <button class="btn-remove-player" title="削除">×</button>
        <input type="text" class="player-name-input" value="${name}" placeholder="名前を入力">
        <div class="score-control">
            <button class="score-btn minus" title="-1">－</button>
            <span class="score-display">0</span>
            <button class="score-btn plus" title="+1">＋</button>
        </div>
    `;

    const btnMinus = playerCard.querySelector('.minus');
    const btnPlus = playerCard.querySelector('.plus');
    const scoreDisplay = playerCard.querySelector('.score-display');
    const btnRemove = playerCard.querySelector('.btn-remove-player');
    const nameInput = playerCard.querySelector('.player-name-input');

    let score = 0;

    btnMinus.addEventListener('click', () => {
        score--;
        scoreDisplay.textContent = score;
        scoreDisplay.style.color = score < 0 ? 'var(--danger-color)' : 'var(--text-color)';
    });

    btnPlus.addEventListener('click', () => {
        score++;
        scoreDisplay.textContent = score;
        scoreDisplay.style.color = score < 0 ? 'var(--danger-color)' : 'var(--text-color)';
    });

    btnRemove.addEventListener('click', () => {
        if (confirm('このプレイヤーを削除しますか？')) {
            playerCard.remove();
        }
    });

    nameInput.addEventListener('focus', () => nameInput.select());

    playersGrid.appendChild(playerCard);
}

// Phase Logic
function changePhase(amount) {
    const currentText = phaseDisplay.innerText;
    const match = currentText.match(/(\d+)(?!.*\d)/);

    if (match) {
        let number = parseInt(match[1], 10);
        number += amount;
        if (number < 1) number = 1;

        const newText = currentText.substring(0, match.index) + number + currentText.substring(match.index + match[1].length);
        phaseDisplay.innerText = newText;
    } else {
        if (currentText.trim() === '') {
            phaseDisplay.innerText = "Phase 1";
        }
    }
}

// Timer Logic
// 時間・分・秒の入力から合計秒数を取得
function getTotalSecondsFromInputs() {
    const hours = parseInt(timerHoursInput.value, 10) || 0;
    const minutes = parseInt(timerMinutesInput.value, 10) || 0;
    const seconds = parseInt(timerSecondsInput.value, 10) || 0;
    return hours * 3600 + minutes * 60 + seconds;
}

function formatTime(ms) {
    if (ms < 0) ms = 0;

    let totalSeconds = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100); // 小数点以下第1位

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');

    // 1時間以上なら HH:MM:SS.d、それ以外は MM:SS.d
    if (h > 0) {
        return `${h.toString().padStart(2, '0')}:${m}:${s}.${tenths}`;
    }
    return `${m}:${s}.${tenths}`;
}

function updateDisplay() {
    let displayTime = elapsedTime;

    if (currentMode === 'DOWN' && initialDurationMs > 0) {
        displayTime = initialDurationMs - elapsedTime;
        if (displayTime < 0) displayTime = 0;
    }

    timerDisplay.textContent = formatTime(displayTime);
}

function setMode(mode) {
    if (isRunning) return; // Prevent switching while running
    currentMode = mode;

    if (mode === 'UP') {
        modeUpBtn.classList.add('active');
        modeDownBtn.classList.remove('active');
        settingUpTimer.style.display = 'flex';
        settingDownTimer.style.display = 'none';
        timerDisplay.textContent = "00:00.0";
    } else {
        modeUpBtn.classList.remove('active');
        modeDownBtn.classList.add('active');
        settingUpTimer.style.display = 'none';
        settingDownTimer.style.display = 'flex';

        // Preview Duration
        const totalSec = getTotalSecondsFromInputs();
        if (totalSec > 0) {
            timerDisplay.textContent = formatTime(totalSec * 1000);
        } else {
            timerDisplay.textContent = "00:00.0";
        }
    }
    elapsedTime = 0;
    initialDurationMs = 0;
}

function startTimer() {
    if (isRunning) return;

    // Initialize duration based on mode
    if (elapsedTime === 0) {
        if (currentMode === 'DOWN') {
            const durationSec = getTotalSecondsFromInputs();
            if (durationSec > 0) {
                initialDurationMs = durationSec * 1000;
            } else {
                initialDurationMs = 0; // Fallback or Error? fallback to 0 implies finish immediately
            }
        } else {
            initialDurationMs = 0; // Count UP
        }
    }

    isRunning = true;
    startTime = Date.now() - elapsedTime;

    btnStart.disabled = true;
    btnStop.disabled = false;

    // Disable inputs
    timerHoursInput.disabled = true;
    timerMinutesInput.disabled = true;
    timerSecondsInput.disabled = true;
    notifyIntervalUpInput.disabled = true;
    notifyIntervalDownInput.disabled = true;
    modeUpBtn.disabled = true;
    modeDownBtn.disabled = true;

    timerDisplay.style.color = 'var(--accent-color)'; // Active Color

    timerInterval = setInterval(() => {
        const now = Date.now();
        const prevElapsedTime = elapsedTime;
        elapsedTime = now - startTime;

        updateDisplay();

        if (currentMode === 'DOWN' && initialDurationMs > 0 && elapsedTime >= initialDurationMs) {
            finishCountdown();
        } else {
            checkNotifications(elapsedTime, prevElapsedTime, initialDurationMs);
        }
    }, 100);
}

function stopTimer() {
    if (!isRunning) return;

    isRunning = false;
    clearInterval(timerInterval);

    btnStart.disabled = false;
    btnStop.disabled = true;
    // Keep 'Active Color' (accent) while paused to show it's not reset? 
    // Or maybe dim it? Let's keep accent.
}

function resetTimer() {
    if (elapsedTime > 0 && !confirm('タイマーをリセットしますか？')) {
        return;
    }

    stopTimer();
    elapsedTime = 0;

    // Unlock inputs
    timerHoursInput.disabled = false;
    timerMinutesInput.disabled = false;
    timerSecondsInput.disabled = false;
    notifyIntervalUpInput.disabled = false;
    notifyIntervalDownInput.disabled = false;
    modeUpBtn.disabled = false;
    modeDownBtn.disabled = false;

    // Reset Color
    timerDisplay.style.color = 'var(--text-color)';

    if (currentMode === 'DOWN') {
        const totalSec = getTotalSecondsFromInputs();
        if (totalSec > 0) {
            timerDisplay.textContent = formatTime(totalSec * 1000);
        } else {
            timerDisplay.textContent = "00:00.0";
        }
    } else {
        timerDisplay.textContent = "00:00.0";
    }

    clearNotifications();
}

function finishCountdown() {
    calculateEnd = true;
    isRunning = false;
    clearInterval(timerInterval); // Stop loop

    elapsedTime = initialDurationMs;
    updateDisplay();

    // UI Updates for End State
    btnStart.disabled = false;
    btnStop.disabled = true;

    // Color Reset (Request: "消して" -> Turn off accent/active color, maybe dim/gray?)
    timerDisplay.style.color = 'var(--text-color)';
    timerDisplay.style.opacity = '0.5'; // Dim it

    notify('時間切れ！', 'red', 880, 1.0);
    playTone(880, 0.4);
    setTimeout(() => playTone(880, 0.4), 200);
    setTimeout(() => playTone(880, 0.8), 400);
}

// Notification Logic
function checkNotifications(currentMs, prevMs, durationMs) {
    const floorCurrentSec = Math.floor(currentMs / 1000);
    const floorPrevSec = Math.floor(prevMs / 1000);
    const secondHasPassed = floorCurrentSec > floorPrevSec;

    // COUNT DOWN Logic (Notify on REMAINING time)
    if (currentMode === 'DOWN' && durationMs > 0) {
        const currentRemaining = Math.ceil((durationMs - currentMs) / 1000);
        const prevRemaining = Math.ceil((durationMs - prevMs) / 1000);

        if (currentRemaining !== prevRemaining) {
            // Priority: Countdown End Sequence
            if ([30, 25, 20, 15].includes(currentRemaining)) {
                notify(`残り ${currentRemaining}秒`, 'orange', 660, 0.3);
            }
            else if (currentRemaining <= 10 && currentRemaining > 0) {
                notify(`残り ${currentRemaining}秒`, 'red', 880, 0.15);
            }
            // User Interval Logic (Only if not in critical countdown phase)
            else if (currentRemaining > 30) {
                checkIntervalNotification(currentMs, prevMs, notifyIntervalDownInput);
            }
        }
    }
    // COUNT UP Logic
    else if (currentMode === 'UP') {
        checkIntervalNotification(currentMs, prevMs, notifyIntervalUpInput);
    }
}

function checkIntervalNotification(currentMs, prevMs, inputEl) {
    const intervalVal = parseFloat(inputEl.value);

    if (!isNaN(intervalVal) && intervalVal > 0) {
        // 0.1秒(100ms)単位に丸めて計算（小数点以下第一位まで対応）
        const intervalTenths = Math.round(intervalVal * 10); // 2.3秒 → 23 (0.1秒単位)
        const currentTenths = Math.floor(currentMs / 100);   // 現在時間を0.1秒単位に
        const prevTenths = Math.floor(prevMs / 100);         // 前回時間を0.1秒単位に

        // 現在と前回がどのインターバルに属するか計算
        const currentInterval = Math.floor(currentTenths / intervalTenths);
        const prevInterval = Math.floor(prevTenths / intervalTenths);

        // 新しいインターバルに入ったら通知
        if (currentInterval > prevInterval && currentInterval > 0) {
            const elapsedSec = (currentInterval * intervalTenths) / 10;
            // 小数点以下があれば表示、なければ整数表示
            const displayTime = elapsedSec % 1 === 0 ? elapsedSec.toFixed(0) : elapsedSec.toFixed(1);
            notify(`${displayTime}秒経過`, 'yellow', 550, 0.2);
        }
    }
}

function notify(text, colorClass, freq, duration) {
    notifArea.textContent = text;
    notifArea.style.opacity = '1';

    if (colorClass === 'red') notifArea.style.color = 'var(--danger-color)';
    else if (colorClass === 'orange') notifArea.style.color = 'var(--warning-color)';
    else notifArea.style.color = 'var(--text-color)';

    playTone(freq, duration);
    setTimeout(() => {
        notifArea.style.opacity = '0';
    }, 2000);
}

function clearNotifications() {
    notifArea.textContent = '';
    notifArea.style.opacity = '0';
}

toggleSoundBtn.addEventListener('click', () => {
    isSoundOn = !isSoundOn;
    toggleSoundIcon.textContent = isSoundOn ? '🔊' : '🔇';
    toggleSoundBtn.style.opacity = isSoundOn ? '1' : '0.5';
    if (audioCtx.state === 'suspended') audioCtx.resume();
});

toggleThemeBtn.addEventListener('click', () => {
    document.body.classList.toggle('theme-light');
    document.body.classList.toggle('theme-dark');
    isDarkMode = !isDarkMode;
    toggleThemeBtn.querySelector('.icon').textContent = isDarkMode ? '🌙' : '☀️';
});

btnStart.addEventListener('click', () => {
    if (timerDisplay.style.opacity === '0.5') {
        // If restarting after finish, reset opacity
        timerDisplay.style.opacity = '1';
        // Auto Reset before start implies new round? 
        // Logic: if finished, Reset is needed usually. 
        // But User clicked Start. Let's assume they want to verify reset first.
        // Or if they want to Add time?
        // Let's force reset behavior or just start fresh if 0?
        if (elapsedTime >= initialDurationMs && initialDurationMs > 0) {
            resetTimer(); // Reset first
            startTimer(); // Then start
            return;
        }
    }
    startTimer();
});
btnStop.addEventListener('click', stopTimer);
btnReset.addEventListener('click', resetTimer);
btnAddPlayer.addEventListener('click', () => createPlayer());

phasePrevBtn.addEventListener('click', () => changePhase(-1));
phaseNextBtn.addEventListener('click', () => changePhase(1));

modeUpBtn.addEventListener('click', () => setMode('UP'));
modeDownBtn.addEventListener('click', () => setMode('DOWN'));

// 時間・分・秒の入力変更でプレビュー更新
function updateTimerPreview() {
    if (!isRunning && currentMode === 'DOWN') {
        const totalSec = getTotalSecondsFromInputs();
        if (totalSec > 0) {
            timerDisplay.textContent = formatTime(totalSec * 1000);
        } else {
            timerDisplay.textContent = "00:00.0";
        }
    }
}

timerHoursInput.addEventListener('input', updateTimerPreview);
timerMinutesInput.addEventListener('input', updateTimerPreview);
timerSecondsInput.addEventListener('input', updateTimerPreview);

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return;

    if (e.code === 'Space') {
        e.preventDefault();
        if (isRunning) stopTimer();
        else startTimer();
    }

    if (e.code === 'Escape') {
        resetTimer();
    }
});

// Init
createPlayer('プレイヤー 1');
createPlayer('プレイヤー 2');
setMode('UP'); // Default
