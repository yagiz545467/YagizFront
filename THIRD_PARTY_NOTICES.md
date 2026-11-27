# Third-party notices

YağızFront is licensed under GNU AGPL v3. The grid-neighbor routine in
`src/game/grid.ts` is adapted from `GameMapImpl.neighbors` in OpenFrontIO,
from the user-supplied OpenFrontIO-main checkout.

Copyright © OpenFront and Contributors.
Original source: https://github.com/openfrontio/OpenFrontIO
Original path: packages/engine-lib/src/game/GameMapImpl.ts

YağızFront modifies the routine into a standalone function, adds a new
region generator and replaces real-time gameplay and all UI with its own
turn-based dynasty simulation. No OpenFront proprietary assets, premium
content, branding images or external service credentials are included.

See LICENSE for the full GNU Affero General Public License v3.
Other npm dependencies retain their individual licenses.

## OpenFront World map
`src/game/maps/openfront-world.json` is a lossless run-length encoding of
OpenFront `resources/maps/world/map16x.bin` (516 × 258 cells).
Attribution: OpenFront / OpenFront Inc.; map author evanpelle, rebuild by Patrick Plays Badly.
Source: https://github.com/openfrontio/OpenFrontIO/tree/main/resources/maps/world
Map data and its adaptations are CC BY-SA 4.0:
https://creativecommons.org/licenses/by-sa/4.0/
The upstream asset notice is preserved in `src/game/maps/LICENSE-ASSETS`.
Only terrain land bits are retained; cities, ownership and gameplay are YağızFront additions.
The artificial outer boundary cells are cleared for play; the encoded source remains unchanged.
