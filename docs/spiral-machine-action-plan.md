# Spiral Machine Website: Codex Action Plan

## Project goal

Build a responsive personal website as an interactive **hand-drawn inventor’s notebook machine**.

On desktop, the homepage presents a **floating spiral machine hero** with subtle idle motion. No section text is visible at first. User interaction with gears, belts, modules, or hotspots reveals content panels for:

* Workbench
* Daily Sketch
* To-Dos
* Hacker News Pulse
* Calendar
* Find Me

On mobile, the composition **unwinds into a horizontal machine strip** made of connected modules.

The build should favor:

* layered raster assets with transparency
* CSS transforms and transitions
* lightweight JS for interaction state
* graceful progressive enhancement
* accessible HTML content layered over illustrated frames

---

## Core creative rules

1. Keep the aesthetic **grayscale, notebook-like, hand-drawn, textured**.
2. Avoid brassy/golden steampunk styling.
3. The machine itself is the navigation system.
4. Idle state should feel alive but restrained:

   * occasional steam
   * tiny gear motion
   * subtle floating / breathing
   * tiny indicator flickers
5. All readable text content should be **live HTML**, not baked into artwork.
6. Raster illustrations may provide the heavy look, while HTML/CSS/JS controls layout, accessibility, and interaction.

---

## Deliverables Codex should create

### Files

```text
/index.html
/styles/
  base.css
  layout.css
  machine.css
  animations.css
  mobile.css
/scripts/
  app.js
  machine-state.js
  panel-controller.js
/assets/
  paper-grid-bg.png
  machine-shadow.png
  spiral-machine-base.png
  steam-top.png
  steam-mid.png
  steam-bottom.png
  gear-cluster-top.png
  todo-belt-overlay.png
  calendar-wheel-overlay.png
  findme-terminal-overlay.png
  hn-pulse-frame.png
  panel-blank.png
  panel-sketch.png
  panel-todos.png
  panel-news.png
  panel-calendar.png
  panel-findme.png
  mobile-strip-base.png
```

Codex may use placeholders for missing assets, but all filenames and DOM hooks should be ready.

---

## Phase 1: Build the semantic HTML skeleton

Create one semantic page with:

* a `header` for title / identity
* a `main` containing the machine experience
* one semantic `section` per module
* live HTML content inside each section
* an accessible fallback layout when images or JS fail

### Required structure

```html
<body>
  <div class="site-shell">
    <header class="site-header">
      <h1>Adam Jones’ Daily Computing Engine</h1>
      <p>Campbell River Laboratory · Model AJ-02</p>
    </header>

    <main class="machine-experience" data-mode="desktop">
      <section class="machine-scene" aria-label="Interactive machine navigation">
        <!-- layered art stack -->
        <!-- hotspots -->
        <!-- machine content panels -->
      </section>

      <section id="daily-sketch" class="content-module" data-module="sketch">
        <!-- live HTML content -->
      </section>

      <section id="workbench" class="content-module" data-module="workbench">
        <!-- live HTML content -->
      </section>

      <section id="todos" class="content-module" data-module="todos">
        <!-- live HTML content -->
      </section>

      <section id="hn-pulse" class="content-module" data-module="news">
        <!-- live HTML content -->
      </section>

      <section id="calendar" class="content-module" data-module="calendar">
        <!-- live HTML content -->
      </section>

      <section id="find-me" class="content-module" data-module="findme">
        <!-- live HTML content -->
      </section>
    </main>
  </div>
</body>
```

### Accessibility rules

* Every interactive hotspot must be a real `button`.
* Panels must be keyboard reachable.
* Use `aria-expanded`, `aria-controls`, and `aria-hidden` correctly.
* Respect `prefers-reduced-motion`.
* All important content must remain accessible without animation.

---

## Phase 2: Create the layered machine scene

The machine scene should behave like a stacked illustration.

### Required layer order

```text
1. notebook drift background
2. grid paper
3. machine shadow
4. spiral machine base
5. steam overlays
6. gear overlays
7. module overlays
8. reveal panels / content windows
9. hotspot buttons
```

### Suggested DOM structure

```html
<section class="machine-scene" aria-label="Interactive machine navigation">
  <div class="machine-stage">
    <img class="layer bg-grid" src="assets/paper-grid-bg.png" alt="" />
    <img class="layer machine-shadow" src="assets/machine-shadow.png" alt="" />
    <img class="layer machine-base desktop-only" src="assets/spiral-machine-base.png" alt="" />

    <img class="layer steam steam-top" src="assets/steam-top.png" alt="" />
    <img class="layer steam steam-mid" src="assets/steam-mid.png" alt="" />
    <img class="layer steam steam-bottom" src="assets/steam-bottom.png" alt="" />

    <img class="layer overlay gear-top" src="assets/gear-cluster-top.png" alt="" />
    <img class="layer overlay todo-belt" src="assets/todo-belt-overlay.png" alt="" />
    <img class="layer overlay calendar-wheel" src="assets/calendar-wheel-overlay.png" alt="" />
    <img class="layer overlay findme-terminal" src="assets/findme-terminal-overlay.png" alt="" />
    <img class="layer overlay hn-pulse-frame" src="assets/hn-pulse-frame.png" alt="" />

    <div class="panel-layer">
      <article id="panel-sketch" class="panel panel-sketch" hidden></article>
      <article id="panel-workbench" class="panel panel-workbench" hidden></article>
      <article id="panel-todos" class="panel panel-todos" hidden></article>
      <article id="panel-news" class="panel panel-news" hidden></article>
      <article id="panel-calendar" class="panel panel-calendar" hidden></article>
      <article id="panel-findme" class="panel panel-findme" hidden></article>
    </div>

    <div class="hotspot-layer">
      <button class="hotspot hotspot-sketch" data-target="sketch" aria-controls="panel-sketch" aria-expanded="false">Open Daily Sketch</button>
      <button class="hotspot hotspot-workbench" data-target="workbench" aria-controls="panel-workbench" aria-expanded="false">Open Workbench</button>
      <button class="hotspot hotspot-todos" data-target="todos" aria-controls="panel-todos" aria-expanded="false">Open To-Dos</button>
      <button class="hotspot hotspot-news" data-target="news" aria-controls="panel-news" aria-expanded="false">Open Hacker News Pulse</button>
      <button class="hotspot hotspot-calendar" data-target="calendar" aria-controls="panel-calendar" aria-expanded="false">Open Calendar</button>
      <button class="hotspot hotspot-findme" data-target="findme" aria-controls="panel-findme" aria-expanded="false">Open Find Me</button>
    </div>
  </div>
</section>
```

---

## Phase 3: Position the desktop modules

Desktop is a **hero sculpture**, not a normal page grid.

### Module map

* Top node: Idea Orbit (non-content hero signal)
* Upper-left / upper band: Daily Sketch
* Mid band: Workbench
* Middle conveyor: To-Dos
* Mid-lower signal station: Hacker News Pulse
* Lower regulator: Calendar
* Bottom base: Find Me

### Implementation notes

* Use a relatively positioned `.machine-stage`.
* Absolutely position art layers and hotspots within it.
* Use CSS custom properties for all module coordinates.
* Keep the stage inside a responsive container with a max width.

Example:

```css
:root {
  --stage-w: min(92vw, 1100px);
  --stage-h: calc(var(--stage-w) * 1.25);

  --idea-x: 50%;
  --idea-y: 8%;
  --sketch-x: 24%;
  --sketch-y: 21%;
  --workbench-x: 36%;
  --workbench-y: 36%;
  --todos-x: 49%;
  --todos-y: 52%;
  --news-x: 55%;
  --news-y: 65%;
  --calendar-x: 49%;
  --calendar-y: 79%;
  --findme-x: 49%;
  --findme-y: 92%;
}
```

Codex should use custom properties and not hardcode everything inline.

### Desktop coordinate map

Use a normalized stage coordinate system where:

* `0% 0%` = top-left of the desktop machine stage
* `100% 100%` = bottom-right of the desktop machine stage
* hotspot coordinates mark the **interaction center**
* panel anchors mark the preferred **panel origin point**

#### Desktop module coordinates

| Module            | Hotspot center `(x,y)` | Preferred panel anchor | Panel direction | Notes                                                                            |
| ----------------- | ---------------------- | ---------------------- | --------------- | -------------------------------------------------------------------------------- |
| Idea Orbit        | `50%, 8%`              | `56%, 10%`             | right/down      | Mostly decorative hero signal; can animate but does not need large content panel |
| Daily Sketch      | `24%, 21%`             | `16%, 27%`             | left/down       | Anchor near drawing arm / sketch plate                                           |
| Workbench         | `36%, 36%`             | `19%, 39%`             | left/down       | Largest project panel; allow more width                                          |
| To-Dos            | `49%, 52%`             | `58%, 49%`             | right/up        | Conveyor interaction; panel can slide out to right                               |
| Hacker News Pulse | `55%, 65%`             | `66%, 62%`             | right/up        | Radar + ticker; detail panel should reveal to right                              |
| Calendar          | `49%, 79%`             | `60%, 77%`             | right/up        | Compact date/agenda panel                                                        |
| Find Me           | `49%, 92%`             | `62%, 89%`             | right/up        | Contact panel near base terminal                                                 |

#### Desktop hotspot sizes

These are suggested interactive hit areas, not the visible art dimensions.

| Module            | Hotspot width | Hotspot height | Shape        |
| ----------------- | ------------- | -------------- | ------------ |
| Daily Sketch      | `16%`         | `9%`           | rounded-rect |
| Workbench         | `18%`         | `10%`          | rounded-rect |
| To-Dos            | `14%`         | `8%`           | rounded-rect |
| Hacker News Pulse | `18%`         | `10%`          | rounded-rect |
| Calendar          | `14%`         | `8%`           | rounded-rect |
| Find Me           | `16%`         | `8%`           | rounded-rect |

#### Desktop panel size guidance

| Panel             | Width   | Max width | Notes                          |
| ----------------- | ------- | --------- | ------------------------------ |
| Daily Sketch      | `26rem` | `34vw`    | include image and note         |
| Workbench         | `30rem` | `38vw`    | allow featured project + links |
| To-Dos            | `22rem` | `28vw`    | checklist style                |
| Hacker News Pulse | `24rem` | `30vw`    | top stories / selected story   |
| Calendar          | `20rem` | `24vw`    | agenda compact                 |
| Find Me           | `18rem` | `22vw`    | icon links + short text        |

### Desktop CSS variable blueprint

```css
:root {
  --idea-x: 50%;
  --idea-y: 8%;
  --idea-panel-x: 56%;
  --idea-panel-y: 10%;

  --sketch-x: 24%;
  --sketch-y: 21%;
  --sketch-panel-x: 16%;
  --sketch-panel-y: 27%;

  --workbench-x: 36%;
  --workbench-y: 36%;
  --workbench-panel-x: 19%;
  --workbench-panel-y: 39%;

  --todos-x: 49%;
  --todos-y: 52%;
  --todos-panel-x: 58%;
  --todos-panel-y: 49%;

  --news-x: 55%;
  --news-y: 65%;
  --news-panel-x: 66%;
  --news-panel-y: 62%;

  --calendar-x: 49%;
  --calendar-y: 79%;
  --calendar-panel-x: 60%;
  --calendar-panel-y: 77%;

  --findme-x: 49%;
  --findme-y: 92%;
  --findme-panel-x: 62%;
  --findme-panel-y: 89%;
}
```

### Mobile coordinate map

Mobile should use an **unwound horizontal strip** with each module treated as a station in a scroll-snap conveyor.

Use a normalized per-module coordinate system where each module card is its own local canvas.

#### Mobile module order

1. Idea Orbit
2. Daily Sketch
3. Workbench
4. To-Dos
5. Hacker News Pulse
6. Calendar
7. Find Me

#### Mobile module sizing guidance

* each module width: `88vw`
* min height: `20rem`
* gap between modules: `2rem`
* panel drawers should expand inline below the module art

#### Mobile per-module local coordinates

| Module            | Hotspot center `(x,y)` inside module | Drawer origin | Notes                             |
| ----------------- | ------------------------------------ | ------------- | --------------------------------- |
| Idea Orbit        | `52%, 28%`                           | `50%, 80%`    | mostly hero / intro               |
| Daily Sketch      | `34%, 50%`                           | `50%, 90%`    | tap drawing plate or arm          |
| Workbench         | `48%, 52%`                           | `50%, 92%`    | main projects drawer              |
| To-Dos            | `52%, 50%`                           | `50%, 92%`    | list drawer below belt            |
| Hacker News Pulse | `56%, 48%`                           | `50%, 92%`    | stories drawer below radar/ticker |
| Calendar          | `52%, 50%`                           | `50%, 92%`    | agenda drawer                     |
| Find Me           | `50%, 52%`                           | `50%, 92%`    | contact drawer                    |

#### Mobile interaction guidance

* no hover dependency
* tapping the module should toggle its drawer
* drawers should push content downward rather than overlap heavily
* keep hotspot hit areas large: minimum `44px` logical touch target

### Recommended panel anchoring logic

Codex should implement panel placement using translated percentages from CSS variables instead of brittle pixel offsets.

Example:

```css
.panel[data-module="todos"] {
  left: var(--todos-panel-x);
  top: var(--todos-panel-y);
  transform: translate(-10%, -50%) scale(0.96);
}

.scene.is-open-todos .panel[data-module="todos"] {
  transform: translate(0, -50%) scale(1);
}
```

### Recommended hotspot anchoring logic

```css
.hotspot[data-target="news"] {
  left: var(--news-x);
  top: var(--news-y);
  width: 18%;
  height: 10%;
  transform: translate(-50%, -50%);
}
```

### Collision / overflow rules

Codex should ensure:

* panels never clip outside the stage on common desktop widths
* if viewport width is below comfortable overlap threshold, switch panel behavior to centered modal-like reveal or move earlier to mobile layout
* workbench and HN panels get priority for width
* calendar and find-me panels stay compact

---

## Phase 4: Build the panel system

The machine should reveal content only after interaction.

### Behavior rules

* On first load: no content panels visible.
* On hover/focus/tap: targeted mechanism subtly reacts.
* On click/tap/Enter/Space: associated panel opens.
* Only one major panel open at a time on desktop.
* On mobile, allow inline expansion per module.

### Panel mechanics by section

#### Daily Sketch

* Trigger: drawing arm / sketch plate
* Motion: small arm twitch, paper slide, panel unfold
* Content: latest sketch image, note, link

#### Workbench

* Trigger: central plate or large bracket
* Motion: latch unlock, blueprint tray opens
* Content: projects, experiments, featured builds

#### To-Dos

* Trigger: conveyor or checkbox gear
* Motion: belt scrolls, checkboxes step, panel slides out
* Content: tasks list

#### Hacker News Pulse

* Trigger: radar dish / signal gauge / ticker
* Motion: dish sweeps faster, indicator blinks, ticker engages, side panel reveals
* Content: top stories, categories, links

#### Calendar

* Trigger: date wheel / time regulator
* Motion: wheel ticks, date flips, panel lifts
* Content: schedule items, next event, agenda

#### Find Me

* Trigger: terminal / signal port
* Motion: indicator pulse, switch click, contact panel expands
* Content: links and contact methods

---

## Phase 5: CSS architecture

Codex should separate CSS into focused files.

### `base.css`

* reset / sensible defaults
* font setup
* colors and CSS variables
* reduced motion defaults

### `layout.css`

* overall page structure
* desktop and mobile containers
* fallback content layout

### `machine.css`

* layer positioning
* stage sizing
* hotspot positions
* panel anchoring

### `animations.css`

* steam drift
* gear spin
* float/breathe
* panel reveal
* radar sweep
* belt scroll

### `mobile.css`

* switch from spiral hero to horizontal strip
* touch-first module behavior
* type scale adjustments

### Required design tokens

```css
:root {
  --paper: #f2f1ec;
  --paper-grid: rgba(60, 60, 60, 0.08);
  --ink: #2d2d2b;
  --ink-soft: rgba(45, 45, 43, 0.65);
  --panel-bg: rgba(250, 248, 242, 0.92);
  --shadow: rgba(0, 0, 0, 0.18);
  --glow-soft: rgba(255, 255, 255, 0.45);
  --motion-fast: 180ms;
  --motion-med: 320ms;
  --motion-slow: 900ms;
  --ease-mech: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

No bright saturated colors unless used in an optional future accent layer.

---

## Phase 6: Idle animation system

Idle motion must be subtle and non-annoying.

### Always-on motions

* machine stage: tiny vertical breathing motion
* top gear overlay: slow rotation
* steam layers: low-opacity drifting
* shadow: slight pulse
* HN radar: occasional soft sweep
* signal lights: tiny intermittent flicker

### Example animations

```css
@keyframes breathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-4px) scale(1.002); }
}

@keyframes slowSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes steamDrift {
  0% { transform: translate3d(0, 0, 0); opacity: 0.10; }
  50% { opacity: 0.18; }
  100% { transform: translate3d(14px, -10px, 0); opacity: 0.08; }
}
```

### Reduced motion requirement

If `prefers-reduced-motion: reduce`, Codex must:

* disable looping movement
* keep only essential opacity changes
* keep interactions direct and quick

---

## Phase 7: Interaction model in JS

Use lightweight JS. No framework needed for v1.

### Required files

#### `machine-state.js`

Owns app state:

* current mode: desktop or mobile
* active panel id
* reduced motion state
* hovered module

#### `panel-controller.js`

Owns panel open/close logic:

* open selected panel
* close others when needed
* update `aria-expanded`
* update classes on scene root

#### `app.js`

Bootstraps everything:

* query DOM
* bind events
* initialize mode
* handle resize changes

### State model

```js
const machineState = {
  mode: 'desktop',
  activePanel: null,
  reducedMotion: false,
  hoveredModule: null,
};
```

### Required interactions

* mouseenter / mouseleave on hotspots
* focus / blur on hotspots
* click on hotspots
* Escape closes open panel
* resize recalculates mode
* tap should work on touch devices without requiring hover

### CSS class strategy

When a module activates, add scene classes like:

```text
is-hovering-todos
is-open-news
is-open-calendar
```

Codex should use these classes to trigger animation changes.

---

## Phase 8: Mobile unwound machine

Mobile should not attempt a dramatic real-time geometric unravel animation.

Instead, Codex should render a **dedicated mobile composition** that looks like the spiral has already unwound into a horizontal machine strip.

### Mobile strategy

* Replace the desktop spiral hero with a horizontally scrollable strip.
* Use CSS media queries and optionally switch image assets.
* Each module occupies roughly 80–100vw width.
* Use scroll snapping.
* Module content expands inline inside or below each module.

### Structure

```html
<section class="mobile-machine-strip" aria-label="Mobile machine strip">
  <div class="mobile-strip-track">
    <article class="mobile-module module-idea"></article>
    <article class="mobile-module module-sketch"></article>
    <article class="mobile-module module-workbench"></article>
    <article class="mobile-module module-todos"></article>
    <article class="mobile-module module-news"></article>
    <article class="mobile-module module-calendar"></article>
    <article class="mobile-module module-findme"></article>
  </div>
</section>
```

### Mobile behavior

* horizontal swipe
* snap per module
* tap module to reveal content drawer
* keep steam and gear motion lightweight
* avoid overcrowded annotations

### CSS essentials

```css
.mobile-strip-track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 88vw;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  gap: 2rem;
}

.mobile-module {
  scroll-snap-align: center;
}
```

---

## Phase 9: Live content inside panels

Codex should populate panels with semantic placeholder content and leave clear comments for replacement.

### Daily Sketch panel

* title
* sketch image placeholder
* 1–2 sentence note
* action link

### Workbench panel

* featured builds list
* experiments list
* one highlighted project card

### To-Dos panel

* checkbox list
* task metadata
* quick filters placeholder

### Hacker News Pulse panel

* top 3 stories
* source / points / comments placeholders
* categories or tags

### Calendar panel

* upcoming events list
* today summary
* date badge

### Find Me panel

* icon links
* short intro
* external destinations

All content must be editable in plain HTML.

---

## Phase 10: Hacker News Pulse module specifics

This module deserves extra care.

### Required visual parts

* radar dish frame
* signal strength gauge
* category toggles
* ticker lane
* reveal panel opening

### Required interactions

#### Idle

* dish slow sweep
* indicator flicker
* gauge twitches rarely

#### Hover / focus

* dish speeds slightly
* ticker glows subtly
* one category toggle brightens

#### Open

* ticker lane begins short movement
* side panel slides out
* stories fade in one by one

### HTML overlay zones

Codex should build live text overlays inside:

```html
<div class="hn-pulse-module">
  <div class="hn-frame-art"></div>
  <div class="hn-ticker-window">
    <ul class="hn-ticker-list">
      <li>Story headline placeholder</li>
      <li>Story headline placeholder</li>
      <li>Story headline placeholder</li>
    </ul>
  </div>
  <aside class="hn-detail-panel">
    <h3>Top signals</h3>
    <ol>
      <li>Story placeholder</li>
      <li>Story placeholder</li>
      <li>Story placeholder</li>
    </ol>
  </aside>
</div>
```

No story text should be burned into the art layer.

---

## Phase 11: Asset loading and fallbacks

Codex should assume some assets may be missing initially.

### Rules

* Use image placeholders gracefully.
* Keep layout functioning if an asset fails.
* Avoid layout shift by assigning width/height or aspect-ratio.
* Each asset wrapper should have a fallback background color or outline.

Example:

```css
.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: auto;
  object-fit: contain;
  pointer-events: none;
}
```

---

## Phase 12: Build order for Codex

Codex should implement in this exact order.

### Step 1

Set up semantic HTML and CSS file structure.

### Step 2

Create desktop machine stage with placeholder layer boxes and correct stacking.

### Step 3

Add actual asset hooks and image elements.

### Step 4

Position hotspots over the stage.

### Step 5

Implement panel open/close logic with one open panel at a time.

### Step 6

Add idle motion and hover states.

### Step 7

Implement Hacker News Pulse module interactions.

### Step 8

Create dedicated mobile horizontal strip layout.

### Step 9

Add reduced-motion support and keyboard support.

### Step 10

Polish spacing, transitions, and fallback behavior.

---

## Acceptance criteria

Codex is done when:

* desktop shows floating spiral machine with layered art
* no panels are visible on initial load
* hovering/focusing a module causes subtle machine response
* activating a module reveals the correct panel
* only one desktop panel is open at once
* mobile shows a horizontal unwound machine strip
* mobile modules open inline cleanly
* all text content is real HTML
* animations are subtle and reduced-motion safe
* the page remains usable if assets or JS fail

---

## Notes for Codex

* Build for clarity first, polish second.
* Keep class names human-readable.
* Use CSS custom properties extensively.
* Do not over-engineer with frameworks.
* Favor progressive enhancement.
* Preserve the illusion that the machine is operating the UI.
* The result should feel like an **interactive inventor’s notebook machine**, not a normal website wearing a costume.
