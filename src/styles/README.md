# Styling and themes

`index.css` loads `tokens.css`, `primitives.css`, and `motion.css` after Bootstrap. Component
styles contain only their own layout or interactive details.

## Change the appearance

Edit `tokens.css`. The light palette also supplies the `:root` defaults; each
`[data-theme='name']` block defines a selectable palette. `services/theme.ts` owns the attribute, saved preference,
favicon, and `themeStorage` notification. `main.tsx` restores the preference before
React mounts; the navbar requests changes through the shared controller.

- `--color-page`, `--color-surface`, and `--color-hover` control backgrounds.
- `--color-text`, `--color-muted`, and `--color-disabled` control text.
- `--color-border` and `--color-border-strong` distinguish panels from controls.
- `--color-accent` and `--color-on-accent` form a foreground/background pair.
- Success, warning, caution, and danger tokens cover game feedback and statuses.
- Card-face tokens are separate: red/black suits stay legible on light cards in
  either theme. Color-picker gradients and simulation colors represent actual
  color data, so they deliberately do not follow the UI palette.
- `--content-width`, `--page-gutter`, `--panel-padding`, and `--space-*` set spacing.
- `--radius-panel`, `--radius-control`, and `--radius-card` set corner treatment.
- `--font-body` and `--font-mono` set fonts.
- `--motion-duration` and `--motion-easing` control theme transitions. The current
  duration is deliberately preserved; change it here to tune the entire UI.
- `--interaction-duration` controls modal/card motion and `--disclosure-duration`
  controls dropdown motion independently. All three durations become zero for
  reduced-motion preferences.

For a new palette, add a block to `tokens.css` (or another globally imported CSS
file). No controller or navbar changes are needed:

```css
[data-theme='ocean'] {
    --theme-label: Ocean;
    color-scheme: dark;
    --color-page: #142630;
    --color-surface: #1c3340;
    --color-hover: #294756;
    --color-text: #e2f1f5;
    --color-muted: #a3beca;
    --color-border: #486775;
    --color-border-strong: #7295a5;
    --color-accent: #99d4de;
    --color-on-accent: #142630;
}
```

`themeRegistry.ts` discovers exact root selectors (`[data-theme='name']`,
`:root[data-theme='name']`, or `html[data-theme='name']`) in loaded stylesheets.
Use stable lowercase IDs with hyphens/underscores. Palettes cycle in CSS source
order and wrap to the first. `--theme-label` is optional; its fallback is the ID
with spaces. Repeated selectors update a palette without duplicating it. Keep
palette definitions unconditional and globally loaded; component-specific theme
selectors do not register palettes. Unspecified tokens inherit the light defaults,
so complete dark palettes should override all contrasting UI colors. Saved
palettes restore on startup; a deleted palette falls back to the first.

Use `color-scheme: light` or `dark` for native controls, syntax highlighting, and
the logo/icon treatment. Existing
`--primary-color` / `--bg-color-*` aliases remain for canvas consumers; avoid
adding new aliases or theme-specific component selectors. Use hex palette
values for the text colors read by `readColor()` in canvas renderers.

Code blocks follow `color-scheme` using the light/dark Shiki theme pair in
`components/tools/CodeBlock/CodeBlock.tsx`; callers can still specify a syntax
theme explicitly.

## Reuse the shared primitives

`AppLayout` supplies `.page-shell`, so page components should not add another
percentage width, viewport width, or outer gutter.

```tsx
<section className="demo-layout">
    <figure className="ui-frame">{display}</figure>
    <section className="ui-panel ui-stack demo-controls">{controls}</section>
</section>
```

- `.ui-panel`: themed surface, border, padding, and small corner radius.
- `.ui-frame`: bordered display area with clipped contents. Keep popovers outside.
- `.ui-stack`: vertical flow; customize its `--stack-gap` locally.
- `.ui-cluster`: wrapping row of controls or actions.
- `.demo-layout`: display and controls grid, stacked below 64rem.
- `.ui-full-width`: full-width buttons where the enclosing grid sets their size.

Native controls, number fields, and custom selects share their visual treatment
in `primitives.css`. Keep keyboard focus visible. Use component classes for
layout and genuine exceptions rather than copying the control or panel rules.
Avoid global selectors in route-specific CSS: routes load lazily, and global
rules would otherwise alter pages visited afterward. DataTables needs scoped
`!important` color rules to match its vendor stylesheet.

## Theme transitions and interaction motion

A theme change is one root View Transition, rather than hundreds of independent
CSS color transitions. The old page snapshot stays opaque while the new snapshot
fades over it using `--motion-duration` and `--motion-easing`. Normal blending
avoids additive brightening, and root geometry animation is disabled. This covers
package styles, inherited colors, syntax highlighting, logos, and canvas pixels
without maintaining a list of special selectors. The live DOM switches once.

`services/theme.ts` coordinates the DOM update with a synchronous React commit
and bounded asset decoding. Canvas listeners repaint synchronously on
`themeStorage`; they must not wait for an animation frame because browsers
suspend rendering while capturing the new view. A stalled image cannot strand
the controller. Rapid toggles finish the current fade and then apply the latest queued palette;
interrupting a snapshot would otherwise flash its destination colors. Snapshot failures,
zero duration, hidden documents, unsupported browsers, and reduced motion fall
back to an immediate switch. No screenshot polyfill or DOM overlay is injected.
While fading, the browser displays snapshots of animations/simulations; their
underlying state continues running. The fade does not animate layout.

`motion.css` controls interaction transitions separately. A small layered
`!important` rule overrides vendor presets. Only controls opt into hover color
transitions, using `--interaction-duration`; all element transitions are suppressed during a theme
change so snapshots capture the settled palette. Descendants cannot opt into
separate named view transitions while the root fade is active. Ordinary content has no color
transition, and descendants never inherit animation lists.

For component motion, set `--component-transitions` on the exact element:

```css
.example-popover {
    --component-transitions: opacity var(--disclosure-duration) ease,
                             transform var(--disclosure-duration) ease;
}
```

The property resets on descendants. Use this hook instead of `transition` or
`transition: all`. Modal/card motion uses `--interaction-duration`, dropdowns use
`--disclosure-duration`, and all duration tokens become zero for reduced motion.

## Aligned simulation and advisor layouts

Use `ExperimentDemo` for simulations. The shared `.demo-layout` stretches the
canvas frame and controls to one shared grid row. `DemoFrame` puts canvas content
in absolutely positioned `.demo-frame-content`, so its intrinsic size cannot force a
larger row. The renderers observe their wrapper size through `observeElementSize`
to refresh backing stores when controls change height, not only on window resize.

`ColorPickerDemo` and `FreqGuesserDemo` use `.demo-display-pair` with two
`DemoFrame` children and a control panel directly in the shared grid. The frames
grow with the controls, including when more frequency components are added.
Swatches stack on small screens; both games stack controls below the display on
tablets and phones. Avoid nested control-panel wrappers and fixed canvas heights.

The advisor uses paired grid rows for picker/inventory, trick/recommendation,
and explanation/alternatives. Keep those panels as direct grid children so their
top and bottom borders share the same row; don't restore independent column stacks.
Below 70rem the pairs become a single flow with the same spacing token.

Test navigation and backend-dependent pages with `netlify dev` at
`http://localhost:8080`, including the coding tables and blog. Plain Vite does
not serve `/.netlify/functions/*`. The compact desktop navbar expands on mobile
using grid-row transitions (`--disclosure-duration`), including its submenus.

The mobile theme toggle lives beside the Menu button, outside the collapsible
links. Closed links become hidden after the disclosure finishes so they cannot
receive keyboard focus. The desktop navbar retains its compact width.
