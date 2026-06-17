(function startHeartSync(global) {
  "use strict";

  // Edit this block to personalize the page.
  const CONFIG = {
    love: {
      leftName: "Lee    ",
      rightName: "    Yaya",
      subtitle: "Every heartbeat is for you.",
      anniversaryDate: "2026-06-06"
    },
    heartRate: {
      defaultBpm: 75
    },
    sensorPanel: {
      // Use "compact", "full", or "hidden".
      mode: "compact",
      connectOnClick: true,
      showConnectButton: false
    },
    particle: {
      minCount: 12000,
      phoneCount: 22000,
      tabletCount: 34000,
      desktopCount: 48000,
      maxCount: 52000,
      morphDuration: 4.2,
      introDelay: 0.35,
      maxPixelRatio: 1.75
    }
  };

  function boot() {
    const namespace = global.HeartSync || {};
    const ui = new namespace.UiManager(CONFIG);
    const defaultBpm = CONFIG.heartRate.defaultBpm;
    let currentMode = "waiting";

    if (!global.THREE) {
      ui.showError("Three.js could not be loaded. Check your network connection or host the Three.js file locally.");
      return;
    }

    const sceneMount = document.getElementById("scene");
    const animation = new namespace.HeartAnimation({ defaultBpm });
    const particles = new namespace.ParticleSystem({
      mount: sceneMount,
      config: CONFIG.particle
    });

    const ble = new namespace.BleManager({
      onBpm: (bpm, source) => {
        animation.setBpm(bpm, source);
      },
      onStatus: (message) => {
        ui.setStatus(message);
      },
      onModeChange: (mode) => {
        currentMode = mode;

        if (mode === "ble") {
          ui.setMode("ble", "Live heart rate");
        } else {
          animation.clearBpm();
          ui.setMode("waiting", "Tap BPM pill to connect");
        }
      }
    });

    ui.setBleAvailability(ble.isSupported());
    ui.setMode("waiting", ble.isSupported() ? "Tap BPM pill to connect" : "Bluetooth unavailable");

    const connectToBle = () => {
      if (CONFIG.sensorPanel.mode === "hidden" || currentMode === "ble" || ble.isConnecting || !ble.isSupported()) {
        return;
      }

      ble.connect();
    };

    const bleButton = document.getElementById("bleButton");
    if (bleButton) {
      bleButton.addEventListener("click", (event) => {
        event.stopPropagation();
        connectToBle();
      });
    }

    const sensorPanel = document.querySelector(".sensor-panel");
    if (sensorPanel && CONFIG.sensorPanel.connectOnClick !== false) {
      sensorPanel.addEventListener("click", connectToBle);
      sensorPanel.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        connectToBle();
      });
    }

    let isRunning = true;
    let frameHandle = 0;

    document.addEventListener("visibilitychange", () => {
      isRunning = !document.hidden;

      if (!isRunning && frameHandle) {
        cancelAnimationFrame(frameHandle);
        frameHandle = 0;
      }

      if (isRunning) {
        scheduleTick();
      }
    });

    global.addEventListener("resize", () => {
      particles.resize();
    });

    function scheduleTick() {
      if (!frameHandle) {
        frameHandle = requestAnimationFrame(tick);
      }
    }

    function tick() {
      frameHandle = 0;

      if (!isRunning) {
        return;
      }

      const timeSeconds = performance.now() / 1000;
      const metrics = animation.update(timeSeconds);
      metrics.source = animation.source;

      particles.update(timeSeconds, metrics);
      particles.render();
      ui.update(timeSeconds, metrics);

      scheduleTick();
    }

    scheduleTick();

    global.HeartSyncApp = {
      config: CONFIG,
      animation,
      particles,
      ble,
      ui
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
