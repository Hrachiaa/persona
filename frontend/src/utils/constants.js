// Facts shared across tabs and forms, so the gates (chat/reads), the portrait
// and the profile forms can't drift apart.

// How many tests unlock the AI features. Must match the backend's gate.
export const TOTAL_TESTS = 6;

// Whether a test from GET /tests counts as completed. An IQ run the backend
// flagged as "invalid" doesn't count.
export const isTestCompleted = (test) =>
  !!test.result && !(test.testType === 'iq' && test.result?.reliability === 'invalid');

// Profile birth-year bounds (the profile stores a year, not a full date).
export const BIRTH_YEAR_MIN = 1900;
export const maxBirthYear = () => new Date().getFullYear();

// Gender choices shared by the survey and the profile editor.
// Labels come from the caller's namespace (`gender.male` / `gender.female`).
export const GENDER_OPTIONS = [
  { value: 'M', labelKey: 'gender.male', emoji: '♂' },
  { value: 'F', labelKey: 'gender.female', emoji: '♀' },
];
