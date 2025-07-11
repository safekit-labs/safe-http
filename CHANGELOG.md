# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### [0.0.3-alpha.1] - 2025-07-11
- Updated types to allow for importing `HttpClient` and `ClientConfig` from `@safekit/safe-http` to fix types that are too deep

### [0.0.2-alpha.1] - 2025-07-11
- Enhanced `httpClient` configuration API with direct parameter support
- Added `baseUrl` option for setting base URL for all requests
- Added `headers` option supporting static objects, functions, and async functions
- Added `fetch` option for custom fetch implementations
- Added support for all `RequestInit` options (mode, credentials, cache, etc.)
- Simplified configuration interface by removing redundant `defaultOptions`

## [0.0.1-alpha.1] - 2025-07-11

### Added
- Initial release of type-safe HTTP client builder
- Support for multiple validation libraries (Zod, Yup, Valibot, ArkType, Effect Schema, Superstruct)
- Automatic TypeScript type inference for requests and responses
- Schema validation for params, query, body, headers, and responses
- Flat and nested SDK structure support
- Custom validation functions support
- Null validation (skip validation) option
- Request and response validation with detailed error handling
- HTTP status code constants
- Comprehensive test coverage for all validation libraries
