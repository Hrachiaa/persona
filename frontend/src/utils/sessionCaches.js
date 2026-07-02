// Module-scope caches (tests list, portrait, swiped ids) deliberately outlive
// React unmounts — but they must not outlive the *account*. Each cache module
// registers its reset here; AuthContext fires them on login and logout so one
// session's data can never leak into the next (e.g. a stale "5 of 6 tests"
// chat gate after switching users without a full page reload).
const resets = new Set();

export function registerSessionCache(reset) {
  resets.add(reset);
}

export function resetSessionCaches() {
  resets.forEach((reset) => reset());
}
