/**
 * Ceyda ❤️ Yasin - Yüksek Performanslı Parçacık & Ses Motoru (Ultra Smooth 60-120 FPS)
 * Tüm Telefonlarda (iOS & Android) %100 Çalan Gerçek Medya Oynatıcı 🍓💖🎵
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

  // 1. Çilek Sprite Önbelleği (Büyük & Net)
  const strawberryCanvas = document.createElement('canvas');
  strawberryCanvas.width = 80;
  strawberryCanvas.height = 80;
  const sctx = strawberryCanvas.getContext('2d');
  sctx.font = '52px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText('🍓', 40, 40);

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

  // ==========================================================================
  // Kalp Sınıfı (Uzun Ömürlü ve Zarifçe Yükselen Kalpler)
  // ==========================================================================
  class FloatingHeart {
    constructor(isBurst = false, burstX, burstY) {
      this.reset(isBurst, burstX, burstY);
    }

    reset(isBurst = false, burstX, burstY) {
      this.size = random(10, 26);
      this.color = randomChoice(HEART_COLORS);
      this.alpha = random(0.35, 0.85);
      this.maxAlpha = this.alpha;

      if (isBurst) {
        this.x = burstX;
        this.y = burstY;
        const angle = random(0, Math.PI * 2);
        const speed = random(1.8, 5.0);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - random(1.5, 3.5);
        this.isBurst = true;
        this.life = 1;
        this.decay = random(0.004, 0.007);
        this.swayOffset = random(0, Math.PI * 2);
        this.swaySpeed = random(0.02, 0.04);
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
      this.rotationSpeed = random(-0.014, 0.014);
      this.scale = random(0.8, 1.3);
    }

    update() {
      if (this.isBurst) {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.97;
        this.vy *= 0.97;
        this.vy -= 0.025;
        this.swayOffset += this.swaySpeed;
        this.x += Math.sin(this.swayOffset) * 0.45;
        this.rotation += this.rotationSpeed;
        this.life -= this.decay;
        this.alpha = this.maxAlpha * Math.min(1, this.life * 1.3);
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

  // ==========================================================================
  // Çilek Sınıfı (Uzun Süre Yavaşça Yükselen Tatlı Çilekler 🍓)
  // ==========================================================================
  class BurstStrawberry {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      const angle = random(0, Math.PI * 2);
      const speed = random(1.8, 5.2);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - random(1.5, 4.0);
      this.rotation = random(-0.5, 0.5);
      this.rotationSpeed = random(-0.025, 0.025);
      this.life = 1;
      this.decay = random(0.0035, 0.0065);
      this.scale = random(0.75, 1.15);
      this.swayOffset = random(0, Math.PI * 2);
      this.swaySpeed = random(0.02, 0.045);
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.97;
      this.vy *= 0.97;
      this.vy -= 0.022;
      this.swayOffset += this.swaySpeed;
      this.x += Math.sin(this.swayOffset) * 0.6;
      this.rotation += this.rotationSpeed;
      this.life -= this.decay;
      return this.life > 0;
    }

    draw() {
      if (this.life <= 0.01) return;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      const currentScale = this.scale * Math.min(1, this.life * 1.5);
      ctx.scale(currentScale, currentScale);
      ctx.globalAlpha = Math.min(1, this.life * 1.4);
      ctx.drawImage(strawberryCanvas, -40, -40, 80, 80);
      ctx.restore();
    }
  }

  // ==========================================================================
  // Yıldız Sınıfı
  // ==========================================================================
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

  // ==========================================================================
  // Işıltı Tozu
  // ==========================================================================
  class SparkleParticle {
    constructor(x, y) {
      this.x = x + random(-6, 6);
      this.y = y + random(-6, 6);
      this.vx = random(-1.2, 1.2);
      this.vy = random(-1.6, 0.6);
      this.size = random(1.5, 4.0);
      this.color = randomChoice(STAR_COLORS);
      this.life = 1;
      this.decay = random(0.009, 0.018);
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy -= 0.015;
      this.life -= this.decay;
      return this.life > 0;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.life * 1.2);
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

  // ==========================================================================
  // Tıklama / Dokunma Olayı (Çilek Patlaması)
  // ==========================================================================
  let lastClickTime = 0;
  function createHeartAndStrawberryBurst(x, y) {
    const now = performance.now();
    if (now - lastClickTime < 50) return;
    lastClickTime = now;

    for (let i = 0; i < 14; i++) {
      hearts.push(new FloatingHeart(true, x, y));
    }
    for (let i = 0; i < 5; i++) {
      strawberries.push(new BurstStrawberry(x, y));
    }
    for (let i = 0; i < 18; i++) {
      sparkles.push(new SparkleParticle(x, y));
    }
  }

  // ==========================================================================
  // Native HTML5 Ses Oynatıcı Kontrolü
  // ==========================================================================
  const audioElement = document.getElementById('bg-audio');
  const musicBtn = document.getElementById('music-btn');
  const musicText = musicBtn ? musicBtn.querySelector('.music-text') : null;
  let isPlaying = false;

  function startAudioPlayback() {
    if (!audioElement) return;

    audioElement.volume = 1.0;
    const playPromise = audioElement.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        isPlaying = true;
        if (musicBtn) musicBtn.classList.add('playing');
        if (musicText) musicText.innerText = 'Çalıyor';
      }).catch((err) => {
        console.log('Audio autoplay prevented, awaiting user gesture:', err);
      });
    }
  }

  function pauseAudioPlayback() {
    if (!audioElement) return;
    audioElement.pause();
    isPlaying = false;
    if (musicBtn) musicBtn.classList.remove('playing');
    if (musicText) musicText.innerText = 'Melodi';
  }

  function toggleAudio() {
    if (isPlaying) {
      pauseAudioPlayback();
    } else {
      startAudioPlayback();
    }
  }

  // Butona Dokunma
  if (musicBtn) {
    musicBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAudio();
    });
    musicBtn.addEventListener('touchend', (e) => {
      e.stopPropagation();
      toggleAudio();
    });
  }

  // Ekrana Her Dokunuşta / Tıklamada Sesi Başlat
  function onUserScreenInteraction(e) {
    const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : (e.clientX || width / 2);
    const clientY = e.touches && e.touches[0] ? e.touches[0].clientY : (e.clientY || height / 2);

    createHeartAndStrawberryBurst(clientX, clientY);

    if (!isPlaying) {
      startAudioPlayback();
    }
  }

  window.addEventListener('touchstart', onUserScreenInteraction, { passive: true });
  window.addEventListener('touchend', onUserScreenInteraction, { passive: true });
  window.addEventListener('click', onUserScreenInteraction);

  // İmleç Hareketi
  let lastMove = 0;
  window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - lastMove > 35) {
      sparkles.push(new SparkleParticle(e.clientX, e.clientY));
      lastMove = now;
    }
  });

})();
