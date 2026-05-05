---
name: Omari Onboarding
description: Calm, trust-building onboarding and review system for applicant and internal portals.
tokens:
  colors:
    brand:
      950:
        $type: color
        $value: '#043d32'
      800:
        $type: color
        $value: '#0d6f59'
      700:
        $type: color
        $value: '#10836a'
      600:
        $type: color
        $value: '#14a27a'
      500:
        $type: color
        $value: '#24bf75'
      200:
        $type: color
        $value: '#d8f5ea'
      100:
        $type: color
        $value: '#eefbf5'
    accent:
      amber:
        $type: color
        $value: '#b67a23'
    semantic:
      success:
        600:
          $type: color
          $value: '#059669'
        500:
          $type: color
          $value: '#10b981'
        100:
          $type: color
          $value: '#d1fae5'
      warning:
        600:
          $type: color
          $value: '#d97706'
        500:
          $type: color
          $value: '#f59e0b'
        100:
          $type: color
          $value: '#fef3c7'
      danger:
        600:
          $type: color
          $value: '#dc2626'
        500:
          $type: color
          $value: '#ef4444'
        100:
          $type: color
          $value: '#fee2e2'
      info:
        600:
          $type: color
          $value: '#2563eb'
        500:
          $type: color
          $value: '#3b82f6'
        100:
          $type: color
          $value: '#dbeafe'
    neutral:
      surface:
        $type: color
        $value: '#ffffff'
      surfaceSoft:
        $type: color
        $value: '#f7fbf8'
      surfaceMuted:
        $type: color
        $value: '#eef5f2'
      surfaceDim:
        $type: color
        $value: '#e5eceb'
      line:
        $type: color
        $value: '#d9ebe2'
      lineStrong:
        $type: color
        $value: '#bfd3ca'
      text900:
        $type: color
        $value: '#15352e'
      text800:
        $type: color
        $value: '#1f453f'
      text700:
        $type: color
        $value: '#4d6a63'
      text500:
        $type: color
        $value: '#80948f'
      text400:
        $type: color
        $value: '#a9b8b3'
  typography:
    fontFamilies:
      display:
        $type: fontFamily
        $value: '"Outfit", "Trebuchet MS", sans-serif'
      body:
        $type: fontFamily
        $value: '"Source Sans 3", "Segoe UI", sans-serif'
    fontSizes:
      xs:
        $type: fontSize
        $value: 0.74rem
      sm:
        $type: fontSize
        $value: 0.82rem
      md:
        $type: fontSize
        $value: 0.95rem
      lg:
        $type: fontSize
        $value: 1.06rem
      xl:
        $type: fontSize
        $value: 1.35rem
      display:
        $type: fontSize
        $value: clamp(2.2rem, 2.9vw, 3.15rem)
    fontWeights:
      regular:
        $type: fontWeight
        $value: 400
      medium:
        $type: fontWeight
        $value: 500
      semibold:
        $type: fontWeight
        $value: 600
      bold:
        $type: fontWeight
        $value: 700
      extrabold:
        $type: fontWeight
        $value: 800
    lineHeights:
      tight:
        $type: lineHeight
        $value: 1.2
      snug:
        $type: lineHeight
        $value: 1.375
      normal:
        $type: lineHeight
        $value: 1.5
      relaxed:
        $type: lineHeight
        $value: 1.625
    letterSpacing:
      eyebrow:
        $type: letterSpacing
        $value: 0.08em
      display:
        $type: letterSpacing
        $value: 0.01em
  spacing:
    0:
      $type: spacing
      $value: 0
    1:
      $type: spacing
      $value: 4px
    1_5:
      $type: spacing
      $value: 8px
    2:
      $type: spacing
      $value: 12px
    3:
      $type: spacing
      $value: 16px
    4:
      $type: spacing
      $value: 20px
    5:
      $type: spacing
      $value: 24px
    6:
      $type: spacing
      $value: 30px
    7:
      $type: spacing
      $value: 38px
    8:
      $type: spacing
      $value: 48px
    9:
      $type: spacing
      $value: 64px
  radii:
    xs:
      $type: borderRadius
      $value: 8px
    sm:
      $type: borderRadius
      $value: 12px
    md:
      $type: borderRadius
      $value: 16px
    lg:
      $type: borderRadius
      $value: 22px
    xl:
      $type: borderRadius
      $value: 28px
    pill:
      $type: borderRadius
      $value: 999px
  shadows:
    sm:
      $type: boxShadow
      $value: '0 1px 2px rgba(0, 0, 0, 0.05)'
    md:
      $type: boxShadow
      $value: '0 4px 6px rgba(0, 0, 0, 0.07)'
    lg:
      $type: boxShadow
      $value: '0 10px 15px rgba(0, 0, 0, 0.1)'
    soft:
      $type: boxShadow
      $value: '0 14px 34px rgba(10, 72, 60, 0.07)'
    card:
      $type: boxShadow
      $value: '0 20px 42px rgba(8, 54, 44, 0.09)'
    modal:
      $type: boxShadow
      $value: '0 28px 70px rgba(6, 34, 27, 0.28)'
  elevation:
    base:
      $type: boxShadow
      $value: none
    surface:
      $type: boxShadow
      $value: '0 10px 24px rgba(10, 72, 60, 0.05)'
    card:
      $type: boxShadow
      $value: '0 20px 42px rgba(8, 54, 44, 0.09)'
    floating:
      $type: boxShadow
      $value: '0 24px 56px rgba(6, 34, 27, 0.13)'
    modal:
      $type: boxShadow
      $value: '0 28px 70px rgba(6, 34, 27, 0.28)'
  motion:
    duration:
      fast:
        $type: duration
        $value: 150ms
      base:
        $type: duration
        $value: 200ms
      slow:
        $type: duration
        $value: 300ms
      sectionRise:
        $type: duration
        $value: 440ms
    easing:
      standard:
        $type: cubicBezier
        $value:
          x1: 0.4
          y1: 0
          x2: 0.2
          y2: 1
      subtle:
        $type: cubicBezier
        $value:
          x1: 0.4
          y1: 0
          x2: 1
          y2: 1
  borders:
    hairline:
      $type: borderWidth
      $value: 1px
    focusRing:
      $type: borderWidth
      $value: 4px
  zIndex:
    sticky:
      $type: zIndex
      $value: 30
    overlay:
      $type: zIndex
      $value: 50
---

# Brand & Style
Omari Onboarding is a calm, regulated, high-trust workflow product. The visual language is deliberately restrained: soft white and misted green surfaces, rounded geometry, and clear hierarchy keep the experience feeling safe and organized while still looking polished enough for a formal business process.

The system should feel like a guided service desk rather than a flashy consumer app. Interfaces stay bright, legible, and lightly atmospheric, with a nature-tinted brand palette that suggests progress, stability, and reassurance. The emotional goal is confidence: applicants should feel supported, while internal reviewers should feel in control.

# Colors
The palette is built around deep evergreen text, teal-to-green brand accents, and pale mint backgrounds. White is used generously for the primary working surface, while the page background stays just tinted enough to create separation without harsh contrast.

Brand color ramps move from deep forest tones to energetic green highlights. Primary actions and active states use the richer end of the brand scale, while secondary surfaces and hover states stay translucent and soft. Warm amber appears sparingly as an attention accent for cautions, notes, and supporting labels.

Semantic colors are used conventionally and quietly. Success leans green, warnings lean amber, errors lean red, and informational states lean blue. These colors should support decision-making, not dominate the page.

# Typography
The type system pairs a rounded display face with a neutral humanist body face. Headings are intentionally more sculpted and expressive, while body copy stays open and readable for dense form entry and review work.

Hierarchy should be obvious at a glance. Large headings, compact uppercase eyebrow labels, and moderate body line length create a strong scanning pattern. Labels and metadata are typically semibold or bold so they remain legible inside dense cards, stepper rows, and review lists.

Text color is intentionally deep rather than pure black. The whole product favors a softer editorial feel over stark contrast, which keeps the interface calm even when the layout gets information-heavy.

# Layout & Spacing
The layout is structured around generous section spacing and clear containers rather than tight grids. Content should breathe. Large horizontal regions are balanced by compact internal padding so the interface feels controlled but not cramped.

The portal shell uses a fixed navigation rail and a scrolling main workspace, while auth screens use centered panels with layered imagery and cards. Most content widths stay centered and capped so reading and form completion feel focused.

The spacing scale is even and pragmatic. Small values support labels, controls, and icon relationships; medium values handle card internals; larger values separate page-level regions and create the sense of a guided flow.

# Elevation & Depth
Depth is achieved through tonal layering, borders, and soft shadows rather than dark overlays. Surfaces sit on a light green-tinted canvas, then lift upward with subtle shadow and thin borders.

Primary cards are lightly elevated and softly shadowed. Sticky bars, floating auth panels, and modal surfaces step up one level further with stronger shadow and slightly richer borders. Hover states lift items by only a pixel or two so the UI feels responsive without becoming restless.

Background gradients and faint radial glows are used as atmosphere, not decoration. They should frame the content and hint at motion without competing with the workspace.

# Shapes
The shape language is rounded, friendly, and consistent. Standard cards use medium radii, major containers use larger radii, and pill-shaped elements are reserved for badges, chips, and high-visibility buttons.

Inputs are moderately rounded and compact enough to feel efficient. Floating cards and auth hero modules use the largest corners in the system so they read as prominent, premium surfaces. Icons are line-based and simple, with rounded terminals that match the rest of the system.

# Components
Primary buttons use the brand gradient and a clear raised shadow so the main action is unmistakable. Ghost buttons and sidebar actions stay quieter, relying on border and text color to preserve hierarchy.

Forms are built from strong labels, pale filled inputs, and soft focus rings. Focus treatment should always be visible and brand-tinted, never default browser blue. Disabled states are muted rather than gray-on-gray so the form still feels coherent.

Navigation items live in a fixed left rail with active-state gradients, generous touch targets, and small glyphs. This keeps the product oriented around task flow and makes it obvious where the user is inside the process.

Status chips, review summaries, and progress indicators should be compact, rounded, and easy to read. They are there to compress operational information into quick-scanning surfaces, not to add visual noise.

Auth screens are the most expressive part of the system. They can use layered imagery, glassy cards, and floating informational panels, but the tone still needs to remain calm and professional. The page should feel like a polished entry point into a serious workflow, not a marketing landing page.
