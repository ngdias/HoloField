/*
* OpenAPI YAML schema validation for Swagger
* Includes standard OpenAPI and project-specific validation.
* Currently used during Express startup
* and by the standalone validation script validate_openapi.js.
*/
import SwaggerParser from "@apidevtools/swagger-parser";
import { httpMethods } from "../modules/http.js";
// - ~ - ~ - ~ - ~ - ~ - 
// - ~ - Validators - ~ -
/*
 * OpenAPI YAML compliance validation
 */
export const ValidateOpenAPISchema = async (openapiPath) => {
    const schema = await SwaggerParser.validate(openapiPath);
    console.log("OpenAPI specification is valid.");
    return schema;
};
/*
 * Project-specific OpenAPI YAML validation
 */
export const ValidateProjectSchema = (schema) => {
    let errorsFound = false;
    if (!schema.servers || schema.servers.length < 1 || !schema.servers[0].url) {
        throw new Error("Project's OpenAPI specification must contain at least one server with a URL.");
    }
    if (!schema.paths)
        throw new Error("Project's OpenAPI specification must contain paths.");
    for (const [path, item] of Object.entries(schema.paths)) {
        if (!item) {
            console.error(`"${path}" is empty, has no nested definitions.`);
            errorsFound = true;
            continue;
        }
        ;
        const methods = httpMethods.filter(method => item[method]);
        if (methods.length === 0) {
            console.error(`"${path}" must define at least one of ${httpMethods}`);
            errorsFound = true;
            continue;
        }
        ;
        for (const method of methods) {
            const operation = item[method];
            if (!operation) {
                console.error(`"${path}" operation is missing.`);
                errorsFound = true;
                continue;
            }
            ;
            if (!operation.operationId) {
                console.error(`"${path}:" "${method}:" operation is missing operationId.`);
                errorsFound = true;
            }
            if (!operation.tags || operation.tags.length === 0) {
                console.error(`"${path}:" "${method}:" operation must define at least one tag.`);
                errorsFound = true;
            }
        }
    }
    if (errorsFound)
        throw new Error("Project's OpenAPI specification is invalid.");
    console.log("Project's OpenAPI specification is valid.");
    return schema; //as unknown as ProjectAPISpec;
};
