/**
 * Ceyda ❤️ Yasin - Yüksek Performanslı Parçacık & Ses Motoru (Ultra Smooth 60-120 FPS)
 * Donanım Hızlandırmalı Sprite Önbelleği (Sıfır Donma)
 */

(function () {
  'use strict';

  const canvas = document.getElementById('dream-canvas');
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // 1. Çilek Sprite Önbelleği
  const strawberryCanvas = document.createElement('canvas');
  strawberryCanvas.width = 64;
  strawberryCanvas.height = 64;
  const sctx = strawberryCanvas.getContext('2d');
  sctx.font = '40px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText('🍓', 32, 32);

  // 2. Renk Paletleri
  const HEART_COLORS = [
    '#ffb6c1',
    '#ffc0cb',
    '#ff69b4',
    '#f8bbd0',
    '#e1bee7',
    '#ffd6e0'
  ];

  const STAR_COLORS = [
    '#ffffff',
    '#fff4d6',
    '#e6f0ff',
    '#ffdaeb'
  ];

  const hearts = [];
  const stars = [];
  const sparkles = [];
  const strawberries = [];

  const MAX_HEARTS = 35;
  const MAX_STARS = 60;

  const random = (min, max) => Math.random() * (max - min) + min;
  const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Kalp Sınıfı
  class FloatingHeart {
    constructor(isBurst = false, burstX, burstY) {
      this.reset(isBurst, burstX, burstY);
    }

    reset(isBurst = false, burstX, burstY) {
      this.size = random(8, 24);
      this.color = randomChoice(HEART_COLORS);
      this.alpha = random(0.3, 0.75);
      this.maxAlpha = this.alpha;

      if (isBurst) {
        this.x = burstX;
        this.y = burstY;
        const angle = random(0, Math.PI * 2);
        const speed = random(2, 6);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - random(1.5, 3.5);
        this.isBurst = true;
        this.life = 1;
        this.decay = random(0.012, 0.022);
      } else {
        this.x = random(0, width);
        this.y = height + random(10, 80);
        this.vx = 0;
        this.speedY = random(0.7, 1.8);
        this.swaySpeed = random(0.015, 0.03);
        this.swayAmplitude = random(1.2, 3);
        this.swayOffset = random(0, Math.PI * 2);
        this.isBurst = false;
      }

      this.rotation = random(-0.5, 0.5);
      this.rotationSpeed = random(-0.012, 0.012);
      this.scale = random(0.75, 1.25);
    }

    update() {
      if (this.isBurst) {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.96;
        this.vy *= 0.96;
        this.vy -= 0.03;
        this.rotation += this.rotationSpeed;
        this.life -= this.decay;
        this.alpha = this.maxAlpha * this.life;
        return this.life > 0;
      } else {
        this.y -= this.speedY;
        this.swayOffset += this.swaySpeed;
        this.x += Math.sin(this.swayOffset) * this.swayAmplitude * 0.4;
        this.rotation += this.rotationSpeed;

        if (this.y < -40) {
          this.reset(false);
        }
        return true;
      }
    }

    draw() {
      if (this.alpha <= 0.01) return;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.scale(this.scale, this.scale);
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;

      const s = this.size;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.3);
      ctx.bezierCurveTo(-s * 0.5, -s * 0.3, -s, s * 0.1, 0, s);
      ctx.bezierCurveTo(s, s * 0.1, s * 0.5, -s * 0.3, 0, s * 0.3);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = this.alpha * 0.45;
      ctx.beginPath();
      ctx.arc(-s * 0.25, 0, s * 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // Çilek Sınıfı
  class BurstStrawberry {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      const angle = random(0, Math.PI * 2);
      const speed = random(2.5, 6.5);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - random(1.5, 3.5);
      this.rotation = random(-0.5, 0.5);
      this.rotationSpeed = random(-0.035, 0.035);
      this.life = 1;
      this.decay = random(0.014, 0.024);
      this.scale = random(0.55, 0.95);
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.96;
      this.vy *= 0.96;
      this.vy += 0.04;
      this.rotation += this.rotationSpeed;
      this.life -= this.decay;
      return this.life > 0;
    }

    draw() {
      if (this.life <= 0.01) return;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      const s = this.scale * this.life;
      ctx.scale(s, s);
      ctx.globalAlpha = Math.min(1, this.life * 1.25);
      ctx.drawImage(strawberryCanvas, -32, -32, 64, 64);
      ctx.restore();
    }
  }

  // Yıldız Sınıfı
  class FloatingStar {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = random(0, width);
      this.y = random(0, height);
      this.speedY = random(0.2, 0.75);
      this.color = randomChoice(STAR_COLORS);
      this.size = random(2, 5.5);
      this.points = randomChoice([4, 5]);
      this.alpha = random(0.3, 0.9);
      this.pulseSpeed = random(0.02, 0.05);
      this.pulseOffset = random(0, Math.PI * 2);
      this.rotation = random(0, Math.PI);
      this.rotSpeed = random(-0.008, 0.008);
    }

    update() {
      this.y -= this.speedY;
      this.pulseOffset += this.pulseSpeed;
      this.rotation += this.rotSpeed;
      this.currentAlpha = (Math.sin(this.pulseOffset) * 0.5 + 0.5) * this.alpha + 0.15;

      if (this.y < -15) {
        this.y = height + 15;
        this.x = random(0, width);
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = this.currentAlpha;
      ctx.fillStyle = this.color;

      const spikes = this.points;
      const outer = this.size;
      const inner = this.size * 0.35;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(0, -outer);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
        rot += step;
        ctx.lineTo(Math.cos(rot) * inner, Math.sin(rot) * inner);
        rot += step;
      }
      ctx.lineTo(0, -outer);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  // Işıltı Tozu
  class SparkleParticle {
    constructor(x, y) {
      this.x = x + random(-4, 4);
      this.y = y + random(-4, 4);
      this.vx = random(-1.2, 1.2);
      this.vy = random(-1.5, 0.6);
      this.size = random(1.5, 3.5);
      this.color = randomChoice(STAR_COLORS);
      this.life = 1;
      this.decay = random(0.025, 0.05);
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;
      return this.life > 0;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.life;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < MAX_HEARTS; i++) {
    const heart = new FloatingHeart();
    heart.y = random(0, height);
    hearts.push(heart);
  }

  for (let i = 0; i < MAX_STARS; i++) {
    stars.push(new FloatingStar());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < stars.length; i++) {
      stars[i].update();
      stars[i].draw();
    }

    for (let i = hearts.length - 1; i >= 0; i--) {
      const heart = hearts[i];
      if (heart.update()) {
        heart.draw();
      } else if (heart.isBurst) {
        hearts.splice(i, 1);
      }
    }

    for (let i = strawberries.length - 1; i >= 0; i--) {
      const strawberry = strawberries[i];
      if (strawberry.update()) {
        strawberry.draw();
      } else {
        strawberries.splice(i, 1);
      }
    }

    for (let i = sparkles.length - 1; i >= 0; i--) {
      const sparkle = sparkles[i];
      if (sparkle.update()) {
        sparkle.draw();
      } else {
        sparkles.splice(i, 1);
      }
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

  // Tıklama Olayı (Donma Önleyici Debounce)
  let lastClickTime = 0;
  function createHeartAndStrawberryBurst(x, y) {
    const now = performance.now();
    if (now - lastClickTime < 60) return;
    lastClickTime = now;

    for (let i = 0; i < 10; i++) {
      hearts.push(new FloatingHeart(true, x, y));
    }
    for (let i = 0; i < 3; i++) {
      strawberries.push(new BurstStrawberry(x, y));
    }
    for (let i = 0; i < 12; i++) {
      sparkles.push(new SparkleParticle(x, y));
    }
  }

  window.addEventListener('pointerdown', (e) => {
    createHeartAndStrawberryBurst(e.clientX, e.clientY);
    startMelody();
    playSoftNote();
  });

  let lastMove = 0;
  window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - lastMove > 40) {
      sparkles.push(new SparkleParticle(e.clientX, e.clientY));
      lastMove = now;
    }
  });

  // Web Audio API
  let audioCtx = null;
  let isAudioPlaying = false;
  let melodyInterval = null;

  const NOTES = [277.18, 329.63, 369.99, 440.00, 493.88, 554.37, 659.25, 739.99, 880.00];

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSoftNote(freq) {
    if (!audioCtx || audioCtx.state !== 'running') return;

    try {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      const noteFreq = freq || randomChoice(NOTES);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(noteFreq, audioCtx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, audioCtx.currentTime);

      const now = audioCtx.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.07, now + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 3.0);
    } catch (err) {}
  }

  function startMelody() {
    initAudio();
    if (!isAudioPlaying) {
      isAudioPlaying = true;
      playSoftNote();
      melodyInterval = setInterval(() => {
        if (!isAudioPlaying) return;
        playSoftNote();
        if (Math.random() > 0.4) {
          setTimeout(() => playSoftNote(), 300);
        }
      }, 1600);
    }
  }

  const autoStartEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
  function autoStartAudio() {
    startMelody();
    autoStartEvents.forEach(evt => window.removeEventListener(evt, autoStartAudio));
  }
  autoStartEvents.forEach(evt => window.addEventListener(evt, autoStartAudio, { once: true }));

  try {
    startMelody();
  } catch(e) {}

})();
