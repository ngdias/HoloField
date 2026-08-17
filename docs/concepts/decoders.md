---
title: Decoders
group: Engine
---

# Decoders

A decoder interprets a boundary field as a three-dimensional scalar field.

The boundary field provides the mathematical description of the source geometry, while the decoder determines how that description is extended or transformed into three-dimensional space. The decoder therefore defines the spatial relationship between the boundary representation and the resulting volumetric field.

A decoder can be thought of as a mathematical lens: it determines how information defined on the boundary is interpreted throughout the surrounding volume. Different decoders can therefore use the same boundary field to produce different volumetric representations.

The decoder is also responsible for interpreting the coordinate space supplied by the sampler. The sampler determines where the field is evaluated; the decoder determines how those positions relate to the boundary representation.

The returned scalar field follows an implicit surface convention:

| Scalar value | Interpretation                |
|     :-:      |   :-                          |
|     > 0	   | Inside the generated surface  |
|     = 0	   | On the generated surface      |
|     < 0  	   | Outside the generated surface |

## Decoder compatibility

A decoder's geometric assumptions must be compatible with the boundary field being supplied to it.

For example, the Radial Decoder interprets the boundary as a function of direction from a common origin and therefore expects the boundary field to provide meaningful values for spherical directions. A boundary field designed around a different spatial interpretation may still be passed to the decoder, but the resulting scalar field may not produce a meaningful or useful volume.

This compatibility is intentionally not enforced by the pipeline. The ability to combine different fields and decoders is part of HoloField's experimental nature, and unusual combinations can be useful for exploring the behaviour of the system.

## Radial Decoder

See {@link Decoders.RadialDecoder | Radial Decoder} for the implementation.

The Radial Decoder interprets the boundary field as a directional description of a surface surrounding a common origin.

For each position in three-dimensional space, the decoder separates the position into its distance from the origin and its normalized direction. The direction is used to query the boundary field, while the returned value determines the radius of the generated surface in that direction.

### Mathematical model

For a position *p*:

> r = |p|

> d = p / |p|

The boundary field is sampled using the unit direction:

> boundaryValue = boundary(d)

The boundary value is then mapped to a surface radius:

> boundaryRadius = f(boundaryValue)

The scalar field returned by the decoder is:

> density = boundaryRadius - r

The zero isosurface represents the surface whose radius varies according to the boundary field.

### Geometric interpretation

The decoder effectively treats the boundary as a collection of radial measurements. Each direction from the origin has an associated boundary value, which is interpreted as the distance at which the generated surface occurs along that direction.

This makes the decoder particularly suitable for spherical and radial projections. The resulting volume is not a direct copy of the boundary surface; it is a volumetric field constructed by extending the boundary information along radial directions.

### Tuning mapBoundaryValue()

This function has become an experimental part of the Radial Decoder. It defines how values produced by the boundary field are interpreted as geometric radii.

The function is intentionally structured as a small testbed: several alternative mappings are present in the implementation and can be activated simply by changing the returned expression. Parameter controls may be exposed in the webpage in the future, but this particular tuning will remain code-side only. This allows for some room to experiment with different relationships between the boundary values and the resulting 3D projection without changing the core radial decoding algorithm.

The choice of mapping can have varying degrees of impact on the resulting geometry, depending on the specific boundary field being sampled. In particular, the relationship between boundary values and radius determines how strongly variations in the boundary field are expressed spatially.

For example, suppose the boundary field is a gradient:

```text
z = -1 → value 0
z =  0 → value 0.5
z = +1 → value 1
```

With direct radius mapping:

`radius = value`

the resulting radii are:

```text
bottom: radius 0
middle: radius 0.5
top:    radius 1
```

A value of zero therefore collapses the projected surface to the origin.

An alternative mapping of:

`radius = 0.5 + value * 0.5`

would produce:

```text
bottom: radius 0.5
middle: radius 0.75
top:    radius 1
```

The minimum radius is now 0.5, so the same boundary gradient produces a more
compact range of radii without allowing the surface to collapse to the origin.

The difference can be understood as a change in dynamic range:

```text
Direct mapping:

0 -------------------- 1
point                 sphere
```

```text
Offset mapping:

0.5 ------------------ 1
rounded cap           sphere
```

This distinction is important when experimenting with the mapping function.
Changing the radius range, offset, amplitude, or applying a nonlinear transformation can alter both the overall form and the relative expression of features in the boundary field.

The volume enclosed by a spherical radius also grows cubically:

$$
V = \frac{4}{3}\pi r^3
$$

Consequently, equal changes in radius do not correspond to equal changes in enclosed volume. Changes at larger radii affect a substantially larger volume than equivalent changes at shorter radii, but may be visually less noticeable than changes near the center (ie., at shorter radii).

The current implementation uses direct mapping:

`radius = value`

while other expressions in `mapBoundaryValue()` are retained as experimental
alternatives. They are intended to make the relationship between the mathematical
boundary description and the resulting spatial projection easy to explore.

The radial decoder itself only requires a radius to be determined for each sampled
direction. The particular mathematical relationship used to obtain that radius
is therefore an experimental choice rather than an intrinsic part of the radial
projection algorithm.

## Height Field Decoder

See {@link Decoders.HeightFieldDecoder | Height Field Decoder } for the implementation.

The Height Field Decoder interprets the boundary field as a height function over the XY plane.

For each position, the decoder samples the boundary field to obtain the height of the surface at that position. The difference between the sampled height and the position's Z coordinate defines the scalar field.

The purpose of this decoder is to produce a simple terrain-like surface on the XY plane, providing a predictable geometry against which the decoder and subsequent pipeline stages can be tested and verified.

### Mathematical model

For a position p = (x,y,z):

h = boundary(x,y,z)

The decoder returns:

density = z - h

The zero isosurface corresponds to the height function defined by the boundary field.

### Geometric interpretation

Unlike the Radial Decoder, which extends boundary information outward from a common origin, the Height Field Decoder extends the boundary vertically along the Z axis.

The same boundary field can therefore produce substantially different geometry depending on which decoder interprets it.

### Compatibility

The Height Field Decoder expects the boundary field to produce values that can be meaningfully interpreted as height relative to a surface.

Boundary fields that produce values outside the expected range, or fields whose spatial pattern does not correspond meaningfully to height sampling, may produce unexpected geometries or scalar fields with few or no positive values.

This is not necessarily an error in the decoder: it may indicate that the mathematical field and the chosen projection model are incompatible.