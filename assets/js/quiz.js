// ============================================================
// Torhymne-Quiz — Game Logic
// ============================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbwAxC4SqGqopZ8TeyQtrLame6UURqUBBcO_sbOa7Pt27-l-2aQJgMzICnAEiJJ7kByaLw/exec';

// --- State ---
let clubs = [];          // original data from API (never mutated)
let roundOrder = [];     // shuffled copy for the current round
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;

// --- YouTube IFrame API state ---
let ytPlayer = null;
let ytPlayerReady = false;
let ytApiReady = false;
let dataReady = false;

// --- DOM refs ---
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const errorTextEl = document.querySelector('#error p');
const gameEl = document.getElementById('game');
const startBtn = document.getElementById('start-btn');
const quizRound = document.getElementById('quiz-round');
const roundProgress = document.getElementById('round-progress');
const playBtn = document.getElementById('play-btn');
const selectEl = document.getElementById('club-select');
const checkBtn = document.getElementById('check-btn');
const feedbackEl = document.getElementById('feedback');
const feedbackText = document.getElementById('feedback-text');
const overlayEl = document.getElementById('overlay');
const resultsEl = document.getElementById('results');
const resultsCorrect = document.getElementById('results-correct');
const resultsWrong = document.getElementById('results-wrong');
const resultsTotal = document.getElementById('results-total');
const nextRoundBtn = document.getElementById('next-round-btn');

var YT_ERROR_MSG = 'Die Torhymne konnte leider nicht geladen werden - bitte prüfe Deine Internet-Verbindung und versuche es später noch einmal.';

// --- YouTube IFrame API ready callback ---
// Pre-create the player with no video so it is fully initialized
// by the time the user taps "QUIZ STARTEN".
window.onYouTubeIframeAPIReady = function () {
  ytApiReady = true;
  try {
    ytPlayer = new YT.Player('player', {
      height: '315',
      width: '100%',
      playerVars: {
        controls: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: function () {
          ytPlayerReady = true;
          tryShowGame();
        },
        onStateChange: onPlayerStateChange,
        onError: function () {
          showError(YT_ERROR_MSG);
        },
      },
    });
  } catch (e) {
    showError(YT_ERROR_MSG);
  }
};

// --- iOS fallback: detect stalled playback and show play button ---
function onPlayerStateChange(event) {
  // If the player is playing, hide the fallback play button
  if (event.data === YT.PlayerState.PLAYING) {
    playBtn.hidden = true;
  }
  // If the player is paused or unstarted right after we asked it to play,
  // iOS likely blocked autoplay — show the manual play button
  if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.UNSTARTED) {
    // Small delay to avoid flashing the button during normal loading transitions
    setTimeout(function () {
      if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
        var state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.UNSTARTED || state === YT.PlayerState.CUED) {
          playBtn.hidden = false;
        }
      }
    }, 500);
  }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', function () {
  fetchData();

  // Timeout fallback: if YT player hasn't initialized after 10 seconds, show error
  setTimeout(function () {
    if (!ytPlayerReady) {
      showError(YT_ERROR_MSG);
    }
  }, 10000);

  startBtn.addEventListener('click', function () {
    startBtn.hidden = true;
    quizRound.hidden = false;
    startRound();
  });

  checkBtn.addEventListener('click', checkAnswer);

  // iOS fallback play button — tapping provides a fresh user gesture
  playBtn.addEventListener('click', function () {
    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
      ytPlayer.playVideo();
    }
    playBtn.hidden = true;
  });

  nextRoundBtn.addEventListener('click', function () {
    resultsEl.hidden = true;
    startBtn.hidden = false;
  });
});

// --- Show game only when data, YT API, and player are all ready ---
function tryShowGame() {
  if (dataReady && ytApiReady && ytPlayerReady) {
    loadingEl.hidden = true;
    gameEl.hidden = false;
  }
}

// --- Fetch data from Google Sheets API ---
function fetchData() {
  fetch(API_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then(function (data) {
      if (!Array.isArray(data) || data.length < 2) {
        showError();
        return;
      }
      clubs = data;
      dataReady = true;
      tryShowGame();
    })
    .catch(function () {
      showError();
    });
}

function showError(message) {
  loadingEl.hidden = true;
  if (message) {
    errorTextEl.textContent = message;
  }
  errorEl.hidden = false;
}

// --- Helpers ---
function shuffle(array) {
  var shuffled = array.slice();
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

function extractVideoId(url) {
  var match = url.match(/\/embed\/([^?/]+)/);
  if (match) return match[1];
  match = url.match(/[?&]v=([^&]+)/);
  if (match) return match[1];
  match = url.match(/youtu\.be\/([^?]+)/);
  if (match) return match[1];
  return url;
}

// --- Round Logic ---
function startRound() {
  roundOrder = shuffle(clubs);
  currentIndex = 0;
  correctCount = 0;
  wrongCount = 0;
  loadQuestion();
}

function loadQuestion() {
  var club = roundOrder[currentIndex];

  // Progress
  roundProgress.textContent = 'Frage ' + (currentIndex + 1) + ' von ' + roundOrder.length;

  // Play video via YouTube API — player is already initialized
  var videoId = extractVideoId(club.YoutubeURL || club.YoutubeID);
  var startTime = parseInt(club.StartTime, 10) || 0;
  var endTime = parseInt(club.EndTime, 10) || 0;

  playBtn.hidden = true;
  ytPlayer.loadVideoById({
    videoId: videoId,
    startSeconds: startTime,
    endSeconds: endTime,
  });
  ytPlayer.playVideo();

  // Populate dropdown — sorted alphabetically
  var names = clubs.map(function (c) { return c.Club; }).sort();
  selectEl.innerHTML = '<option value="" disabled selected>Wähle den Verein...</option>';
  names.forEach(function (name) {
    var opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    selectEl.appendChild(opt);
  });

  // Reset UI
  selectEl.disabled = false;
  checkBtn.hidden = false;
  checkBtn.disabled = false;
  feedbackEl.hidden = true;
  feedbackText.className = '';
}

// --- Check Answer ---
function checkAnswer() {
  var selected = selectEl.value;

  if (!selected) {
    feedbackText.textContent = 'Bitte wähle einen Verein aus!';
    feedbackText.className = 'feedback-wrong';
    feedbackEl.hidden = false;
    return;
  }

  var club = roundOrder[currentIndex];

  // Lock controls
  selectEl.disabled = true;
  checkBtn.hidden = true;

  if (selected === club.Club) {
    // Correct
    correctCount++;
    overlayEl.classList.add('visible');
    setTimeout(function () {
      overlayEl.classList.remove('visible');
    }, 1600);
    feedbackText.textContent = 'TOR! Richtig!';
    feedbackText.className = 'feedback-correct';
  } else {
    // Wrong
    wrongCount++;
    var msg = club.ErrorMessage || 'Leider falsch! Versuch es nochmal.';
    feedbackText.textContent = msg;
    feedbackText.className = 'feedback-wrong';
  }

  feedbackEl.hidden = false;

  // Auto-advance after delay
  setTimeout(function () {
    if (currentIndex < roundOrder.length - 1) {
      currentIndex++;
      loadQuestion();
    } else {
      showResults();
    }
  }, 2000);
}

// --- Results ---
function showResults() {
  quizRound.hidden = true;
  resultsEl.hidden = false;
  resultsCorrect.textContent = 'Richtig: ' + correctCount;
  resultsWrong.textContent = 'Falsch: ' + wrongCount;
  resultsTotal.textContent = 'Gesamt: ' + clubs.length + ' Torhymnen';

  // Stop playback
  if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
    ytPlayer.stopVideo();
  }
}
