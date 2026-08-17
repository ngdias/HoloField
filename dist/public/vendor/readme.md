# Vendor

This directory contains third-party files copied from the project's installed dependencies for direct access by the web application.

The files currently originate from the `three.js` module directory and are included here because the application does not use a bundler such as Webpack. The browser therefore cannot directly resolve the required files from the Node.js module structure.

These vendor files are not part of HoloField's source code and should not be modified unless the corresponding upstream dependency is being updated.

When updating `three.js`, the relevant vendor files should be replaced with the matching versions from the installed package.

## Source

The files are copied from the installed `three.js` package under `node_modules/`.

## Purpose

The vendor directory provides browser-accessible copies of third-party modules, avoiding exposing the contents of `node_modules` via the web application (Express).
