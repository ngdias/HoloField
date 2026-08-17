/**
 * Contains controllers used by viewer.js to manage Three.js rendering
 * environment and scene objects.
 */

import * as THREE from "../vendor/three.module.js";
import { OrbitControls } from "../vendor/OrbitControls.js";

export const viewController = () => {
    
    // Renderer
    const boundaryViewer = document.getElementById("boundary-viewer");
    if (!boundaryViewer) throw new Error("Missing #boundary-viewer element");

    const projectionViewer = document.getElementById("projection-viewer");
    if (!projectionViewer) throw new Error("Missing #projection-viewer element");

    const viewerSize = Math.min(
        boundaryViewer.clientHeight,
        projectionViewer.clientHeight
    );

    const boundaryRenderer = new THREE.WebGLRenderer();
    boundaryRenderer.setSize(viewerSize, viewerSize);

    const projectionRenderer = new THREE.WebGLRenderer();
    projectionRenderer.setSize(viewerSize, viewerSize);

    // Camera
    const camera = new THREE.PerspectiveCamera(
            30, window.innerWidth / window.innerHeight,
            0.1, 1000
    );
    camera.position.z = 5;

    // Scene
    const boundaryScene = new THREE.Scene();
    const boundarySceneController = SceneController(boundaryScene);

    const projectionScene = new THREE.Scene();
    const projectionSceneController = SceneController(projectionScene);

    // Camera controls
    const boundaryControls = new OrbitControls(
        camera,
        boundaryRenderer.domElement
    );

    const projectionControls = new OrbitControls(
        camera,
        projectionRenderer.domElement
    );

    return {

        camera,

        boundaryViewer,
        projectionViewer,

        boundaryRenderer,
        projectionRenderer,

        boundaryControls,
        projectionControls,

        boundaryScene,
        boundarySceneController,

        projectionScene,
        projectionSceneController
    }
}

const SceneController = (scene) => {

    const renderGroup = new THREE.Group();
    const groupName = 'renderables';

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    const mainLightName = 'main-light';

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    const ambientLightName = 'ambient-light';

    let autoRotate = true;

    const setupGroup = () => {

        if (scene.getObjectByName(groupName)) return;

        renderGroup.name = groupName;
        scene.add(renderGroup);
    };

    const setupLights = () => {

        // Lights are coupled, so checking one is enough
        if (scene.getObjectByName(mainLightName)) return;

        ambientLight.name = ambientLightName;
        scene.add(ambientLight);

        mainLight.name = mainLightName;
        mainLight.position.set(2, 3, 4);
        scene.add(mainLight);
    };

    const replaceRenderable = (sceneObject) => {
 
        renderGroup.clear();
        renderGroup.add(sceneObject);
    };

    const rotate = (deltaTime = 0.01) => {

        if (!autoRotate) return;

        renderGroup.rotation.x += deltaTime;
        renderGroup.rotation.y += deltaTime;
    };

    setupGroup();
    setupLights();

    return {
        get autoRotate() {
            return autoRotate;
        },

        set autoRotate(value) {
            autoRotate = value;
        },

        replaceRenderable,
        rotate
    };
};