(function attachParticleSystem(global) {
  "use strict";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const vertexShader = `
    precision highp float;

    uniform float uTime;
    uniform float uMorph;
    uniform float uPulse;
    uniform float uEnergy;
    uniform float uSpeed;
    uniform float uTurbulence;
    uniform float uHeartScale;
    uniform float uPixelRatio;
    uniform float uGlow;

    attribute vec3 aTarget;
    attribute vec4 aSeed;
    attribute float aSize;

    varying float vAlpha;
    varying float vGlow;
    varying float vWarmth;

    mat2 rotate2d(float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return mat2(c, -s, s, c);
    }

    float easeOutCubic(float t) {
      float inv = 1.0 - t;
      return 1.0 - inv * inv * inv;
    }

    void main() {
      float morph = easeOutCubic(smoothstep(0.0, 1.0, uMorph));
      float time = uTime * (0.44 + uSpeed * 0.24);

      vec3 origin = position;
      vec3 heart = aTarget * uHeartScale;

      vec3 drift = vec3(
        sin(time * (0.70 + aSeed.x * 0.76) + aSeed.y * 6.2831),
        cos(time * (0.58 + aSeed.y * 0.72) + aSeed.z * 6.2831),
        sin(time * (0.64 + aSeed.z * 0.84) + aSeed.x * 7.2)
      );

      float preMorphFloat = 0.22 + uTurbulence * 0.18;
      float heartFloat = 0.034 + uTurbulence * 0.042;
      vec3 floatMotion = drift * mix(preMorphFloat, heartFloat, morph);

      float swirl = sin(uTime * 0.18 + aSeed.w * 6.2831) * 0.035 * morph * (0.45 + uTurbulence);
      heart.xy = rotate2d(swirl) * heart.xy;

      vec3 p = mix(origin + floatMotion, heart, morph);
      p += floatMotion * (0.42 + morph * 0.58);

      vec3 radial = normalize(vec3(p.xy, p.z * 0.45) + vec3(0.0001));
      p += radial * uPulse * morph * (0.07 + uEnergy * 0.06);

      vec4 modelPosition = modelViewMatrix * vec4(p, 1.0);
      float perspective = 25.0 / max(2.0, -modelPosition.z);
      float pulseSize = 1.0 + uPulse * morph * 0.38;
      gl_PointSize = aSize * uPixelRatio * perspective * pulseSize;
      gl_Position = projectionMatrix * modelPosition;

      vAlpha = mix(0.24, 0.72, morph) * (0.76 + aSeed.z * 0.28);
      vAlpha += uPulse * 0.18 * morph;
      vGlow = uGlow * (0.55 + aSeed.x * 0.5);
      vWarmth = aSeed.y;
    }
  `;

  const fragmentShader = `
    precision highp float;

    uniform float uPulse;
    uniform float uEnergy;

    varying float vAlpha;
    varying float vGlow;
    varying float vWarmth;

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float distanceFromCenter = length(uv);
      float softDisc = smoothstep(0.5, 0.07, distanceFromCenter);
      float core = smoothstep(0.24, 0.0, distanceFromCenter);

      vec3 deepRose = vec3(0.93, 0.045, 0.24);
      vec3 petal = vec3(1.0, 0.30, 0.49);
      vec3 champagne = vec3(1.0, 0.78, 0.61);
      vec3 electric = vec3(1.0, 0.14, 0.40);

      vec3 color = mix(deepRose, petal, vWarmth);
      color = mix(color, champagne, core * (0.22 + uPulse * 0.14));
      color = mix(color, electric, uEnergy * 0.18 + uPulse * 0.10);

      float alpha = softDisc * vAlpha * (0.72 + vGlow * 0.28);
      alpha += core * 0.16 * vGlow;

      gl_FragColor = vec4(color, alpha);
    }
  `;

  function chooseParticleCount(config) {
    const width = global.innerWidth || 1280;
    const height = global.innerHeight || 720;
    const shortest = Math.min(width, height);
    const longest = Math.max(width, height);
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4;
    const dpr = global.devicePixelRatio || 1;

    const isPhone = shortest < 680;
    const isTablet = !isPhone && (longest < 1400 || navigator.maxTouchPoints > 0);
    let count = isPhone ? config.phoneCount : isTablet ? config.tabletCount : config.desktopCount;

    if (cores <= 4) {
      count *= 0.78;
    }

    if (memory <= 4) {
      count *= 0.86;
    }

    if (width * height * dpr * dpr > 4200000) {
      count *= 0.84;
    }

    return Math.round(clamp(count, config.minCount, config.maxCount));
  }

  function randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function sampleHeartPoint() {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const x = randomInRange(-1.36, 1.36);
      const y = randomInRange(-1.18, 1.38);
      const equation = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y;

      if (equation <= 0) {
        const edgeFalloff = clamp(1.15 - Math.sqrt(x * x + y * y) * 0.55, 0.24, 1);
        const z = randomInRange(-0.34, 0.34) * edgeFalloff;
        return {
          x: x * 1.78,
          y: (y - 0.08) * 1.72,
          z
        };
      }
    }

    return { x: 0, y: 0, z: 0 };
  }

  function sampleOriginPoint(index, count) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2.6 + Math.pow(Math.random(), 0.45) * 5.6;
    const shell = index / count;
    const spiral = angle + shell * Math.PI * 7.4;

    return {
      x: Math.cos(spiral) * radius + randomInRange(-0.55, 0.55),
      y: Math.sin(spiral) * radius * 0.62 + randomInRange(-1.65, 1.65),
      z: randomInRange(-3.2, 2.2)
    };
  }

  class ParticleSystem {
    constructor(options) {
      const settings = options || {};
      this.mount = settings.mount;
      this.config = Object.assign(
        {
          minCount: 12000,
          phoneCount: 22000,
          tabletCount: 34000,
          desktopCount: 48000,
          maxCount: 52000,
          morphDuration: 4.2,
          introDelay: 0.35,
          maxPixelRatio: 1.75
        },
        settings.config || {}
      );

      this.startTime = performance.now() / 1000;
      this.currentCount = chooseParticleCount(this.config);
      this.reductions = 0;
      this.frameSamples = 0;
      this.lastFpsTime = this.startTime;
      this.latestFps = 60;
      this.pixelRatioCap = this.config.maxPixelRatio;
      this.morphStartTime = null;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
      this.camera.position.set(0, 0, 8.7);

      this.renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        depth: false,
        powerPreference: "high-performance"
      });
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, this.pixelRatioCap));
      this.mount.appendChild(this.renderer.domElement);

      this.uniforms = {
        uTime: { value: 0 },
        uMorph: { value: 0 },
        uPulse: { value: 0 },
        uEnergy: { value: 0 },
        uSpeed: { value: 1 },
        uTurbulence: { value: 0.2 },
        uHeartScale: { value: 1 },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uGlow: { value: 0.5 }
      };

      this.material = new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending
      });

      this.points = new THREE.Points(this.createGeometry(this.currentCount), this.material);
      this.points.frustumCulled = false;
      this.scene.add(this.points);

      this.resize();
    }

    createGeometry(count) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const targets = new Float32Array(count * 3);
      const seeds = new Float32Array(count * 4);
      const sizes = new Float32Array(count);

      for (let index = 0; index < count; index += 1) {
        const origin = sampleOriginPoint(index, count);
        const target = sampleHeartPoint();
        const i3 = index * 3;
        const i4 = index * 4;

        positions[i3] = origin.x;
        positions[i3 + 1] = origin.y;
        positions[i3 + 2] = origin.z;

        targets[i3] = target.x;
        targets[i3 + 1] = target.y;
        targets[i3 + 2] = target.z;

        seeds[i4] = Math.random();
        seeds[i4 + 1] = Math.random();
        seeds[i4 + 2] = Math.random();
        seeds[i4 + 3] = Math.random();
        sizes[index] = randomInRange(0.52, 1.58);
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("aTarget", new THREE.BufferAttribute(targets, 3));
      geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
      geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      geometry.computeBoundingSphere();
      return geometry;
    }

    update(timeSeconds, metrics) {
      const hasHeartRate = Boolean(metrics.hasHeartRate);

      if (hasHeartRate && this.morphStartTime === null) {
        this.morphStartTime = timeSeconds;
      }

      if (!hasHeartRate) {
        this.morphStartTime = null;
      }

      const elapsed = this.morphStartTime === null ? 0 : timeSeconds - this.morphStartTime;
      const morph = this.morphStartTime === null
        ? 0
        : clamp((elapsed - this.config.introDelay) / this.config.morphDuration, 0, 1);

      this.uniforms.uTime.value = timeSeconds;
      this.uniforms.uMorph.value = morph;
      this.uniforms.uPulse.value = metrics.pulse;
      this.uniforms.uEnergy.value = metrics.energy;
      this.uniforms.uSpeed.value = metrics.speed;
      this.uniforms.uTurbulence.value = metrics.turbulence;
      this.uniforms.uHeartScale.value = metrics.scale;
      this.uniforms.uGlow.value = metrics.glow;

      this.points.rotation.y = Math.sin(timeSeconds * 0.12) * 0.055;
      this.points.rotation.x = Math.sin(timeSeconds * 0.08 + 1.4) * 0.025;
      this.points.rotation.z = Math.sin(timeSeconds * 0.06) * 0.018;

      this.samplePerformance(timeSeconds);
    }

    render() {
      this.renderer.render(this.scene, this.camera);
    }

    resize() {
      const width = global.innerWidth || 1;
      const height = global.innerHeight || 1;
      const pixelRatio = Math.min(global.devicePixelRatio || 1, this.pixelRatioCap);
      this.camera.aspect = width / height;
      this.camera.position.z = width < 720 ? 9.7 : 8.7;
      this.camera.updateProjectionMatrix();
      this.renderer.setPixelRatio(pixelRatio);
      this.renderer.setSize(width, height, false);
      this.uniforms.uPixelRatio.value = this.renderer.getPixelRatio();
    }

    samplePerformance(timeSeconds) {
      this.frameSamples += 1;
      const elapsed = timeSeconds - this.lastFpsTime;

      if (elapsed < 1) {
        return;
      }

      this.latestFps = this.frameSamples / elapsed;
      this.frameSamples = 0;
      this.lastFpsTime = timeSeconds;

      if (timeSeconds - this.startTime < 8 || this.reductions >= 2) {
        return;
      }

      if (this.latestFps < 42 && this.currentCount > this.config.minCount * 1.25) {
        this.reduceParticleLoad();
      }
    }

    reduceParticleLoad() {
      this.reductions += 1;
      this.currentCount = Math.max(this.config.minCount, Math.round(this.currentCount * 0.76));

      const previousGeometry = this.points.geometry;
      this.points.geometry = this.createGeometry(this.currentCount);
      previousGeometry.dispose();

      this.pixelRatioCap = Math.min(this.pixelRatioCap, 1.25);
      this.resize();
    }

    getStats() {
      return {
        particles: this.currentCount,
        fps: this.latestFps
      };
    }

    dispose() {
      if (this.points) {
        this.points.geometry.dispose();
      }

      if (this.material) {
        this.material.dispose();
      }

      if (this.renderer) {
        this.renderer.dispose();
      }
    }
  }

  global.HeartSync = global.HeartSync || {};
  global.HeartSync.ParticleSystem = ParticleSystem;
})(window);
