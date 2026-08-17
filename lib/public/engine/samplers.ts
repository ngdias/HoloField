/**
 * Sampler implementations for generating coordinates used by decoders.
 *
 * @remarks
 * This module provides the sampler implementations and registry used by the
 * pipeline to select and execute a sampling strategy.
 * 
 * @module Samplers
*/

import { PointDataset, VoxelGrid } from "./datasets.js";

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~
// - ~ - Type Definitions / Type Imports - ~ -

import type { Vector3 } from "./datasets.js";
import type { BoundDecoder } from "./decoders.js";
import type { BoundaryField } from "./fields.js";

/**
 * Defines how positions on a surface are represented and provides the
 * coordinates used by a field.
 *
 * @remarks
 * The primary use case is spherical surfaces, where the sampler provides
 * normalized direction vectors with components in the range [-1, 1].
 * However, alternative samplers may represent other surface types, such as
 * planar surfaces, provided the field implementation supports the supplied
 * coordinate space.
*/
export interface Sampler {
    metadata: {
        displayName: string
        description: string
        samplerType: "boundary" | "pointCloud" | "voxel"
        mathFunction?: string
    }
}

export interface BoundarySampler extends Sampler {

    defaults: BoundarySamplerOptions
    generate(field: BoundaryField, options: BoundarySamplerOptions): PointDataset
}

export interface PointCloudSampler extends Sampler {

    defaults: SpatialSamplerOptions
    generate(decoder: BoundDecoder, options: SpatialSamplerOptions): PointDataset
}

export interface VoxelSampler extends Sampler {

    defaults: SpatialSamplerOptions
    generate(decoder: BoundDecoder, options: SpatialSamplerOptions): VoxelGrid
}

export type BoundarySamplerOptions = {
    thetaSegments?: number
    phiSegments?: number
    sampleCount?: number
    displayRadius?: number
}

export type SpatialSamplerOptions = {
    size?: number
    resolution?: number
    threshold?: number
    isoValue?: number;
}

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Helper Functions - ~ -

const Scale = (direction: Vector3, scalar: number): Vector3 => {

    return {
        x: direction.x * scalar,
        y: direction.y * scalar,
        z: direction.z * scalar
    };
}

const GridPosition = (x: number, y: number, z: number, size: number, step: number): Vector3 => {

    return {
        x: -size / 2 + (x + 0.5) * step,
        y: -size / 2 + (y + 0.5) * step,
        z: -size / 2 + (z + 0.5) * step,
    };
}

/**
 * Converts spherical coordinates to a Cartesian unit vector on the unit sphere.
 *
 * Theta is the polar angle in [0, π], measured from the +Z axis.
 * Phi is the azimuth in [0, 2π), measured in the XY plane from the +X axis.
 * 
 * @document ../../../docs/concepts/samplers.md
*/
const SphericalToVector = (theta: number, phi: number): Vector3 => {

    return {
        x: Math.sin(theta) * Math.cos(phi),
        y: Math.sin(theta) * Math.sin(phi),
        z: Math.cos(theta)
    };
}

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ 
// - ~ - Surface Samplers - ~ -

/**
 * Samples the boundary function on a regular latitude–longitude grid.
 *
 * Sample positions are generated from uniformly spaced latitude and longitude
 * intervals, producing a structured spherical grid. This approach is simple
 * and efficient, but exhibits increasing sample density near the poles.
 * 
 * @remarks
 * Increasing either segment count increases the number of sampled
 * directions and produces a denser approximation of the boundary
 * surface at the cost of additional computation.
 * 
 * Theta controls the number of rings between the two poles.
 * 
 * Phi controls the number of angular divisions around the sphere's axis.
 * 
 * @document ../../../docs/concepts/samplers.md
 * 
 * @param boundary - Boundary field to sample.
 *
 * @param options - Sampling configuration.
 * @param options.thetaSegments - Number of subdivisions between the 
 *      north and south poles. Higher values improve sampling density 
 *      along the polar direction.
 * @param options.phiSegments - Number of subdivisions around the sphere's 
 *      equator. Higher values improve sampling density around the azimuth.
 * @param options.displayRadius - Radius of the sampled sphere used for 
 *      visualization. Does not affect the sampled field values.
 *
 * @returns A PointDataset containing the sampled boundary values.
*/
export const LatLongSampler = {

    metadata: {
        displayName: "Latitude-Longitude Sampler",
        description: "Samples the boundary on a uniform latitude-longitude grid.",
        samplerType: "boundary"
    },

    defaults: {
        thetaSegments: 64,
        phiSegments: 96,
        displayRadius: 1
    },

    generate(boundary: BoundaryField, options: BoundarySamplerOptions): PointDataset {

        const {
            thetaSegments = this.defaults.thetaSegments as number,
            phiSegments = this.defaults.phiSegments as number,
            displayRadius = this.defaults.displayRadius as number
        } = options;

        const dataset = new PointDataset({ 'boundary': boundary.metadata });

        dataset.metadata.sampler = { ...this.metadata };

        for (let thetaIdx = 0; thetaIdx <= thetaSegments; thetaIdx++) {

            const theta = thetaIdx * Math.PI / thetaSegments;

            for (let phiIdx = 0; phiIdx < phiSegments; phiIdx++) {

                const phi = phiIdx * 2 * Math.PI / phiSegments;

                const unitDirection = SphericalToVector!(theta, phi);

                const position = Scale(unitDirection, displayRadius);

                const value = boundary.sample(unitDirection);

                dataset.add({ unitDirection, position, value });
            }
        }

        return dataset;
    }
} satisfies BoundarySampler

/**
 * Samples the boundary function using a Fibonacci sphere distribution.
 *
 * Sample positions are distributed approximately uniformly over the sphere
 * using the golden-angle algorithm, avoiding pole clustering and producing
 * a more even spatial sampling than a latitude–longitude grid.
 * 
 * @document ../../../docs/concepts/samplers.md
 * 
 * @param options - Sampling configuration.
 * @param options.sampleCount - Number of samping positions to be added to the datatset.
 * @param options.displayRadius - Radius of the sampled sphere used for 
 *      visualization. Does not affect the sampled field values.
*/
export const FibonacciSampler = {

    metadata: {
        displayName: "Fibonacci Sampler",
        description: "Samples the boundary using a Fibonacci sphere distribution with nearly uniform point spacing.",
        samplerType: "boundary"
    },

    defaults: {
        sampleCount: 1600,
        displayRadius: 1
    },

    generate(boundary: BoundaryField, options: BoundarySamplerOptions): PointDataset {

        const {
            sampleCount = this.defaults.sampleCount as number,
            displayRadius = this.defaults.displayRadius as number
        } = options;

        const goldenAngle = Math.PI * (3 - Math.sqrt(5));

        const dataset = new PointDataset({ 'boundary': boundary.metadata });

        dataset.metadata.sampler = { ...this.metadata };

        for (let i = 0; i < sampleCount; i++) {

            const z = 1 - 2 * ((i + 0.5) / sampleCount);

            const radius = Math.sqrt(1 - z*z);

            const azimuth = i * goldenAngle; // phi

            const x = Math.cos(azimuth) * radius;
            const y = Math.sin(azimuth) * radius;

            const unitDirection: Vector3 = {x, y, z};

            const position = Scale(unitDirection, displayRadius);

            const value = boundary.sample(unitDirection);

            dataset.add({ unitDirection, position, value });
        }

        return dataset;
    }
} satisfies BoundarySampler

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ 
// - ~ - Volume Samplers - ~ -

/**
 * Samples a decoded scalar field within a uniform Cartesian voxel grid.
 * 
 * The sampler divides a cubic volume of the specified `size` into equally
 * sized voxels and evaluates the decoder at the centre position of each voxel.
 * 
 * The resulting values are stored in a `VoxelGrid` suitable for volume rendering,
 * isosurface extraction, or other 3D processing techniques.
 * 
 * This sampler assumes that the input decoder represents a continuous
 * scalar field in 3D space. The sampling resolution is uniform along all
 * three axes, producing a regular grid with predictable memory requirements.
 * 
 * @document ../../../docs/concepts/samplers.md
 * 
 * @param decoder - Decoder bound to a scalar field to evaluate values 
 * at voxel indexes / coordinates.
 *
 * @param options - Sampling configuration.
 * @param options.size - Physical size of the cubic sampling volume.
 * @param options.resolution - Number of voxels along each axis.
*/
export const UniformVoxelSampler = {

    metadata: {
        displayName: "Uniform Voxel Sampler",
        description: "Samples a decoded scalar field on a uniform Cartesian voxel grid.",
        samplerType: "voxel",
    },

    defaults: {
        size: 2,
        resolution: 96
    },

    generate(decoder: BoundDecoder, options: SpatialSamplerOptions): VoxelGrid {
        
        const {
            size = this.defaults.size as number,
            resolution = this.defaults.resolution as number
        } = options;

        const step = size / resolution;

        const dataset = new VoxelGrid(decoder, size, resolution, step);

        dataset.metadata.sampler = { ...this.metadata };

        for(let z = 0; z < resolution; z++) {

            for(let y = 0; y < resolution; y++) {

                for(let x = 0; x < resolution; x++) {

                    const position = GridPosition(x, y, z, size, step);

                    dataset.set(x, y, z, decoder.sample(position));
                }
            }
        }

        return dataset;
    }
} satisfies VoxelSampler

/**
 * Samples a decoded scalar field as a uniform 3D point cloud.
 *
 * The sampler evaluates the decoder at regularly spaced positions throughout
 * the specified volume and stores the resulting samples in a `PointDataset`.
 *
 * The resulting points can be used for point-based rendering or other 3D
 * processing techniques.
 *
 * This sampler produces a regular spatial distribution of samples, independent
 * of the scalar values returned by the decoder.
 * 
 * @document ../../../docs/concepts/samplers.md
 * 
 * @param decoder - Decoder bound to a scalar field to evaluate values 
 * at voxel indexes / coordinates.
 * 
 * @param options - Sampling configuration.
 * @param options.size - Physical size of the cubic sampling volume.
 * @param options.resolution - Number of sampling positions along each axis.
 * @param options.threshold - Minimum scalar-field value required for a sample to be retained.
 */
export const UniformPointCloudSampler = {

    metadata: {
        displayName: "Uniform Point Cloud Sampler",
        description: "Samples a decoded scalar field as a thresholded Cartesian point cloud.",
        samplerType: "pointCloud"
    },

    defaults: {
        size: 2,
        resolution: 72,
        threshold: 0.02
    },

    generate(decoder: BoundDecoder, options: SpatialSamplerOptions): PointDataset {

        const {
            size = this.defaults.size as number,
            resolution = this.defaults.resolution as number,
            threshold = this.defaults.threshold as number
        } = options;

        const dataset = new PointDataset(decoder.metadata);

        dataset.metadata.sampler = { ...this.metadata };

        const step = size / resolution;

        for (let z = 0; z < resolution; z++) {

            for (let y = 0; y < resolution; y++) {

                for (let x = 0; x < resolution; x++) {

                    const position = GridPosition(x, y, z, size, step);

                    const value = decoder.sample(position);

                    if (value >= threshold) dataset.add({ position, value });
                }
            }
        }

        return dataset;
    },
} satisfies PointCloudSampler

/**
 * Samples a decoded scalar field as a point cloud representing its surface.
 *
 * The sampler evaluates the decoder throughout the specified volume and
 * retains positions where the scalar field meets the configured surface
 * criterion.
 *
 * The resulting points are stored in a `PointDataset` suitable for
 * point-based rendering or other surface-based 3D processing.
 *
 * Unlike `UniformPointCloudSampler`, this sampler selects points according
 * to the decoded field rather than sampling the volume uniformly.
 * 
 * @document ../../../docs/concepts/samplers.md
 * 
 * @param decoder - Decoder bound to a scalar field to evaluate values 
 * at voxel indexes / coordinates.
 * 
 * @param options - Sampling configuration.
 * @param options.size - Physical size of the cubic sampling volume.
 * @param options.resolution - Number of sampling positions along each axis.
 * @param options.threshold - Tolerance around the isovalue used to select surface samples.
 * @param options.isoValue - Scalar-field value defining the target surface.
 */
export const SurfacePointCloudSampler = {

    metadata: {
        displayName: "Surface Point Cloud Sampler",
        description: "Samples a decoded scalar field as points near an isosurface.",
        samplerType: "pointCloud"
    },

    defaults: {
        size: 2,
        resolution: 128,
        threshold: 0.02,
        isoValue: 0
    },

    generate(decoder: BoundDecoder, options: SpatialSamplerOptions): PointDataset {

        const {
            size = this.defaults.size as number,
            resolution = this.defaults.resolution as number,
            threshold = this.defaults.threshold as number,
            isoValue = this.defaults.isoValue as number
        } = options;

        const dataset = new PointDataset(decoder.metadata);

        dataset.metadata.sampler = { ...this.metadata };

        const step = size / resolution;

        for (let z = 0; z < resolution; z++) {

            for (let y = 0; y < resolution; y++) {

                for (let x = 0; x < resolution; x++) {

                    const position = GridPosition(x, y, z, size, step);

                    const value = decoder.sample(position);

                    if (Math.abs(value - isoValue) <= threshold) {

                        dataset.add({ position, value });
                    }
                }
            }
        }

        return dataset;
    }
} satisfies PointCloudSampler
