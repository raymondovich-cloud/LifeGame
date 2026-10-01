# LifeGame 3.0 — Session Change Log

**Date:** 1 October 2026  
**Topic:** Fix accordion viewport jump

## Changed
- Updated `source/presentation/finance/finance.js` to preserve the current horizontal and vertical scroll position when a Finance subblock is opened or closed.
- Added two animation-frame restorations after the accordion state change to prevent browser focus/layout scrolling from moving the viewport.
- Updated `source/design/components/accordion.css` with `overflow-anchor: none` on the accordion list to prevent browser scroll anchoring from shifting the section.

## Architectural impact
- Presentation and Design System only.
- No changes to Domain, Application, Core, Memory, or Infrastructure.
- No business logic or data behavior changed.

## Commits
- `a2c04abbc3ba4f15b7d32113c90e274665315e41` — Finance accordion viewport preservation.
- `78da78dd675c362ef2512914f67fc79bc2ad77f6` — Accordion scroll anchoring prevention.
