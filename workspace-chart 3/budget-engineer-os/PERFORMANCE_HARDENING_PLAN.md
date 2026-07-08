# PERFORMANCE_HARDENING_PLAN.md

## Current bottleneck
The `three-vendor` chunk remains the main payload hotspot.

## Targeted improvements
1. Split heavy 3D viewers into an opt-in route or modal.
2. Replace high-level helper imports with more selective modules where possible.
3. Add a lightweight 2D-first mode for lower-capability devices.
4. Defer archive/standards/export helpers behind lazy-loaded actions.
5. Consider a second viewer mode without drei helpers.

## Near-term practical next step
- Create a BIM viewer toggle so the workspace can open in metrics-only mode first, then load 3D on demand.
