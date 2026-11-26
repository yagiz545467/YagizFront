# YağızFront

## Platform
Mobile-first web, Turkish. Desktop is a secondary responsive layout.

## Audience and purpose
A private group of 2–8 friends plays a persistent turn-based dynasty strategy game across separate phones. Replaces their hand-drawn tabletop game. Success is a complete, resumable multiplayer match, won by the last surviving dynasty.

## Confirmed rules
Random map; four cities per player drafted in alternating snake order; choose a capital. Equal starting resources and three main actions per turn. Cities produce troops; ports enable consensual trade; ships carry armies. Secret battle tactics, terrain, morale, fatigue and pursuit decisions determine outcomes. Marriage, children, succession, contested claims and exile matter. Spies enable intelligence, sabotage and assassination. Contextual personal events offer choices. Science progresses from medieval economy/navigation/warfare to cannon and muskets, with an exceptionally rare late-game atomic discovery. No overall or per-turn timer. Persist every action; reconnect without elimination.

## Access and privacy
Shared server-verified entry password, stored only in untracked environment configuration; distinct player sessions and recovery codes. Never send rival secret tactics, agents or private events to a client. No bots, public matchmaking or map editor in v1.

## Stack
TypeScript, Next.js/React, Canvas map, server-authoritative commands, PostgreSQL (Neon), Vercel deployment and a new public GitHub repository. Reuse suitable OpenFront core algorithms with AGPL notices; exclude proprietary assets and existing frontend.

## Confirmed visual commitments
Original dark-ink/parchment identity, Turkish UI, map-first screen, touch pan/zoom and bottom action sheets. Bottom navigation: Şehirler, Ordu, Hanedan, Bilim. Taste frontend v1 and Impeccable. User explicitly requested a visual mockup before UI implementation, using currently installed skill versions.

User subsequently cancelled image generation and explicitly requested direct implementation. Vercel deployment is owned by the user; deliver a new GitHub repository with source pushed.

## Assumptions to tune through playtesting
Exact initial gold/troop quantities, building costs, tactical multipliers and event odds remain balance parameters rather than hard-coded UI promises. Mockup figures illustrate a hypothetical game, not live data.
