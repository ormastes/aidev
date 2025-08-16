import { getMode } from '../../children/src/utils/mode';
import { Mode } from '../../children/src/types';

describe('getMode', () => {
  it('should return "vf" as default mode when no options provided', () => {
    const result = getMode({});
    expect(result).toBe('vf');
  });

  it('should return "vf" when mdMode is false', () => {
    const result = getMode({ mdMode: false });
    expect(result).toBe('vf');
  });

  it('should return "md" when mdMode is true', () => {
    const result = getMode({ mdMode: true });
    expect(result).toBe('md');
  });

  it('should return "vf" when options is null', () => {
    const result = getMode(null);
    expect(result).toBe('vf');
  });

  it('should return "vf" when options is undefined', () => {
    const result = getMode(undefined);
    expect(result).toBe('vf');
  });

  it('should handle other option properties correctly', () => {
    const result = getMode({ 
      mdMode: false,
      otherOption: 'value',
      anotherOption: 123
    });
    expect(result).toBe('vf');
  });

  it('should return "md" regardless of other options when mdMode is true', () => {
    const result = getMode({ 
      mdMode: true,
      otherOption: 'value'
    });
    expect(result).toBe('md');
  });
});