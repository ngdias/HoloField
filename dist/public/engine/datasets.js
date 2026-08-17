/**
 * Defines the dataset Classes used to store renderable data and
 * expose methods for storage, retrieval, and on-the-fly computation
 * of aggregate statistical metrics.
 *
 * @module Datasets
 */
// - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Data Classes - ~ -
/**
* Stores sampled point data generated from boundary and point-cloud datasets.
*
* Provides the metadata, sampled points, and operations required by the
* engine and visualization stages.
*/
export class PointDataset {
    samples = [];
    constructor(metadata) {
        this.metadata = { ...metadata };
    }
    add(sample) {
        this.samples.push(sample);
    }
}
/**
* Stores scalar values in a three-dimensional regular voxel grid.
*
* Provides the metadata, statistics, indexing, and value access operations
* required by the engine's sampling and mesh-generation stages.
*/
export class VoxelGrid {
    statistics = {
        positiveCount: 0,
        positiveMin: Infinity,
        positiveMax: -Infinity
    };
    constructor(decoder, size, resolution, step) {
        this.metadata = { ...decoder.metadata };
        this.size = size;
        this.resolution = resolution;
        this.step = step;
        this.values = new Float32Array(resolution ** 3);
    }
    set(x, y, z, value) {
        this.values[this.index(x, y, z)] = value;
        this.#tally(value);
    }
    index(x, y, z) {
        return x + y * this.resolution + z * this.resolution * this.resolution;
    }
    get(x, y, z) {
        return this.values[this.index(x, y, z)];
    }
    #tally(value) {
        if (value <= 0)
            return;
        this.statistics.positiveCount++;
        if (value < this.statistics.positiveMin)
            this.statistics.positiveMin = value;
        if (value > this.statistics.positiveMax)
            this.statistics.positiveMax = value;
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
export class TriangleMesh {
    constructor(metadata, triangles, size, step, isoLevel) {
        this.metadata = { ...metadata };
        this.triangles = triangles;
        this.size = size;
        this.step = step;
        this.isoLevel = isoLevel;
    }
}
