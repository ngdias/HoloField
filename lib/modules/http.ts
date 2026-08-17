/**
 * Module containing helper functions for api_endpoints.js
 */

import { ValidateProjectSchema } from "../tests/swagger_openapi.js";

import type { OpenAPIV3 } from "openapi-types";
import type { Request, Response } from "express";
import type { ProjectAPISpec } from "../tests/swagger_openapi.js";

// - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ - ~ -
// - ~ - Type Definitions / Imports / Exports - ~ -  

export type URLString = string;
export type APIErrorCode = typeof APIErrorCodes[keyof typeof APIErrorCodes];

export type SwaggerPath = {
    endpoint: string;
    swaggerPath: string;
};

// - ~ - ~ - ~ - ~ - ~ -
// - ~ - Constants - ~ - 

export const APIErrorCodes = { // Prevent typos
    MISS_PARAM: "MISSING_PARAMETERS",
    INV_PARAM: "INVALID_PARAMETERS",
    INTRNL_ERR: "INTERNAL_SERVER_ERROR",
    NOT_FOUND: "PATH_NOT_FOUND"
} as const;

export const httpMethods = ["get", "post"] as const;

// - ~ - ~ - ~ - ~ - ~ -
// - ~ - Functions - ~ - 

export const RequireGETQuery = (req: Request, res: Response, docLink: URLString) => {
    
    if (Object.keys(req.query).length === 0) {

        SendError(
            res,
            400,
            APIErrorCodes.MISS_PARAM,
            "This endpoint requires query parameters.",
            docLink
        );

        return false;
    }

    return true;
}

export const ValidatePOSTRequest = () => {
    // develop later when necessity arises
}

export const SendError = (res: Response, status: number, code: APIErrorCode, message: string, docLink?: URLString) => {
    
    return res.status(status).json({
        "error": {
            code,
            message,
            "documentation": docLink
        }
    });
}
