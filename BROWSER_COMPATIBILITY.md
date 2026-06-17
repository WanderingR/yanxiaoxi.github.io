# Browser Compatibility

## Supported

- Chrome desktop
- Chrome Android
- Edge desktop
- Edge Android

## Limited

- Android tablets: supported, but performance depends on GPU and memory.
- Safari desktop: WebGL is usable, Web Bluetooth is not.
- Firefox desktop: WebGL is usable, Web Bluetooth support is limited.

## Requirements

- WebGL must be available for the particle scene.
- Web Bluetooth is needed only for live heart-rate pairing.
- If Bluetooth is not available, the app remains fully usable in simulated mode.

## Performance Expectations

- Desktop Chrome: 60 FPS target.
- Android Chrome: 60 FPS target on modern hardware.
- Minimum acceptable: 30 FPS.
