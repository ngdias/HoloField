---
title: Web Implementation
children:
  - ./openapi.md
  - ./viewer.md
group: Browser
---

# Web Implementation Notes

This section documents implementation details of the web-facing side of HoloField that are useful for understanding how the browser-side logic works.

Currently, it contains two sections:

- [OpenAPI implementation](openapi.md) documents the OpenAPI configuration's dual role implementation as schema validator and operational configuration.

- [Browser rendering](viewer.md) - describes how the browser uses `requestAnimationFrame()` to render the 3D projections.

## Preparing Data for Three.js

The calculation pipeline remains independent from rendering preparations.

Three.js consumes specific data structures, but those structures are converted from HoloField datasets rather than produced directly by samplers.

### Scalar Field to Volume Representation

HoloField Dataset --> Three.js Adapter --> Three.js Object

The scalar field remains a mathematical dataset. The rendering layer determines how it is visualized.

### Scalar Field to Mesh

A scalar field may be converted into surface geometry using an extraction algorithm:

HoloField Voxel Dataset --> Mesh Dataset --> Three.js Adapter --> Three.js BufferGeometry

The mesh is still an HoloField dataset.

Three.js only receives the final geometry representation.

The Three.js module handles:

- GPU buffers,
- materials,
- lighting,
- camera interaction,
- animation.

These concerns are segregated from the calculation pipeline.
