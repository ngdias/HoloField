---
title: Boundary Fields
group: Engine
---

# Boundary Fields

A Boundary Field defines a scalar function, to be applied over a geometric (surface) domain.

The purpose of separating fields from geometry generation is to allow the same mathematical function to be sampled using different surface representations.

In other words, Boundary Fields are independent of the underlying surface geometry. A sampler determines how positions on a surface are represented and provides the coordinates used by the field.

A field does not create geometry. It only answers:

> Given a coordinate in the field domain, what scalar value exists there?

## Architecture

The pipeline for generating a *boundary representation on the surface of a sphere* consists of:

> Sampler → Boundary Field → Geometry

The pipeline for generating a *boundary projection into a 3D volume* consists of:

> Sampler → Boundary Field → Decoder → Geometry

or

> Sampler → Boundary Field → Decoder → Mesh Generator → Geometry

The sampler is responsible for converting a geometric representation into the coordinate system expected by the field.

Examples:

- A sphere sampler may provide normalized direction vectors.
- A planar sampler may provide normalized planar coordinates.
- A voxel sampler may provide coordinates within a volume.

The Boundary Field remains independent of how the coordinates were generated.

## Coordinate assumptions

Fields *operate* in a normalized coordinate space:

> x, y, z ∈ [-1, 1]

The decoder establishes the coordinate representation presented to the field, not the sampler. The sampler is responsible only for generating and supplying spatial coordinates within its configured sampling domain; the decoder determines how those coordinates are interpreted and transformed before being passed to the underlying mathematical representation.

The normalized coordinate convention describes the intended *input* domain of the field; it is not necessarily enforced by the field's mathematical function.

Fields should not perform geometry-specific transformations.

# Implemented Fields

## Fruity Field

See {@link "Boundary Fields"!FruityField | FruityField} for the implementation.

The Fruity Field provides a simple placeholder for experimenting with arbitrary mathematical functions without modifying the existing boundary-field definitions.

It is useful for:

* quickly testing a new mathematical expression,
* experimenting with field behaviour before creating a dedicated field,
* testing decoders and samplers with different input patterns,
* exploring how mathematical changes propagate through the generation pipeline.

The field is intentionally minimal: its purpose is to provide a convenient entry point for experimentation rather than to represent a specific mathematical shape or pattern.

### Mathematical definition

The field evaluates a user-defined function of the sampled coordinates:

> value = f(x, y, z)

The function may use any combination of the available spatial coordinates and mathematical operations supported by the implementation.

### Domain assumptions

The field itself imposes no particular geometric interpretation on the coordinates. The expected coordinate range and meaning depend on the sampler and on the mathematical function being tested.

The resulting values are passed through the same decoder and sampling pipeline as other boundary fields.

### Examples

A simple expression can be substituted directly into the implementation:

```ts
return Math.sin(coordinate.x) + Math.cos(coordinate.y);
```

or:

```ts
return coordinate.x * coordinate.y - coordinate.z;
```

Changing the expression changes the boundary representation without needing to touch any of the other fields.

## Hemispherical Field

See {@link "Boundary Fields"!HemisphereField | HemisphereField} for the implementation.

The Hemispherical Field divides the coordinate domain into two regions according to the sign of the Z coordinate, assigning one value to the upper hemisphere and another to the lower hemisphere.

It is useful for:

* testing binary or discontinuous boundary fields,
* distinguishing the two halves of a spherical domain,
* validating Z-axis orientation and coordinate normalization,
* testing how decoders and samplers handle abrupt changes in field values.

It is a useful diagnostic field because its output is determined entirely by the sign of `z`. The resulting boundary between the two regions should occur at the equatorial plane, making incorrect coordinate orientation or parameterization immediately apparent.

### Mathematical definition

The field evaluates:

> value = 1 if z > 0, otherwise 0

Input and output mapping:

| Input z | Output |
| :-----: | :----: |
|  z < 0  |    0   |
|  z = 0  |    0   |
|  z > 0  |    1   |

The field therefore contains a discontinuity at `z = 0`, except that the implementation explicitly assigns the boundary itself the value `0`.

### Domain assumptions

The field only depends on the sign of the Z coordinate and does not require a normalized range.

For a spherical surface, the sign of `z` separates the sphere into two hemispheres:

* `z > 0` — upper hemisphere
* `z ≤ 0` — lower hemisphere, including the equator

The coordinate system must therefore have a meaningful Z axis corresponding to the intended vertical direction.

### Examples

A sphere:

```text
south pole z=-1 → 0
equator   z= 0 → 0
north pole z= 1 → 1
```

A planar domain:

```text
lower region z<0 → 0
boundary   z= 0 → 0
upper region z>0 → 1
```

## Latitude Bands Field

See {@link "Boundary Fields"!LatitudeBandsField | LatitudeBandsField} for the implementation.

The Latitude Bands Field produces a repeating sinusoidal pattern based on latitude over a spherical surface.

It is useful for:

* generating repeated bands across a spherical boundary,
* testing angular parameterization,
* validating the relationship between Cartesian coordinates and spherical coordinates,
* producing a visually distinctive pattern for detecting spatial distortions or orientation errors.

Unlike the [Hemispherical Field](#hemispherical-field), which divides the sphere into two regions, this field produces multiple alternating bands whose values vary continuously between `0` and `1`.

### Mathematical definition

The field evaluates:

> value = 0.5 + 0.5 sin(8 arccos(z))

The `arccos(z)` term converts the normalized Z coordinate into the polar angle measured from the positive Z axis.

The resulting sine function completes four full oscillations over the polar-angle range from `0` to `π`, producing alternating latitude bands.

The output is shifted and scaled so that:

> * `sin(...) = -1` produces `0`
> * `sin(...) = 0` produces `0.5`
> * `sin(...) = 1` produces `1`

### Domain assumptions

The field expects the input Z coordinate to represent the normalized vertical component of a spherical position:

> z ∈ [-1,1]

For a unit sphere:

* `z = 1` corresponds to the north pole,
* `z = 0` corresponds to the equator,
* `z = -1` corresponds to the south pole.

Because the field depends only on `z`, every point at the same latitude receives the same value. The resulting pattern therefore forms bands around the Z axis.

### Examples

On a unit sphere:

```text
north pole     z =  1 → 0.5
upper latitudes       → alternating values
equator        z =  0 → 0.5
lower latitudes       → alternating values
south pole     z = -1 → 0.5
```

The bands are therefore concentric rings when viewed along the Z axis, and horizontal latitude bands when the sphere is viewed from the side.

## Polar Height Field

See {@link "Boundary Fields"!PolarHeightField | PolarHeightField} for the implementation.

The Height Gradient Field creates a scalar gradient based on vertical position within the coordinate domain.

It is useful for generating height-dependent effects such as:

- elevation-based coloring,
- density transitions,
- displacement intensity,
- terrain-like gradients.

It is useful as a first validator because:

 - every sampled value is easy to predict analytically,
 - produces linear mapping with smooth variation over the spherical surface (continuous gradient without discontinuities)
 - the resulting color gradient immediately reveals incorrect parameterization,
 - any inversion of the Z-axis or normalization errors are visually obvious.

### Mathematical definition

The field evaluates:

> value = (z + 1) / 2

Input and output mapping:

| Input z | Output |
|  :---:  | :---:  |
|   -1    |   0    |
|    0    |  0.5   |
|    1    |   1    |

### Domain assumptions

The field expects the input coordinate system to have a normalized Z axis:

> z ∈ [-1,1]

For spherical surfaces this corresponds naturally to the vertical component of
a unit direction vector.

For other surfaces, the sampler must provide an equivalent normalized
coordinate representation.

### Examples

A sphere sampler:

```text
south pole z=-1 → 0
equator z= 0 → 0.5
north pole z= 1 → 1
```

A planar sampler:
```text
bottom edge z=-1 → 0
center z= 0 → 0.5
top edge z= 1 → 1
```

## Simple Height Field

See {@link "Boundary Fields"!SimpleHeightField | SimpleHeightField} for the implementation.

The Simple Height Field produces a smoothly varying height value from the X and Y coordinates using a combination of sine and cosine functions.

It is useful for:

* testing height-based decoders - essentially **terrain geometries**,
* producing a simple non-planar surface,
* validating how variations in a boundary field propagate into a 3D projection,
* providing a more structured test case than a uniform height field.

The periodic variation creates a regular pattern of peaks and valleys while keeping the overall height within a narrow range.

### Mathematical definition

The field evaluates:

> value = 0.65 + 0.1 sin(10x) cos(10y)

The resulting value oscillates around a baseline of `0.65` with an amplitude of `0.1`.

The theoretical output range is therefore:

> 0.55 ≤ value ≤ 0.75

### Domain assumptions

The field depends only on the X and Y coordinates. The Z coordinate has no effect on the result.

The spatial frequency is controlled by the factor `10` applied to both X and Y. Consequently, the field produces a repeating two-dimensional pattern across the XY plane.

The output is intended to represent a height value rather than a signed distance or occupancy value. A decoder is responsible for interpreting this height as a three-dimensional surface.

### Examples

At positions where the sine and cosine terms produce their maximum or minimum combinations:

```text
maximum → 0.75
baseline → 0.65
minimum → 0.55
```

The resulting surface forms a regular pattern of shallow undulations across the XY plane.
