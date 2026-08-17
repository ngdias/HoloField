/**
 * @file Algorithm Registry
 *
 * Provides ordered collections of the algorithms available to the HoloField
 * pipeline. The registry establishes a stable mapping between user interface
 * selections and algorithm implementations.
 *
 * Unlike ES module exports, whose enumeration order should not be relied upon
 * as an application-level contract, the registry defines the presentation order
 * used throughout the application.
 *
 * The registry does not create or wrap algorithms. It stores references to the
 * exported implementations so that the pipeline, web interface, and other
 * adapters share a common catalogue without duplicating metadata.
 */
import * as BoundaryFields from "./fields.js";
import * as Decoders from "./decoders.js";
import * as Samplers from "./samplers.js";
// - ~ - Registry - ~ -
const BuildRegistry = (module) => Object.values(module);
export const algoRegistry = {
    boundaryFields: BuildRegistry(BoundaryFields),
    decoders: BuildRegistry(Decoders),
    samplers: BuildRegistry(Samplers),
};
/*
//type AnyModule = Record<string, any>;

type RegistryEntry<T> = {
    implementation: T;
    displayName: string;
};

const BuildRegistry2 = <T extends PipelineAlgoBase>(module: Record<string, T>): RegistryEntry<T>[] =>
    Object.values(module).map(algorithm => ({
        implementation: algorithm,
        displayName: algorithm.metadata.displayName
    }));
    
const BuildRegistry2 = (module: AnyModule) =>

    Object.values(module).map(algorithm => ({
        implementation: algorithm,
        displayName: algorithm.metadata.displayName
    }));

const BuildRegistry = (module: AnyModule) =>

    Object.entries(module).map(([name, algorithm]) => ({
        name: name,
        displayName: algorithm.metadata.displayName
    }));
*/
/*
const BuildRegistry = (module: AnyModule) =>
    Object.values(module);

const BuildRegistry = (module: AnyModule) =>
    Object.values(module).filter(isAlgorithm);
*/
// <T extends { metadata: { displayName: string }}>
// <T extends { metadata: { displayName: string } }>
