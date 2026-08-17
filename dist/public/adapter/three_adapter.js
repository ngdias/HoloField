/**
 * Creates renderable Three.js objects generated from the mathematical engine datasets.
 *
 * Contains orchestrator Classes responsible for converting the structured
 * calculation datasets into Three.js-compatible geometries, materials, and
 * scene objects.
 */
import * as THREE from "../vendor/three.module.js";
import { GenerateBoundaryDataset, GeneratePointCloudDataset, GenerateVoxelDataset, GenerateMeshDataset } from "../engine/pipeline.js";
// - ~ - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Three.js Adapters - ~ -
/**
 * Creates a 3D representation of a 2D boundary surface field
 */
export class PointRenderable {
    colors;
    positions;
    sceneObject;
    pipelineDataset;
    material = new THREE.PointsMaterial({ size: 0.03, vertexColors: true }); // color: 0xffffff
    constructor(sceneController, samplerType, boundaryName, samplerName, decoderName) {
        this.constructor.prepare(sceneController, this, samplerType, boundaryName, samplerName, decoderName);
    }
    static prepare(sceneController, renderable, samplerType, boundaryName, samplerName, decoderName) {
        const samplingParams = {}; // Use defaults for now
        const dataset = samplerType === "boundary"
            ? GenerateBoundaryDataset(boundaryName, samplerName, samplingParams)
            : GeneratePointCloudDataset(boundaryName, decoderName, samplerName, samplingParams);
        renderable.pipelineDataset = dataset;
        renderable.positions = new Float32Array(dataset.samples.length * 3);
        renderable.colors = new Float32Array(dataset.samples.length * 3);
        let minValue = Infinity;
        let maxValue = -Infinity;
        for (const sample of dataset.samples) {
            minValue = Math.min(minValue, sample.value);
            maxValue = Math.max(maxValue, sample.value);
        }
        /*
        For debugging a scalar field, a diverging map is often better:

        const normalized = (sample.value - minValue) / (maxValue - minValue);

        renderable.colors[colorIndex++] = normalized;       // red increases
        renderable.colors[colorIndex++] = 0.5;              // fixed green
        renderable.colors[colorIndex++] = 1 - normalized;   // blue decreases
        */
        let positionIndex = 0;
        let colorIndex = 0;
        for (const sample of dataset.samples) {
            const value = (sample.value - minValue) / (maxValue - minValue);
            // For a symmetric range around zero, emphasize round the sign of the field:
            // const value = (sample.value - minValue) / (maxValue - minValue);
            renderable.positions[positionIndex++] = sample.position.x;
            renderable.positions[positionIndex++] = sample.position.y;
            renderable.positions[positionIndex++] = sample.position.z;
            renderable.colors[colorIndex++] = value; // R   default: value
            renderable.colors[colorIndex++] = value; // G   default: value
            renderable.colors[colorIndex++] = 1.0; // B   default: 1.0
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(renderable.positions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(renderable.colors, 3));
        geometry.computeBoundingBox();
        geometry.center();
        renderable.sceneObject = new THREE.Points(geometry, renderable.material);
        sceneController.replaceRenderable(renderable.sceneObject);
    }
    changeMaterial(settings) {
        // something like this but an update, ToDo later
        this.material = new THREE.PointsMaterial(settings);
    }
}
/**
 * Creates a 3D projection with voxels of a 2D boundary surface field
 */
export class VoxelProjectionRenderable {
    sceneObject;
    pipelineDataset;
    color = new THREE.Color();
    material = new THREE.MeshPhongMaterial({ color: 0x00ff88, emissive: 0x004400, shininess: 100 });
    constructor(sceneController, boundaryName, decoderName, samplerName) {
        this.constructor.prepare(sceneController, this, boundaryName, decoderName, samplerName);
    }
    static prepare(sceneController, renderable, boundaryName, decoderName, samplerName) {
        const samplingParams = {}; // Use defaults
        const dataset = GenerateVoxelDataset(boundaryName, decoderName, samplerName, samplingParams);
        renderable.pipelineDataset = dataset;
        console.log(dataset.statistics);
        const minValue = dataset.statistics.positiveMin;
        const maxValue = dataset.statistics.positiveMax;
        const occupiedVoxels = dataset.statistics.positiveCount;
        const cube = new THREE.BoxGeometry(dataset.step, dataset.step, dataset.step);
        const matrix = new THREE.Matrix4();
        renderable.sceneObject = new THREE.InstancedMesh(cube, renderable.material, occupiedVoxels);
        const step = dataset.step;
        const half = dataset.size / 2;
        let instance = 0;
        for (let i = 0; i < dataset.values.length; i++) {
            const value = dataset.values[i];
            if (value <= 0)
                continue;
            const x = i % dataset.resolution;
            const y = Math.floor(i / dataset.resolution) % dataset.resolution;
            const z = Math.floor(i / (dataset.resolution * dataset.resolution));
            matrix.setPosition(x * step - half + step / 2, y * step - half + step / 2, z * step - half + step / 2);
            renderable.sceneObject.setMatrixAt(instance, matrix);
            /*
            const normalized = THREE.MathUtils.clamp(
                (value - minValue) / (maxValue - minValue), 0, 1);
            */
            const normalizedValue = THREE.MathUtils.clamp(value / maxValue, 0, 1);
            //renderable.color.setRGB(value, 0, 1 - value);
            //renderable.color.setRGB(0, normalized, 1 - normalized); // Green
            renderable.color.setRGB(0, 0.2 + 0.8 * (1 - normalizedValue), 0.3 + 0.7 * (1 - normalizedValue)); // Cyan?
            renderable.sceneObject.setColorAt(instance, renderable.color);
            instance++;
        }
        console.assert(instance === occupiedVoxels, `Voxel count mismatch: created ${instance}, expected ${occupiedVoxels}`);
        renderable.sceneObject.computeBoundingBox();
        const center = new THREE.Vector3();
        renderable.sceneObject.boundingBox.getCenter(center);
        renderable.sceneObject.position.sub(center);
        renderable.sceneObject.computeBoundingSphere();
        renderable.sceneObject.instanceMatrix.needsUpdate = true;
        renderable.sceneObject.instanceColor.needsUpdate = true;
        sceneController.replaceRenderable(renderable.sceneObject);
    }
}
/**
 * Creates a 3D projection with mesh of a 2D boundary surface field
 */
export class MeshProjectionRenderable {
    sceneObject;
    pipelineDataset;
    //color = new THREE.Color(); // mesh uses color?
    //material = new THREE.MeshNormalMaterial();
    material = new THREE.MeshNormalMaterial({ side: THREE.FrontSide });
    //material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    //material = new THREE.MeshBasicMaterial({wireframe: true});
    //material = new THREE.PointsMaterial({ size: 0.02 });
    //material = new THREE.MeshStandardMaterial({ color: 0x66ccff });
    //material = new THREE.MeshPhongMaterial({ color: 0x00ff88, emissive: 0x004400, shininess: 100 });
    constructor(sceneController, boundaryName, decoderName, samplerName, generatorName) {
        this.constructor.prepare(sceneController, this, boundaryName, decoderName, samplerName, generatorName);
    }
    static prepare(sceneController, renderable, boundaryName, decoderName, samplerName, generatorName) {
        const samplingParams = {}; // Use defaults
        const dataset = GenerateMeshDataset(boundaryName, decoderName, samplerName, generatorName, samplingParams);
        renderable.pipelineDataset = dataset;
        // Flatten the triangles
        const positions = new Float32Array(dataset.triangles.length * 9);
        let offset = 0;
        for (const triangle of dataset.triangles) {
            for (const vertex of triangle) {
                positions[offset++] = vertex[0];
                positions[offset++] = vertex[1];
                positions[offset++] = vertex[2];
            }
        }
        // Create the geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.computeBoundingBox();
        geometry.center();
        // Compute normals
        geometry.computeVertexNormals();
        // Create mesh
        renderable.sceneObject = new THREE.Mesh(geometry, renderable.material);
        sceneController.replaceRenderable(renderable.sceneObject);
    }
}
export class CubeDemoRenderable {
    sceneObject;
    pipelineDataset = { metadata: { displayName: "Demo Cube", description: "Three.js default cube" } };
    constructor(sceneController) {
        this.constructor.prepare(sceneController, this);
    }
    static prepare(sceneController, renderable) {
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshNormalMaterial();
        renderable.sceneObject = new THREE.Mesh(geometry, material);
        sceneController.replaceRenderable(renderable.sceneObject);
    }
}
