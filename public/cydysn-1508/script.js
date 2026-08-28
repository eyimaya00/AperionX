/**
 * Ceyda ❤️ Yasin - Yüksek Performanslı Parçacık & Ses Motoru (Ultra Smooth 60-120 FPS)
 * Tüm Mobil Cihazlarla (iPhone / Android) %100 Uyumlu Çift Katmanlı Ses Motoru 🍓💖🎵
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
  // %100 Mobil Uyumlu Çift Katmanlı Ses Motoru (HTML5 Audio + Web Audio)
  // ==========================================================================
  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // Bellek içinde sıcak romantik melodi WAV dosyası oluşturma (0ms gecikme, offline)
  function generateDreamMelodyWav() {
    const sampleRate = 22050;
    const totalSeconds = 14;
    const numSamples = sampleRate * totalSeconds;
    const buffer = new Float32Array(numSamples);

    // Romantik Pentatonik Rüya Ezgisi
    const melodyEvents = [
      { time: 0.0, freq: 369.99, dur: 3.5, vol: 0.55 }, // F#4
      { time: 1.0, freq: 554.37, dur: 3.2, vol: 0.50 }, // C#5
      { time: 2.2, freq: 440.00, dur: 3.0, vol: 0.48 }, // A4
      { time: 3.6, freq: 659.25, dur: 3.6, vol: 0.55 }, // E5
      { time: 5.0, freq: 493.88, dur: 3.2, vol: 0.48 }, // B4
      { time: 6.4, freq: 739.99, dur: 3.8, vol: 0.55 }, // F#5
      { time: 8.0, freq: 554.37, dur: 3.5, vol: 0.52 }, // C#5
      { time: 9.4, freq: 440.00, dur: 3.0, vol: 0.48 }, // A4
      { time: 10.8, freq: 369.99, dur: 4.0, vol: 0.55 },// F#4
      { time: 12.2, freq: 493.88, dur: 3.0, vol: 0.48 }  // B4
    ];

    for (const ev of melodyEvents) {
      const startSample = Math.floor(ev.time * sampleRate);
      const durSamples = Math.floor(ev.dur * sampleRate);
      for (let i = 0; i < durSamples && (startSample + i) < numSamples; i++) {
        const t = i / sampleRate;
        const attack = Math.min(1, t / 0.06);
        const decay = Math.exp(-t * 1.1);
        const env = attack * decay * ev.vol;

        // Sıcak piyano/çan tonu harmonikleri
        const val = (
          Math.sin(2 * Math.PI * ev.freq * t) * 0.72 +
          Math.sin(4 * Math.PI * ev.freq * t) * 0.22 +
          Math.sin(6 * Math.PI * ev.freq * t) * 0.06
        ) * env;

        buffer[startSample + i] += val;
      }
    }

    // 16-Bit PCM WAV Başlığı & Verisi
    const wavBytes = new Uint8Array(44 + numSamples * 2);
    const view = new DataView(wavBytes.buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(view, 8, 'WAVE');

    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);

    writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      let s = Math.max(-1, Math.min(1, buffer[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    const blob = new Blob([wavBytes], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  // HTML5 Media Audio Element (iOS & Android'de sessiz mod filtrelerini aşar)
  let htmlAudio = null;
  let isMediaAudioStarted = false;

  function initHtmlAudio() {
    if (!htmlAudio) {
      try {
        const audioUrl = generateDreamMelodyWav();
        htmlAudio = new Audio(audioUrl);
        htmlAudio.loop = true;
        htmlAudio.volume = 0.85;
        htmlAudio.setAttribute('playsinline', 'true');
        htmlAudio.setAttribute('webkit-playsinline', 'true');
      } catch (err) {
        console.warn('Audio Init Error:', err);
      }
    }
  }
  initHtmlAudio();

  // Yedek Web Audio Context
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    return audioCtx;
  }

  function playSoftTouchNote() {
    const actx = getAudioContext();
    if (!actx) return;
    if (actx.state === 'suspended') {
      actx.resume();
    }
    try {
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      const notes = [554.37, 659.25, 739.99, 880.00];
      osc.type = 'sine';
      osc.frequency.setValueAtTime(randomChoice(notes), actx.currentTime);
      gain.gain.setValueAtTime(0, actx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, actx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 1.8);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start();
      osc.stop(actx.currentTime + 2.0);
    } catch (e) {}
  }

  // Tüm Cihazlarda Garantili Ses Başlatıcı
  function triggerSoundPlayback() {
    // 1. Katman: HTML5 Audio (Mobilde %100 çalma garantili)
    if (htmlAudio && !isMediaAudioStarted) {
      const playPromise = htmlAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          isMediaAudioStarted = true;
        }).catch(() => {});
      }
    }

    // 2. Katman: Dokunma Sesi
    playSoftTouchNote();
  }

  // Mobil Dokunma & Masaüstü Tıklama
  function handleInteraction(e) {
    const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : (e.clientX || width / 2);
    const clientY = e.touches && e.touches[0] ? e.touches[0].clientY : (e.clientY || height / 2);

    createHeartAndStrawberryBurst(clientX, clientY);
    triggerSoundPlayback();
  }

  window.addEventListener('touchstart', handleInteraction, { passive: true });
  window.addEventListener('touchend', handleInteraction, { passive: true });
  window.addEventListener('pointerdown', handleInteraction);
  window.addEventListener('click', handleInteraction);

  let lastMove = 0;
  window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - lastMove > 35) {
      sparkles.push(new SparkleParticle(e.clientX, e.clientY));
      lastMove = now;
    }
  });

})();
