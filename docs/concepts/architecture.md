---
title: Engine Guide
children:
  - ./fields.md
  - ./decoders.md
  - ./samplers.md
  - ./mesh_generators.md
group: Engine
---

# Engine Guide

This page explains the conceptual model behind HoloField.

## Spherical Coordinate Convention

HoloField uses the standard mathematical spherical coordinate convention where the **Z axis is the polar axis**. In this convention, the polar angle **θ (theta)** is measured from the positive Z direction (`0 ≤ θ ≤ π`), while the azimuth angle **φ (phi)** describes rotation around the Z axis in the XY plane (`0 ≤ φ < 2π`). This convention is commonly used in mathematics and physics and defines the sphere orientation used by the Latitude - Longitude Sampler, for example.

Some graphics-oriented implementations instead use the **Y axis as the polar axis**, treating Y as the "up" direction. This is also a valid convention and is common in 3D graphics, but it represents a rotation of the coordinate system rather than a different sphere. We use Z as the polar axis to follow the mathematical convention and to keep spherical sampling definitions explicit and consistent.

## Engine and Browser Boundaries

HoloField is divided into an **engine side** and a **browser side**. This is a separation of responsibilities rather than a server/client distinction.

### Engine Side

The engine contains the implementation of the projection pipeline and is intended to be independent of the webpage that uses it. It defines the mathematical and data-processing components used to transform boundary data into renderable datasets:

* boundary fields
* decoders
* samplers
* datasets
* mesh generators
* pipeline orchestrators

The engine components operate on their defined data structures and contracts and do not manage the webpage, DOM, UI controls, or rendering lifecycle.

`pipeline.ts` belongs to this side. It acts as a dispatcher that connects the engine components and exposes higher-level operations to the application, but it does not start the engine or execute the application by itself.

### Browser Side

The browser side is responsible for the application that uses the engine. It connects the engine to the webpage and handles concerns that are specific to the browser environment, including:

* DOM interaction
* UI controls
* pipeline function calls
* triggering generation of projections
* managing generated results
* setting up Three.js rendering objects
* viewer window lifecycle and layout

`viewer.js` is the primary orchestration layer on the browser side. It responds to user interaction, invokes the appropriate engine pipeline operations, and presents the resulting datasets through the application's viewers.

### Boundary Between the Two

The browser side interact with the engine through the pipeline orchestrator functions rather than reaching into individual engine implementations. The engine therefore remains concerned with **what is generated and how it is generated**, while the browser application is concerned with **when generation is requested and how the results are presented**.

This separation allows the engine to be developed and documented as an independent projection system while the browser application acts as one possible consumer of that system.

## Engine Architecture

The engine consists of four major subsystems:

- Surface Fields
- Decoders
- Projection
- Rendering

### Calculation Pipeline

Mathematical calculations are separated from the storage and management of generated data.

The calculation pipeline is designed around three distinct responsibilities:

1. **Calculation functions** define mathematical transformations.
2. **Dataset classes** store generated results.
3. **Rendering preparation** converts datasets into formats suitable for visualization. This happens on the browser side.

This separation keeps calculations deterministic and reusable while allowing generated datasets to be cached, inspected, compared, and passed to different consumers.

### Pipeline Overview

The general data flow is:

1. Input Definition  
2. Calculation Functions
3. Generated Dataset
4. Three.js Representation

### Calculation Functions

A calculation stage receives input data or configuration and produces a new data representation. It does not own the resulting dataset.

Datasets are instanced objects that can be stored, reused, displayed, or transformed further.

Calculation functions represent mathematical operations.

Examples:

- Boundary fields
- Decoders
- Interpolation functions
- Procedural generators
- Coordinate transformations

These operations are intended to be deterministic:

> input + configuration → output

They do not maintain runtime state or store generated results.

Example: Boundary Field → Scalar value at coordinate

### Lazy Calculation Pipeline

The engine generates data going backwards from the projection sampling requirementa to the boundary field. Intermediate calculations are not stored; only meaningful results become datasets.

1. - Sampler determines amount of calculation requests
   - Sampler creates the dataset object
   - Sampler sends coordinates to Decoder
2. Decoder requests values from Boundary
3. Boundary calculates value based on coordinates
4. Decoder returns the transformed value

- Decoders are not necessary when creating a projection of the boundary field itself.

## Boundary Fields

A [field](fields.md) defines a scalar function (over a surface domain). It answers:

> Given a coordinate in the field domain, what scalar value exists at this location?

It does not know:

- how coordinates were generated,
- how many samples will be requested,
- where results will be stored,
- how results will be rendered.

The primary use case is spherical surfaces, where a Sampler provides normalized coordinates derived from a sphere. However, the abstraction is not limited to spherical geometry.

The boundary field remains independent of the geometry used to generate the coordinates.

## Decoders

A [decoder](decoders.md) transforms a mathematical representation into a dataset representation.

A decoder defines how a continuous mathematical function becomes a sampled representation. For example, the Radial Decoder calculates scalar values, but the resulting scalar field is stored by a dataset container.

A decoder acts like a mathematical lens: it interprets the information stored on the boundary surface and projects it into a volumetric representation that can be sampled in 3D space.

## Samplers

A [sampler](samplers.md) converts a continuous spatial representation into a discrete dataset.

A sampler defines how the continuous field produced by a [decoder](decoders.md) is evaluated and represented at discrete spatial positions. For example, the Uniform Voxel Sampler evaluates the decoder on a regular three-dimensional grid, while point-cloud samplers select individual positions according to their sampling criteria.

A sampler acts as a **spatial measurement process**: it determines where the decoded field is observed and how those observations are organized into a dataset, without changing the underlying field itself.

## Mesh Generators

A [mesh generator](mesh_generators.md) extracts a geometric surface from a volumetric dataset.

A mesh generator interprets the scalar values stored in a voxel dataset and determines where the requested isosurface lies within the sampled volume. The resulting geometry is represented as a mesh dataset containing vertices and triangles, which can then be passed to the rendering side of HoloField.

Different mesh generators can interpret the same voxel dataset using different surface extraction strategies. HoloField currently provides implementations of **Marching Cubes** and **Dual Contouring**, allowing the effects of different extraction methods to be explored without changing the preceding field, decoder, or sampling selections.

A mesh generator therefore acts as the **geometric interpretation stage** of the pipeline: it converts a discrete volumetric representation into an explicit surface representation suitable for rendering or further geometric processing.

## Dataset Containers

Datasets represent generated results.

Unlike calculation functions, datasets are persistent objects.

Examples:

- Voxel grids
- Meshes
- Point clouds

Datasets may:

- be cached,
- be compared,
- be displayed,
- be serialized,
- be transformed into other representations

The dataset contains the result of a computation, not the computation itself.


