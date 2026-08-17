/**
 * A set of diagnostic tools to help debug Three.js objects
 */

/**
 * Print the scene hierarchy
 * 
 * Useful for discovering:
 *   - duplicated groups
 *   - duplicated lights
 *   - forgotten helpers
 *   - wrong parentage
 * 
 * @param {*} scene Three.js Scene object
 */
export const PrintSceneTree = (scene) => {

    scene.traverse(object => {

        console.log(object.type, object.name || "(unnamed)");
    });
};

/**
 * List direct scene children
 * 
 * When the hierarchy is too verbose
 * 
 * @param {*} scene Three.js Scene object
 */
export const PrintSceneChildren = (scene) => {

    console.table(
        scene.children.map(child => ({
            type: child.type,
            name: child.name,
            visible: child.visible
        }))
    );
};

/**
 * Count named objects
 * 
 * Useful for checking uniqueness
 * 
 * @example
 * console.log(CountNamedObjects(scene, "renderables"));
 * 
 * @param {*} Three.js Scene object
 * @param {*} name Object name
 * @returns Number of objects with the queried name
 */
export const CountNamedObjects = (scene, name) => {

    return scene.children.filter(child => child.name === name).length;
};

/**
 * Renderer status
 * 
 * Useful once during startup
 * 
 * @param {*} renderer Renderer object
 */
export const PrintRendererInfo = (renderer) => {

    console.log({
        autoClear: renderer.autoClear,
        shadowMap: renderer.shadowMap.enabled
    });
};

/**
 * Show all objects in a Scene Group
 * 
 * @param {*} group Scene Group object
 */
export const PrintRenderGroup = (group) => {

    console.table(
        group.children.map(child => ({ type: child.type, name: child.name })));
};

/**
 * Instanced mesh statistics
 * 
 * @param {*} mesh Three.js Mesh object
 */
export const PrintInstancedMesh = (mesh) => {

    console.log({
        count: mesh.count,
        matrixNeedsUpdate: mesh.instanceMatrix.needsUpdate,
        colorNeedsUpdate: mesh.instanceColor?.needsUpdate
    });
};

/**
 * Lights report in a Scene object
 * 
 * @param {*} scene Three.js Scene object
 */
export const PrintLights = (scene) => {

    console.table(
        scene.children
            .filter(child => child.isLight)
            .map(light => ({
                type: light.type,
                name: light.name,
                intensity: light.intensity
            }))
    );
};

