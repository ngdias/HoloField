/**
 * Defines the mesh generators used to extract renderable geometry from
 * voxel datasets.
 * 
 * @module Mesh Generators
*/

import { TriangleMesh } from "./datasets.js"

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ 
// - ~ - Type Definitions / Type Imports - ~ -

import type { VoxelGrid } from "./datasets.js"

type MeshGeneratorOptions = {
    isoLevel?: number
}

/**
 * A 3-point XYZ coordinate represented as a tuple.
 *
 * Counterpart to the object-based Vector3 used by datasets.
 */
type VectorCoord = [number, number, number];

/**
 * A triangle defined by three 3D coordinates.
 */
export type Triangle = [VectorCoord, VectorCoord, VectorCoord];

type SurfaceConstraint = {
    position: VectorCoord;
    normal: VectorCoord;
}

type Axis = keyof typeof axisConfigs;

/**
 * Common interface for mesh generators that extract a surface from voxel data.
 *
 * Defines the metadata, default parameters, and generation method shared by
 * all mesh-generation algorithms.
 */
export interface MeshGenerator {
    metadata: {
        displayName: string
        description: string
    }

    defaults: {
        isoLevel: number
    }

    generate(voxelDataset: VoxelGrid, options: MeshGeneratorOptions): TriangleMesh
}
/**
 * Internal runtime state shared between mesh-generator methods.
 *
 * Stores the input data, generation parameters, and temporary geometry
 * produced during the mesh-generation process.
 */
interface GeneratorRuntime {
    voxelDataset: VoxelGrid
    isoLevel: number
	resolution?: number
    triangles: Triangle[]
	vertices?: Map<number, VectorCoord>
};

// - ~ - Mesh Generators - ~ -

/**
 * Mesh generator implementing the Marching Cubes algorithm for extracting
 * an isosurface from voxel data.
 */
export const MarchingCubesGenerator = {

    metadata: {
        displayName: "Marching Cubes Generator",
        description: "Extracts a isosurface mesh from a voxel grid using the Marching Cubes algorithm.",
    },

    defaults: {
        isoLevel: 0.15 //0.5
    },

    generate(voxelDataset: VoxelGrid, options: MeshGeneratorOptions): TriangleMesh {

        const { isoLevel = this.defaults.isoLevel as number } = options;

        const resolution = voxelDataset.resolution;
        const runtime: GeneratorRuntime = {
            voxelDataset,
            isoLevel,
            triangles: []
        }

        for (let z = 0; z < resolution - 1; z++) {
            
            for (let y = 0; y < resolution - 1; y++) {
                
                for (let x = 0; x < resolution - 1; x++) {

                    this.processCube(runtime, x, y, z);
                }
            }
        }

        const meshMetadata = {
            ...voxelDataset.metadata,
            generator: { ...this.metadata }
        };

        return new TriangleMesh(
            meshMetadata,
            runtime.triangles,
            voxelDataset.size,
            voxelDataset.step,
            isoLevel
        );
    },

    processCube(runtime: GeneratorRuntime, x: number, y: number, z: number): void {

        const { isoLevel, voxelDataset } = runtime;

		const step = voxelDataset.step;

        //const corners = GetCubeCorners(x, y, z);
        //const values: number[] = corners.map(([cx, cy, cz]) => voxelDataset.get(cx, cy, cz));

		const values = new Array<number>(8);

		for (let i = 0; i < 8; i++) {

			const [ox, oy, oz] = cubeCornerOffsets[i];

			values[i] = voxelDataset.get(x + ox, y + oy, z + oz);
		}

		const cubeIndex = GetCubeIndex(values, isoLevel);

		if (cubeIndex === 0 || cubeIndex === 255) return;

        const edgeMask = GetCubeEdgeMask(cubeIndex);
		//const edgeMask = triTable[cubeIndex];

		//const edgeVertices = GetEdgeVertices(edgeMask, corners, isoLevel, voxelDataset.step);
        const edgeVertices: (VectorCoord | undefined)[] = new Array(12);

        for (let edge = 0; edge < 12; edge++) {

            if (edgeMask & (1 << edge)) {

                const [a, b] = edgeCorners[edge];

                const vertex = InterpolateVertex(x, y, z, a, b, values[a], values[b], isoLevel);

                edgeVertices[edge] = [
                    vertex[0] * step,
                    vertex[1] * step,
                    vertex[2] * step
                ];
            }
        }

        const triangleOffset = cubeIndex * 16;

        for (let i = 0; triTable[triangleOffset + i] !== -1; i += 3) {

            const a = edgeVertices[triTable[triangleOffset + i]];
            const b = edgeVertices[triTable[triangleOffset + i + 1]];
            const c = edgeVertices[triTable[triangleOffset + i + 2]];

            if (!a || !b || !c) return;

            //console.assert(triTable[triangleOffset + i] >= 0 && triTable[triangleOffset + i] < 12);

            const triangle: Triangle = [a, b, c];

            runtime.triangles.push(triangle);
        }
    }
}

/**
 * Mesh generator implementing the Dual Contouring algorithm for extracting
 * an isosurface from voxel data.
 */
export const DualContouringGenerator = {

    metadata: {
        displayName: "Dual Contouring Generator",
        description: "Extracts a isosurface mesh from a voxel grid using the Dual Contouring algorithm.",
    },

    defaults: {
        isoLevel: 0.15 //0.5
    },

    generate(voxelDataset: VoxelGrid, options: MeshGeneratorOptions): TriangleMesh {

        const { isoLevel = this.defaults.isoLevel as number } = options;

        const resolution = voxelDataset.resolution;

        const runtime: GeneratorRuntime = {
            voxelDataset,
            isoLevel,
			resolution,
			vertices: new Map(), // temporary
            triangles: [], // the data sent to the mesh instance
        }

		// Pass 1: Generate one dual vertex for each active voxel
        for (let z = 0; z < resolution - 1; z++) {
            for (let y = 0; y < resolution - 1; y++) {
                for (let x = 0; x < resolution - 1; x++) {

                    this.processCube(runtime, x, y, z);
                }
            }
        }

		// Pass 2: Connect neighboring dual vertices into surface quads
		for (let z = 0; z < resolution - 1; z++) {
			for (let y = 0; y < resolution - 1; y++) {
				for (let x = 0; x < resolution - 1; x++) {

					for (const axis of ["X","Y","Z"] as const) {

						const cfg = axisConfigs[axis];

						if (cfg.valid(x,y,z)) this.generateDCFace(runtime, x, y, z, axis);
					}				
				}
			}
		}

		const meshMetadata = {
            ...voxelDataset.metadata,
            generator: { ...this.metadata }
        };

        return new TriangleMesh(
            meshMetadata,
            runtime.triangles,
            voxelDataset.size,
            voxelDataset.step,
            isoLevel
			//[...runtime.vertices.values()] // Dual contouring debug and point dataset generation
        );
    },

    processCube(runtime: GeneratorRuntime, x: number, y: number, z: number): void {

        const { isoLevel, resolution, voxelDataset } = runtime;

		const step = voxelDataset.step;

        //const corners = GetCubeCorners(x, y, z);
		//const values: number[] = corners.map(([cx, cy, cz]) => voxelDataset.get(cx, cy, cz));

		const values = new Array<number>(8);

		for (let i = 0; i < 8; i++) {

			const [ox, oy, oz] = cubeCornerOffsets[i];

			values[i] = voxelDataset.get(x + ox, y + oy, z + oz);
		}

		const cubeIndex = GetCubeIndex(values, isoLevel);

		if (cubeIndex === 0 || cubeIndex === 255) return;
		
        const edgeMask = GetCubeEdgeMask(cubeIndex);

		const constraints: SurfaceConstraint[] = [];

		for (let edge = 0; edge < 12; edge++) {

			if (edgeMask & (1 << edge)) {

				const [a, b] = edgeCorners[edge];

				const position = InterpolateVertex(x, y, z, a, b, values[a], values[b], isoLevel);

				const normal = GetNormalAt(voxelDataset, position);

				constraints.push({ position, normal	});
			}
		}

		//const vertex = CreateDualVertex(constraints); // simpler implementation
		const vertex = SolveQEF(constraints, [x, y, z], [x + 1, y + 1, z + 1]);

		const cubeKey = GetCubeIndex3D(x, y, z, resolution!);

		const worldVertex: VectorCoord = [vertex[0] * step, vertex[1] * step, vertex[2] * step];

		runtime.vertices!.set(cubeKey, worldVertex);
    },

	generateDCFace(runtime: GeneratorRuntime, x: number, y: number, z: number, axis: Axis): void {

		const { isoLevel, voxelDataset } = runtime;
			
		const cfg = axisConfigs[axis];
		if (!cfg) throw new Error(`Invalid axis: ${axis}`);

		// 2. Check for a sign change crossing along the target edge
		const insideA = voxelDataset.get(x, y, z) < isoLevel;
		const insideB = voxelDataset.get(x + cfg.dx, y + cfg.dy, z + cfg.dz) < isoLevel;

		if (insideA === insideB) return;

		// 3. Retrieve the 4 vertices forming the quad ring, applying an 'o'ffset
		const verts = cfg.ring.map(({ox, oy, oz}) => GetVertex(runtime, x + ox, y + oy, z + oz));

		const [v0,v1,v2,v3] = verts;

		if (!v0 || !v1 || !v2 || !v3) return;

		// 4. Output both triangles with uniform winding based on edge directionality
		if (insideA) {
			runtime.triangles.push(
				[v0, v1, v2], 
				[v0, v2, v3]);

		} else {
			runtime.triangles.push(
				[v0, v2, v1], 
				[v0, v3, v2]);
		}
	}
} 

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~  
// - ~ - Algorithm Utilities  - ~ -

/** QEF implementation for Dual Contouring */
const SolveQEF = (constraints: SurfaceConstraint[],	voxelMin: VectorCoord, 
	voxelMax: VectorCoord): VectorCoord => {

	const count = constraints.length;

	if (count === 0) {
		return [
			(voxelMin[0] + voxelMax[0]) * 0.5,
			(voxelMin[1] + voxelMax[1]) * 0.5,
			(voxelMin[2] + voxelMax[2]) * 0.5
		];
	}

	// Single Hermite constraint: the intersection point is already the best solution
	if (count === 1) return ClampToBounds(constraints[0].position, voxelMin, voxelMax);

	// Fallback point (constraint centroid)
	let cx = 0;	let cy = 0;	let cz = 0;

	for (const c of constraints) {
		cx += c.position[0];
		cy += c.position[1];
		cz += c.position[2];
	}

	cx /= count; cy /= count; cz /= count;

	/*
	Build the normal equations:

		AᵀA x = Aᵀb

	where:
		A = surface normals
		b = normal · intersection position

	AᵀA is symmetric:

		[ ata00  ata01  ata02 ]
		[ ata01  ata11  ata12 ]
		[ ata02  ata12  ata22 ]
	*/

	let ata00 = 0; let ata01 = 0; let ata02 = 0; 
	let ata11 = 0; let ata12 = 0; let ata22 = 0;

	let atbX = 0; let atbY = 0; let atbZ = 0;

	for (const constraint of constraints) {

		const [nx, ny, nz] = constraint.normal;
		const [px, py, pz] = constraint.position;

		const rhs =
			nx * px +
			ny * py +
			nz * pz;

		ata00 += nx * nx;
		ata01 += nx * ny;
		ata02 += nx * nz;

		ata11 += ny * ny;
		ata12 += ny * nz;

		ata22 += nz * nz;

		atbX += nx * rhs;
		atbY += ny * rhs;
		atbZ += nz * rhs;
	}

	const det =
    ata00 * (ata11 * ata22 - ata12 * ata12) -
    ata01 * (ata01 * ata22 - ata02 * ata12) +
    ata02 * (ata01 * ata12 - ata02 * ata11);

	const trace = ata00 + ata11 + ata22;

	const conditioning = Math.abs(det) / (trace * trace * trace);

	// Regularization factor
	const alpha = trace * Math.max(1e-5, 5e-3 * (1 - conditioning));
	//const alpha = trace * Math.max(1e-6, 1e-3 * (1 - conditioning));
	//const alpha = 1e-4; 

	// Add alpha to the main diagonal of AᵀA
	ata00 += alpha;
	ata11 += alpha;
	ata22 += alpha;

	// Biases the system to pull towards the fallback center when under-determined
	atbX += alpha * cx;
	atbY += alpha * cy;
	atbZ += alpha * cz;

	const solution = SolveSymmetric3x3(
		ata00, ata01, ata02,
		ata11, ata12,
		ata22,
		atbX, atbY, atbZ
	);

	// Degenerate system: planes do not define a unique point
	if (!solution) return ClampToBounds([cx, cy, cz], voxelMin, voxelMax);

	// λ = 0 → pure QEF
	// λ = 1 → pure average
	//const lambda = 0.1;
	const lambda = 0.15 * (1 - conditioning);

	const blended: VectorCoord = [
		solution[0] * (1 - lambda) + cx * lambda,
		solution[1] * (1 - lambda) + cy * lambda,
		solution[2] * (1 - lambda) + cz * lambda
	];

	return ClampToBounds(blended, voxelMin, voxelMax);
}

const SolveSymmetric3x3 = (
	ata00: number, ata01: number, ata02: number, ata11: number, ata12: number, ata22: number,
	atbX: number, atbY: number, atbZ: number): VectorCoord | null => {

	const det =
		ata00 * (ata11 * ata22 - ata12 * ata12) -
		ata01 * (ata01 * ata22 - ata02 * ata12) +
		ata02 * (ata01 * ata12 - ata02 * ata11);

	const EPSILON = 1e-12; // 12

	if (Math.abs(det) < EPSILON) return null;

	const invDet = 1 / det;

	/*
	Inverse of the symmetric AᵀA matrix:

	1 / det(AᵀA) *

		[ ata11*ata22 - ata12²,  ata02*ata12 - ata01*ata22,  ata01*ata12 - ata02*ata11 ]
		[ ata02*ata12 - ata01*ata22,  ata00*ata22 - ata02²,  ata01*ata02 - ata00*ata12 ]
		[ ata01*ata12 - ata02*ata11,  ata01*ata02 - ata00*ata12,  ata00*ata11 - ata01² ]
	*/

	const i00 = (ata11 * ata22 - ata12 * ata12) * invDet;
	const i01 = (ata02 * ata12 - ata01 * ata22) * invDet;
	const i02 = (ata01 * ata12 - ata02 * ata11) * invDet;

	const i11 = (ata00 * ata22 - ata02 * ata02) * invDet;
	const i12 = (ata01 * ata02 - ata00 * ata12) * invDet;

	const i22 = (ata00 * ata11 - ata01 * ata01) * invDet;

	const x =
		i00 * atbX +
		i01 * atbY +
		i02 * atbZ;

	const y =
		i01 * atbX +
		i11 * atbY +
		i12 * atbZ;

	const z =
		i02 * atbX +
		i12 * atbY +
		i22 * atbZ;

	if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
		return null;
	}

	return [x,y,z];
}

const ClampToBounds = (point: VectorCoord, min: VectorCoord, max: VectorCoord): VectorCoord => {

	const padding = 0.001; // 0 or 0.01 or 0.001 or 1e-4

	return [
		Math.min(
			max[0] - padding,
			Math.max(min[0] + padding, point[0])
		),

		Math.min(
			max[1] - padding,
			Math.max(min[1] + padding, point[1])
		),

		Math.min(
			max[2] - padding,
			Math.max(min[2] + padding, point[2])
		)
	];
}

/**
 * Creates a dual-contouring vertex from surface constraints using a simple
 * averaging method as an alternative to the `SolveQEF()` approach.
 *
 * Not currently used in the production path, but can be substituted easily
 * for testing and debugging. Unlike `SolveQEF()`, it does not minimize a
 * quadratic error function and instead computes a simpler representative
 * position from the constraints.
 */
const CreateDualVertex = (constraints: SurfaceConstraint[]): VectorCoord => {

	const vertex: VectorCoord = [0, 0, 0];

	for (const c of constraints) {

        vertex[0] += c.position[0];
        vertex[1] += c.position[1];
        vertex[2] += c.position[2];
    }

    vertex[0] /= constraints.length;
    vertex[1] /= constraints.length;
    vertex[2] /= constraints.length;

	return vertex;
}

const GetGradient = (voxelDataset: VoxelGrid, x: number, y: number, z: number): VectorCoord => {

    const r = voxelDataset.resolution;

    const dx =
        x === 0
            ? voxelDataset.get(x + 1, y, z) - voxelDataset.get(x, y, z)
            : x === r - 1
                ? voxelDataset.get(x,     y, z) - voxelDataset.get(x - 1, y, z)
                : voxelDataset.get(x + 1, y, z) - voxelDataset.get(x - 1, y, z);

    const dy =
        y === 0
            ? voxelDataset.get(x, y + 1, z) - voxelDataset.get(x, y, z)
            : y === r - 1
                ? voxelDataset.get(x, y,     z) - voxelDataset.get(x, y - 1, z)
                : voxelDataset.get(x, y + 1, z) - voxelDataset.get(x, y - 1, z);

    const dz =
        z === 0
            ? voxelDataset.get(x, y, z + 1) - voxelDataset.get(x, y, z)
            : z === r - 1
                ? voxelDataset.get(x, y, z    ) - voxelDataset.get(x, y, z - 1)
                : voxelDataset.get(x, y, z + 1) - voxelDataset.get(x, y, z - 1);

    return [dx * 0.5, dy * 0.5, dz * 0.5];
};

const Normalize = (v: VectorCoord): VectorCoord => {

    const length = Math.hypot(
        v[0],
        v[1],
        v[2]
    );

    if (length === 0) return [0,0,0];

    return [
        v[0]/length,
        v[1]/length,
        v[2]/length
    ];
};

const GetNormalAt = (voxelDataset: VoxelGrid, position: VectorCoord): VectorCoord => {

	// Calculate gradient interpolated
	const x = position[0];
	const y = position[1];
	const z = position[2];

	const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const z0 = Math.floor(z);

    const x1 = Math.min(x0 + 1, voxelDataset.resolution - 1);
    const y1 = Math.min(y0 + 1, voxelDataset.resolution - 1);
    const z1 = Math.min(z0 + 1, voxelDataset.resolution - 1);

    const tx = x - x0;
    const ty = y - y0;
    const tz = z - z0;

    const g000 = Normalize(GetGradient(voxelDataset,x0,y0,z0));
    const g100 = Normalize(GetGradient(voxelDataset,x1,y0,z0));
    const g010 = Normalize(GetGradient(voxelDataset,x0,y1,z0));
    const g110 = Normalize(GetGradient(voxelDataset,x1,y1,z0));

    const g001 = Normalize(GetGradient(voxelDataset,x0,y0,z1));
    const g101 = Normalize(GetGradient(voxelDataset,x1,y0,z1));
    const g011 = Normalize(GetGradient(voxelDataset,x0,y1,z1));
    const g111 = Normalize(GetGradient(voxelDataset,x1,y1,z1));

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const interpolate = (component: number):number => {

        const c00 = lerp(g000[component], g100[component], tx);
        const c10 = lerp(g010[component], g110[component], tx);
        const c01 = lerp(g001[component], g101[component], tx);
        const c11 = lerp(g011[component], g111[component], tx);

        const c0 = lerp(c00,c10,ty);
        const c1 = lerp(c01,c11,ty);

        return lerp(c0,c1,tz);
    };

    const gradient = [
        interpolate(0),
        interpolate(1),
        interpolate(2)
    ];

	// Calculate normal
	const length = Math.hypot(
        gradient[0],
        gradient[1],
        gradient[2]
    );

    if (length === 0) { return [0,0,0]; }

    return [
        gradient[0] / length,
        gradient[1] / length,
        gradient[2] / length
    ];
};

/**
 * Encodes the scalar values at a cube's eight corners into a configuration index.
 *
 * Each corner is classified relative to the isolevel, producing one of 256
 * possible inside/outside configurations.
 *
 * Shared by the Marching Cubes and Dual Contouring generators.
 */
const GetCubeIndex = (values: number[], isoLevel: number): number => {

	let cubeIndex = 0;

	if (values[0] < isoLevel) cubeIndex |= 1;
	if (values[1] < isoLevel) cubeIndex |= 2;
	if (values[2] < isoLevel) cubeIndex |= 4;
	if (values[3] < isoLevel) cubeIndex |= 8;
	if (values[4] < isoLevel) cubeIndex |= 16;
	if (values[5] < isoLevel) cubeIndex |= 32;
	if (values[6] < isoLevel) cubeIndex |= 64;
	if (values[7] < isoLevel) cubeIndex |= 128;

	return cubeIndex;
}

/**
 * Converts 3D voxel coordinates into a linear array index.
 *
 * Used directly by Dual Contouring during cube processing and indirectly
 * when retrieving vertices for generated faces.
 */
const GetCubeIndex3D = (x: number, y: number, z: number, resolution: number): number => {

    return x + y * resolution + z * resolution * resolution;
}

/**
 * Retrieves the dual vertex associated with a voxel cell.
 * Returns undefined when no vertex has been generated for the specified cell.
 * 
 * Helper for Dual Contouring
 */
const GetVertex = (runtime: GeneratorRuntime, x: number, y: number, z: number): VectorCoord | undefined => {

	const { resolution } = runtime;

	const key = GetCubeIndex3D(x, y, z, resolution!);

	return runtime.vertices!.get(key);
}

/**
 * Calculates the intersected voxel edges for a cube configuration.
 *
 * Replaces the static Marching Cubes edge table lookup by deriving the
 * intersected edge mask directly from the cube index.
 *
 * @param cubeIndex Bitmask representing the inside/outside state of the cube corners.
 * @returns A 12-bit mask identifying cube edges crossed by the iso-surface.
 */
const GetCubeEdgeMask = (cubeIndex: number): number => {

	let edges = 0;

	for (let edge = 0; edge < 12; edge++) {

		const [a, b] = edgeCorners[edge];

		const insideA = (cubeIndex & (1 << a)) !== 0;
		const insideB = (cubeIndex & (1 << b)) !== 0;

		if (insideA !== insideB) {
			edges |= (1 << edge);
		}
	}

	if (edges === 4095) {
    	console.warn("All edges active", { cubeIndex });
	}

	return edges;
}

/** 
 * Finds Hermite intersections.
 * 
 * Used by Marching Cubes and Dual Contouring.
 */
const InterpolateVertex = (x: number, y: number, z: number, cornerA: number, cornerB: number, 
							valueA: number, valueB: number, isoLevel: number): VectorCoord => {

	const [ax, ay, az] = cubeCornerOffsets[cornerA];
    const [bx, by, bz] = cubeCornerOffsets[cornerB];

	if (Math.abs(valueB - valueA) < Number.EPSILON) {
        return [x + ax, y + ay, z + az];
    }

	const t = (isoLevel - valueA) / (valueB - valueA);

    return [
        x + ax + t * (bx - ax),
        y + ay + t * (by - ay),
        z + az + t * (bz - az)
    ];
}

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~
// - ~ - Static / Lookup Tables - ~ -

/**
 For Dual Contouring

 To replace three repeated XYZ traversal loops with a single nested loop structure.

 Define axis-specific offsets for 
   - the crossing edge and 
   - the quad ring
   - the cube traversal
*/
const axisConfigs = {
	X: {
		dx: 1, dy: 0, dz: 0,
		// 2D 'o'ffsets in the Y-Z plane around the X-axis edge
		ring: [
			{ ox: 0,  oy:  0,  oz:  0 }, // v0
			{ ox: 0,  oy: -1,  oz:  0 }, // v1
			{ ox: 0,  oy: -1,  oz: -1 }, // v2
			{ ox: 0,  oy:  0,  oz: -1 }  // v3
		],
		valid: (x: number, y: number, z: number) => y > 0 && z > 0
	},

	Y: {
		dx: 0, dy: 1, dz: 0,
		// 2D 'o'ffsets in the X-Z plane around the Y-axis edge
		ring: [
			{ ox:  0, oy: 0, oz:  0 }, // v0
			{ ox:  0, oy: 0, oz: -1 }, // v1
			{ ox: -1, oy: 0, oz: -1 }, // v2
			{ ox: -1, oy: 0, oz:  0 }  // v3
		],
		valid: (x: number, y: number, z: number) => x > 0 && z > 0
	},

	Z: {
		dx: 0, dy: 0, dz: 1,
		// 2D 'o'ffsets in the X-Y plane around the Z-axis edge
		ring: [
			{ ox:  0, oy:  0, oz: 0 }, // v0
			{ ox: -1, oy:  0, oz: 0 }, // v1
			{ ox: -1, oy: -1, oz: 0 }, // v2
			{ ox:  0, oy: -1, oz: 0 }  // v3
		],
		valid: (x: number, y: number, z: number) => x > 0 && y > 0
	}
} as const;

/**
 * Defines the local coordinates of the eight corners of a unit cube.
 * Used to access voxel values without allocating corner coordinate arrays.
 *  
 * Used by Marching Cubes and Dual Contouring
 */
const cubeCornerOffsets = [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],

    [0, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 1]
] as const;

/** 
 * Lookup table mapping each cube edge to its two corner indices. 
 *
 * Used by Marching Cubes and Dual Contouring 
*/
const edgeCorners = [
	[0, 1], // edge 0
	[1, 2], // edge 1
	[2, 3], // edge 2
	[3, 0], // edge 3

	[4, 5], // edge 4
	[5, 6], // edge 5
	[6, 7], // edge 6
	[7, 4], // edge 7

	[0, 4], // edge 8
	[1, 5], // edge 9
	[2, 6], // edge 10
	[3, 7]  // edge 11
] as const;

/**
 * Marching Cubes triangle lookup table.
 *
 * Maps each of the 256 possible cube configurations to the edge indices
 * forming the triangles required to represent the isosurface.
 * 
 * Copied over from "/node-modules/three/examples/jsm/objects/MarchingCubes.js"
 */
const triTable = new Int32Array( [
	- 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 8, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 1, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 8, 3, 9, 8, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 2, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 8, 3, 1, 2, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 2, 10, 0, 2, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	2, 8, 3, 2, 10, 8, 10, 9, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	3, 11, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 11, 2, 8, 11, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 9, 0, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 11, 2, 1, 9, 11, 9, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	3, 10, 1, 11, 10, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 10, 1, 0, 8, 10, 8, 11, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	3, 9, 0, 3, 11, 9, 11, 10, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 8, 10, 10, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	4, 7, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	4, 3, 0, 7, 3, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 1, 9, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	4, 1, 9, 4, 7, 1, 7, 3, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 2, 10, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	3, 4, 7, 3, 0, 4, 1, 2, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 2, 10, 9, 0, 2, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, - 1, - 1, - 1, - 1,
	8, 4, 7, 3, 11, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	11, 4, 7, 11, 2, 4, 2, 0, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 0, 1, 8, 4, 7, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, - 1, - 1, - 1, - 1,
	3, 10, 1, 3, 11, 10, 7, 8, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, - 1, - 1, - 1, - 1,
	4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, - 1, - 1, - 1, - 1,
	4, 7, 11, 4, 11, 9, 9, 11, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 5, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 5, 4, 0, 8, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 5, 4, 1, 5, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	8, 5, 4, 8, 3, 5, 3, 1, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 2, 10, 9, 5, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	3, 0, 8, 1, 2, 10, 4, 9, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	5, 2, 10, 5, 4, 2, 4, 0, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, - 1, - 1, - 1, - 1,
	9, 5, 4, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 11, 2, 0, 8, 11, 4, 9, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 5, 4, 0, 1, 5, 2, 3, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, - 1, - 1, - 1, - 1,
	10, 3, 11, 10, 1, 3, 9, 5, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, - 1, - 1, - 1, - 1,
	5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, - 1, - 1, - 1, - 1,
	5, 4, 8, 5, 8, 10, 10, 8, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 7, 8, 5, 7, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 3, 0, 9, 5, 3, 5, 7, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 7, 8, 0, 1, 7, 1, 5, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 5, 3, 3, 5, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 7, 8, 9, 5, 7, 10, 1, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, - 1, - 1, - 1, - 1,
	8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, - 1, - 1, - 1, - 1,
	2, 10, 5, 2, 5, 3, 3, 5, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	7, 9, 5, 7, 8, 9, 3, 11, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, - 1, - 1, - 1, - 1,
	2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, - 1, - 1, - 1, - 1,
	11, 2, 1, 11, 1, 7, 7, 1, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, - 1, - 1, - 1, - 1,
	5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, - 1,
	11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, - 1,
	11, 10, 5, 7, 11, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 8, 3, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 0, 1, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 8, 3, 1, 9, 8, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 6, 5, 2, 6, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 6, 5, 1, 2, 6, 3, 0, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 6, 5, 9, 0, 6, 0, 2, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, - 1, - 1, - 1, - 1,
	2, 3, 11, 10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	11, 0, 8, 11, 2, 0, 10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 1, 9, 2, 3, 11, 5, 10, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, - 1, - 1, - 1, - 1,
	6, 3, 11, 6, 5, 3, 5, 1, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, - 1, - 1, - 1, - 1,
	3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, - 1, - 1, - 1, - 1,
	6, 5, 9, 6, 9, 11, 11, 9, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	5, 10, 6, 4, 7, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	4, 3, 0, 4, 7, 3, 6, 5, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 9, 0, 5, 10, 6, 8, 4, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, - 1, - 1, - 1, - 1,
	6, 1, 2, 6, 5, 1, 4, 7, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, - 1, - 1, - 1, - 1,
	8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, - 1, - 1, - 1, - 1,
	7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, - 1,
	3, 11, 2, 7, 8, 4, 10, 6, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, - 1, - 1, - 1, - 1,
	0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, - 1, - 1, - 1, - 1,
	9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, - 1,
	8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, - 1, - 1, - 1, - 1,
	5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, - 1,
	0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, - 1,
	6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, - 1, - 1, - 1, - 1,
	10, 4, 9, 6, 4, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	4, 10, 6, 4, 9, 10, 0, 8, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	10, 0, 1, 10, 6, 0, 6, 4, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, - 1, - 1, - 1, - 1,
	1, 4, 9, 1, 2, 4, 2, 6, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, - 1, - 1, - 1, - 1,
	0, 2, 4, 4, 2, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	8, 3, 2, 8, 2, 4, 4, 2, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	10, 4, 9, 10, 6, 4, 11, 2, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, - 1, - 1, - 1, - 1,
	3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, - 1, - 1, - 1, - 1,
	6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, - 1,
	9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, - 1, - 1, - 1, - 1,
	8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, - 1,
	3, 11, 6, 3, 6, 0, 0, 6, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	6, 4, 8, 11, 6, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	7, 10, 6, 7, 8, 10, 8, 9, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, - 1, - 1, - 1, - 1,
	10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, - 1, - 1, - 1, - 1,
	10, 6, 7, 10, 7, 1, 1, 7, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, - 1, - 1, - 1, - 1,
	2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, - 1,
	7, 8, 0, 7, 0, 6, 6, 0, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	7, 3, 2, 6, 7, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, - 1, - 1, - 1, - 1,
	2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, - 1,
	1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, - 1,
	11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, - 1, - 1, - 1, - 1,
	8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, - 1,
	0, 9, 1, 11, 6, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, - 1, - 1, - 1, - 1,
	7, 11, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	3, 0, 8, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 1, 9, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	8, 1, 9, 8, 3, 1, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	10, 1, 2, 6, 11, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 2, 10, 3, 0, 8, 6, 11, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	2, 9, 0, 2, 10, 9, 6, 11, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, - 1, - 1, - 1, - 1,
	7, 2, 3, 6, 2, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	7, 0, 8, 7, 6, 0, 6, 2, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	2, 7, 6, 2, 3, 7, 0, 1, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, - 1, - 1, - 1, - 1,
	10, 7, 6, 10, 1, 7, 1, 3, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, - 1, - 1, - 1, - 1,
	0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, - 1, - 1, - 1, - 1,
	7, 6, 10, 7, 10, 8, 8, 10, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	6, 8, 4, 11, 8, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	3, 6, 11, 3, 0, 6, 0, 4, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	8, 6, 11, 8, 4, 6, 9, 0, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, - 1, - 1, - 1, - 1,
	6, 8, 4, 6, 11, 8, 2, 10, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, - 1, - 1, - 1, - 1,
	4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, - 1, - 1, - 1, - 1,
	10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, - 1,
	8, 2, 3, 8, 4, 2, 4, 6, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 4, 2, 4, 6, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, - 1, - 1, - 1, - 1,
	1, 9, 4, 1, 4, 2, 2, 4, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, - 1, - 1, - 1, - 1,
	10, 1, 0, 10, 0, 6, 6, 0, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, - 1,
	10, 9, 4, 6, 10, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	4, 9, 5, 7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 8, 3, 4, 9, 5, 11, 7, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	5, 0, 1, 5, 4, 0, 7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, - 1, - 1, - 1, - 1,
	9, 5, 4, 10, 1, 2, 7, 6, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, - 1, - 1, - 1, - 1,
	7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, - 1, - 1, - 1, - 1,
	3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, - 1,
	7, 2, 3, 7, 6, 2, 5, 4, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, - 1, - 1, - 1, - 1,
	3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, - 1, - 1, - 1, - 1,
	6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, - 1,
	9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, - 1, - 1, - 1, - 1,
	1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, - 1,
	4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, - 1,
	7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, - 1, - 1, - 1, - 1,
	6, 9, 5, 6, 11, 9, 11, 8, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, - 1, - 1, - 1, - 1,
	0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, - 1, - 1, - 1, - 1,
	6, 11, 3, 6, 3, 5, 5, 3, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, - 1, - 1, - 1, - 1,
	0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, - 1,
	11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, - 1,
	6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, - 1, - 1, - 1, - 1,
	5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, - 1, - 1, - 1, - 1,
	9, 5, 6, 9, 6, 0, 0, 6, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, - 1,
	1, 5, 6, 2, 1, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, - 1,
	10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, - 1, - 1, - 1, - 1,
	0, 3, 8, 5, 6, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	10, 5, 6, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	11, 5, 10, 7, 5, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	11, 5, 10, 11, 7, 5, 8, 3, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	5, 11, 7, 5, 10, 11, 1, 9, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, - 1, - 1, - 1, - 1,
	11, 1, 2, 11, 7, 1, 7, 5, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, - 1, - 1, - 1, - 1,
	9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, - 1, - 1, - 1, - 1,
	7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, - 1,
	2, 5, 10, 2, 3, 5, 3, 7, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, - 1, - 1, - 1, - 1,
	9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, - 1, - 1, - 1, - 1,
	9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, - 1,
	1, 3, 5, 3, 7, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 8, 7, 0, 7, 1, 1, 7, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 0, 3, 9, 3, 5, 5, 3, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 8, 7, 5, 9, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	5, 8, 4, 5, 10, 8, 10, 11, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, - 1, - 1, - 1, - 1,
	0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, - 1, - 1, - 1, - 1,
	10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, - 1,
	2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, - 1, - 1, - 1, - 1,
	0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, - 1,
	0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, - 1,
	9, 4, 5, 2, 11, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, - 1, - 1, - 1, - 1,
	5, 10, 2, 5, 2, 4, 4, 2, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, - 1,
	5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, - 1, - 1, - 1, - 1,
	8, 4, 5, 8, 5, 3, 3, 5, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 4, 5, 1, 0, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, - 1, - 1, - 1, - 1,
	9, 4, 5, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	4, 11, 7, 4, 9, 11, 9, 10, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, - 1, - 1, - 1, - 1,
	1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, - 1, - 1, - 1, - 1,
	3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, - 1,
	4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, - 1, - 1, - 1, - 1,
	9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, - 1,
	11, 7, 4, 11, 4, 2, 2, 4, 0, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, - 1, - 1, - 1, - 1,
	2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, - 1, - 1, - 1, - 1,
	9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, - 1,
	3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, - 1,
	1, 10, 2, 8, 7, 4, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	4, 9, 1, 4, 1, 7, 7, 1, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, - 1, - 1, - 1, - 1,
	4, 0, 3, 7, 4, 3, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	4, 8, 7, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 10, 8, 10, 11, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	3, 0, 9, 3, 9, 11, 11, 9, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 1, 10, 0, 10, 8, 8, 10, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	3, 1, 10, 11, 3, 10, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 2, 11, 1, 11, 9, 9, 11, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, - 1, - 1, - 1, - 1,
	0, 2, 11, 8, 0, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	3, 2, 11, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	2, 3, 8, 2, 8, 10, 10, 8, 9, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	9, 10, 2, 0, 9, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, - 1, - 1, - 1, - 1,
	1, 10, 2, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	1, 3, 8, 9, 1, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 9, 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	0, 3, 8, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1,
	- 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1, - 1 ] );
