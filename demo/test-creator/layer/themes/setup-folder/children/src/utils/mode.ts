import { Mode } from '../types';

export function getMode(options: any): Mode {
  // VF mode is default unless --md-mode is specified
  return options?.mdMode ? 'md' : 'vf';
}