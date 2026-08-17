/**
 * Contains utility functions used by viewer.js to manage page
 * behavior, populate UI controls, and handle rendering requests.
 */

import * as Samplers from "../engine/samplers.js";
import { PointRenderable, VoxelProjectionRenderable, MeshProjectionRenderable } from "./three_adapter.js";

const pageLayouts = {
    render: ["render-workspace", "render-list-page"],
    about:  ["render-workspace", "about-page"],
    howto:  ["render-workspace", "howto-page"],
    docs:   ["docs-workspace"]
};

let currentLayout = "render";

export const SetPageLayout = (layout) => {

    if (layout === currentLayout) return;

    currentLayout = layout;

    const visible = pageLayouts[layout];

    document
        .querySelectorAll(".page")
        .forEach(element => {
            element.classList.toggle(
                "hidden",
                !visible.includes(element.id)
            );
        });
}

export const HandleRenderOptions = (pipelineState, renderButton) => {
    
    const sampler = Samplers[pipelineState.sampler];

    renderButton.disabled =
    !pipelineState.boundary ||
    !pipelineState.sampler ||
    (
        sampler.metadata.samplerType !== "boundary" &&
        !pipelineState.decoder
    );
}

export const PopulateSelect = (selectElement, module,
    {
        placeholder = "-- Select --",
        placeholderValue = "",
        placeholderDisabled = true
    } = {}
) => {

    selectElement.replaceChildren();

    const option = document.createElement("option");

    option.value = placeholderValue;
    option.textContent = placeholder;
    option.disabled = placeholderDisabled;
    option.selected = true;

    selectElement.appendChild(option);

    for (const [key, algo] of Object.entries(module)) {

        const option = document.createElement("option");

        option.value = key;
        option.textContent = algo.metadata.displayName;

        selectElement.appendChild(option);
    }
};

export const PopulateSamplerSelect = (selectElement) => {

    selectElement.replaceChildren();

    const placeholder = document.createElement("option");

    placeholder.value = "";
    placeholder.textContent = "-- Select --";
    placeholder.disabled = true;
    placeholder.selected = true;

    selectElement.appendChild(placeholder);

    const boundaryGroup = document.createElement("optgroup");
    boundaryGroup.label = "Boundary samplers";

    const spatialGroup = document.createElement("optgroup");
    spatialGroup.label = "Spatial samplers";

    for (const [key, algo] of Object.entries(Samplers)) {

        const option = document.createElement("option");

        option.value = key;
        option.textContent = algo.metadata.displayName;

        if (algo.metadata.samplerType === "boundary") {
            boundaryGroup.appendChild(option);
        } else {
            spatialGroup.appendChild(option);
        }
    }

    selectElement.append(boundaryGroup, spatialGroup);
}

export const AddRenderable = (sceneController, pipelineState, samplerType) => {

    let renderedObject;
    const boundaryName = pipelineState.boundary;
    const samplerName = pipelineState.sampler;
    const decoderName = pipelineState.decoder;
    const meshGenName = pipelineState.meshGen;

    switch (samplerType) {

        case "boundary":

            renderedObject = new PointRenderable(sceneController, samplerType, boundaryName, samplerName);
        break;

        case "pointCloud":
            
            renderedObject = new PointRenderable(sceneController, samplerType, boundaryName, samplerName, decoderName);
        break;

        case "voxel":
            
            renderedObject = new VoxelProjectionRenderable(sceneController, boundaryName, decoderName, samplerName);
        break;

        case "mesh":
            
            renderedObject = new MeshProjectionRenderable(sceneController, boundaryName, decoderName, samplerName, meshGenName);
        break;
    }

    return renderedObject;
}

export const RenderableListController = (renderMap, renderListbox) => ({

    add(renderable, renderableKey, pipelineState) {

        renderMap.set(renderableKey, renderable);

        const option = document.createElement("option");
        option.value = renderableKey;
        option.selected = true;
        option.textContent = pipelineState.boundary + ' - ' +
                             pipelineState.decoder + ' - ' +
                             pipelineState.sampler + ' - ' +
                             pipelineState.meshGen;

        renderListbox.appendChild(option);
    },

    recover(sceneController, renderables, renderableKey) {

        const cachedRenderable = renderMap.get(renderableKey);

        if (cachedRenderable) {

            sceneController.replaceRenderable(cachedRenderable.sceneObject);

            if (cachedRenderable.renderGroup) { // It's a projection, or DemoCube

                renderables.projection = cachedRenderable;

            } else { // It's a boundary

                renderables.boundary = cachedRenderable;
            }
            
            renderListbox.value = renderableKey; // to make the current renderable look selected

            return true;
        }

        return false;
    },

    remove(renderableKey) {

        renderMap.delete(renderableKey);

        renderListbox.options[renderListbox.selectedIndex]?.remove();
    }
});
