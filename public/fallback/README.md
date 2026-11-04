# AF-18 static views

These files are captures of the existing Vector PNI 5.2 procedural model, not
photographs, generated illustrations or manufacturer CAD documentation.

Source: stable commit `7e781eb831a663a70c2eafcc99bc233c7405a20f`.
Captured on 2026-11-04 with local Chrome / Playwright, using the project's
unchanged materials, lighting and geometry. No image-generation service was used.

`af18-overview.webp`: 1600 × 1000 pixels, 55,212 bytes, opaque #edf0f2 background.
The 1800 × 1200 scene capture uses a 34° perspective camera at (5.8, 6.2, 11.5),
looking at (0, 0.1, 0); the saved image crops 100 pixels from each outer edge.
Projected landmarks in `fallback-landmarks.js` use this cropped image's axes.
Its maximum CSS width is 800 pixels, providing 2× resolution at that size.

`parts/*.webp`: 15 actual component-preview captures, 600 × 480 pixels.
There is intentionally no image of the external charger: its appearance is not
documented and it is not installed on the drone.

To reproduce the development captures with the existing local production preview:

```
node tests/viewer.ultimate-runner.mjs --browser=chrome --url=http://127.0.0.1:5175 --output=qa-artifacts/fallback/capture.json tests/viewer.capture-fallback.js
```

The helper writes images and camera/landmark metadata to `qa-artifacts/fallback`.
Review them before copying them here; do not regenerate these resources at runtime.
The fallback uses ordinary HTML `<img>` elements and shared component/catalogue
data, with no renderer, canvas or Three.js dependency for displaying these images.
