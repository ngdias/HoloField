/**
 * Module for Express server initialized from ../server.js
 * Sets up all the endpoints related to API acess to the main application
 */

import { Router } from "express";
import { API_DOCS_PATH } from "../server.js";
import * as BoundaryFields from "../public/engine/fields.js";
import * as Decoders from "../public/engine/decoders.js";
import { ValidateProjectSchema } from "../tests/swagger_openapi.js";
import { IsBFieldValid, IsDecoderValid } from "../public/engine/common.js";
import { APIErrorCodes, httpMethods, RequireGETQuery, SendError } from "./http.js";

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~
// - ~ - Type definitions / Type Imports - ~ -

import type { OpenAPIV3 } from "openapi-types";
//import type { Request, Response } from "express";
import type { Vector3 } from "../public/engine/datasets.js";
import type { ProjectOperation, ProjectAPISpec } from "../tests/swagger_openapi.js";

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Helper Functions - ~ -

const RegisterBoundaryEndpoint = (apiRouter: Router, path: string, operation: ProjectOperation) => {
    
    apiRouter.get(path, (req, res) => {
    
        // The first OpenAPI tag determines the Swagger UI navigation category
        const tag = operation.tags[0]; // Ex. Decoders

        const operID = operation.operationId; // Ex. radialDecoder - the actual callable function name

        // Example: http://localhost:3000/api/docs/#/Engine/get_api_decoders_radial
        const swaggerURL = new URL(API_DOCS_PATH + `/#/${tag}/${operID}`, `${req.protocol}://${req.get("host")}`);

        const query = RequireGETQuery(req, res, swaggerURL.href);
    
        if (!query) return;

        if (!IsBFieldValid(operID)) {

            throw new Error(`Invalid boundary field operationId: ${operID}`);
        }

        const boundaryField = BoundaryFields[operID];

        const position: Vector3 = {
            x: Number(req.query.x),
            y: Number(req.query.y),
            z: Number(req.query.z)
        };

        if (!Number.isFinite(position.x) ||
            !Number.isFinite(position.y) ||
            !Number.isFinite(position.z)) {

            SendError(
                res,
                400,
                APIErrorCodes.INV_PARAM,
                "x, y and z must be finite numbers",
                swaggerURL.href
            );

            return;
        }

        res.json({ value: boundaryField.sample(position) });
    })
    
}

const RegisterDecoderEndpoint = (apiRouter: Router, path: string, operation: ProjectOperation) => {

    apiRouter.get(path, (req, res) => {

        // The first OpenAPI tag determines the Swagger UI navigation category
        const tag = operation.tags[0]; // Ex. Decoders
        const operID = operation.operationId; // Ex. radialDecoder - the actual callable function name

        // Example: http://localhost:3000/api/docs/#/Engine/get_api_decoders_radial
        const swaggerURL = new URL(API_DOCS_PATH + `/#/${tag}/${operID}`, `${req.protocol}://${req.get("host")}`);
    
        const query = RequireGETQuery(req, res, swaggerURL.href);
    
        if (!query) return;

        const fieldName = req.query.field;
        
        if (!IsBFieldValid(fieldName)) {

            SendError(
                res,
                400,
                APIErrorCodes.INV_PARAM,
                `Invalid boundary field: ${fieldName}`,
                swaggerURL.href
            );

            return;
        }

        const boundaryField = BoundaryFields[fieldName];
        
        const position: Vector3 = {
            x: Number(req.query.x),
            y: Number(req.query.y),
            z: Number(req.query.z)
        };

        if (!Number.isFinite(position.x) ||
            !Number.isFinite(position.y) ||
            !Number.isFinite(position.z)) {

            SendError(
                res,
                400,
                APIErrorCodes.INV_PARAM,
                "x, y and z must be finite numbers",
                swaggerURL.href
            );

            return;
        }

        if (!IsDecoderValid(operID)) {

            throw new Error(`Invalid decoder operationId: ${operID}`);
        }

        const decoder = Decoders[operID](boundaryField);

        res.json({ value: decoder.sample(position) });
    });
}

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~
// - ~ - Setup all API Endpoints - ~ -

export const CreateAPIEndpoints = (apiRouter: Router, openAPISpec: OpenAPIV3.Document) => {

    let projectSchema;
    try {
        projectSchema = ValidateProjectSchema(openAPISpec);

    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }

    apiRouter.get("/", (req, res) => {
    
        // Generate a JSON machine-readable endpoint index at the root path (api/)
        const endpointPaths = Object.keys(projectSchema.paths);
    
        const payload = {
            "name": "HoloField REST API",
            "documentation": {
                "swagger": "/api/docs",
                "openapi": "/api/openapi.json"
            },
            "endpoints": endpointPaths
        }
    
        res.json(payload);
    });

    apiRouter.get("/openapi.json", (req, res) => {
        res.json(projectSchema);
    });

    for (const [path, pathItem] of Object.entries(projectSchema.paths)) {

        //const methods = Object.keys(pathItem).filter(key => httpMethods.includes(key)); // more problematic to validate TS type
        const methods = httpMethods.filter(method => pathItem[method]); // equivalent, semantically a little different

        for (const method of methods) {

            // ProjectAPISpec is produced only after schema validation,
            // which guarantees that every registered method has an operation.
            const operation = pathItem[method]!;

            switch (method) {

                case "get":

                    switch (operation.tags?.[0]) {

                        case "Boundary Fields":
                            RegisterBoundaryEndpoint(apiRouter, path, operation);
                        break;

                        case "Decoders":
                            RegisterDecoderEndpoint(apiRouter, path, operation);
                        break;
                    }
                break;

                case "post":
                    // placeholder for a future update
                break;
            }
        }
    }
}
