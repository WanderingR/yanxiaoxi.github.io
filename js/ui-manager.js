(function attachUiManager(global) {
  "use strict";

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  function getElement(id) {
    return document.getElementById(id);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function startOfLocalDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function getLoveConfig(config) {
    return config.love || config || {};
  }

  function getAnniversaryDate(config) {
    return getLoveConfig(config).anniversaryDate || "2024-02-14";
  }

  function getTitle(config) {
    const love = getLoveConfig(config);

    if (love.title) {
      return {
        custom: love.title
      };
    }

    const leftName = love.leftName || "Lee";
    const rightName = love.rightName || "XXX";
    return {
      leftName,
      rightName
    };
  }

  class UiManager {
    constructor(config) {
      this.config = config || {};
      this.sensorPanel = document.querySelector(".sensor-panel");
      this.title = getElement("loveTitle");
      this.subtitle = getElement("loveSubtitle");
      this.sinceDate = getElement("sinceDate");
      this.daysTogether = getElement("daysTogether");
      this.bpmValue = getElement("bpmValue");
      this.modeText = getElement("modeText");
      this.modeDot = getElement("modeDot");
      this.bleButton = getElement("bleButton");
      this.error = getElement("appError");
      this.lastDayUpdate = 0;
      this.lastDisplayedBpm = null;

      this.applyConfig();
      this.applySensorPanelConfig();
      this.updateAnniversary(true);
    }

    applyConfig() {
      const love = getLoveConfig(this.config);

      if (this.title) {
        const title = getTitle(this.config);

        if (title.custom) {
          this.title.classList.remove("love-title--names");
          this.title.textContent = title.custom;
        } else {
          const leftName = document.createElement("span");
          const rightName = document.createElement("span");
          leftName.className = "love-name";
          rightName.className = "love-name";
          leftName.textContent = title.leftName;
          rightName.textContent = title.rightName;
          this.title.classList.add("love-title--names");
          this.title.replaceChildren(leftName, rightName);
        }
      }

      if (this.subtitle) {
        this.subtitle.textContent = love.subtitle || "Every heartbeat is for you.";
      }

      if (this.sinceDate) {
        this.sinceDate.textContent = `Since ${getAnniversaryDate(this.config)}`;
      }
    }

    applySensorPanelConfig() {
      if (!this.sensorPanel) {
        return;
      }

      const panelConfig = this.config.sensorPanel || {};
      const mode = panelConfig.mode || "compact";
      const normalizedMode = mode === "full" || mode === "hidden" ? mode : "compact";
      const connectOnClick = panelConfig.connectOnClick !== false && normalizedMode !== "hidden";

      this.sensorPanel.hidden = normalizedMode === "hidden";
      this.sensorPanel.classList.remove("sensor-panel--full", "sensor-panel--compact");

      if (normalizedMode !== "hidden") {
        this.sensorPanel.classList.add(`sensor-panel--${normalizedMode}`);
      }

      this.sensorPanel.dataset.connect = panelConfig.showConnectButton ? "visible" : "hidden";
      this.sensorPanel.dataset.panelConnect = connectOnClick ? "enabled" : "disabled";
      this.sensorPanel.tabIndex = connectOnClick ? 0 : -1;
      this.sensorPanel.setAttribute("aria-label", connectOnClick ? "Heart rate. Tap to connect watch." : "Heart rate");

      if (connectOnClick) {
        this.sensorPanel.setAttribute("role", "button");
        this.sensorPanel.title = "Tap to connect watch";
      } else {
        this.sensorPanel.removeAttribute("role");
        this.sensorPanel.removeAttribute("title");
      }

      if (this.bleButton) {
        const hideButton = !panelConfig.showConnectButton || normalizedMode === "hidden";
        this.bleButton.tabIndex = hideButton ? -1 : 0;
        this.bleButton.setAttribute("aria-hidden", hideButton ? "true" : "false");
      }
    }

    update(timeSeconds, metrics) {
      if (metrics) {
        const pulse = clamp(metrics.pulse, 0, 1);
        document.documentElement.style.setProperty("--ui-pulse", pulse.toFixed(3));
        this.setBpm(metrics.bpm, metrics.source || null);
      }

      if (timeSeconds - this.lastDayUpdate > 30) {
        this.updateAnniversary(false);
      }
    }

    updateAnniversary(force) {
      const anniversaryDate = new Date(`${getAnniversaryDate(this.config)}T00:00:00`);
      this.lastDayUpdate = performance.now() / 1000;

      if (!force && !this.daysTogether) {
        return;
      }

      if (Number.isNaN(anniversaryDate.getTime())) {
        if (this.daysTogether) {
          this.daysTogether.textContent = "Set a valid anniversary date";
        }
        return;
      }

      const today = startOfLocalDay(new Date());
      const start = startOfLocalDay(anniversaryDate);
      const days = Math.max(0, Math.floor((today - start) / MS_PER_DAY) + 1);

      if (this.daysTogether) {
        this.daysTogether.textContent = `Together for ${days.toLocaleString()} days`;
      }
    }

    setBpm(bpm) {
      if (bpm === null || bpm === undefined) {
        if (this.lastDisplayedBpm !== null) {
          this.lastDisplayedBpm = null;

          if (this.bpmValue) {
            this.bpmValue.textContent = "--";
          }
        }

        return;
      }

      const rounded = Math.round(bpm);

      if (rounded === this.lastDisplayedBpm) {
        return;
      }

      this.lastDisplayedBpm = rounded;

      if (this.bpmValue) {
        this.bpmValue.textContent = String(rounded);
      }
    }

    setBleAvailability(isAvailable) {
      if (this.sensorPanel) {
        this.sensorPanel.dataset.ble = isAvailable ? "available" : "unavailable";
        this.sensorPanel.title = isAvailable ? "Tap to connect watch" : "Web Bluetooth unavailable in this browser";

        if (!isAvailable) {
          this.sensorPanel.dataset.panelConnect = "disabled";
          this.sensorPanel.tabIndex = -1;
          this.sensorPanel.removeAttribute("role");
          this.sensorPanel.setAttribute("aria-label", "Heart rate. Web Bluetooth unavailable.");
        }
      }

      if (!this.bleButton) {
        return;
      }

      if (!isAvailable) {
        this.bleButton.textContent = "BLE unavailable";
        this.bleButton.disabled = true;
      }
    }

    setMode(mode, message) {
      const isLive = mode === "ble";

      if (this.modeDot) {
        this.modeDot.classList.toggle("is-live", isLive);
      }

      if (this.sensorPanel) {
        this.sensorPanel.dataset.mode = isLive ? "ble" : "waiting";
        this.sensorPanel.title = isLive ? "Live heart rate connected" : "Tap to connect watch";
      }

      if (this.modeText) {
        this.modeText.textContent = message || (isLive ? "Live heart rate" : "Waiting for watch");
      }

      if (this.bleButton) {
        this.bleButton.textContent = isLive ? "Watch connected" : "Connect watch";
        this.bleButton.disabled = isLive;
      }
    }

    setStatus(message) {
      if (this.modeText) {
        this.modeText.textContent = message;
      }
    }

    showError(message) {
      if (!this.error) {
        return;
      }

      this.error.hidden = false;
      this.error.textContent = message;
    }
  }

  global.HeartSync = global.HeartSync || {};
  global.HeartSync.UiManager = UiManager;
})(window);
