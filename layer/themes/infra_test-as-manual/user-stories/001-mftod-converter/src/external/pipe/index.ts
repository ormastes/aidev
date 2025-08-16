/**
 * External Layer Pipe - Exports for cross-layer communication
 * Only these exports should be used by other layers
 */

// Services
export { FileReader } from '../services/FileReader';
export { FileWriter } from '../services/FileWriter';
export { RealCaptureService } from '../services/RealCaptureService';

// Types
export type { FeatureFile } from '../services/FileReader';
export type { OutputFormat } from '../services/FileWriter';
export type { CaptureOptions, CaptureResult } from '../services/RealCaptureService';