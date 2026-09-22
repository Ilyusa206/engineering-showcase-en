# Responsive components for a commercial website

This case uses a generalized reconstruction. Customer content, personal information, assets and private media links are excluded.

## Problem

A site built in a visual page editor needed interactive sections beyond standard blocks: a data-driven specialist directory, service and specialty navigation, responsive cards, filters and touch-friendly mobile interaction.

## Constraints

- Components had to run inside embedded HTML blocks without a framework build pipeline.
- Desktop and mobile needed materially different controls.
- Editors needed to change content independently of rendering logic.
- A third-party carousel had to coexist with the host page.
- Customer assets and staff records could not be copied into a public example.

## Architecture and approach

Scoped CSS, semantic HTML, small JavaScript state machines, data arrays and custom DOM events coordinate the embedded components. Desktop and mobile views use the same logical identifiers with different presentation and controls.

## My implementation

- Responsive department and specialty selectors in HTML/CSS/JavaScript.
- Specialist cards and a Swiper carousel.
- Separate content records, rendering and filtering.
- Escaping of dynamic labels and URLs before insertion.
- Custom events between separately embedded mobile blocks.
- Touch scrolling, breakpoints, overflow behavior, active states and button semantics.

## Key engineering decisions

1. **Coordinate blocks through events.** A navigation block emits a selection; a specialty block reacts without depending on its DOM structure.
2. **Escape editor-managed strings.** Even controlled content passes through escaping before rendering.
3. **Use a distinct mobile interaction.** A wide grid becomes horizontal touch navigation and expandable controls.
4. **Keep content declarative.** Additions are data records, not duplicated markup and listeners.

## Reliability, security and testing

Components handle absent mount points and incomplete records. Desktop and narrow mobile layouts were checked. The public sample uses fictional data and loads no customer assets.

## Result

The site gained maintainable, non-standard responsive interfaces within the visual editor's constraints.

## What this demonstrates

HTML/CSS/JavaScript implementation, responsive interaction, third-party component integration, safe dynamic rendering and event coordination. [Inspect the directory sample](../../frontend/data-driven-directory.ts).
