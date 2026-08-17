/**
 * Provides pipeline dispatch functions that form the boundary between 
 * the engine and visualization layers. The pipeline assembles the configured 
 * engine components and orchestrates their execution in the required order, 
 * connecting named components and executing the required data-generation steps. 
 * It does not implement the individual algorithms or maintain application state.
 * 
 * @module Pipeline
 */

import * as BoundaryFields from "./fields.js";
import * as MeshGenerators from "./mesh_generators.js";
import * as Decoders from "./decoders.js";
import * as Samplers from "./samplers.js";
import { IsBFieldValid, IsDecoderValid, IsGeneratorValid, IsSamplerValid } from "./common.js";
import { ScalarFieldRange } from "./diagnostics.js";

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~
// - ~ - Type definitions / Type Imports - ~ -

import type { BoundaryField } from "./fields.js";
import type { DecoderFactory } from "./decoders.js";
import type { MeshGenerator } from "./mesh_generators.js";
import type { BoundarySampler, PointCloudSampler, VoxelSampler, 
              BoundarySamplerOptions, SpatialSamplerOptions } from "./samplers.js";
import type { BoundaryName, DecoderName, SamplerName, MeshGeneratorName } from "./common.js";
import { PointDataset } from "./datasets.js";

// - ~ - ~ - ~ - ~ - ~ -
// - ~ - Pipeline - ~ -

// Boundary surface representation / visualization

/**
 * Generates a point dataset from the boundary through the configured pipeline.
 * 
 * Decoder step does not apply - it's for a direct representation of the boundary
 * field on the surface of a sphere.
 *
 * Acts as the interface between the engine and visualization layers.
 */
export const GenerateBoundaryDataset = (boundaryName: BoundaryName, samplerName: SamplerName, gridParams: BoundarySamplerOptions) => {

    if (!IsBFieldValid(boundaryName)) throw new Error(`Invalid boundary field name: ${boundaryName}`);
    if (!IsSamplerValid(samplerName)) throw new Error(`Invalid sampler name: ${samplerName}`);

    const boundaryField = BoundaryFields[boundaryName];
    const sampler = Samplers[samplerName];

    if (sampler.metadata.samplerType !== "boundary") {
        throw new Error("Expected a boundary sampler.");
    }

    const pointDataset = sampler.generate(boundaryField, gridParams);

    return pointDataset as PointDataset;
}

// Volumetric representation - lazy execution

/**
 * Generates a voxel dataset through the configured pipeline.
 *
 * Acts as the interface between the engine and visualization layers.
 */
export const GenerateVoxelDataset = (
                boundaryName: BoundaryName, 
                decoderName: DecoderName, 
                samplerName: SamplerName,
                gridParams: SpatialSamplerOptions) => {

    if (!IsBFieldValid(boundaryName)) throw new Error(`Invalid boundary field name: ${boundaryName}`);
    if (!IsDecoderValid(decoderName)) throw new Error(`Invalid decoder name: ${decoderName}`);
    if (!IsSamplerValid(samplerName)) throw new Error(`Invalid sampler name: ${samplerName}`);

    const boundaryField = BoundaryFields[boundaryName];
    const decoder = Decoders[decoderName] as DecoderFactory;
    const sampler = Samplers[samplerName] as VoxelSampler;

    if (sampler.metadata.samplerType !== "voxel") {
        throw new Error("Expected a voxel sampler.");
    }

    const boundDecoder = decoder(boundaryField);

    const voxelGrid = sampler.generate(boundDecoder, gridParams);
    //ScalarFieldRange(voxelGrid);
    return voxelGrid;
}

/**
 * Generates a point dataset from the decoded field through the configured pipeline.
 *
 * Acts as the interface between the engine and visualization layers.
 */
export const GeneratePointCloudDataset = (
                boundaryName: BoundaryName, 
                decoderName: DecoderName, 
                samplerName: SamplerName,
                gridParams: SpatialSamplerOptions) => {

    if (!IsBFieldValid(boundaryName)) throw new Error(`Invalid boundary field name: ${boundaryName}`);
    if (!IsDecoderValid(decoderName)) throw new Error(`Invalid decoder name: ${decoderName}`);
    if (!IsSamplerValid(samplerName)) throw new Error(`Invalid sampler name: ${samplerName}`);

    const boundaryField = BoundaryFields[boundaryName] as BoundaryField;
    const decoder = Decoders[decoderName] as DecoderFactory;
    const sampler = Samplers[samplerName] as PointCloudSampler;

    if (sampler.metadata.samplerType !== "pointCloud") {
        throw new Error("Expected a point cloud sampler.");
    }

    const boundDecoder = decoder(boundaryField);

    const pointCloudGrid = sampler.generate(boundDecoder, gridParams);

    return pointCloudGrid;
}

/**
 * Generates a mesh dataset through the configured pipeline.
 *
 * Acts as the interface between the engine and visualization layers,
 * exposing generated data to the rendering side.
 */
export const GenerateMeshDataset = (
                boundaryName: BoundaryName, 
                decoderName: DecoderName, 
                samplerName: SamplerName,
                generatorName: MeshGeneratorName,
                gridParams: SpatialSamplerOptions) => {

    if (!IsBFieldValid(boundaryName)) throw new Error(`Invalid boundary field name: ${boundaryName}`);
    if (!IsDecoderValid(decoderName)) throw new Error(`Invalid decoder name: ${decoderName}`);
    if (!IsSamplerValid(samplerName)) throw new Error(`Invalid sampler name: ${samplerName}`);
    if (!IsGeneratorValid(generatorName)) throw new Error(`Invalid mesh generator name: ${generatorName}`);

    const voxelGrid = GenerateVoxelDataset(boundaryName, decoderName, samplerName, gridParams);

    const meshGenerator = MeshGenerators[generatorName] as MeshGenerator;

    const triangleMesh = meshGenerator.generate(voxelGrid, {});

    return triangleMesh;
}
