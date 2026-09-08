# Аян & Аружан — wedding invitation

Open index.html directly in a modern browser. No installation or build is needed.

## Edit before sharing

- Text, names, schedule times, address and photo description: index.html.
- Event date/time, countdown, WhatsApp numbers/message and map URL: CONFIG at the top of script.js.
- All elements marked data-date display CONFIG.eventDate in CONFIG.eventTimezone automatically.
- Replace both example WhatsApp numbers (guest replies and organizer) before sharing.
- Colors and fonts: variables at the top of style.css.
- Photo: assets/invitation-photo.jpg. A monogram design appears if it is unavailable.
- Optional music: add assets/music.mp3 and set musicEnabled to true. Playback begins only after interaction. The music button disappears if the audio cannot load.

Google Fonts are optional; local serif and sans-serif fonts are the offline fallbacks.
The WhatsApp button opens a prepared message; it never sends it automatically.
To restart the envelope animation, reload the page.

## Cinematic animation

After the seal opens, the floral plaque runs a staged 3-second entrance: background,
flowers, frame, names, date and scroll hint. The existing names/date remain unchanged.
Entrance timings and reusable motion classes are at the end of style.css.
JavaScript handles accessible letter splitting, rolling countdown digits, SVG dividers,
visibility-triggered reveals and event-driven parallax without libraries.

The lower-left pause button stops motion. System reduced-motion settings are respected.
Mobile uses four petals and smaller scroll parallax; desktop adds pointer depth.
Background loops pause when the hero is outside the viewport or the tab is hidden.
assets/floral-spray.png is a generated floral composition, displayed using an SVG
neutral-background filter shared by the three layers. Replace both raster and filter
if using a true transparent cutout later.

## Wedding day schedule

The schedule in index.html uses a 100svh sticky scene (minimum 740px) inside a 220svh section. Edit the five
events directly in the ordered list; data-progress places each event along the route.
The final 23:30 event includes the italic Ақ жол label. The inline SVG contains matching
base/progress paths: update both path definitions together when changing the curve.
initWeddingTimeline() uses getTotalLength()/getPointAtLength() to position the heart,
event markers and event labels. Progress rewinds with upward scrolling. Bounds and
path length are cached on opening, resize, font loading and motion preference changes.
Pausing motion (or system reduced motion) displays the entire schedule without a long
sticky section. The location following it is ULUU TOO PREMIUM, Bishkek; the countdown
uses Bishkek's +06:00 offset. CONFIG.mapUrl controls the map destination.

Optional controller checks: `node --test tests/wedding-timeline.test.cjs`.
These cover exact curve sampling, progress, reverse scrolling, activation, motion
preferences and geometry caching; they do not replace visual testing on a phone.

## RSVP, contact and final screen

The questionnaire validates the name, a required yes/no radio choice, and 1–10 guests
(CONFIG.maxGuests). Declining disables the counter and prepares an answer for zero guests;
switching back restores the previous count. No guest information is stored or sent by
the site. A successful submission opens a WhatsApp draft and shows a reusable link in
case popups are blocked. The guest must press Send in WhatsApp. Editing the form clears
the previous prepared answer. CONFIG.organizerWhatsapp controls the separate contact link.

RSVP/contact/farewell motion is handled by initPaperScenes() and the paper-enter classes;
the existing floral asset is tinted burgundy for these sections. The final seal has an
inline SVG fallback. To use your own image, add assets/wax-heart.png and set waxHeartPath.
Optional stamp sound: add assets/stamp.mp3, then enable stampSoundEnabled. Missing optional
assets are not requested by default; blocked audio fails silently.

Run all checks: `node --test tests/rsvp.test.cjs tests/wedding-timeline.test.cjs`.
# Uzatu
