/**
 * Module containing helper functions for api_endpoints.js
 */
// - ~ - ~ - ~ - ~ - ~ -
// - ~ - Constants - ~ - 
export const APIErrorCodes = {
    MISS_PARAM: "MISSING_PARAMETERS",
    INV_PARAM: "INVALID_PARAMETERS",
    INTRNL_ERR: "INTERNAL_SERVER_ERROR",
    NOT_FOUND: "PATH_NOT_FOUND"
};
export const httpMethods = ["get", "post"];
// - ~ - ~ - ~ - ~ - ~ -
// - ~ - Functions - ~ - 
export const RequireGETQuery = (req, res, docLink) => {
    if (Object.keys(req.query).length === 0) {
        SendError(res, 400, APIErrorCodes.MISS_PARAM, "This endpoint requires query parameters.", docLink);
        return false;
    }
    return true;
};
export const ValidatePOSTRequest = () => {
    // develop later when necessity arises
};
export const SendError = (res, status, code, message, docLink) => {
    return res.status(status).json({
        "error": {
            code,
            message,
            "documentation": docLink
        }
    });
};
