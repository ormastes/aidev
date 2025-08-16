import { PipeController } from '../../src/pipe/controllers';

describe("PipeController", () => {
  let controller: PipeController;

  beforeEach(() => {
    controller = new PipeController();
  });

  test('should create instance', () => {
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(PipeController);
  });

  test('should have proper structure', () => {
    expect(typeof controller).toBe('object');
  });
});