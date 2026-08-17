/**
 * Diagnostic utilities for inspecting generated datasets.
 *
 * Provides non-invasive analysis tools for validating pipeline output,
 * sampling scalar fields, measuring spatial distributions, and producing
 * reports useful during algorithm development.
 *
 * Diagnostics operate on completed dataset instances and do not modify
 * the underlying data. They are intended for validation, debugging, and
 * development analysis of the pipeline implementation.
 *
 * @module Diagnostics
 */
// dp - dataset pipeline
import * as dp from "./pipeline.js";
// - ~ - ~ - ~ - ~ - ~ -
// - ~ - Launchers - ~ -
// Runs a configurable series of diagnostic analyses on generated boundary sampling data.
const boundaryDiagnostics = (bfield, sampler) => {
    const PointDataset = dp.GenerateBoundaryDataset(bfield, sampler, { thetaSegments: 32, phiSegments: 64 });
    console.log(PointDataset);
    CheckPointSample(PointDataset);
};
//boundaryDiagnostics('PolarHeightField', 'FibonacciSampler');
// Runs a configurable series of diagnostic analyses on voxel data.
const voxelDiagnostics = (bfield, decoder, sampler, gridParams) => {
    const voxelGrid = dp.GenerateVoxelDataset(bfield, decoder, sampler, gridParams);
    //console.log(voxelGrid);
    //ScalarFieldRange(voxelGrid);
    //ZeroCrossingStats(voxelGrid);
    MixedCubeRatio(voxelGrid);
    //ScalarInboundCount(voxelGrid);
    //IsolevelStats(voxelGrid, -0.1);
};
//voxelDiagnostics('HemisphereField', 'RadialDecoder', 'UniformVoxelSampler', {});
// Runs a configurable series of diagnostic analyses on point cloud data.
const pointCloudDiagnostics = (bfield, decoder, sampler, gridParams) => {
    const pointCloudGrid = dp.GeneratePointCloudDataset(bfield, decoder, sampler, gridParams);
    console.log("pointCloudGrid", pointCloudGrid);
    CheckPointSample(pointCloudGrid);
};
//pointCloudDiagnostics('HemisphereField', 'RadialDecoder', 'UniformPointCloudSampler', {});
// Runs a configurable series of diagnostic analyses on mesh data.
const meshDiagnostics = (bfield, decoder, sampler, generator, gridParams) => {
    const triangleMesh = dp.GenerateMeshDataset(bfield, decoder, sampler, generator, gridParams);
    //console.log("Metadata", triangleMesh.metadata);
    MeshChecks(triangleMesh);
};
//meshDiagnostics('PolarHeightField', 'RadialDecoder', 'UniformVoxelSampler', 'DualContouringGenerator', {});
// - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Helper / diagnostic functions - ~ -
/**
 * Logs the distribution of scalar values below and above an isolevel.
 * Useful for evaluating how the chosen isolevel partitions the voxel data.
 */
function IsolevelStats(dataset, isoLevel = 0.5) {
    let below = 0;
    let above = 0;
    for (const value of dataset.values) {
        if (value < isoLevel)
            below++;
        else
            above++;
    }
    console.log({
        isoLevel,
        below,
        above,
        totalVoxels: dataset.values.length,
        belowRatio: below / dataset.values.length
    });
}
function CheckPointSample(dataset) {
    const values = dataset.samples.map(s => s.value);
    console.log("\nStats:");
    console.log({
        samples: dataset.samples.length,
        min: Math.min(...values),
        max: Math.max(...values)
    });
    console.log("\nSampled values:");
    console.log(dataset.samples[0]);
    console.log(dataset.samples[1000]);
    console.log(dataset.samples[2111]);
    console.log(dataset.samples.at(-1));
}
/** Samples a decoder at regular intervals along the z-axis and logs the resulting values. */
function TestDecoderAlgo(decoder) {
    for (let z = -1; z <= 1; z += 0.5) {
        const value = decoder.sample({ x: 0, y: 0, z });
        console.log(`z: ${z.toFixed(2).padStart(5)}\tvalue: ${value.toFixed(2).padStart(5)}`);
    }
}
/**
 * Calculates and logs the minimum and maximum values of a voxel dataset.
 *
 * Can be used to log the values of a dataset rendered in a browser.
 *
 * Temporary, while there isn't a proper statistics panel set up in the webpage.
 */
export function ScalarFieldRange(dataset) {
    let min = Infinity;
    let max = -Infinity;
    for (const value of dataset.values) {
        min = Math.min(min, value);
        max = Math.max(max, value);
    }
    console.log({ min, max });
}
/** Counts and logs the number of voxels classified as inside the surface. */
function ScalarInboundCount(dataset) {
    let inside = 0;
    for (const value of dataset.values) {
        if (value > 0)
            inside++;
    }
    console.log("Voxels inside:", inside, "Total voxels", dataset.values.length);
}
/**
 * - prints the number of triangles and vertices
 * - performs a series of validation checks
 */
function MeshChecks(dataset) {
    /*
     0 → probably wrong isoLevel, empty field, or bug.
     A few hundred/thousand → plausible.
     Millions → likely duplicate generation or a broken triTable lookup.
     */
    console.log({
        triangles: dataset.triangles.length,
        vertices: dataset.triangles.length * 3
    });
    // Every triangle has three vertices
    for (const triangle of dataset.triangles) {
        console.assert(triangle.length === 3);
    }
    // No undefined vertices
    for (const triangle of dataset.triangles) {
        console.assert(triangle[0]);
        console.assert(triangle[1]);
        console.assert(triangle[2]);
    }
    // No NaN coordinates
    for (const triangle of dataset.triangles) {
        for (const vertex of triangle) {
            console.assert(Number.isFinite(vertex[0]));
            console.assert(Number.isFinite(vertex[1]));
            console.assert(Number.isFinite(vertex[2]));
        }
    }
    // Bounds check
    // Every coordinate should lie inside the voxel volume.
    const max = dataset.size;
    for (const triangle of dataset.triangles) {
        for (const [x, y, z] of triangle) {
            console.assert(x >= 0 && x <= max);
            console.assert(y >= 0 && y <= max);
            console.assert(z >= 0 && z <= max);
        }
    }
}
/**
 * Logs the number and ratio of mixed cubes in a voxel grid.
 *
 * A mixed cube contains both positive and negative scalar values and
 * therefore intersects the implicit surface.
 */
function MixedCubeRatio(dataset) {
    const { resolution } = dataset;
    let mixedCubeCount = 0;
    let cubeCount = 0;
    for (let z = 0; z < resolution - 1; z++) {
        for (let y = 0; y < resolution - 1; y++) {
            for (let x = 0; x < resolution - 1; x++) {
                cubeCount++;
                let hasPositive = false;
                let hasNegative = false;
                function test(value) {
                    if (value > 0)
                        hasPositive = true;
                    else if (value < 0)
                        hasNegative = true;
                    else {
                        hasPositive = true;
                        hasNegative = true;
                    }
                }
                test(dataset.get(x, y, z));
                test(dataset.get(x + 1, y, z));
                test(dataset.get(x, y + 1, z));
                test(dataset.get(x + 1, y + 1, z));
                test(dataset.get(x, y, z + 1));
                test(dataset.get(x + 1, y, z + 1));
                test(dataset.get(x, y + 1, z + 1));
                test(dataset.get(x + 1, y + 1, z + 1));
                if (hasPositive && hasNegative)
                    mixedCubeCount++;
            }
        }
    }
    console.log({
        mixedCubeCount,
        cubeCount,
        ratioMixedCube: mixedCubeCount / cubeCount
    });
}
/**
 * Logs zero-crossing counts and their ratio across voxel-cell edges.
 *
 * A zero crossing occurs where the scalar field changes sign between
 * the endpoints of a cell edge, indicating that the implicit surface
 * intersects that edge.
 */
function ZeroCrossingStats(dataset) {
    const { resolution } = dataset;
    let edgeCount = 0;
    let crossingCount = 0;
    // navigate voxel dataset
    for (let z = 0; z < resolution; z++) {
        for (let y = 0; y < resolution; y++) {
            for (let x = 0; x < resolution; x++) {
                const value = dataset.get(x, y, z);
                // +X
                if (x + 1 < resolution) {
                    edgeCount++;
                    const neighbour = dataset.get(x + 1, y, z);
                    if (value === 0 || neighbour === 0 ||
                        (value > 0) !== (neighbour > 0))
                        crossingCount++;
                }
                // +Y
                if (y + 1 < resolution) {
                    edgeCount++;
                    const neighbour = dataset.get(x, y + 1, z);
                    if (value === 0 || neighbour === 0 ||
                        (value > 0) !== (neighbour > 0))
                        crossingCount++;
                }
                // +Z
                if (z + 1 < resolution) {
                    edgeCount++;
                    const neighbour = dataset.get(x, y, z + 1);
                    if (value === 0 || neighbour === 0 ||
                        (value > 0) !== (neighbour > 0))
                        crossingCount++;
                }
            }
        }
    }
    console.log({
        crossingCount,
        edgeCount,
        ratioCrossEdge: crossingCount / edgeCount
    });
}
