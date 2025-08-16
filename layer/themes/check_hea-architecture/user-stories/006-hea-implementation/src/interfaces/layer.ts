/**
 * Core interfaces for HEA Layer definitions
 */

export enum LayerType {
  Core = 'core',
  Shared = 'shared',
  Themes = 'themes',
  Infrastructure = 'infrastructure',
}

export interface LayerConfig {
  name: string;
  type: LayerType;
  path: string;
  dependencies: LayerType[];
  exports: string[];
  version: string;
}

export interface LayerMetadata {
  config: LayerConfig;
  modules: ModuleInfo[];
  pipes: PipeInfo[];
  dependencies: DependencyInfo[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ModuleInfo {
  name: string;
  path: string;
  exports: string[];
  imports: string[];
  hasTests: boolean;
  coverage?: number;
}

export interface PipeInfo {
  name: string;
  interface: string;
  implementation: string;
  methods: MethodInfo[];
  dependencies: string[];
}

export interface MethodInfo {
  name: string;
  async: boolean;
  parameters: ParameterInfo[];
  returnType: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: any;
}

export interface DependencyInfo {
  from: string;
  to: string;
  type: DependencyType;
  valid: boolean;
  reason?: string;
}

export enum DependencyType {
  Import = 'import',
  Export = 'export',
  Pipe = 'pipe',
  Type = 'type',
}