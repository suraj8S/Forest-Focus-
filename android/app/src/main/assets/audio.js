// Forest Audio Engine - Generative Web Audio API Synthesizer
// 100% Offline, Zero external dependencies, with strict exception guards

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.sfxGain = null;
    this.currentAmbient = null;
    this.ambientNodes = [];
    this.volume = 0.5;
    this.sfxEnabled = true;
    this.ambientType = 'off';
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = this.volume;
      this.ambientGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.masterGain);
    } catch (e) {
      console.warn('AudioContext initialization failed or not supported:', e);
    }
  }

  ensureContext() {
    try {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(err => {
          console.warn('AudioContext resume prevented by autoplay policy:', err);
        });
      }
    } catch (e) {
      console.warn('Audio context verification error:', e);
    }
  }

  setVolume(val) {
    try {
      const safeVal = typeof val === 'number' && !isNaN(val) ? val : 0.5;
      this.volume = Math.max(0, Math.min(1, safeVal));
      if (this.ambientGain && this.ctx) {
        this.ambientGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
      }
    } catch (e) {
      console.warn('Failed setting ambient volume:', e);
    }
  }

  // --- Sound Effects ---
  playSfx(type) {
    if (!this.sfxEnabled) return;
    try {
      this.ensureContext();
      if (!this.ctx || this.ctx.state !== 'running') return;

      const t = this.ctx.currentTime;

      if (type === 'start') {
        [523.25, 659.25].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + i * 0.12);
          gain.gain.setValueAtTime(0.3, t + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.6);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(t + i * 0.12);
          osc.stop(t + i * 0.12 + 0.6);
        });
      } else if (type === 'complete') {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + i * 0.15);
          const startTime = t + i * 0.15;
          const dur = (i === notes.length - 1) ? 1.2 : 0.4;
          gain.gain.setValueAtTime(0.4, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(startTime);
          osc.stop(startTime + dur);
        });
      } else if (type === 'fail') {
        const notes = [329.63, 261.63, 220.0];
        notes.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t + i * 0.22);
          const startTime = t + i * 0.22;
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(startTime);
          osc.stop(startTime + 0.5);
        });
      } else if (type === 'coin') {
        [987.77, 1318.51].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + i * 0.08);
          gain.gain.setValueAtTime(0.35, t + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.4);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(t + i * 0.08);
          osc.stop(t + i * 0.08 + 0.4);
        });
      } else if (type === 'tap') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.04);
      }
    } catch (e) {
      console.warn('Error playing SFX (' + type + '):', e);
    }
  }

  // --- Ambient Generators ---
  stopAmbient() {
    try {
      this.ambientNodes.forEach(node => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (e) {}
      });
    } catch (err) {
      console.warn('Error stopping ambient nodes:', err);
    } finally {
      this.ambientNodes = [];
      this.ambientType = 'off';
    }
  }

  setAmbient(type) {
    try {
      this.stopAmbient();
      if (type === 'off') return;
      this.ensureContext();
      if (!this.ctx) return;

      this.ambientType = type;

      switch (type) {
        case 'rain': this.startRain(); break;
        case 'forest': this.startForest(); break;
        case 'cafe': this.startCafe(); break;
        case 'fire': this.startFire(); break;
        case 'waves': this.startWaves(); break;
        case 'zen': this.startZen(); break;
      }
    } catch (e) {
      console.warn('Error starting ambient sound (' + type + '):', e);
      this.stopAmbient();
    }
  }

  createNoiseBuffer(seconds = 3) {
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  startRain() {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(4);
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.45;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    noise.start();
    this.ambientNodes.push(noise, filter, gain);
  }

  startForest() {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(4);
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 450;
    filter.Q.value = 2.0;

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.2;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 250;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = this.ctx.createGain();
    gain.gain.value = 0.35;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);

    lfo.start();
    noise.start();
    this.ambientNodes.push(noise, filter, lfo, lfoGain, gain);
  }

  startCafe() {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(3);
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 650;
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.28;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    noise.start();
    this.ambientNodes.push(noise, filter, gain);
  }

  startFire() {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(3);
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1200;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.2;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    noise.start();
    this.ambientNodes.push(noise, filter, gain);
  }

  startWaves() {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(5);
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 350;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = this.ctx.createGain();
    gain.gain.value = 0.4;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);

    lfo.start();
    noise.start();
    this.ambientNodes.push(noise, filter, lfo, lfoGain, gain);
  }

  startZen() {
    const freqs = [108, 216, 432, 648];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.08 / (idx + 1);
      osc.connect(gain);
      gain.connect(this.ambientGain);
      osc.start();
      this.ambientNodes.push(osc, gain);
    });
  }
}

window.soundEngine = new SoundEngine();
