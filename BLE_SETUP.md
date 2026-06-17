# BLE Setup Guide

Heart Sync reads standard heart-rate data through Web Bluetooth.

## Required UUIDs

- Service: `0x180D`
- Characteristic: `0x2A37`

## Supported Flow

1. Open the site in Chrome or Edge.
2. Use `https://` or `localhost`.
3. Tap `Connect watch`.
4. Choose a device exposing the Heart Rate Service.
5. Keep the wearable in a mode that broadcasts heart-rate measurements.

## Huawei Watch GT5

Huawei devices may expose heart-rate data differently depending on firmware and mode. If the watch does not appear in the picker, check:

- Whether the current workout or health mode is broadcasting heart-rate measurement.
- Whether the device exposes the standard Heart Rate Service to external clients.
- Whether browser permissions for Bluetooth are enabled.

If the watch is not compatible, the app falls back to simulated BPM automatically.

## Fallback Rules

- BLE unavailable: simulated mode.
- Connection canceled: simulated mode.
- Device disconnects: simulated mode.
- No blocking dialogs after the browser permission prompt.
