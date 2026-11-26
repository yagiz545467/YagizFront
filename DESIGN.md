---
name: YağızFront
description: A dark-ink strategic atlas with parchment text and brass actions.
colors:
  ink: "#191f1d"
  surface: "#232c27"
  raised: "#2c352e"
  paper: "#eee5d1"
  muted: "#b5bcac"
  brass: "#d0ae76"
  line: "#414c40"
  danger: "#e9a18c"
  green: "#b5c999"
  sea: "#243a38"
typography:
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "16px"
    lineHeight: 1.5
  label:
    fontFamily: "Geist, sans-serif"
    fontSize: "14px"
    fontWeight: 550
rounded:
  button: "7px"
  field: "6px"
  sheet: "16px 16px 0 0"
spacing:
  small: "8px"
  medium: "16px"
  large: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brass}"
    textColor: "#24291f"
    rounded: "{rounded.button}"
    padding: "10px 15px"
  input:
    backgroundColor: "#1d251f"
    textColor: "{colors.paper}"
    rounded: "{rounded.field}"
    padding: "11px 13px"
---

# Design System: YağızFront

## Overview

**Creative North Star: "The Strategic Atlas"**

An ink-and-parchment atlas with restrained brass actions and a dynasty crest. The implemented interface uses compact Turkish controls, flat divided rows and a dominant map. User direction is code-first; image generation was cancelled.

**Key Characteristics:**
- Dark tonal surfaces and parchment text.
- Brass selected states and primary actions.
- Compact management rows around a canvas atlas.

Source: `src/app/globals.css`. Review evidence: `.impeccable/review/desktop.jpg` is a 718×730 capture; mobile visual verification is unavailable. Responsive rules below describe code, not a verified mobile rendering.

## Colors

### Primary
- **Brass:** primary actions, crests, focus rings and active navigation.

### Neutral
- **Ink, surface and raised:** page, resource strip and selected-row layering.
- **Paper and muted:** primary text and supporting labels.
- **Line:** borders and row separators.
- **Sea:** canvas and entry-art background.

Danger and green communicate destructive and ready states. Ownership colors accompany textual map labels.

## Typography

**Body Font:** Geist with sans-serif fallback. Resource quantities use tabular numerals.

Display headlines use restrained negative tracking and medium weight. Entry display scales from 44–72px on wide layouts, with explicit smaller-screen overrides. Panel headings are 28px, or 27px at the mobile breakpoint. Body text follows the frontmatter; supporting text varies from 10–14px. The implementation does not establish a universal 14px label minimum.

## Layout

The game fills the dynamic viewport: header, resource strip, map workspace, turn bar and bottom navigation. The desktop management panel is 370px wide, 330px at widths up to 900px and 420px from 1500px.

At widths up to 700px, the map takes the workspace and the management panel becomes a bottom sheet capped at 89% height. Navigation accounts for the bottom safe area. Entry and lobby layouts stack at 900px. Spacing uses repeated 8px, 16px and 24px increments with component-specific adjustments.

## Elevation & Depth

Most surfaces use borders and tonal layers. The mobile sheet adds a structural upward shadow (`0 -12px 35px #17241a44`); entry headings use text shadows for map legibility.

## Shapes

Controls have gently rounded corners; the mobile sheet rounds only its upper corners. The recurring crest has a shield-like curved base. Divided action rows remain flat.

## Components

- **Buttons:** outlined by default; brass primary variant. Default minimum height is 44px, with smaller contextual overrides. Hover changes fill and border; press scales to 98%. Focus uses a brass 2px outline offset by 4px. Disabled opacity is 42%.
- **Inputs:** dark inset fill, line border, 48px minimum height and 16px text.
- **Navigation:** muted inactive labels; active brass text, darker fill and a top indicator. Mobile buttons stack icon above text.
- **Management sheet:** explicit close control and scrollable content. Entrance takes 250ms with `cubic-bezier(.16,1,.3,1)`; reduced-motion settings disable animations and transitions.
- **Notices and rows:** tonal notices group explanatory content; separated rows carry actions and city data.

## Do's and Don'ts

### Do:
- **Do** reuse the implemented semantic colors and visible focus treatment.
- **Do** pair territorial colors with labels.
- **Do** respect reduced motion and mobile safe areas.

### Don't:
- **Don't** replace the atlas identity with neon, glass effects or ornamental fantasy frames.
- **Don't** describe untested mobile layouts as visually verified.
