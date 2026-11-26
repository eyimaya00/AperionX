document.addEventListener('DOMContentLoaded', () => {
  const socket = io({ path: '/yarisma/socket.io' });
  socket.emit('admin:join');

  const statusBadge = document.getElementById('game-status');
  const playerCountEl = document.getElementById('admin-player-count');
  const statPlayers = document.getElementById('stat-players');
  const statQuestion = document.getElementById('stat-question');
  const statAnswers = document.getElementById('stat-answers');

  const btnStart = document.getElementById('btn-start');
  const btnNext = document.getElementById('btn-next');
  const btnReveal = document.getElementById('btn-reveal');
  const btnLeaderboard = document.getElementById('btn-leaderboard');
  const btnEnd = document.getElementById('btn-end');
  const btnReset = document.getElementById('btn-reset');

  // ─── Controls ─────────────────────────────
  btnStart.onclick = () => socket.emit('admin:start');
  btnNext.onclick = () => socket.emit('admin:next');
  btnReveal.onclick = () => socket.emit('admin:reveal');
  btnLeaderboard.onclick = () => socket.emit('admin:leaderboard');
  btnEnd.onclick = () => { if (confirm('Yarışmayı bitirmek istediğinize emin misiniz?')) socket.emit('admin:end'); };
  btnReset.onclick = () => { if (confirm('Yarışmayı sıfırlamak istediğinize emin misiniz?')) socket.emit('admin:reset'); };

  // ─── Timer ────────────────────────────────
  const timeSlider = document.getElementById('time-slider');
  const timeValue = document.getElementById('time-value');
  timeSlider.oninput = () => { timeValue.textContent = timeSlider.value + ' saniye'; };
  timeSlider.onchange = () => { socket.emit('admin:set-time', { seconds: parseInt(timeSlider.value) }); };

  // ─── Add Question ─────────────────────────
  document.getElementById('btn-add-question').onclick = () => {
    const q = {
      question: document.getElementById('new-q-text').value.trim(),
      options: [
        document.getElementById('new-q-opt0').value.trim(),
        document.getElementById('new-q-opt1').value.trim(),
        document.getElementById('new-q-opt2').value.trim(),
        document.getElementById('new-q-opt3').value.trim()
      ],
      correctAnswer: parseInt(document.getElementById('new-q-correct').value),
      category: document.getElementById('new-q-category').value.trim() || 'Genel',
      difficulty: 'Orta'
    };

    if (!q.question || q.options.some(o => !o)) {
      alert('Tüm alanları doldurun!');
      return;
    }

    socket.emit('admin:add-question', q);
    document.getElementById('new-q-text').value = '';
    document.getElementById('new-q-opt0').value = '';
    document.getElementById('new-q-opt1').value = '';
    document.getElementById('new-q-opt2').value = '';
    document.getElementById('new-q-opt3').value = '';
    document.getElementById('new-q-category').value = '';
  };

  // ─── State Update ─────────────────────────
  socket.on('state:update', (state) => {
    const statusMap = { lobby: 'LOBİ', question: 'SORU', revealing: 'CEVAP', leaderboard: 'SIRALAMA', finished: 'BİTTİ' };
    const statusColors = { lobby: '#6366F1', question: '#10B981', revealing: '#F59E0B', leaderboard: '#A855F7', finished: '#EF4444' };

    statusBadge.textContent = statusMap[state.status] || state.status;
    statusBadge.style.background = statusColors[state.status] || '#666';

    statPlayers.textContent = state.playerCount;
    playerCountEl.textContent = state.playerCount + ' Oyuncu';

    if (state.currentQuestionIndex >= 0) {
      statQuestion.textContent = (state.currentQuestionIndex + 1) + '/' + state.totalQuestions;
    } else {
      statQuestion.textContent = '-';
    }

    statAnswers.textContent = (state.answeredCount || 0) + '/' + state.playerCount;
    updateButtons(state.status);
  });

  function updateButtons(status) {
    btnStart.disabled = status !== 'lobby';
    btnNext.disabled = !['revealing', 'leaderboard'].includes(status);
    btnReveal.disabled = status !== 'question';
    btnLeaderboard.disabled = !['revealing', 'question', 'leaderboard'].includes(status);
    btnEnd.disabled = !['question', 'revealing', 'leaderboard'].includes(status);
    btnReset.disabled = false;
  }

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  // ─── Player List ──────────────────────────
  socket.on('player:list', (players) => {
    const tbody = document.getElementById('player-tbody');
    tbody.innerHTML = players.map(p =>
      '<tr>' +
      '<td>' + p.rank + '</td>' +
      '<td><span class="admin-player-dot" style="background:' + p.color + '"></span>' + escapeHtml(p.name) + '</td>' +
      '<td>' + p.score.toLocaleString() + '</td>' +
      '<td>' + (p.streak > 0 ? p.streak + 'x 🔥' : '-') + '</td>' +
      '<td><button class="btn btn-sm btn-danger" data-kick="' + p.id + '">Çıkar</button></td>' +
      '</tr>'
    ).join('');

    tbody.querySelectorAll('[data-kick]').forEach(btn => {
      btn.onclick = () => {
        if (confirm('Bu oyuncuyu çıkarmak istediğinize emin misiniz?')) {
          socket.emit('admin:kick-player', { playerId: btn.dataset.kick });
        }
      };
    });
  });

  // ─── Question List ────────────────────────
  socket.on('questions:list', (questions) => {
    document.getElementById('question-count').textContent = questions.length;
    const list = document.getElementById('question-list');
    const letters = ['A', 'B', 'C', 'D'];
    list.innerHTML = questions.map((q, i) =>
      '<div class="question-item glass-card">' +
      '<div class="qi-header">' +
      '<span class="qi-number">' + (i + 1) + '</span>' +
      '<span class="qi-category">' + escapeHtml(q.category || 'Genel') + '</span>' +
      '<button class="btn btn-sm btn-danger" data-remove="' + i + '">Sil</button>' +
      '</div>' +
      '<p class="qi-text">' + escapeHtml(q.question) + '</p>' +
      '<div class="qi-options">' +
      q.options.map((o, j) =>
        '<span class="qi-opt ' + (j === q.correctAnswer ? 'correct' : '') + '">' +
        letters[j] + ') ' + escapeHtml(o) + '</span>'
      ).join('') +
      '</div>' +
      '</div>'
    ).join('');

    list.querySelectorAll('[data-remove]').forEach(btn => {
      btn.onclick = () => {
        if (confirm('Bu soruyu silmek istediğinize emin misiniz?')) {
          socket.emit('admin:remove-question', { index: parseInt(btn.dataset.remove) });
        }
      };
    });
  });

  // ─── Other Events ─────────────────────────
  socket.on('admin:error', (data) => { alert(data.message); });

  socket.on('settings:updated', (data) => {
    timeSlider.value = data.timeLimit;
    timeValue.textContent = data.timeLimit + ' saniye';
  });

  socket.on('answer:count', (data) => {
    statAnswers.textContent = data.answered + '/' + data.total;
  });
});
