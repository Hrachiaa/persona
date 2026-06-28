// Tests taken in several short "approaches" instead of one long run. The whole
// test is still ONE backend test scored once, after the final part — only the
// runner chunks it, showing a break screen between parts. Map: testType →
// questions per part (e.g. bigFive's 120 questions → 4 parts of 30). A test not
// listed here runs as a single uninterrupted pass.
//
// The number is questions per fragment; the last fragment takes the remainder, so
// an uneven count splits front-loaded (e.g. Values' 57 → 29 + 28).
//
// Shared by the runner (Tests.jsx, which slices the questionnaire) and the
// Portrait (which draws a segmented progress ring around a half-finished orb).
export const PART_SIZE = {
  bigFive: 30,  // Personality — 120 → 4 × 30
  shcwartz: 29, // Values      — 57  → 29 + 28
  cope: 30,     // Stress      — 60  → 2 × 30
  ecr: 18,      // Attachment  — 36  → 2 × 18
  pid: 25,      // Shadows     — 100 → 4 × 25
};
