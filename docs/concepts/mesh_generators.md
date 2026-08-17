---
title: Mesh Generators
group: Engine
---

# Mesh Generators

A mesh generator extracts an explicit surface representation from a sampled scalar field.

Mesh generators operate on a volumetric dataset produced by a volume sampler. They interpret the scalar values relative to an isolevel and determine where the corresponding implicit surface passes through the sampled volume.

The resulting mesh dataset contains vertices and triangles and can be passed to the rendering side of HoloField through the appropriate adapter.

Different mesh generators can operate on the same voxel dataset using different surface extraction strategies. This allows the effects of the extraction algorithm to be explored independently from the boundary field, decoder, and sampling stages.

## Marching Cubes Generator

See {@link "Mesh Generators"!MarchingCubesGenerator | Marching Cubes} for the implementation.

The Marching Cubes Generator extracts an isosurface by processing the voxel grid one cell at a time.

For each cube of eight neighbouring scalar samples, the generator determines which corners lie below the selected isolevel. This produces one of 256 possible cube configurations. A lookup table then determines which cube edges are intersected by the isosurface and how those intersections should be connected into triangles.

The resulting triangles form an approximation of the isosurface across the entire voxel grid.

### Mathematical model

For each cube, the eight scalar values are compared with the isolevel:

> value < isoLevel → inside
> value ≥ isoLevel → outside

The resulting binary configuration identifies the cube's topology. Where an edge connects samples on opposite sides of the isolevel, the surface is assumed to intersect that edge.

The intersection position is interpolated between the two edge endpoints according to their scalar values.

The lookup table then specifies the triangles connecting these intersection points.

### Characteristics

Marching Cubes is a local surface extraction method: each cube is processed using its own eight scalar values and the predefined topology table.

Its main advantages are:

* straightforward implementation,
* predictable processing of a regular voxel grid,
* well-established topology cases,
* direct production of triangle geometry.

The extracted surface is therefore strongly dependent on the spatial resolution of the voxel dataset. Increasing the sampling resolution provides more local information from which the surface can be reconstructed.

## Dual Contouring Generator

See {@link "Mesh Generators"!DualContouringGenerator | Dual Contouring} for the implementation.

The Dual Contouring Generator extracts an isosurface by constructing a representative vertex for each voxel cell containing a surface intersection.

Instead of generating triangles directly from the topology of each cube, Dual Contouring first identifies where the implicit surface intersects the cube's edges and derives constraints from those intersections. These constraints are used to position a representative vertex within the cell.

Neighbouring cell vertices are then connected to form the surface mesh.

### Mathematical model

For each voxel cell, the generator examines the edges connecting its eight corners. An edge represents a surface intersection when its endpoint values lie on opposite sides of the selected isolevel.

Each intersection provides a constraint describing where the surface passes through the cell and, when available, the local surface normal.

The representative vertex is obtained by solving a **Quadratic Error Function (QEF)** that seeks the position best satisfying the collected surface constraints.

Conceptually, the QEF minimizes the accumulated squared distance between the candidate vertex and the constraint planes:

> minimize Σ (nᵢ · (x - pᵢ))²

where `pᵢ` is a surface intersection point and `nᵢ` is its associated normal.

The resulting vertex is therefore influenced by multiple surface intersections within the same cell rather than being determined independently for each intersected edge.

### Characteristics

Dual Contouring differs from Marching Cubes primarily in how it represents the surface within each cell.

Marching Cubes:

* identifies edge intersections,
* uses predefined configurations,
* directly creates triangles.

Dual Contouring:

* identifies edge intersections,
* derives surface constraints,
* creates a representative vertex per intersecting cell,
* connects neighbouring cell vertices to form the surface.

Because the vertex position is determined from multiple local constraints, Dual Contouring can preserve sharper features and more directly adapt the mesh geometry to the local shape of the implicit surface.

Its implementation is consequently more involved than Marching Cubes and depends on the quality of the surface intersection and normal information available from the sampled field.
