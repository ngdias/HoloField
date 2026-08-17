/**
 * Standalone validation for API schemas.
 *
 * @remarks
 * Validates the project's OpenAPI schema and related project definitions.
 * 
 * Intended to be executed independently during development or validation
 * workflows rather than as part of the application runtime.
 *
 * Exits with status code 1 when validation fails.
 */
import path from "node:path";

import { ValidateOpenAPISchema, ValidateProjectSchema } from "./tests/swagger_openapi.js";

const openapiPath = path.resolve("./docs/openapi/openapi.yaml");

try {

    const openAPISchema = await ValidateOpenAPISchema(openapiPath);

    ValidateProjectSchema(openAPISchema);

} catch (error) {

    console.error(error instanceof Error ? error.message : String(error));

    process.exit(1);
}