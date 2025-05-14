
// This file is kept for backward compatibility
// All types are now organized into separate files in the types directory
export * from './campaign-base';
export * from './buyer';
export * from './metrics';
export * from './forecasting';
export type { ApiErrorResponse, DateRange } from './common';
// Re-export ExternalPlatformConnection with a clear name to avoid ambiguity
export type { ExternalPlatformConnection as PlatformConnection } from './common';
