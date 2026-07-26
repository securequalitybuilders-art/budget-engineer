# Attributions

This project adapts (re-implements in TypeScript) formulas and calculation logic from the following MIT-licensed open-source repositories. No code is copied verbatim — the original sources are Python; all implementations here are original TypeScript ports.

## Sources

| Repository | License | What was adapted |
|---|---|---|
| [github.com/Abhinavbwj/Skills-Architects](https://github.com/Abhinavbwj/Skills-Architects) | MIT | Area scheduling, U-value, daylight factor, egress/occupant load, structural loading, energy demand, and cost estimation formulas/methods |
| [github.com/Abhinavbwj/Claude-skills-for-Computational-Designers](https://github.com/Abhinavbwj/Claude-skills-for-Computational-Designers) | MIT | Supplementary computational design methods referenced for the calculator implementations |

## What was used

- **Formulas**: The mathematical relationships for average daylight factor (BRE method), U-value (ISO 6946), occupant load factors (IBC 2018), dead/live loads (IBC/ASCE 7), and degree-day energy estimation.
- **Default constants**: Reference values for occupant load factors, U-value targets, material conductivities, and climate degree-day ranges.
- **Method names**: The calculator category names (area schedule, U-value, daylight, egress, structural load, energy demand, cost estimate) follow the architectural engineering convention established in the source repositories.

## License

Both source repositories are MIT-licensed. This project retains the MIT license. See [LICENSE](./LICENSE).

## OpenCV.js

Floor-plan wall detection (Sprint 87) uses **[OpenCV.js](https://opencv.org/)** (Apache 2.0 license) — a JavaScript binding of OpenCV compiled to WebAssembly via Emscripten.

- **Usage**: Lazy-loaded on first "Detect walls" click (not in main bundle). Runs entirely client-side in a WebAssembly sandbox.
- **Integration**: The `@techstark/opencv-js` npm package provides `opencv.js` (WASM inlined). Dynamic `import()` creates a separate 14.5 MB chunk, excluded from PWA precache. Loaded on-demand, cached by the browser after first use.
- **Pipeline**: grayscale → adaptive threshold → morphology cleanup → HoughLinesP → collinear merge → axis snap → room derivation → PlanModel construction.
- **Accuracy caveat**: Detection is approximate. Results are labelled "auto-detected — review and correct." Users must verify dimensions.

## Compliance rule structure

The **jurisdiction-keyed compliance rule structure** (per-jurisdiction files with `ComplianceRuleDef` / `evaluate()` interface) is inspired by the country-code dossier pattern in [Skills-Architects](https://github.com/Abhinavbwj/Skills-Architects). The Zimbabwe (ZBC) rule values are based on ZBC 1996 / SI references already cited in the app's typology knowledge base; all TypeScript re-implementation is original.

*ATTRIBUTIONS.md — Sprint 87, July 2026*
