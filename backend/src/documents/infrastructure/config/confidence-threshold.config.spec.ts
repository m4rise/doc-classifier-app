import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  resolveConfidenceThreshold,
} from './confidence-threshold.config';

describe('resolveConfidenceThreshold', () => {
  const originalConfidenceThreshold = process.env.CONFIDENCE_THRESHOLD;

  afterEach(() => {
    if (originalConfidenceThreshold === undefined) {
      delete process.env.CONFIDENCE_THRESHOLD;
      return;
    }

    process.env.CONFIDENCE_THRESHOLD = originalConfidenceThreshold;
  });

  it('uses the default threshold when the env var is absent', () => {
    delete process.env.CONFIDENCE_THRESHOLD;

    expect(resolveConfidenceThreshold()).toBe(DEFAULT_CONFIDENCE_THRESHOLD);
  });

  it('parses a threshold between 0 and 1', () => {
    process.env.CONFIDENCE_THRESHOLD = '0.85';

    expect(resolveConfidenceThreshold()).toBe(0.85);
  });

  it.each(['-0.1', '1.2', 'abc', '70%', ''])(
    'falls back to the default threshold for invalid value %s',
    (value) => {
      process.env.CONFIDENCE_THRESHOLD = value;

      expect(resolveConfidenceThreshold()).toBe(DEFAULT_CONFIDENCE_THRESHOLD);
    },
  );
});
