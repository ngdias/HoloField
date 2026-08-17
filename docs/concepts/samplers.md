---
title: Samplers
group: Engine
---

# Samplers

Samplers define where in 3D space a decoded field is evaluated, how densely it is sampled, and how the resulting samples are organized into a dataset.

The sampler is responsible only for choosing sample positions. It does not modify the field, calculate decoders transformations, or determine how samples are rendered. Different sampling strategies can therefore represent the same field while exposing different properties of the underlying function.

All samplers produce a standardized dataset, allowing downstream pipeline stages to operate independently of the sampling strategy.

There are as of now a few different types of samplers:

 - boundary samplers
 - volume samplers
   - point cloud
   - voxel samplers
   - mesh samplers

**Boundary samplers** evaluate the original boundary field directly. They select positions on the surface where the field function is sampled. Different strategies choose these positions differently, affecting the distribution and density of samples while leaving the underlying field unchanged.

**Volume samplers** include point cloud, voxel and mesh. They operate on the three-dimensional scalar field produced by a decoder. Unlike boundary samplers, volume samplers evaluate the field after it has been transformed into a volumetric representation by a decoder function.

A volume sampler does not modify the 3D representation. Its role is simply to choose where within the volume the decoded field should be evaluated and how those samples are stored.

## Latitude-Longitude (Boundary Sampler)

See {@link Samplers.LatLongSampler | Latitude-Longitude Sampler} for the implementation.

Strictly speaking the implementation uses colatitude + azimuth, not geographical latitude + longitude. The name was chosen for being more intuitive.

The Latitude-Longitude sampler divides the sphere into a regular angular grid. It is simple, deterministic, and useful when a predictable relationship between sample indices and spherical coordinates is important.

The main advantage of this approach is simplicity: every point can be described directly by its latitude and longitude coordinates. However, the distribution is not uniform. Points become increasingly concentrated near the poles because lines of longitude converge.

### Mathematical model

The sphere is sampled using two angles:

- **θ (theta)**: polar angle measured from the positive Z axis.
- **φ (phi)**: azimuth angle around the Z axis in the XY plane.

The generated directions are converted into Cartesian coordinates and used as positions where the boundary field is evaluated.

## Fibonacci (Boundary Sampler)

See {@link Samplers.FibonacciSampler | Fibonacci Sampler} for the implementation.

The Fibonacci sampler generates points distributed approximately uniformly over the sphere using the golden angle. Unlike the Latitude-Longitude approach, it does not create a regular grid, but instead attempts to minimise clustering and spacing variations between neighbouring samples.

This makes it useful when the goal is to represent the overall structure of a field with a fixed number of samples rather than preserve a direct angular indexing scheme.

### Mathematical model

The algorithm progressively distributes points along the polar axis while rotating each new point by the golden angle:

$$
\phi_i = i \times \pi(3-\sqrt{5})
$$

The Z coordinate determines the height of each point:

$$
z_i = 1 - 2\frac{i+0.5}{N}
$$

The remaining X and Y coordinates are calculated from the circular cross-section at that height:

```
radius = sqrt(1 - z*z)

x = cos(phi) * radius
y = sin(phi) * radius

```

The resulting vector is a point on the unit sphere.

## Uniform Voxel Sampler

See {@link Samplers.UniformVoxelSampler | Uniform Voxel Sampler} for the implementation.

The Uniform Voxel Sampler samples the decoded scalar field on a regular Cartesian grid. The sampling volume is divided into equally sized cubic voxels, and the field is evaluated once at the centre of each voxel.

The primary advantage of this approach is its simplicity. The relationship between voxel indices and spatial positions is straightforward, memory requirements are predictable, and the resulting grid is compatible with many visualization and processing algorithms.

The trade-off is that every region of the volume receives the same sampling density, regardless of how much the field varies. Future implementations may use adaptive or sparse sampling strategies to concentrate samples where additional detail is beneficial.

With the current visualization settings, the voxel representation visually obscures the interior of the volume, whereas the point representation can expose interior samples directly, at adequate resolution values. This difference is a consequence of the rendering approach rather than an inherent property of the underlying dataset.

### Mathematical model

The sampled volume is represented as a regular Cartesian grid with a fixed number of voxels along each axis.

For a cubic volume of side length `size` and resolution `N`, the distance between voxel centres is:

> step = size / N

The centre position of a voxel at grid coordinates `(x, y, z)` is:

```
position.x = -size/2 + (x + 0.5) * step
position.y = -size/2 + (y + 0.5) * step
position.z = -size/2 + (z + 0.5) * step
```

The scalar value stored in each voxel is obtained by evaluating the decoded field at the calculated position:

```value = decoder.sample(position)```

The resulting collection of values forms a discrete approximation of the original continuous scalar field.

## Uniform Point Cloud Sampler

See {@link Samplers.UniformPointCloudSampler | Uniform Point Cloud Sampler} for the implementation.

The Uniform Point Cloud Sampler evaluates the decoded scalar field on the same regular Cartesian grid used by the Uniform Voxel Sampler, but stores only the sampled positions that satisfy a value threshold.

Its primary purpose is to provide another alternative to inspect the spatial distribution of a decoded volume without creating a mesh. By retaining points that satisfy an occupancy condition, the sampler provides a direct visual representation of where the decoded field indicates the presence of the generated volume.

Unlike a voxel dataset, which retains a value at every position in the regular sampling grid, a point dataset retains only the positions that satisfy its selection criterion. The absence of a point therefore indicates that the sample was not selected, but does not itself preserve the scalar value at that position.

A further practical difference appears during visualization. The voxel representation retains the complete sampled volume, but its rendered surface can visually obscure the interior of the volume. A point representation does not have the same continuous enclosing appearance: individual samples remain visible according to their spatial distribution. At sufficiently high sampling resolution, this can make internal structures and variations within the generated volume visible through gaps between the outer samples.

### Mathematical model

For a cubic sampling volume of side length `size` and resolution `N`, the distance between sampling positions is:

> step = size / N

The position of each sample at grid coordinates `(x, y, z)` is:

```text
position.x = -size/2 + (x + 0.5) * step
position.y = -size/2 + (y + 0.5) * step
position.z = -size/2 + (z + 0.5) * step
```

The decoded field is evaluated at each position:

`value = decoder.sample(position)`

A sample is added to the point dataset when:

`value >= threshold`

The resulting dataset therefore contains a subset of the uniformly distributed sampling positions together with their corresponding scalar values.

---

## Surface Point Cloud Sampler

See {@link Samplers.SurfacePointCloudSampler | Surface Point Cloud Sampler} for the implementation.

The Surface Point Cloud Sampler evaluates the decoded scalar field on a regular Cartesian grid and retains samples whose values are close to a specified isosurface.

Unlike the Uniform Point Cloud Sampler, which selects points according to whether their values exceed a threshold, the Surface Point Cloud Sampler is intended to produce a point representation of the **surface itself**.

This makes it useful for inspecting the location and distribution of an implicit surface before applying a mesh extraction algorithm. It can also provide a lightweight representation of the surface for visualization and diagnostic purposes.

The trade-off is that the resulting point density depends on both the sampling resolution and the selected tolerance around the isovalue. A tolerance that is too small may produce too few points, while a large tolerance may produce a thick band of points around the surface rather than a thin surface representation.

### Mathematical model

For each sampling position `(x, y, z)`, the decoded field is evaluated:

`value = decoder.sample(position)`

A sample is retained when its scalar value lies within the specified threshold of the target isovalue:

`|value - isoValue| <= threshold`

The resulting dataset therefore approximates the isosurface:

> value = isoValue

by retaining discrete samples in a narrow scalar band around it.

The quality of the approximation depends on the spatial resolution of the underlying sampling grid and the selected threshold.

---
---

See `engine/samplers.ts` for the implementation.

## Helper Function: SphericalToVector()

HoloField implements the standard mathematical spherical coordinate convention where the Z axis is the polar axis.

Some 3D graphics implementations use the Y axis as the polar axis because Y is commonly treated as the "up" direction. This is only a difference in coordinate orientation; both approaches describe the same sphere. We keep the Z axis convention to align with the mathematical definition of spherical coordinates.

The spherical coordinate system is defined as:

- **θ (theta)**: polar angle (colatitude)
  - measured downward from the positive Z axis
  - range: `0 ≤ θ ≤ π`

- **φ (phi)**: azimuth
  - angle around the Z axis in the XY plane
  - range: `0 ≤ φ < 2π`

The conversion to Cartesian coordinates is performed as:

> x = r . sin(θ) . cos(ϕ)

> y = r . sin(θ) . sin(ϕ)

> z = r . cos(θ)

So for a unit sphere, ie, radius = 1, the resulting vector has length 1. Therefore the JavaScript implementation becomes:

```
x = Math.sin(theta) * Math.cos(phi)
y = Math.sin(theta) * Math.sin(phi)
z = Math.cos(theta)
```

## Helper Function: GridPosition()

`GridPosition` converts discrete grid coordinates `(x, y, z)` into the corresponding spatial position within a cubic sampling volume.

The grid is centred on the origin, with `size` defining the total extent of the volume and `step` defining the distance between adjacent samples. The `+0.5` offset places each sample at the **centre of its grid cell** rather than on its boundary.

For a grid coordinate `(x, y, z)`:

```text
position = -size/2 + (index + 0.5) × step
```

This provides a consistent mapping between the integer indices used by the samplers and the continuous coordinates supplied to the decoder.
