/**
 * Defines the dataset Classes used to store renderable data and
 * expose methods for storage, retrieval, and on-the-fly computation
 * of aggregate statistical metrics.
 * 
 * @module Datasets
 */

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ ~ -
// - ~ - Type definitions / Type Imports - ~ -

import type { BoundaryField } from "./fields.js"
import type { BoundDecoder, DecoderMetadata } from "./decoders.js"
import type { Sampler } from "./samplers.js"
import type { MeshGenerator, Triangle } from "./mesh_generators.js"

export interface PointDataset {
    metadata: PipelineMetadata
    samples: PointSample[]
    add(sample: PointSample): void
}

export interface VoxelGrid {
    metadata: PipelineMetadata
    size: number
    resolution: number
    step: number
    statistics: {
        positiveCount: number
        positiveMin: number
        positiveMax: number
    }
    values: Float32Array
    index(x: number, y: number, z: number): number
    set(x: number, y: number, z: number, value: number): void
    get(x: number, y: number, z: number): number
}

export interface TriangleMesh {
    metadata: PipelineMetadata & {
        generator: MeshGenerator["metadata"]
    }
    size: number
    step: number
    isoLevel: number
    triangles: Triangle[];
}

/**
 * Records the provenance of a dataset as it passes through the pipeline.
 * 
 * Metadata from each processing stage is accumulated in sequence, allowing 
 * a dataset to retain the identity and configuration of the operations
 * that produced it.
*/
export interface PipelineMetadata {
    boundary?: BoundaryField["metadata"]
    decoder?: DecoderMetadata
    sampler?: Sampler["metadata"];
}

/**
 * A 3-point XYZ coordinate represented as an object.
 *
 * Counterpart to the tuple-based VectorCoord used by mesh generators.
 */
export type Vector3 = {
    x: number
    y: number
    z: number
}

/**
 * Defines the data structure used to store a sampled point from a boundary 
 * field and its calculated scalar value.
 * 
 * Represents a discrete point in the 2D surface field that was sampled and 
 * had its value calculated.
 * 
 * - unitDirection describes the point in the boundary's parameterization, 
 * typically as a normalized direction vector. It identifies where the
 * point lies on the source surface.
 * 
 * - position is the corresponding world-space position used to represent 
 * the sampled point in the generated dataset and visualization.
 * 
 * - value is the scalar field value calculated at the sampled point.
 */
type PointSample = {
    unitDirection?: Vector3,  // Parameterization of the boundary
    position: Vector3,   // World-space location used for rendering
    value: number       // Scalar stored on the boundary
}

// - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Data Classes - ~ -

/**
* Stores sampled point data generated from boundary and point-cloud datasets.
*
* Provides the metadata, sampled points, and operations required by the
* engine and visualization stages.
*/
export class PointDataset implements PointDataset {

    samples: PointSample[] = [];

    constructor(metadata: PipelineMetadata) {

        this.metadata = { ...metadata };
    }

    add(sample: PointSample): void {

        this.samples.push(sample);
    }
}

/**
* Stores scalar values in a three-dimensional regular voxel grid.
*
* Provides the metadata, statistics, indexing, and value access operations
* required by the engine's sampling and mesh-generation stages.
*/
export class VoxelGrid implements VoxelGrid {

    statistics = {
        positiveCount: 0,
        positiveMin: Infinity,
        positiveMax: -Infinity
    }

    constructor(decoder: BoundDecoder, size: number, resolution: number, step: number) {

        this.metadata = { ...decoder.metadata };
        this.size = size;
        this.resolution = resolution;
        this.step = step;
        this.values = new Float32Array(resolution ** 3);
    }

    set(x: number, y: number, z: number, value: number): void {

        this.values[this.index(x, y, z)] = value;
        this.#tally(value);
    }

    index(x: number, y: number, z: number): number {

        return x + y * this.resolution + z * this.resolution * this.resolution;
    }
    
    get(x: number, y: number, z: number): number {

        return this.values[this.index(x, y, z)];
    }

    #tally(value: number): void {

        if (value <= 0) return;

        this.statistics.positiveCount++;
        if (value < this.statistics.positiveMin) this.statistics.positiveMin = value;
        if (value > this.statistics.positiveMax) this.statistics.positiveMax = value;
    }
}

/**
 * Represents a generated triangular surface mesh.
 *
 * TriangleMesh is an engine-side geometry dataset produced by mesh generation
 * algorithms. It stores the surface as a collection of independent triangles,
 * where each triangle contains three 3D coordinates.
 *
 * The dataset is intentionally kept separate from rendering representations.
 * Browser-side adapters are responsible for converting the mesh into the
 * structures required by rendering engines such as Three.js (for example,
 * flattened position buffers and indexed geometry).
 *
 * @example
 * A mesh generated from a voxel field:
 *
 * (VoxelGrid) → MeshGenerator → (TriangleMesh) → Renderable Adapter → Screen display
 */
export class TriangleMesh implements TriangleMesh {

    constructor(metadata: PipelineMetadata & {generator: MeshGenerator["metadata"]}, 
                    triangles: Triangle[], size: number, step: number, isoLevel: number) {

        this.metadata = { ...metadata };
        this.triangles = triangles;
        this.size = size;
        this.step = step;
        this.isoLevel = isoLevel;
    }
}
