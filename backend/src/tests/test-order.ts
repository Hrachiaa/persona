// Single source of truth for the test sequence. A test is locked until every
// test before it is completed, so the "first N tests" are always a stable prefix.
export const TEST_ORDER = ['bigFive', 'shcwartz', 'cope', 'iq', 'ecr', 'pid'] as const;

export type TestType = (typeof TEST_ORDER)[number];
