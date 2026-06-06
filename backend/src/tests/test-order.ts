// Single source of truth for the test sequence. A test is locked until every
// test before it is completed, so the "first N tests" are always a stable prefix.
export const TEST_ORDER = ['bigFive', 'shcwartz', 'cope', 'iq', 'ecr', 'pid'] as const;

export type TestType = (typeof TEST_ORDER)[number];

// Portrait milestones: a base portrait after the first 4 tests, regenerated into
// a richer one once all 6 are done.
export const PORTRAIT_BASE_TESTS = TEST_ORDER.slice(0, 4); // bigFive, shcwartz, cope, iq
export const PORTRAIT_FULL_TESTS = TEST_ORDER;
