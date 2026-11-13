# Ananya & Nemish — Wedding Invitation

A responsive, event-led wedding invitation for **2–3 February 2027** at **Happy Retreats KAI**, Agalagurki, Chikkaballapur, Karnataka, near Bengaluru.

## Pages
- `index.html` — opening envelope, interlocking monogram, countdown, event navigation, family names, venue, and the final RSVP section
- `haldi.html` — Haldi timing, event illustration, decor palette and guest dress palette with hex codes
- `mehendi.html` — Mehendi and acoustic music timings shown separately, event illustration, decor palette and guest dress palette with hex codes
- `wedding.html` — simple wedding invitation timing (**2:00 PM onwards**) and wedding decor / guest dress palettes with hex codes

## Shared assets and behavior
- `styles.css` — responsive editorial styling, typography, RSVP form and music player
- `script.js` — opening interaction, countdown, responsive navigation, RSVP preview validation and official soundtrack player
- `assets/monogram.svg` — interlocking A/N monogram
- `assets/haldi-scene.svg`, `assets/mehendi-scene.svg`, `assets/wedding-scene.svg` — original event illustrations
- `assets/floral-corners.svg` — botanical accents

## Soundtrack
The consistent sound control on all pages uses the official YouTube player for **Jashn-E-Bahaaraa (Instrumental - Flute)** by A. R. Rahman:
https://www.youtube.com/watch?v=-2w18bd-ZQ4

The recording is embedded from the official YouTube release; it is not downloaded, copied or re-hosted here. Guests must tap the sound control to begin playback. A separate full-page navigation reloads the player, so guests may need to tap play again after moving between event pages.

## RSVP
The final homepage section includes a short RSVP preview:
- Title
- Name
- Number of guests (shown when attending)
- Joyfully accept / Regretfully decline
- Optional note

The form validates and displays a local preview confirmation only. It does **not** transmit or save responses yet. Connect a Google Sheets endpoint or database before sending the invitation to guests.

## Accessibility and testing notes
- Invitation copy remains selectable HTML text.
- The opening returns to the top after a full page reload.
- The site respects reduced-motion preferences.
- No RSVP data is persisted by the preview form.
