/**
 * Shared utilities used across application modules.
 *
 * This module contains functionality that is required by multiple
 * application components, such as the engine pipeline and the Express API server,
 * but does not belong exclusively to either subsystem.
 *
 * @module Common Helpers
 */

import * as BoundaryFields from "./fields.js";
import * as Decoders from "./decoders.js";
import * as Samplers from "./samplers.js";
import * as MeshGenerators from "./mesh_generators.js";

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~
// - ~ - Type definitions - ~ -

export type BoundaryName = keyof typeof BoundaryFields;
export type DecoderName = keyof typeof Decoders;
export type SamplerName = keyof typeof Samplers;
export type MeshGeneratorName = keyof typeof MeshGenerators;

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Helper Functions - ~ -

export const IsBFieldValid = (value: unknown): value is BoundaryName => {

    return typeof value === "string" && value in BoundaryFields;
}

export const IsDecoderValid = (value: unknown): value is DecoderName => {

    return typeof value === "string" && value in Decoders;
}

export const IsSamplerValid = (value: unknown): value is SamplerName => {

    return typeof value === "string" && value in Samplers;
}

export const IsGeneratorValid = (value: unknown): value is MeshGeneratorName => {

    return typeof value === "string" && value in MeshGenerators;
}