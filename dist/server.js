/**
 * HTTP server entry point for the HoloField application.
 *
 * @remarks
 * Initializes the Express application, configures the server middleware
 * and routes, and starts listening for incoming HTTP requests.
*/
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { APIErrorCodes, SendError } from "./modules/http.js";
import { CreateAPIEndpoints } from "./modules/api_endpoints.js";
import { ValidateOpenAPISchema } from "./tests/swagger_openapi.js";
// - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Swagger Setup - ~ -
const openapiPath = path.resolve("./docs/openapi/openapi.yaml");
let openAPISchema;
try {
    openAPISchema = await ValidateOpenAPISchema(openapiPath);
}
catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}
// - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Express Setup - ~ -
const app = express();
const apiRouter = express.Router();
app.use(express.json());
app.set("json spaces", 2);
app.set("trust proxy", true); // generate URLs with the correct protocol
// - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Express Roots - ~ -
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// three.js main application entry page
app.use(express.static(path.join(__dirname, "public")));
app.use("/docs", express.static(path.resolve("docs/code")) // typedoc
);
app.use("/api", apiRouter);
// - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Express API Endpoints - ~ -
export const API_DOCS_PATH = "/api/docs";
app.use(API_DOCS_PATH, swaggerUi.serve, swaggerUi.setup(openAPISchema));
CreateAPIEndpoints(apiRouter, openAPISchema);
// No route matched
app.use((req, res) => {
    const docURL = new URL(API_DOCS_PATH, `${req.protocol}://${req.get("host")}`).href;
    return SendError(res, 404, APIErrorCodes.NOT_FOUND, "Endpoint not found", docURL);
});
// Something unexpected threw
const API_DEBUG = true;
app.use((error, req, res, next) => {
    console.error(error);
    const message = API_DEBUG && error instanceof Error
        ? error.message
        : "Internal server error";
    return SendError(res, 500, APIErrorCodes.INTRNL_ERR, message);
});
// - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Express Init - ~ -
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Express is running at http://localhost:${PORT}`);
});
