---
title: OpenAPI
group: Browser
---

# API Architecture

For the moment, the API only exposes endpoints that return a single value: boundary fields and decoders. Functions that return full datasets will require a different arrangement to support binary file downloads and an upload interface for demonstrating dataset import. This will be implemented in a future update.

While the OpenAPI schema conventionally describes an API for documentation and client generation, this project also uses the schema as operational configuration. It encodes information required by the API implementation, including:

- the HTTP endpoint path;
- the callable implementation associated with each operation;
- the information required to construct precise Swagger documentation URLs.

This makes the OpenAPI schema the source of truth for endpoint configuration, allowing the API routes to be created procedurally rather than maintaining the same information independently in the application code.

One major advantage is that disabling an endpoint is simply a matter of commenting 2 lines in the `paths:` section of the main OpenAPI schema file, `openapi.yaml`.

## operationId

OpenAPI `operationId` values have an operational role beyond the API implementation. Each value corresponds to the name of the callable implementation associated with the operation: a function in the case of decoders, or an object implementing the field interface in the case of boundary fields.

For example,

```yaml
operationId: radialDecoder
```

shares the same identifier name as the corresponding function in the application.

When adding, removing, or renaming an operation, its `operationId` must remain synchronized with the corresponding implementation.

## OpenAPI paths as the endpoint source of truth

The OpenAPI `path` definitions are also used operationally. `CreateAPIEndpoints()` is responsible for orchestrating the registry of the API endpoints as Express routes from the validated OpenAPI schema.

For example, an OpenAPI definition such as:

```yaml
/decoders/radial:
  get:
    operationId: radialDecoder
```

provides both the HTTP endpoint path (ex. /decoders/radial) and the operation identifier (radialDecoder) used by the application.

```text
OpenAPI schema
     │
     ├── operationId ──→ callable implementation
     │
     └── path ─────────→ registry endpoint
                              │
                              ▼
                    CreateAPIEndpoints()
                              │
                              ▼
                       Express routes
```

The implementation therefore does not need to maintain separate hard-coded endpoint paths. Changes to the API's documented paths in the schema propagate directly to the generated routes.

## Precise Swagger paths for error guidance

The same configuration also supports the documentation links included with API errors. Because the Swagger path is derived from the OpenAPI definition, these links can target the specific endpoint section rather than the top of the Swagger homepage, facilitating navigation when the API contains an extensive list of endpoints.