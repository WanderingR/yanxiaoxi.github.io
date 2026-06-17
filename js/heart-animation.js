(function attachHeartAnimation(global) {
  "use strict";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  class HeartAnimation {
    constructor(options) {
      const config = options || {};
      this.defaultBpm = config.defaultBpm || 75;
      this.currentBpm = null;
      this.targetBpm = null;
      this.source = "waiting";
      this.previousPhase = 0;
      this.lastBeatTime = 0;
      this.hasHeartRate = false;
    }

    setBpm(bpm, source) {
      const nextBpm = Number(bpm);
      if (!Number.isFinite(nextBpm)) {
        return;
      }

      this.targetBpm = clamp(nextBpm, 42, 190);
      this.source = source || "ble";
      this.hasHeartRate = this.source === "ble";

      if (this.currentBpm === null) {
        this.currentBpm = this.targetBpm;
      }
    }

    clearBpm() {
      this.source = "waiting";
      this.currentBpm = null;
      this.targetBpm = null;
      this.hasHeartRate = false;
      this.previousPhase = 0;
    }

    useSimulation() {
      this.clearBpm();
    }

    update(timeSeconds) {
      if (!this.hasHeartRate || this.currentBpm === null || this.targetBpm === null) {
        return {
          bpm: null,
          phase: 0,
          pulse: 0,
          isBeat: false,
          lastBeatTime: this.lastBeatTime,
          energy: 0,
          scale: 1,
          glow: 0.28,
          speed: 0.62,
          turbulence: 0.24,
          hasHeartRate: false
        };
      }

      this.currentBpm += (this.targetBpm - this.currentBpm) * 0.045;

      const period = 60 / this.currentBpm;
      const phase = (timeSeconds % period) / period;
      const pulse = this.computePulse(phase, timeSeconds);
      const energy = clamp((this.currentBpm - 56) / 72, 0, 1);
      const breath = Math.sin(timeSeconds * 0.32) * 0.01;
      const isBeat = phase < this.previousPhase;

      if (isBeat) {
        this.lastBeatTime = timeSeconds;
      }

      this.previousPhase = phase;

      return {
        bpm: this.currentBpm,
        phase,
        pulse,
        isBeat,
        lastBeatTime: this.lastBeatTime,
        energy,
        scale: 1 + breath + pulse * (0.052 + energy * 0.052),
        glow: 0.42 + energy * 0.34 + pulse * (0.7 + energy * 0.46),
        speed: 0.68 + energy * 1.14 + pulse * 0.34,
        turbulence: 0.18 + energy * 0.56 + pulse * 0.25,
        hasHeartRate: true
      };
    }

    computePulse(phase, timeSeconds) {
      const mainRise = smoothstep(0.018, 0.072, phase);
      const mainFall = 1 - smoothstep(0.145, 0.36, phase);
      const mainPulse = mainRise * mainFall;

      const secondRise = smoothstep(0.245, 0.292, phase);
      const secondFall = 1 - smoothstep(0.315, 0.51, phase);
      const secondPulse = secondRise * secondFall * 0.32;

      const organicVariance =
        1 + Math.sin(timeSeconds * 0.61) * 0.028 + Math.sin(timeSeconds * 1.17 + 2.1) * 0.018;

      return clamp((mainPulse + secondPulse) * organicVariance, 0, 1.22);
    }
  }

  global.HeartSync = global.HeartSync || {};
  global.HeartSync.HeartAnimation = HeartAnimation;
})(window);
