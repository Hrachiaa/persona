// Tests taken in several short fragments ("approaches") instead of a single
// submit. Map: testType → questions per fragment (e.g. bigFive's 120 questions →
// 4 parts of 30). A test not listed here is submitted whole via /submit. The
// whole test is still scored once, after the final fragment. The last fragment
// takes the remainder, so an uneven count splits front-loaded (Values 57 → 29 + 28).
// Mirror of the frontend's PART_SIZE (frontend/src/pages/tabs/testParts.js) — keep in sync.
export const PART_SIZE: Record<string, number> = {
    bigFive: 30,  // Personality — 120 → 4 × 30
    shcwartz: 29, // Values      — 57  → 29 + 28
    cope: 30,     // Stress      — 60  → 2 × 30
    ecr: 18,      // Attachment  — 36  → 2 × 18
    pid: 25,      // Shadows     — 100 → 4 × 25
}

// Total number of fragments for a test, or null when it isn't taken in parts.
export function partsTotal(testType: string, totalQuestions: number): number | null {
    const size = PART_SIZE[testType]
    if (!size) return null
    return Math.ceil(totalQuestions / size)
}
