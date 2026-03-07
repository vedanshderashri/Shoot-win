// A lightweight procedural audio system using Web Audio API
class SoundSystem {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playShootSound() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;

        // Noise buffer for gunshot
        const bufferSize = this.ctx.sampleRate * 0.2; // 200ms
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // Bandpass filter for body
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;

        // Envelope
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(t);

        // Add a low thump
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(1, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
    }

    playReloadSound() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;

        // Helper: burst of filtered noise
        const playNoiseBurst = (startTime, duration, frequency, gain, q = 2) => {
            const bufLen = Math.floor(this.ctx.sampleRate * duration);
            const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

            const src = this.ctx.createBufferSource();
            src.buffer = buf;

            const bpf = this.ctx.createBiquadFilter();
            bpf.type = 'bandpass';
            bpf.frequency.value = frequency;
            bpf.Q.value = q;

            const gainNode = this.ctx.createGain();
            gainNode.gain.setValueAtTime(gain, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            src.connect(bpf);
            bpf.connect(gainNode);
            gainNode.connect(this.ctx.destination);
            src.start(startTime);
            src.stop(startTime + duration);
        };

        // --- Phase 1 (t+0.0): Mag eject click --- 
        playNoiseBurst(t, 0.05, 800, 0.8, 4);   // High freq click
        playNoiseBurst(t, 0.07, 200, 0.4, 2);   // Low thud

        // --- Phase 2 (t+0.3): Magazine rattle (pulling out) ---
        playNoiseBurst(t + 0.3, 0.12, 500, 0.35, 1.5);
        playNoiseBurst(t + 0.35, 0.08, 1200, 0.2, 3);

        // --- Phase 3 (t+1.2): New mag insert click ---
        playNoiseBurst(t + 1.2, 0.04, 900, 1.0, 5);  // Sharp metallic clack
        playNoiseBurst(t + 1.2, 0.06, 180, 0.5, 1);  // Body impact

        // --- Phase 4 (t+1.5): Charging handle pull & release ---
        playNoiseBurst(t + 1.5, 0.06, 700, 0.5, 3);  // Pull
        playNoiseBurst(t + 1.65, 0.05, 1000, 0.8, 5); // Snap forward
        playNoiseBurst(t + 1.65, 0.08, 300, 0.4, 2);  // Low snap body
    }

    playHitmarkerSound() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'square'; // crunchy hitmarker sound like old CoD
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.linearRampToValueAtTime(500, t + 0.05);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
    }
}

export default new SoundSystem();
