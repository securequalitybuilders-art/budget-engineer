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

*ATTRIBUTIONS.md — Sprint 53, July 2026*
