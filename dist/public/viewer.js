/**
 * Main controller for the HoloField web application.
 *
 * @remarks
 * Coordinates page initialization, user interface state, pipeline controls,
 * render generation, and viewer updates. Delegates dataset generation and
 * processing to the pipeline API and delegates visualization to the
 * configured renderers.
 *
 * This module is loaded directly by the application HTML and serves as the
 * entry point for browser-side application behaviour.
 *
 * @category Application
 */
import { viewController } from "./adapter/controllers.js";
import { CubeDemoRenderable } from "./adapter/three_adapter.js";
import * as BoundaryFields from "./engine/fields.js";
import * as Decoders from "./engine/decoders.js";
import * as Samplers from "./engine/samplers.js";
import * as MeshGens from "./engine/mesh_generators.js";
import { HandleRenderOptions, PopulateSelect, PopulateSamplerSelect, RenderableListController, AddRenderable, SetPageLayout } from "./adapter/utility.js";
// - ~ - ~ - ~ - ~ - ~ - ~ - ~
// - ~ - DOM references - ~ -
const boundaryRenderList = document.getElementById("boundary-render-list");
const projectionRenderList = document.getElementById("projection-render-list");
const boundarySelect = document.getElementById("boundary-select");
const boundaryDescription = document.getElementById("boundary-description");
const decoderSelect = document.getElementById("decoder-select");
const decoderDescription = document.getElementById("decoder-description");
const samplerSelect = document.getElementById("sampler-select");
const samplerDescription = document.getElementById("sampler-description");
const meshGenSelect = document.getElementById("generator-select");
const meshGenDescription = document.getElementById("generator-description");
const metadataElement = document.getElementById("dataset-metadata");
const renderButton = document.getElementById("render-button");
const checkbox = document.getElementById("autorotate");
// - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Viewer / Renderer Initialization - ~ -
const { camera, boundaryViewer, projectionViewer, boundaryRenderer, projectionRenderer, boundaryControls, projectionControls, boundaryScene, boundarySceneController, projectionScene, projectionSceneController } = viewController();
boundaryViewer.appendChild(boundaryRenderer.domElement);
projectionViewer.appendChild(projectionRenderer.domElement);
const viewerFrame = document.querySelector(".viewer-frame");
document.documentElement.style.setProperty("--frame-width", `${viewerFrame.clientWidth}px`);
const pipelineState = {
    get boundary() { return boundarySelect.value; },
    get decoder() { return decoderSelect.value; },
    get sampler() { return samplerSelect.value; },
    get meshGen() { return meshGenSelect.value; }
};
const boundaryRenderables = new Map();
const projectionRenderables = new Map();
const boundaryController = RenderableListController(boundaryRenderables, boundaryRenderList);
const projectionController = RenderableListController(projectionRenderables, projectionRenderList);
PopulateSamplerSelect(samplerSelect);
PopulateSelect(boundarySelect, BoundaryFields);
PopulateSelect(decoderSelect, Decoders);
PopulateSelect(meshGenSelect, MeshGens, { placeholder: "-- None --", placeholderDisabled: false });
const renderables = {
    boundary: new CubeDemoRenderable(boundarySceneController),
    projection: new CubeDemoRenderable(projectionSceneController)
};
metadataElement.textContent = JSON.stringify(renderables.boundary.pipelineDataset.metadata, null, 2);
// - ~ - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Event Listeners - ~ - 
window.addEventListener("resize", () => {
    const size = boundaryViewer.clientHeight;
    boundaryRenderer.setSize(size, size);
    projectionRenderer.setSize(size, size);
});
document
    .getElementById("about-button")
    .addEventListener("click", () => SetPageLayout("about"));
document
    .getElementById("how-to-button")
    .addEventListener("click", () => SetPageLayout("howto"));
document
    .getElementById("docs-button")
    .addEventListener("click", () => SetPageLayout("docs"));
boundarySelect.addEventListener("change", () => {
    boundaryDescription.textContent = BoundaryFields[boundarySelect.value].metadata.description;
    HandleRenderOptions(pipelineState, renderButton);
});
decoderSelect.addEventListener("change", () => {
    decoderDescription.textContent = Decoders[decoderSelect.value].metadata.description;
    HandleRenderOptions(pipelineState, renderButton);
});
samplerSelect.addEventListener("change", () => {
    switch (Samplers[samplerSelect.value].metadata.samplerType) {
        case "boundary":
            decoderSelect.disabled = true;
            decoderSelect.selectedIndex = 0;
            decoderDescription.textContent = "Not required for boundary samplers.";
            meshGenSelect.disabled = true;
            meshGenSelect.selectedIndex = 0;
            meshGenDescription.textContent = "Mesh generators require a voxel sampler.";
            break;
        case "pointCloud":
            decoderSelect.disabled = false;
            decoderDescription.textContent = "";
            meshGenSelect.disabled = true;
            meshGenSelect.selectedIndex = 0;
            meshGenDescription.textContent = "Mesh generators require a voxel sampler.";
            break;
        case "voxel":
            decoderSelect.disabled = false;
            decoderDescription.textContent = "";
            meshGenSelect.disabled = false;
            meshGenDescription.textContent = "";
            break;
    }
    samplerDescription.textContent = Samplers[samplerSelect.value].metadata.description;
    HandleRenderOptions(pipelineState, renderButton);
});
meshGenSelect.addEventListener("change", () => {
    meshGenDescription.textContent = meshGenSelect.value ? MeshGens[meshGenSelect.value].metadata.description : "";
    HandleRenderOptions(pipelineState, renderButton);
});
renderButton.addEventListener("click", () => {
    SetPageLayout("render");
    const renderableKey = JSON.stringify(pipelineState);
    let samplerType = Samplers[samplerSelect.value].metadata.samplerType;
    switch (samplerType) {
        case "boundary":
            const isBoundaryCached = boundaryController.recover(boundarySceneController, renderables, renderableKey);
            if (isBoundaryCached)
                return;
            renderables.boundary = AddRenderable(boundarySceneController, pipelineState, samplerType);
            boundaryController.add(renderables.boundary, renderableKey, pipelineState);
            metadataElement.textContent = JSON.stringify(renderables.boundary.pipelineDataset.metadata, null, 2);
            break;
        default:
            const isProjectionCached = projectionController.recover(projectionSceneController, renderables, renderableKey);
            if (isProjectionCached)
                return;
            if (pipelineState.meshGen)
                samplerType = "mesh";
            renderables.projection = AddRenderable(projectionSceneController, pipelineState, samplerType);
            projectionController.add(renderables.projection, renderableKey, pipelineState);
            metadataElement.textContent = JSON.stringify(renderables.projection.pipelineDataset.metadata, null, 2);
    }
});
boundaryRenderList.addEventListener("dblclick", () => {
    const renderableKey = boundaryRenderList.value;
    if (renderableKey)
        boundaryController.recover(boundarySceneController, renderables, renderableKey);
});
projectionRenderList.addEventListener("dblclick", () => {
    const renderableKey = projectionRenderList.value;
    if (renderableKey)
        projectionController.recover(projectionSceneController, renderables, renderableKey);
});
boundaryRenderList.addEventListener("keydown", event => {
    const renderableKey = boundaryRenderList.value;
    if (!renderableKey)
        return;
    switch (event.key) {
        case "Enter":
            boundaryController.recover(boundarySceneController, renderables, renderableKey);
            break;
        case "Backspace":
        case "Delete":
            event.preventDefault(); // prevents browser navigation on Backspace
            boundaryController.remove(renderableKey);
            break;
    }
});
projectionRenderList.addEventListener("keydown", event => {
    const renderableKey = projectionRenderList.value;
    if (!renderableKey)
        return;
    switch (event.key) {
        case "Enter":
            projectionController.recover(projectionSceneController, renderables, renderableKey);
            break;
        case "Backspace":
        case "Delete":
            event.preventDefault(); // prevents browser navigation on Backspace
            projectionController.remove(renderableKey);
            break;
    }
});
boundaryControls.addEventListener("start", () => {
    boundarySceneController.autoRotate = false;
    projectionSceneController.autoRotate = false;
    checkbox.checked = false;
});
projectionControls.addEventListener("start", () => {
    boundarySceneController.autoRotate = false;
    projectionSceneController.autoRotate = false;
    checkbox.checked = false;
});
// - ~ - ~ - ~ - ~ - ~ - ~ - ~
// - ~ - Animate - ~ - ~ - ~ -
let previousTime = performance.now();
function animate(now) {
    requestAnimationFrame(animate);
    const dt = (now - previousTime) / 1000;
    previousTime = now;
    boundarySceneController.autoRotate = checkbox.checked;
    projectionSceneController.autoRotate = checkbox.checked;
    boundarySceneController.rotate(dt);
    projectionSceneController.rotate(dt);
    boundaryRenderer.render(boundaryScene, camera);
    projectionRenderer.render(projectionScene, camera);
    boundaryControls.update();
    projectionControls.update();
}
requestAnimationFrame(animate);
