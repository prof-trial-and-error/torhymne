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

// --- DOM refs ---
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const gameEl = document.getElementById('game');
const startBtn = document.getElementById('start-btn');
const quizRound = document.getElementById('quiz-round');
const roundProgress = document.getElementById('round-progress');
const playerEl = document.getElementById('player');
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

// --- Init ---
document.addEventListener('DOMContentLoaded', function () {
  fetchData();

  startBtn.addEventListener('click', function () {
    startBtn.hidden = true;
    quizRound.hidden = false;
    startRound();
  });

  checkBtn.addEventListener('click', checkAnswer);

  nextRoundBtn.addEventListener('click', function () {
    resultsEl.hidden = true;
    startBtn.hidden = false;
  });
});

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
      loadingEl.hidden = true;
      gameEl.hidden = false;
    })
    .catch(function () {
      showError();
    });
}

function showError() {
  loadingEl.hidden = true;
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

  // Update YouTube iframe (soundbar mode)
  var videoId = extractVideoId(club.YoutubeURL || club.YoutubeID);
  var src = 'https://www.youtube.com/embed/' + videoId
    + '?start=' + club.StartTime
    + '&end=' + club.EndTime
    + '&autoplay=1&controls=1&rel=0';
  playerEl.src = src;

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
}
