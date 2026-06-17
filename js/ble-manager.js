(function attachBleManager(global) {
  "use strict";

  const HEART_RATE_SERVICE = 0x180d;
  const HEART_RATE_MEASUREMENT = 0x2a37;

  class BleManager {
    constructor(options) {
      const settings = options || {};
      this.onBpm = settings.onBpm || function noop() {};
      this.onStatus = settings.onStatus || function noop() {};
      this.onModeChange = settings.onModeChange || function noop() {};
      this.device = null;
      this.characteristic = null;
      this.isConnecting = false;
      this.handleMeasurement = this.handleMeasurement.bind(this);
      this.handleDisconnect = this.handleDisconnect.bind(this);
    }

    isSupported() {
      return Boolean(navigator.bluetooth);
    }

    async connect() {
      if (!this.isSupported()) {
        this.onStatus("Web Bluetooth unavailable.");
        this.onModeChange("waiting");
        return false;
      }

      if (this.isConnecting) {
        return false;
      }

      this.isConnecting = true;
      this.onStatus("Select your heart-rate device.");

      try {
        this.device = await navigator.bluetooth.requestDevice({
          filters: [{ services: [HEART_RATE_SERVICE] }],
          optionalServices: [HEART_RATE_SERVICE]
        });

        this.device.addEventListener("gattserverdisconnected", this.handleDisconnect);
        this.onStatus("Connecting to heart-rate service...");

        const server = await this.device.gatt.connect();
        const service = await server.getPrimaryService(HEART_RATE_SERVICE);
        this.characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT);
        this.characteristic.addEventListener("characteristicvaluechanged", this.handleMeasurement);
        await this.characteristic.startNotifications();

        const name = this.device.name || "heart-rate device";
        this.onStatus(`Live heart rate from ${name}.`);
        this.onModeChange("ble");
        return true;
      } catch (error) {
        const reason = error && error.name ? error.name : "Connection failed";
        this.onStatus(`Waiting for watch. ${reason}.`);
        this.onModeChange("waiting");
        return false;
      } finally {
        this.isConnecting = false;
      }
    }

    async disconnect() {
      if (this.characteristic) {
        try {
          await this.characteristic.stopNotifications();
        } catch (error) {
          // Some devices disconnect before notifications can be stopped.
        }
        this.characteristic.removeEventListener("characteristicvaluechanged", this.handleMeasurement);
      }

      if (this.device && this.device.gatt && this.device.gatt.connected) {
        this.device.gatt.disconnect();
      }

      this.characteristic = null;
      this.onModeChange("waiting");
      this.onStatus("Disconnected. Tap BPM pill to reconnect.");
    }

    handleDisconnect() {
      this.characteristic = null;
      this.onModeChange("waiting");
      this.onStatus("Watch disconnected. Tap BPM pill to reconnect.");
    }

    handleMeasurement(event) {
      const value = event.target.value;
      const bpm = BleManager.parseHeartRate(value);

      if (bpm) {
        this.onBpm(bpm, "ble");
      }
    }

    static parseHeartRate(dataView) {
      if (!dataView || dataView.byteLength < 2) {
        return null;
      }

      const flags = dataView.getUint8(0);
      const isSixteenBit = (flags & 0x01) === 0x01;

      if (isSixteenBit) {
        if (dataView.byteLength < 3) {
          return null;
        }
        return dataView.getUint16(1, true);
      }

      return dataView.getUint8(1);
    }
  }

  global.HeartSync = global.HeartSync || {};
  global.HeartSync.BleManager = BleManager;
})(window);
