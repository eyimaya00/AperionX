document.addEventListener('DOMContentLoaded', () => {
  const socket = io({ path: '/yarisma/socket.io' });
  let playerData = null;
  let selectedAnswer = null;

  const screens = {
    join: document.getElementById('screen-join'),
    waiting: document.getElementById('screen-waiting'),
    question: document.getElementById('screen-player-question'),
    answered: document.getElementById('screen-answered'),
    result: document.getElementById('screen-result'),
    finished: document.getElementById('screen-player-finished')
  };

  function showScreen(name) {
    Object.values(screens).forEach(s => { if (s) s.classList.remove('active'); });
    if (screens[name]) screens[name].classList.add('active');
  }

  // ─── Join ─────────────────────────────────
  document.getElementById('join-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('player-name').value.trim();
    if (!name) return;

    const btn = document.getElementById('join-btn');
    btn.disabled = true;
    btn.textContent = 'Bağlanıyor...';
    document.getElementById('join-error').textContent = '';

    socket.emit('player:join', { name }, (response) => {
      if (response && response.success) {
        playerData = response.player;
        document.getElementById('welcome-name').textContent = 'Hoş geldin, ' + playerData.name + '!';
        showScreen('waiting');
      } else {
        document.getElementById('join-error').textContent = (response && response.error) || 'Bağlantı hatası';
        btn.disabled = false;
        btn.textContent = '🚀 Katıl';
      }
    });
  });

  // ─── Answer Buttons ───────────────────────
  document.querySelectorAll('.answer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (selectedAnswer !== null) return;
      selectedAnswer = parseInt(btn.dataset.answer);
      btn.classList.add('selected');
      document.querySelectorAll('.answer-btn').forEach(b => { b.disabled = true; });
      socket.emit('player:answer', { answer: selectedAnswer });
    });
  });

  // ─── Socket Events ───────────────────────
  socket.on('question:show', (data) => {
    selectedAnswer = null;
    showScreen('question');

    document.getElementById('pq-number').textContent = 'Soru ' + (data.index + 1) + '/' + data.totalQuestions;
    document.getElementById('pq-text').textContent = data.question;
    document.getElementById('pq-category').textContent = data.category || '';

    document.querySelectorAll('.answer-btn').forEach((btn, i) => {
      btn.disabled = false;
      btn.className = 'answer-btn';
      btn.querySelector('.answer-text').textContent = data.options[i];
    });

    startPlayerTimer(data.timeLimit);
  });

  let timerInterval = null;
  function startPlayerTimer(timeLimit) {
    if (timerInterval) clearInterval(timerInterval);
    let remaining = timeLimit;
    const fill = document.getElementById('player-timer-fill');
    const text = document.getElementById('player-timer-text');

    fill.style.width = '100%';
    fill.className = 'player-timer-fill';
    text.textContent = remaining;

    timerInterval = setInterval(() => {
      remaining--;
      if (remaining < 0) remaining = 0;
      text.textContent = remaining;
      fill.style.width = (remaining / timeLimit * 100) + '%';

      fill.classList.remove('warning', 'danger');
      if (remaining <= 5) fill.classList.add('danger');
      else if (remaining <= 10) fill.classList.add('warning');

      if (remaining <= 0) clearInterval(timerInterval);
    }, 1000);
  }

  socket.on('timer:tick', (data) => {
    const fill = document.getElementById('player-timer-fill');
    const text = document.getElementById('player-timer-text');
    if (fill && text) {
      text.textContent = data.timeRemaining;
      const tl = data.timeLimit || 20;
      fill.style.width = (data.timeRemaining / tl * 100) + '%';
      fill.classList.remove('warning', 'danger');
      if (data.timeRemaining <= 5) fill.classList.add('danger');
      else if (data.timeRemaining <= 10) fill.classList.add('warning');
    }
  });

  socket.on('answer:accepted', () => {
    showScreen('answered');
  });

  socket.on('answer:result', (data) => {
    if (timerInterval) clearInterval(timerInterval);
    showScreen('result');

    const icon = document.getElementById('result-icon');
    const text = document.getElementById('result-text');
    const pointsEl = document.getElementById('result-points');
    const totalEl = document.getElementById('result-total');
    const rankEl = document.getElementById('result-rank');
    const streakEl = document.getElementById('result-streak');

    if (data.correct) {
      icon.textContent = '✓';
      icon.className = 'result-icon correct';
      text.textContent = 'Doğru!';
      text.className = 'result-heading correct';
      pointsEl.textContent = '+' + data.points;
      if (navigator.vibrate) navigator.vibrate(100);
    } else {
      icon.textContent = '✗';
      icon.className = 'result-icon wrong';
      text.textContent = 'Yanlış!';
      text.className = 'result-heading wrong';
      pointsEl.textContent = '0';
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    }

    totalEl.textContent = data.totalScore.toLocaleString();
    rankEl.textContent = '#' + data.rank;
    streakEl.textContent = data.streak > 0 ? data.streak + 'x 🔥' : '-';
  });

  socket.on('game:ended', (data) => {
    if (timerInterval) clearInterval(timerInterval);
    showScreen('finished');
    if (playerData && data.rankings) {
      const me = data.rankings.find(p => p.id === socket.id);
      if (me) {
        document.getElementById('final-rank').textContent = '#' + me.rank;
        document.getElementById('final-score').textContent = me.score.toLocaleString();
        document.getElementById('final-total-players').textContent = '/ ' + data.rankings.length + ' kişi';
      }
    }
  });

  socket.on('game:reset', () => {
    if (timerInterval) clearInterval(timerInterval);
    selectedAnswer = null;
    if (playerData) showScreen('waiting');
    else showScreen('join');
  });

  socket.on('kicked', () => {
    if (timerInterval) clearInterval(timerInterval);
    playerData = null;
    selectedAnswer = null;
    showScreen('join');
    document.getElementById('join-error').textContent = 'Yarışmadan çıkarıldınız';
    document.getElementById('join-btn').disabled = false;
    document.getElementById('join-btn').textContent = '🚀 Katıl';
  });

  socket.on('state:update', (state) => {
    if (!playerData) return;
    if (state.status === 'lobby') showScreen('waiting');
  });

  socket.on('disconnect', () => {
    if (timerInterval) clearInterval(timerInterval);
  });

  socket.on('connect', () => {
    if (playerData) {
      socket.emit('player:join', { name: playerData.name }, (response) => {
        if (response && response.success) {
          playerData = response.player;
          showScreen('waiting');
        }
      });
    }
  });
});
