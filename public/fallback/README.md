# AF-18 static views — Vector PNI 7.0

These are real captures of the existing AF-18 procedural model, not photographs, AI-generated illustrations or manufacturer CAD.

Source: local 7.0 working tree based on stable 6.1 commit d6a1ac10925e9137f11478e498f37160b20a4141. Captured during the 2026-11-07 development task with local Chrome / Playwright; no publication or image-generation service.

af18-overview.webp: 1600 × 1000 pixels, 55164 bytes, opaque #edf0f2 background. The real 1800 × 1200 renderer uses a 34° camera at (5.8, 6.2, 11.5), looking at (0, 0.1, 0), then crops 100 pixels from each edge. This is the same camera/landmark coordinate system as the earlier capture.

parts/*.webp: 15 actual exterior previews, 600 × 480 pixels. No invented charger image: the external charger is not installed on the drone and its appearance remains unknown.

WebGL is used only to prepare these files during development. The fallback displays ordinary img resources, and its numbered buttons, shared catalogue, 52 section descriptions and retry action do not require a running 3D engine.

Previous images remain available in the stable 6.1 Git branch and source ZIP.
