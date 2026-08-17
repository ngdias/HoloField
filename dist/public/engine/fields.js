/**
 * Defines the boundary fields used to generate and describe the 2D data
 * that forms the basis of the projection.
 *
 * @module Boundary Fields
*/
// - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Surface Field Implementations / Functions - ~ -
/**
 * Just a debugging field. Can be anything.
 */
export const FruityField = {
    metadata: {
        displayName: "Fruity Field",
        description: "Produces a Fruity Field for debugging",
        mathFunction: "can be anything"
    },
    sample(coordinate) {
        const z = coordinate.z;
        // flat peach, doughnut/donut peach or Saturn peach
        //return 0.6 - 0.3 * z + 0.4 * (1 - z*z);
        // long tear
        //return 0.4 + Math.exp(-1.5 * (z + 1.3));
        //return 0.25 + Math.exp(-0.6 * (z + 1.3));
        //return 0.2 + 1.0 * Math.exp(-1.2 * (z + 1.1));
        // flat peach
        //const taper = -0.25 * z;
        //const belly = 0.35 * (1 - z*z);
        //return 0.6 + taper + belly;
        const clampedX = 0.5 * (Math.abs(z + 1) - Math.abs(z - 1));
        // 2. Tunable shape parameters (Decoupled Left Climb vs Right Drop)
        // Both numbers MUST be positive. Higher numbers = steeper slopes.
        const leftClimb = 1.0116; // Calibrated so x = -1 targets exactly 0.3
        const rightDrop = 8.6000; // Controls the right drop steepness (Tweak this!)
        // 3. Extract pure algebraic coefficients
        const c1 = 2.15; //0.5 * (rightDrop + leftClimb);
        const c2 = 0.05; //0.5 * (rightDrop - leftClimb);
        // 4. Calculate the mathematically stable asymmetric exponent
        const exponent = -(c1 * z * z + c2 * z * Math.abs(z));
        return 0.5; // produces a regular sphere with radial decoder
        return 0.4 + 0.25 * Math.exp(exponent);
    }
};
/**
 * A smooth height field defined by the product of two sinusoidal waves.
 *
 * The field varies along the x and y axes while remaining independent of z,
 * making it suitable for validating height-based decoders and planar surface
 * reconstruction algorithms.
 */
export const SimpleHeightField = {
    metadata: {
        displayName: "Simple Height Field",
        description: "Generates a smooth sinusoidal height field for testing planar surface projection.",
        mathFunction: "(0.25 + 0.1 * Math.sin(coordinate.x * 10) * Math.cos(coordinate.y * 10))"
    },
    sample(coordinate) {
        return (0.65 + 0.1 *
            Math.sin(coordinate.x * 10) *
            Math.cos(coordinate.y * 10));
    }
};
/**
 * Creates a vertical gradient based on the Z coordinate.
 *
 * @remarks
 * - Intended for coordinate spaces where the Z component is in
 *   the range [-1, 1]. The value is linearly mapped to [0, 1].
 *
 * - The field depends only on the Z coordinate; X and Y have no
 *   effect on the returned value.
 *
 * - For spherical surfaces (ie., the boundary representation), the
 *   input is a normalized direction vector supplied by a sphere sampler.
*/
export const PolarHeightField = {
    metadata: {
        displayName: "Polar Height Gradient",
        description: "Produces a uniform gradient between the poles.",
        mathFunction: "(coordinate.z + 1)/2"
    },
    sample(coordinate) {
        return (coordinate.z + 1) / 2;
    }
};
/**
 * Creates a northern hemisphere and southern hemisphere.
 *
 * @remarks
 * Demonstrates a simple threshold.
 * Excellent to verify that decoders handle discontinuities.
*/
export const HemisphereField = {
    metadata: {
        displayName: "Hemispherical Discountinuity",
        description: "Produces a northern hemisphere and southern hemisphere.",
        mathFunction: "coordinate.z > 0 ? 1 : 0"
    },
    sample(coordinate) {
        return (coordinate.z > 0 ? 1 : 0);
    }
};
/**
 * Produces concentric rings around the z-axis.
 *
 * @remarks
 * Tests periodic functions, high-frequency sampling and aliasing
*/
export const LatitudeBandsField = {
    metadata: {
        displayName: "Latitude Bands",
        description: "Produces concentric rings.",
        mathFunction: "0.5 + 0.5 * Math.sin(8 * Math.acos(coordinate.z))"
    },
    sample(coordinate) {
        return (0.5 + 0.5 * Math.sin(8 * Math.acos(coordinate.z)));
    }
};
