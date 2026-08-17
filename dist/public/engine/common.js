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
// - ~ - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Helper Functions - ~ -
export const IsBFieldValid = (value) => {
    return typeof value === "string" && value in BoundaryFields;
};
export const IsDecoderValid = (value) => {
    return typeof value === "string" && value in Decoders;
};
export const IsSamplerValid = (value) => {
    return typeof value === "string" && value in Samplers;
};
export const IsGeneratorValid = (value) => {
    return typeof value === "string" && value in MeshGenerators;
};
