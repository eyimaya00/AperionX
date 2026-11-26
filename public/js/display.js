document.addEventListener('DOMContentLoaded', () => {
  const socket = io({ path: '/yarisma/socket.io' });
  let currentTimeLimit = 20;

  const screens = {
    lobby: document.getElementById('screen-lobby'),
    game: document.getElementById('screen-game'),
    leaderboard: document.getElementById('screen-leaderboard'),
    finished: document.getElementById('screen-finished')
  };

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) screens[name].classList.add('active');
  }

  // ─── Init ─────────────────────────────────
  socket.emit('display:join');
  loadQR();
  initParticles();

  async function loadQR() {
    try {
      const res = await fetch('/yarisma/api/qrcode');
      const data = await res.json();
      document.getElementById('qr-code').innerHTML = '<img src="' + data.qr + '" alt="QR">';
      document.getElementById('join-url').textContent = data.url;
    } catch (e) { console.error('QR yuklenemedi', e); }
  }

  // ─── Player Count ─────────────────────────
  function setPlayerCount(n) {
    document.querySelectorAll('.player-count-display').forEach(el => {
      animateNumber(el, parseInt(el.textContent) || 0, n);
    });
  }

  function animateNumber(el, from, to) {
    const dur = 400, start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(from + (to - from) * easeOut(p));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function addAvatar(name, color) {
    const c = document.getElementById('player-avatars');
    const d = document.createElement('div');
    d.className = 'player-chip';
    d.innerHTML = '<span class="chip-dot" style="background:' + color + '"></span><span>' + escapeHtml(name) + '</span>';
    c.appendChild(d);
  }

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  // ─── Question ─────────────────────────────
  function showQuestion(data) {
    showScreen('game');
    const gameEl = document.getElementById('screen-game');
    gameEl.classList.remove('state-reveal');
    gameEl.classList.add('state-question');

    document.getElementById('q-number').textContent = data.index + 1;
    document.getElementById('q-total').textContent = data.totalQuestions;
    document.getElementById('q-category').textContent = data.category || 'Genel Kültür';
    document.getElementById('q-text').textContent = data.question;

    currentTimeLimit = data.timeLimit;
    updateTimerDisplay(data.timeLimit, data.timeLimit);

    const options = document.querySelectorAll('.option-card');
    data.options.forEach((opt, i) => {
      options[i].className = 'option-card glass-card';
      options[i].querySelector('.option-text').textContent = opt;
      document.getElementById('bar-' + i).style.width = '0%';
      document.getElementById('pct-' + i).textContent = '';
    });

    document.getElementById('answer-count').textContent = '0';
    document.getElementById('answer-total').textContent = '?';
    document.getElementById('reveal-top-players').innerHTML = '';
  }

  function updateTimerDisplay(remaining, total) {
    const text = document.getElementById('timer-text');
    const progress = document.getElementById('timer-progress');
    const circumference = 2 * Math.PI * 54;
    const container = document.getElementById('timer-container');

    text.textContent = remaining;
    const offset = circumference * (1 - remaining / total);
    progress.style.strokeDashoffset = offset;

    container.classList.remove('timer-warning', 'timer-danger');
    if (remaining <= 5) {
      progress.style.stroke = '#EF4444';
      container.classList.add('timer-danger');
    } else if (remaining <= 10) {
      progress.style.stroke = '#F59E0B';
      container.classList.add('timer-warning');
    } else {
      progress.style.stroke = '#6366F1';
    }
  }

  // ─── Reveal ───────────────────────────────
  function showReveal(data) {
    const gameEl = document.getElementById('screen-game');
    gameEl.classList.remove('state-question');
    gameEl.classList.add('state-reveal');

    const options = document.querySelectorAll('.option-card');
    const total = data.totalAnswered || 1;

    options.forEach((opt, i) => {
      const count = data.stats[i];
      const pct = Math.round((count / Math.max(total, 1)) * 100);
      document.getElementById('bar-' + i).style.width = pct + '%';
      document.getElementById('pct-' + i).textContent = count > 0 ? pct + '% (' + count + ')' : '';
      if (i === data.correctAnswer) opt.classList.add('correct');
      else opt.classList.add('wrong');
    });

    const topEl = document.getElementById('reveal-top-players');
    topEl.innerHTML = data.topPlayers.map((p, i) =>
      '<div class="reveal-player ' + (p.correct ? 'correct' : '') + '">' +
      '<span class="reveal-rank">#' + (i + 1) + '</span>' +
      '<span class="reveal-name">' + escapeHtml(p.name) + '</span>' +
      '<span class="reveal-score">' + p.totalScore.toLocaleString() + '</span>' +
      '</div>'
    ).join('');
  }

  // ─── Leaderboard ──────────────────────────
  function showLeaderboard(rankings) {
    showScreen('leaderboard');
    const podiumEl = document.getElementById('podium');
    const listEl = document.getElementById('rankings-list');

    const top3 = rankings.slice(0, 3);
    const podiumOrder = [1, 0, 2];
    const heights = ['180px', '140px', '110px'];
    const medals = ['🥇', '🥈', '🥉'];

    podiumEl.innerHTML = podiumOrder.map(i => {
      if (!top3[i]) return '';
      const p = top3[i];
      return '<div class="podium-item" style="animation-delay:' + (i * 0.2) + 's">' +
        '<div class="podium-medal">' + medals[i] + '</div>' +
        '<div class="podium-avatar" style="background:' + p.color + '">' + escapeHtml(p.name.charAt(0).toUpperCase()) + '</div>' +
        '<div class="podium-name">' + escapeHtml(p.name) + '</div>' +
        '<div class="podium-score">' + p.score.toLocaleString() + '</div>' +
        '<div class="podium-stand" style="height:' + heights[i] + '">' + (i + 1) + '</div>' +
        '</div>';
    }).join('');

    const rest = rankings.slice(3, 10);
    listEl.innerHTML = rest.map((p, i) =>
      '<div class="rank-row" style="animation-delay:' + ((i + 3) * 0.1) + 's">' +
      '<span class="rank-pos">' + p.rank + '</span>' +
      '<span class="rank-avatar" style="background:' + p.color + '">' + escapeHtml(p.name.charAt(0).toUpperCase()) + '</span>' +
      '<span class="rank-name">' + escapeHtml(p.name) + '</span>' +
      '<span class="rank-score">' + p.score.toLocaleString() + '</span>' +
      '</div>'
    ).join('');
  }

  // ─── Finished ─────────────────────────────
  function showFinished(rankings) {
    showScreen('finished');
    createConfetti();

    if (rankings.length > 0) {
      const w = rankings[0];
      document.getElementById('winner-name').textContent = w.name;
      document.getElementById('winner-score').textContent = w.score.toLocaleString() + ' puan';
      document.getElementById('winner-avatar').style.background = w.color;
      document.getElementById('winner-avatar').textContent = w.name.charAt(0).toUpperCase();
    }

    const listEl = document.getElementById('final-rankings');
    listEl.innerHTML = rankings.slice(0, 10).map((p, i) =>
      '<div class="final-rank-row" style="animation-delay:' + (i * 0.1) + 's">' +
      '<span class="rank-pos">' + p.rank + '</span>' +
      '<span class="rank-avatar" style="background:' + p.color + '">' + escapeHtml(p.name.charAt(0).toUpperCase()) + '</span>' +
      '<span class="rank-name">' + escapeHtml(p.name) + '</span>' +
      '<span class="rank-score">' + p.score.toLocaleString() + '</span>' +
      '</div>'
    ).join('');
  }

  // ─── Socket Events ────────────────────────
  socket.on('state:update', s => setPlayerCount(s.playerCount));
  socket.on('player:joined', d => { setPlayerCount(d.playerCount); addAvatar(d.name, d.color); });
  socket.on('player:left', d => setPlayerCount(d.playerCount));
  socket.on('question:show', d => showQuestion(d));
  socket.on('timer:tick', d => updateTimerDisplay(d.timeRemaining, d.timeLimit || currentTimeLimit));
  socket.on('answer:count', d => {
    document.getElementById('answer-count').textContent = d.answered;
    document.getElementById('answer-total').textContent = d.total;
  });
  socket.on('question:reveal', d => showReveal(d));
  socket.on('leaderboard:show', d => showLeaderboard(d.rankings));
  socket.on('game:ended', d => showFinished(d.rankings));
  socket.on('game:reset', () => {
    showScreen('lobby');
    loadQR();
    document.getElementById('player-avatars').innerHTML = '';
  });

  // ─── Particles ────────────────────────────
  function initParticles() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;

    function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    const pts = Array.from({ length: 50 }, () => ({
      x: Math.random() * (w || 1920), y: Math.random() * (h || 1080),
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 0.5, o: Math.random() * 0.3 + 0.08
    }));

    (function loop() {
      ctx.clearRect(0, 0, w, h);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(129,140,248,' + p.o + ')'; ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = 'rgba(99,102,241,' + (0.08 * (1 - d / 120)) + ')';
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      requestAnimationFrame(loop);
    })();
  }

  // ─── Confetti ─────────────────────────────
  function createConfetti() {
    const c = document.getElementById('confetti-container');
    if (!c) return;
    c.innerHTML = '';
    const colors = ['#6366F1', '#818CF8', '#A855F7', '#F59E0B', '#EC4899', '#10B981'];
    for (let i = 0; i < 80; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDelay = Math.random() * 3 + 's';
      p.style.animationDuration = (Math.random() * 2 + 3) + 's';
      p.style.width = (Math.random() * 8 + 4) + 'px';
      p.style.height = (Math.random() * 8 + 4) + 'px';
      c.appendChild(p);
    }
  }
});
