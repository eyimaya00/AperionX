const express = require('express');
const { Server } = require('socket.io');
const path = require('path');
const QRCode = require('qrcode');
const os = require('os');
const fs = require('fs');

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

function hashColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const palette = ['#6366F1', '#8B5CF6', '#818CF8', '#A855F7', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#14B8A6', '#F97316'];
  return palette[Math.abs(h) % palette.length];
}

const game = {
  status: 'lobby',
  players: new Map(),
  questions: [],
  currentQuestionIndex: -1,
  timeLimit: 20,
  timeRemaining: 0,
  timerInterval: null,
  questionStartTime: null,
  currentAnswers: new Map()
};

try {
  game.questions = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'questions.json'), 'utf8'));
  console.log(`[YARISMA] ${game.questions.length} soru yuklendi.`);
} catch (e) {
  console.log('[YARISMA] Soru dosyasi bulunamadi, bos baslatiliyor.');
}

function broadcastState() {
  return {
    status: game.status,
    playerCount: game.players.size,
    currentQuestionIndex: game.currentQuestionIndex,
    totalQuestions: game.questions.length,
    timeRemaining: game.timeRemaining,
    timeLimit: game.timeLimit,
    answeredCount: game.currentAnswers.size
  };
}

function registerYarismaRoutes(app) {
  const staticOpts = { dotfiles: 'allow' };
  app.use('/yarisma/assets', express.static(path.join(__dirname, 'public', 'assets'), staticOpts));
  app.use('/yarisma/css', express.static(path.join(__dirname, 'public', 'css'), staticOpts));
  app.use('/yarisma/js', express.static(path.join(__dirname, 'public', 'js'), staticOpts));

  app.get('/yarisma', (req, res) => res.sendFile(path.join(__dirname, 'public', 'display.html'), staticOpts));
  app.get('/yar%C4%B1sma', (req, res) => res.redirect('/yarisma'));
  app.get('/yarisma/katil', (req, res) => res.sendFile(path.join(__dirname, 'public', 'player.html'), staticOpts));
  app.get('/yarisma/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html'), staticOpts));

  app.get('/yarisma/api/qrcode', async (req, res) => {
    try {
      const host = req.get('host') || '';
      const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      let url;
      if (host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
        url = `${proto}://${host}/yarisma/katil`;
      } else {
        const port = host.includes(':') ? host.split(':')[1] : (process.env.PORT || 3000);
        url = `http://${getLocalIP()}:${port}/yarisma/katil`;
      }
      const qr = await QRCode.toDataURL(url, {
        width: 400, margin: 2,
        color: { dark: '#818CF8', light: '#00000000' }
      });
      res.json({ qr, url });
    } catch (e) {
      res.status(500).json({ error: 'QR olusturulamadi' });
    }
  });

  app.get('/yarisma/api/state', (req, res) => res.json(broadcastState()));
  app.get('/yarisma/api/questions', (req, res) => res.json(game.questions));
  app.post('/yarisma/api/questions', (req, res) => {
    game.questions = req.body;
    res.json({ success: true, count: game.questions.length });
  });
}

function attachYarisma(app, server) {
  const io = new Server(server, { path: '/yarisma/socket.io' });

  function getPlayersArray() {
    return Array.from(game.players.values())
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }

  function calculatePoints(timeElapsed, streak) {
    const base = 1000;
    const speed = Math.max(0, Math.floor(500 * (1 - timeElapsed / game.timeLimit)));
    const streakBonus = Math.min(streak * 200, 1000);
    return base + speed + streakBonus;
  }

  function getAnswerStats() {
    const stats = [0, 0, 0, 0];
    game.currentAnswers.forEach(a => { if (a.answer >= 0 && a.answer <= 3) stats[a.answer]++; });
    return stats;
  }

  function stopTimer() {
    if (game.timerInterval) { clearInterval(game.timerInterval); game.timerInterval = null; }
  }

  function revealAnswer() {
    stopTimer();
    game.status = 'revealing';
    const q = game.questions[game.currentQuestionIndex];
    if (!q) return;

    const correct = q.correctAnswer;
    const stats = getAnswerStats();
    const playerResults = [];

    game.players.forEach((player, sid) => {
      const ans = game.currentAnswers.get(sid);
      let isCorrect = false, points = 0;

      if (ans) {
        isCorrect = ans.answer === correct;
        if (isCorrect) {
          player.streak++;
          points = calculatePoints(ans.timeElapsed, player.streak);
          player.score += points;
        } else {
          player.streak = 0;
        }
        player.answers.push({ qi: game.currentQuestionIndex, answer: ans.answer, correct: isCorrect, points, time: ans.timeElapsed });
      } else {
        player.streak = 0;
        player.answers.push({ qi: game.currentQuestionIndex, answer: -1, correct: false, points: 0, time: game.timeLimit });
      }

      playerResults.push({ id: sid, name: player.name, correct: isCorrect, points, totalScore: player.score, streak: player.streak, answer: ans ? ans.answer : -1 });
    });

    playerResults.sort((a, b) => b.totalScore - a.totalScore);
    playerResults.forEach((p, i) => p.rank = i + 1);

    playerResults.forEach(r => {
      const s = io.sockets.sockets.get(r.id);
      if (s) s.emit('answer:result', { correct: r.correct, points: r.points, totalScore: r.totalScore, rank: r.rank, streak: r.streak, correctAnswer: correct, totalPlayers: game.players.size });
    });

    io.emit('question:reveal', {
      correctAnswer: correct,
      stats,
      totalAnswered: game.currentAnswers.size,
      totalPlayers: game.players.size,
      topPlayers: playerResults.slice(0, 5).map(p => ({ name: p.name, points: p.points, totalScore: p.totalScore, correct: p.correct }))
    });

    io.emit('state:update', broadcastState());
    io.to('admin').emit('player:list', getPlayersArray());
  }

  function startTimer() {
    game.timeRemaining = game.timeLimit;
    game.questionStartTime = Date.now();
    stopTimer();
    game.timerInterval = setInterval(() => {
      game.timeRemaining--;
      io.emit('timer:tick', { timeRemaining: game.timeRemaining, timeLimit: game.timeLimit });
      if (game.timeRemaining <= 0) {
        stopTimer();
        revealAnswer();
      }
    }, 1000);
  }

  io.on('connection', (socket) => {
    socket.emit('state:update', broadcastState());

    socket.on('display:join', () => {
      socket.join('display');
      socket.emit('player:list', getPlayersArray());
    });

    socket.on('admin:join', () => {
      socket.join('admin');
      socket.emit('player:list', getPlayersArray());
      socket.emit('questions:list', game.questions);
    });

    socket.on('player:join', (data, cb) => {
      if (!data || !data.name || !data.name.trim()) return cb && cb({ success: false, error: 'Isim gerekli' });
      if (game.status === 'finished') return cb && cb({ success: false, error: 'Yarisma sona erdi' });

      const name = data.name.trim().substring(0, 20);
      for (const [id, p] of game.players) {
        if (p.name.toLowerCase() === name.toLowerCase() && id !== socket.id)
          return cb && cb({ success: false, error: 'Bu isim kullaniliyor' });
      }

      const player = { id: socket.id, name, score: 0, streak: 0, answers: [], color: hashColor(name), joinedAt: Date.now() };
      game.players.set(socket.id, player);
      socket.join('players');
      if (cb) cb({ success: true, player });

      io.emit('player:joined', { name: player.name, color: player.color, playerCount: game.players.size });
      io.to('admin').emit('player:list', getPlayersArray());
    });

    socket.on('player:answer', (data) => {
      if (game.status !== 'question' || !game.players.has(socket.id) || game.currentAnswers.has(socket.id)) return;
      const answer = parseInt(data.answer);
      if (isNaN(answer) || answer < 0 || answer > 3) return;

      const timeElapsed = Math.min((Date.now() - game.questionStartTime) / 1000, game.timeLimit);
      game.currentAnswers.set(socket.id, { answer, timeElapsed });
      socket.emit('answer:accepted', { answer });
      io.emit('answer:count', { answered: game.currentAnswers.size, total: game.players.size });

      if (game.currentAnswers.size >= game.players.size) {
        setTimeout(() => { if (game.status === 'question') revealAnswer(); }, 500);
      }
    });

    socket.on('admin:start', () => {
      if (!game.questions.length) return socket.emit('admin:error', { message: 'Soru yok! Lutfen soru ekleyin.' });
      if (!game.players.size) return socket.emit('admin:error', { message: 'Oyuncu yok! En az bir oyuncu gerekli.' });

      game.currentQuestionIndex = 0;
      game.currentAnswers = new Map();
      game.status = 'question';

      const q = game.questions[0];
      io.emit('question:show', { index: 0, question: q.question, options: q.options, category: q.category || '', difficulty: q.difficulty || 'Orta', timeLimit: game.timeLimit, totalQuestions: game.questions.length });
      io.emit('state:update', broadcastState());
      startTimer();
    });

    socket.on('admin:next', () => {
      stopTimer();
      game.currentQuestionIndex++;
      if (game.currentQuestionIndex >= game.questions.length) {
        game.status = 'finished';
        io.emit('game:ended', { rankings: getPlayersArray() });
        io.emit('state:update', broadcastState());
        return;
      }
      game.status = 'question';
      game.currentAnswers = new Map();
      const q = game.questions[game.currentQuestionIndex];
      io.emit('question:show', { index: game.currentQuestionIndex, question: q.question, options: q.options, category: q.category || '', difficulty: q.difficulty || 'Orta', timeLimit: game.timeLimit, totalQuestions: game.questions.length });
      io.emit('state:update', broadcastState());
      startTimer();
    });

    socket.on('admin:reveal', () => { if (game.status === 'question') revealAnswer(); });

    socket.on('admin:leaderboard', () => {
      game.status = 'leaderboard';
      io.emit('leaderboard:show', { rankings: getPlayersArray() });
      io.emit('state:update', broadcastState());
    });

    socket.on('admin:end', () => {
      stopTimer();
      game.status = 'finished';
      io.emit('game:ended', { rankings: getPlayersArray() });
      io.emit('state:update', broadcastState());
    });

    socket.on('admin:reset', () => {
      stopTimer();
      game.status = 'lobby';
      game.currentQuestionIndex = -1;
      game.currentAnswers = new Map();
      game.players.forEach(p => { p.score = 0; p.streak = 0; p.answers = []; });
      io.emit('game:reset');
      io.emit('state:update', broadcastState());
      io.to('admin').emit('player:list', getPlayersArray());
    });

    socket.on('admin:set-time', (data) => {
      const s = parseInt(data.seconds);
      if (!isNaN(s) && s >= 5 && s <= 60) {
        game.timeLimit = s;
        io.to('admin').emit('settings:updated', { timeLimit: game.timeLimit });
      }
    });

    socket.on('admin:add-question', (data) => {
      if (data.question && data.options && data.options.length === 4 && data.correctAnswer !== undefined) {
        game.questions.push(data);
        io.to('admin').emit('questions:list', game.questions);
        io.emit('state:update', broadcastState());
      }
    });

    socket.on('admin:remove-question', (data) => {
      const idx = parseInt(data.index);
      if (!isNaN(idx) && idx >= 0 && idx < game.questions.length) {
        game.questions.splice(idx, 1);
        io.to('admin').emit('questions:list', game.questions);
        io.emit('state:update', broadcastState());
      }
    });

    socket.on('admin:kick-player', (data) => {
      if (game.players.has(data.playerId)) {
        game.players.delete(data.playerId);
        game.currentAnswers.delete(data.playerId);
        const ts = io.sockets.sockets.get(data.playerId);
        if (ts) { ts.emit('kicked'); ts.disconnect(); }
        io.emit('player:left', { playerCount: game.players.size });
        io.to('admin').emit('player:list', getPlayersArray());
      }
    });

    socket.on('disconnect', () => {
      if (game.players.has(socket.id)) {
        const p = game.players.get(socket.id);
        game.players.delete(socket.id);
        game.currentAnswers.delete(socket.id);
        io.emit('player:left', { name: p.name, playerCount: game.players.size });
        io.to('admin').emit('player:list', getPlayersArray());
      }
    });
  });
}

module.exports = { registerYarismaRoutes, attachYarisma };
