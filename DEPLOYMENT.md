# GitHub Pages Deployment

Heart Sync is a static site. No build step is required.

## Option 1: Publish the folder contents as the repository root

1. Put `index.html` at the repository root.
2. Commit the `css/`, `js/`, `assets/`, `README.md`, and `LICENSE` files.
3. Open GitHub repository settings.
4. Go to `Pages`.
5. Set source to `Deploy from a branch`.
6. Choose `main` and `/root`.
7. Save.

## Option 2: Publish from a `docs/` folder

1. Move the site files into a `docs/` directory.
2. Keep `index.html` inside that directory.
3. In GitHub Pages settings, select `main` and `/docs`.
4. Save and wait for the deployment to finish.

## Local Checks

You can test the site with any static server:

```bash
cd heart-sync
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Notes

- The app has no backend dependency.
- Web Bluetooth requires HTTPS or `localhost`.
- If the CDN-hosted Three.js file is unavailable, the page cannot render the particle scene.
