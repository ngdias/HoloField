/**
 * Defines the decoders used to transform boundary data into continuous
 * scalar fields for projection.
 * 
 * @module Decoders
*/

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Type Definitions / Imports / Exports - ~ -

import type { BoundaryField } from "./fields.js";
import type { PipelineMetadata, Vector3 } from "./datasets.js";

export interface DecoderMetadata {
    displayName: string;
    description: string;
}

/**
 * Transforms a 2D boundary field into a 3D scalar field.
 * Converts boundary information into an implicit scalar field.
 *
 * This is the core transformation step that turns a boundary description
 * into a holographic volume.
 *
 * The returned scalar field follows an implicit surface convention:
 *
 * - value > 0 : inside the object
 * - value = 0 : on the implicit surface
 * - value < 0 : outside the object
 * 
 * Must generate a zero crossing inside the sampled volume, 
 * 
 *  *- for the intended bondary field target.*
 *
 * All decoder implementations must satisfy this convention.
 */
export interface BoundDecoder {
    metadata: PipelineMetadata
    sample(position: Vector3): number
    length?: any //migration likely
    normalize?: any //migration likely
    //mapBoundaryValue(value: number): number
}

export interface DecoderFactory {
    (boundary: BoundaryField): BoundDecoder;
    metadata: DecoderMetadata;
}

// - ~ - ~ - ~ - ~ - ~ -
// - ~ - Decoders - ~ -

/**
 * Generates a height-based scalar field from a boundary field.
 * 
 * For each position, samples the boundary to obtain its height and returns 
 * the difference between the position's z coordinate and that height. 
 * 
 * Positive values indicate positions above the boundary, while negative 
 * values indicate positions below it.
 * 
 * @document ../../../docs/concepts/decoders.md
*/
export const HeightFieldDecoder = (boundary: BoundaryField) => ({

    metadata: {
        decoder: { ...HeightFieldDecoder.metadata },
        boundary: { ...boundary.metadata }
    },

    sample(position: Vector3): number {

        const h = boundary.sample(position);

        return position.z - h;
    }
});

HeightFieldDecoder.metadata = {
    displayName: "Height Field Decoder",
    description: "Converts a boundary height into a signed height field."
} as DecoderMetadata;

/**
 * Constructs a continuous 3D scalar field by projecting a spherical
 * BoundaryField surface outward from a central point in 3D space.
 *
 * The boundary values are projected into an inner volume, or onto a
 * flat surface depending on the sampled geometry, providing a simple
 * model for transforming 2D boundary data into 3D space.
 * 
 * @document ../../../docs/concepts/decoders.md
 */
export const RadialDecoder = (boundary: BoundaryField) => ({

    metadata: {
        decoder: { ...RadialDecoder.metadata },
        boundary: { ...boundary.metadata }
    },

    /**
     * Evaluates the signed scalar field.
     *
     * @returns A signed value where 
     * - Positive values indicate positions inside the generated object.
     * - Negative values indicate positions outside the generated object.
     * - Zero represents the implicit surface.
     */
    sample(position: Vector3): number {

        const r = this.length(position);

        const direction = this.normalize(position, r);

        const value = boundary.sample(direction);

        // Boundary values in [0,1] become radii in [0.5,1]
        const radius = this.mapBoundaryValue(value);

        return radius - r;
    },
    /**
     * Calculates the Euclidean distance from the origin.
    */
    length(position: Vector3): number {

        return Math.sqrt(
            position.x * position.x +
            position.y * position.y +
            position.z * position.z
        );
    },
    /**
     * Convert a position into a unit direction vector.
     *
     * @returns If the position is the origin, an arbitrary direction is returned
     * to avoid division by zero.
     */
    normalize(position: Vector3, radius: number): Vector3 {

        if (radius === 0) return { x: 0, y: 0, z: 1 }

        return {
            x: position.x / radius,
            y: position.y / radius,
            z: position.z / radius
        };
    },

    /**
     * Maps a normalized boundary value to a radius.
     * 
     * The decoder is responsible for evaluating the scalar field.
     * This method defines how boundary values are interpreted as
     * geometric distances from the origin.
     * 
     * @remarks
     * 
     * This mapping is not part of the core decoding algorithm. 
     * It's part of the interpretation of the boundary field.
     *
     * Current implementation is:
     * - linear mapping
     * 
     * Later other approaches could be implemented:
     * - exponential mapping
     * - logarithmic mapping
     * - signed displacement
     * - arbitrary transfer function
     * 
     * The radial decoder itself doesn't care — it just needs to determine "what radius corresponds to this boundary value?" 
     * Separating that concern will make the function easier to extend without modifying the core decoding logic.
     * 
     * @param value Boundary value in the range [0,1].
     * @returns Radius in world units.
    */
    mapBoundaryValue(value: number): number {

        // shape-preserving approach using a small epsilon
        const epsilon = 0.01;
        const projectionRadii_1 = epsilon + value * (1 - epsilon);

        // apply a base constant
        const projectionRadii_2 = 0.5 + value * 0.5;

        // raw value
        const projectionRadii_3 = value;

        // treat the boundary as a deviation from a base sphere
        // interpret the boundary as surface displacement
        const baseRadius = 0.6;
        const amplitude = 0.8; // 0.98
        const projectionRadii_4 = baseRadius + (value - 0.5) * amplitude;

        // or apply a nonlinear shaping function
        const shaped = Math.pow(value, 2);
        const projectionRadii_5 = baseRadius + (shaped - 0.5) * amplitude;

        return projectionRadii_3;
    }
});

RadialDecoder.metadata = {
    displayName: "Radial Decoder",
    description: "Constructs a continuous 3D scalar field using radial extrusion."
} as DecoderMetadata;

