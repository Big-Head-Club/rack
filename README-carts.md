# Hundred Carts

Site for the 100 games in 100 days project, with the cartridge as the unit instead of the tin
(see `../hundred-tins`). A hundred slots in a rack. Today's game arrives as a cartridge
standing in the console at the bottom of the page; push it in and the light takes over.

`index.html` carries the ten shells inline and opens from disk; the per-game label photographs
live beside it in `art/games/`, and `about.html` and `resources.html` are the two other pages.
`server.js` serves those and hands the rack to every other path, which is what keeps the
tray's `?sub=` bounce working.

**Every cart is a real game**, and seating one launches it: the address travels with the cart
and the page navigates at the peak of the light, so the takeover is the loading screen.
Pulling the cart back out before then cancels it. `tools/games.json` is the whole list — every
live game on the [build ledger](https://build-ledger-production.up.railway.app/), in the order
they were started, a slug, a name and a URL each — and `tools/rebuild.js` writes it into the
page as `GAMES`. `DAY` is derived from its length. The slugs are what the tray sends back as
`?sub=`, so a game that already loads `bar.js` keeps the slug it was given (`hex-smash`, not
the repo's `energy-grid`).

## Every label is the game

The ten shells came with ten stock photographs on their labels. Now that every cart is a game,
the label shows that game: the ledger already keeps a **plate** for every project — a
photograph of it running, shot by `tools/plates.mjs` over there — and `tools/plate-cart.js`
prints it into the shell's photo window.

- **The window is set by hand**, in `art/cut/labels.json`. Detecting it as "pixels far from
  the shell colour" worked on the pale shells and failed on every dark one, where the shadowed
  plastic is as far from the shell's sampled colour as the label is. Ten rectangles read off
  `art/proof.png` took less time than the third attempt would have.
- **The plate is not cropped.** It is 4:3 and the window is portrait, so the plate sits at the
  top at the window's full width and the rest of the window is a band in the plate's own
  bottom colour — which is what a printed label looks like anyway, picture up top, colour
  block under it. The first pass cropped 8% off each side to show more picture, and the plates
  that are mostly a title lost the title: `PATIENT ZERO` became `IENT ZERO`.
- **Lit from the upper left** with a gradient over the pasted picture and a hairline darker at
  its edge, because the shell is; a flat paste floats.
- **Two games keep the stock label** (`plate: false`): Telegram Dailies and Hole in Zero,
  whose web address is the template's landing page, so their plate says SOLID TMA and nothing
  about the game.
- **Not inlined.** Sixty-odd carts at 30KB would put two megabytes of base64 in front of the
  first paint. They are files under `art/games/` and the page references them by path, which
  still opens from disk. The ten shells stay inline because their masks are shared.

Order of operations when a game arrives: add it to `tools/games.json`, shoot its plate on the
ledger (`node tools/plates.mjs <slug>` there), then here `node tools/plate-cart.js <slug>` and
`node tools/rebuild.js`. The tool works from the committed `rgb-cart-*.jpg`, so a fresh clone
does not need the cut pipeline below to add a cart.

## The cart pipeline

The carts are Midjourney photographs, not illustration. Locked prompt suffix — only the
colourway and the label motif vary:

```
<colourway> plastic shell, printed label showing <motif>, vintage 1990s handheld video game
cartridge alone with no console, photographed from directly overhead, tall portrait cartridge
with rounded upper corners and a wide ridged plastic grip along the bottom edge, glossy
printed paper label sticker filling the upper two thirds slightly scuffed at one corner,
injection moulded plastic with fine scratches and faint dust, small moulded notch, centred and
filling the frame, single soft key light from upper left, hard shallow shadow, matte dark
charcoal surface, macro product photography, sharp focus, high detail, no text, no lettering,
no words --ar 4:5 --style raw
```

`alone with no console` earns its place — without it MJ hands back a handheld with a cart in
it. No text on the label: MJ cannot letter, and the readout carries the game's name anyway.
Prefix each prompt with a unique slug (`cartwhale.` etc.) so the feed can be mapped back to
prompts by requiring exactly one slug in an ancestor's text.

### Getting them onto the page

1. Download the 640px webps from the MJ feed → `art/raw/cart-<name>-<0..3>.webp`
2. `sips -s format png` each one (`tools/png.js` is a PNG-only decoder)
3. `node tools/sheet.js` → `art/sheet.png`, a 4-wide contact sheet to pick one per colourway
4. Copy the picks to `art/cart-<name>.png`
5. `node tools/cut-cart.js` → for each cart an RGBA proof, an RGB-with-bleed, and a mask
6. `node tools/proof.js` → `art/proof.png`, the cutouts over hot magenta
7. `sips -s format jpeg -s formatOptions 78` over `art/cut/rgb-cart-*.png`
8. `node tools/rebuild.js` inlines the jpeg+mask pairs into `index.html`

**Pick for ground contrast, not just for the cart.** Three of the first picks had to be swapped
purely because MJ had put a good cart on a ground its own colour, and the cut-out came back
wearing pieces of it. A duller cart on a cleanly separated ground beats a better cart that the
matte cannot find.

### Cutting a cartridge out

A tin lid can be clipped with `border-radius` because it *is* a rounded square. A cartridge is
not: big radius at the top, almost none at the bottom, a ridged grip, a moulded notch. Any
radius that hides the ground in the corners also eats plastic, so the shape has to come out as
real alpha. Two obvious methods failed first:

- **Flood fill from the frame** with a local step tolerance leaked through the shell on 7 of
  10 carts. Macro photography puts a several-pixel soft ramp on every edge, and a walk that
  only ever compares neighbours walks straight up it.
- **The tin crop's "first step clearing half the scanline's peak"** put the red cart's left
  edge 40px inside the plastic. On a tin the rim is the hardest step in the frame; on a
  cartridge the label's printed border is far harder than the shell's own shadowed edge, and
  half of *that* peak is a bar the real edge never reaches.

What separates plastic from ground here is **colour, not luminance** — dark red shell against
charcoal is a 120-point colour distance and barely a 40-point luminance one. So:

- The ground is modelled per scanline, as a straight line between the two ends of each row and
  of each column, averaged. That absorbs MJ's light gradient exactly, where a global distance
  from a sampled corner marks the whole shadow side as foreground.
- The outline is taken at a *high* distance threshold — the confident interior of the plastic,
  not its soft outer ramp. Losing a pixel or two of edge is the right trade: a tight cut
  leaves no charcoal fringe, and a fringe is the one artefact that makes these read as pasted
  on rather than photographed.
- The silhouette is forced row-convex and column-convex. A cartridge is one unbroken span at
  every height and width, so filling between the outermost confident pixels closes the dark
  label, the notch and the grip ridges in a single step.
- **Shadow needs its own test, used only as an erosion.** The cast shadow is 90-plus away from
  the ground it falls on, so two shells came out wearing a lumpy black skirt. A shadow is the
  one thing darker than the ground in every channel *without* being any more colourful than
  it. Testing that instead of the distance shreds the outline — on a near-black shell it fires
  inside the plastic too and the spans comb. Walking inward from an endpoint the distance test
  already found, it just trims the skirt and stops at the first lit bevel. The two near-black
  shells still need a shallower trim than the rest (`ERODE_BY` in `tools/cut-cart.js`).

### Two files per cart, not one

Inlining ten RGBA PNGs put 1.5MB of base64 in the HTML. A JPEG plus a grey+alpha mask used as
a CSS `mask-image` is a quarter of that and sharper per byte, because the transparent surround
stops paying for photographic entropy. Notes that matter:

- `mask-image` reads a PNG's **alpha**, not its luminance, so the mask is colour type 4
  (grey+alpha) with the grey channel flat at zero — a plain greyscale silhouette masks nothing.
- The shell colour is **bled outward** before the JPEG is written. Black outside the silhouette
  rings along every edge, and the ringing lands inside the mask where it shows.
- `tools/png.js` gained adaptive row filters. The RGB writer's constant filter-0 was costing
  190KB a cart.

## The light takes the cart's colour

Every cut samples its own shell: a band just inside the left and right edges of the silhouette,
which is always plastic (anything nearer the middle is label, and the labels are all dark
scenery — averaging a whole cart returns the same murky brown for all ten). It takes a whole
pixel at the 72nd percentile of brightness rather than the median of each channel separately,
because one keeps the shell's hue and the other averages the lit face and the shadowed edge
into a colour the cart does not have anywhere on it. The result is written to
`art/cut/shell.json` and inlined as `c` on each cart.

The page keeps only the hue and a fraction of the chroma — plastic is far too dark and
saturated to flood a screen with. The glow's core stays blown-out white whatever is playing and
the falloff carries the colourway, so the red cart takes the screen warm and the teal one cold,
and the bone and near-black ones take it honestly white, which is correct: they have no colour
to lend.

## The tray

`bar.js` is served from this site and every other game loads it with one line:

```html
<script defer src="https://hundred-carts-production.up.railway.app/bar.js"
        data-game="gorgon" data-name="GORGON"></script>
```

It gives a game the two controls the whole set shares — **EJECT**, the way back to the shelf,
and **SUBSCRIBE**, which puts the game in your stream. Notes that matter:

- **It renders in a shadow root.** These are twenty different codebases with twenty different
  stylesheets, and a drop-in that inherits any of them is a drop-in that breaks somewhere.
- **It is a tag on the left edge, not a bar across the top.** Most of these games are a canvas
  filling the viewport; anything spanning the top covers somebody's score. Spine-set text keeps
  it under 40px wide.
- **Subscribing bounces through the menu.** The stream belongs to this origin and browsers
  partition third-party storage, so a game cannot write to it from inside itself. The button
  carries the slug here as `?sub=<slug>&back=<url>`, this end records it and sends the player
  straight back. The trip is invisible.
- **Keeping a cart and subscribing to its game are one act** — a kept cart reopens forever,
  which is what a subscription is — so there is one list in `localStorage` under
  `carts.stream`, and the punch mark on a tile is what it looks like.
- `document.currentScript` is read with a `script[data-game]` fallback, because across that
  many codebases one of them will load it some way that clears it.

## Sound

Synthesised with Web Audio, never sampled — a self-contained page cannot carry an audio file
without doubling its weight, and the whole event is four gestures anyway: the shell running
down its guides, the contacts seating, the machine coming up through an opening filter, and
the chord the light arrives on. All of it is **scheduled on the audio clock**, not with
`setTimeout`, so the seat lands with the cart and the chord with the white; timers drift
against both. The shape is riser → seat → surge → **impact**: a sub dropping 150→32 Hz under a
filtered boom, a nine-voice stack from C2 to C5 with each voice opening a little later than the
one below it, and a shimmer that arrives late and outlasts everything. Voices are panned in
pairs so the chord has width. The reverb is a generated impulse response (exponentially decaying stereo
noise) wired permanently to the master, with a per-sound send — connecting a shared convolver
to a fresh gain on every call leaks connections. One glyph in the console's corner mutes it.

## Two views

A toggle under the count switches the rack between **ALL CARTS** — the shelf as it fills,
including tomorrow's ghost and the empty slots that finish the row — and **YOUR FEED**, only
the carts you subscribed to, with no ghost and no fillers because nothing arrives in it on its
own. The choice persists in `localStorage` under `carts.view`. An empty feed says `NOTHING
KEPT` rather than showing a blank grid.

Both counts are true at once — a hundred carts are coming, and some number of them are yours
— so the switch is a pair of equals rather than a filter hung off the side of the grid.

## The rack does not draw a hundred slots

Ninety-odd empty boxes is a very long scroll that says nothing a line cannot, and it buries
the carts that actually exist. The grid draws what has arrived, tomorrow's as a dimmed ghost
at the head of the queue, and only enough empty slots to **finish the row it is standing in**
— so a row always reads as a rack rather than a ragged edge. Nothing under the grid says how
many are still to come: `007 / 100` at the top of the page already does, and a second tally
underneath was one statement of the same fact too many. The column count is CSS's decision
(`auto-fill`), so the script reads it back off `gridTemplateColumns` rather than guessing, and
relays out on resize.

## Page notes

- **The brand is the orange off the tower cartridge** (`#cb470d` light, `#f2812f` dark): the
  accents, the pips, the light the machine sits in, and the tray's spine. The readout stays
  phosphor green — that is a property of the glass, not a choice about the house.

- **Every cart is two layers.** The photo, the mask and that cart's colour grade go on the
  inner element; the outer one carries only the drop-shadow. A filter is applied *before* the
  element's own mask, so a drop-shadow on the masked layer traces the photo's rectangle
  instead of the cartridge. On the parent it sees the cut-out shape.
- **One shell, ten colourways.** MJ gave the ten carts ten slightly different shapes, 0.620
  to 0.703 wide-to-tall, and a shoebox of mismatched mouldings is not what this is — it is one
  system with a hundred games for it. Everything is cut to `--cart-a` (the hare's proportion,
  the narrowest and cleanest) and each photograph is stretched to fill it with
  `background-size:100% 100%`, mask included. Every cut carries the same 5% of air on both
  axes, so filling a common box puts every shell at exactly the same size; the widest gives up
  11% of its width to get there, which is invisible without the original beside it.
  `contain` and per-cart aspect ratios were the previous answer and left the shells 13% apart.
- **The cart's width is the unit the machine is cut from**, and the script writes it in from
  the rack's own column width — capped to what leaves room for the machine underneath it. A
  one-column phone hands over a tile nearly as wide as the window, and a cartridge that wide
  makes the console taller than the viewport: nothing is clipped, but you never see more than
  half a cart at a time. On a desktop the cap is never the binding constraint; on a phone it
  always is. A cartridge is one object, so it has to be the same size
  standing in the machine as it is sitting on the shelf — it was less than half the size, and
  that reads as two different props rather than one thing you picked up and carried down. The
  machine's width, the slot, the readout, the vent and the section's own height are all
  multiples of it, which is why none of the console is expressed in percentages. The column is
  `1fr` of whatever the grid decided, so it is measured rather than recomputed.
- **Empty days are a number and nothing else.** A debossed box for a cart that does not exist
  yet is a lot of furniture for an absence, and at this tile size it read as a hole punched in
  the page rather than a slot waiting to be filled.
- Forcing every image into one 4:5 frame instead padded the narrow shells out to 73% of it,
  and on the page that padding sat over the slot as a black margin around every cart.
- **Nothing may depend on a cart covering something.** The first hero hid a screen recess
  behind the closed cart; the narrowest shell left a quarter of it ringing out either side.
- The console is three bands: the dark mouth behind the cart, the cart, and the near half of
  the surface drawn over it. The slot is a slit only as wide as a cartridge — a full-width
  dark band read as a gap between two surfaces rather than a port.
- **The machine is an object, not a floor.** Both halves are cut to the same centred width
  (`--machine`) so their side walls line up, and neither has a bottom radius: the body runs
  off the end of the document and is simply cut there. Spanning the full width made it read as
  a surface the page was resting on rather than a console poking up out of the bottom.
- **Do not trust a page you have only seen through the artifact viewer**, and do not trust a
  backgrounded Chrome tab either: CSS animations AND transitions do not advance in a hidden
  tab, so the flood reads as opacity 0 forever, a 1.5s travel reads as 0px of travel, and
  screenshots time out mid-transition. Drive it in a focused tab over `python3 -m
  http.server`, or grab `el.getAnimations()[0]`, `pause()` it and set `currentTime` by hand —
  which also reads back the real duration and easing when you need to prove one is applied.
- **An animation on the element you are about to transition will silently eat the
  transition.** The nudge lived on `.cart` and owned the same `transform` the seat transition
  needs; removing the animation in the tick that starts the transition meant Chrome never
  interpolated at all. The cart teleported into the slot and no duration changed anything —
  it looked like an easing problem for days. The nudge now lives on the photo layer inside:
  two layers, two jobs.
- **Every cart in the rack is loadable.** The only tiles that do nothing are the empty slots
  and tomorrow's. Gating on "today or already kept" was inherited from the tins, where a day
  you missed was gone — here it meant hovering a cart, watching it lift, clicking it and
  getting a shrug. A cart not yet in the stream is dimmed a little, not disabled.
- **Loading a cart and starting it are two separate clicks.** Picking one off the rack carries
  it to the console and leaves it standing there nudging; only a second, deliberate click
  seats it. The nudge rests for most of its cycle — a constant loop at the bottom of the page
  is a nag.
- The light has a **source**, and two layers. `--fx/--fy` are written from the mouth's live
  rect at seat time; a fixed glow field BEHIND the machine (z-index 0, with `.page` and
  `.console` lifted to 1) rises first and silhouettes it, and only then does the flood break
  out of the same point in front. A flat fade reads as a page transition; this reads as the
  machine.
- **The page used to recoil** — a small scale-and-fade on `.page` and `.console` as the light
  arrived. It was invisible while the console was a full-width surface and wrong the moment it
  became an object: scaling and fading a stacking context with real edges made every layer
  inside it look like it had come loose. Removed; the light does the work.
- `<meta charset="utf-8">` is not optional — the sound toggle's glyph is the only non-ASCII
  character on the page and it turned into mojibake without it.
- **Always check light mode.**
