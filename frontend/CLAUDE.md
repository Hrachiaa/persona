# Frontend — Persona SPA

Vite + React SPA for the Persona platform. See [../CLAUDE.md](../CLAUDE.md) for the monorepo overview.

## Stack

- **Framework**: React 19 on Vite 7
- **Language**: **plain JavaScript** (`.jsx` / `.js`). No `tsconfig.json`, no TS compile step. `@types/react` is in devDeps for editor hints only — do not add `.ts`/`.tsx` files without converting the project deliberately.
- **Styling**: Tailwind CSS 3 + custom utility classes in [src/index.css](src/index.css)
- **HTTP**: axios (single instance with interceptors — see [src/api/client.js](src/api/client.js))
- **Animation**: framer-motion (`AnimatePresence` wraps screen transitions in `App.jsx`)
- **Icons**: react-icons
- **State**: React Context only ([src/context/AuthContext.jsx](src/context/AuthContext.jsx)). **No** Redux / Zustand / React Query / SWR.
- **Forms**: none (no React Hook Form, no Formik — plain controlled inputs).
- **UI library**: none (no shadcn, Headless UI, MUI — components are written from scratch using Tailwind).

## Scripts

From [package.json](package.json):

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server. Proxies `/api/*` → `VITE_API_URL` (default `http://localhost:5000`), stripping the `/api` prefix. |
| `npm run build` | Vite production build → `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | Flat-config ESLint over the repo. |

## Routing

Navigation uses **`react-router-dom` v7** (`BrowserRouter` is mounted in [src/main.jsx](src/main.jsx)). Routes are declared in [src/App.jsx](src/App.jsx):

| Path | Screen |
| --- | --- |
| `/` | redirect — `getInitialPath(user)` picks the landing route |
| `/onboarding` `/register` `/login` `/forgot-password` `/survey` | top-level screens |
| `/tests` `/portrait` `/match` `/reads` `/chat` | Dashboard tabs (all render `Dashboard`) |
| `/tests/:slug` · `/tests/:slug/result` | test runner / result (`:slug` is a friendly name — `logic`, `personality`, `values`, `attachment`, `stress`, `shadows`, … via `TYPE_SLUGS` in [tabs/Tests.jsx](src/pages/tabs/Tests.jsx), not the raw cuid) |
| `/chat` · `/chat/:chatId` | AI chat: `/chat` is the chat list / empty state; `/chat/:chatId` is a conversation (immersive). Chats aren't created freely — opened from the "Discuss with AI" buttons on Portrait / Compatibility ([tabs/Chat.jsx](src/pages/tabs/Chat.jsx)). |
| `/profile` · `/profile/{edit,password,liked,history}` | Dashboard with the Profile overlay open |
| `*` | redirect to `/` |

`/tests`, `/match`, `/chat` and `/profile` are registered as `/tests/*` etc. so their sub-routes match; `DASHBOARD_PREFIXES` / `isDashboardPath()` in [src/App.jsx](src/App.jsx) treat any path under those as the shared `'dashboard'` animation group.

**Sub-state in the URL — two conventions:**
- **Path segments** for things you navigate *into* (a distinct screen that survives refresh / is shareable): the test runner & result ([tabs/Tests.jsx](src/pages/tabs/Tests.jsx) derives `screen`/`selectedTest` from the path; the resume prompt is a transient dialog with *no* URL), the Friends sub-screens (`/match/add`, `/match/requests`, `/match/:friendId[/compatibility]` — [tabs/Compatibility.jsx](src/pages/tabs/Compatibility.jsx) derives the sub-view from segments) and the Profile sub-pages ([Profile.jsx](src/pages/Profile.jsx) derives `view` from the last segment).
- **Query params** for a filter/position *of* the current screen: `/reads?type=film|book` (via `useSearchParams`). These tabs hold no equivalent `useState` — the URL is the source of truth.

The Profile overlay (`/profile*`) has no tab of its own, so the avatar button opens it with `navigate('/profile', { state: { from: activeTab } })` and [Dashboard.jsx](src/pages/Dashboard.jsx) renders that tab behind it — closing the overlay then doesn't flash through the default tab. Inside Profile, sub-views push history but the in-app back button *pops* (`navigate(-1)`), so it doesn't pile up `/profile` entries and loop the browser back button.

- `getInitialPath(user)` decides where `/` lands, using `localStorage` flags (`hasSeenOnboarding`, `hasVisitedBefore`) and `isProfileComplete(user)`. The Google OAuth callback (tokens in the query string) is handled in an effect that `navigate(..., { replace: true })`s once tokens are consumed.
- Auth-gated routes are wrapped with a `requireAuth(...)` helper that redirects to `/login` when there's no `user`.
- All `DASHBOARD_PATHS` render the **same** `Dashboard` element and share one `AnimatePresence` key (`'dashboard'`), so switching tabs doesn't re-animate the shell — `Dashboard` derives `activeTab` / `showProfile` from `useLocation()` and navigates with `useNavigate()` (it owns no tab state). Auth screens keep their per-route `motion` enter/exit transitions.
- SPA deep links work because Vite's dev server / `preview` default to `appType: 'spa'`. Whatever serves the production `dist/` must also fall back to `index.html`.

## State & data fetching

### Auth context
[src/context/AuthContext.jsx](src/context/AuthContext.jsx) is the only Context. `AuthProvider` exposes:

```
user, loading, error,
signup(), login(), logout(), handleGoogleCallback(), fetchMe(), clearError()
```

Read it via `useAuth()`.

### HTTP client
**All** HTTP requests go through [src/api/client.js](src/api/client.js) — a single axios instance with two interceptors:

- **Request**: attaches `Authorization: Bearer <accessToken>` from `localStorage` (if present).
- **Response**: on 401, refreshes via the exported `refreshAccessToken()` — one deduped `POST /auth/refresh` that every concurrent 401 awaits — then retries with the new token. On refresh failure: clears `accessToken` / `refreshToken` / `userId` from `localStorage` and bounces to `/`. `refreshAccessToken()` is exported precisely so requests that bypass axios (the SSE chat fetch) can reuse the same flow.

Tokens live in `localStorage` under exactly these keys: `accessToken`, `refreshToken`, `userId`.

### Per-feature API modules
Wrap `client` — never call axios inline from a component:

- [src/api/auth.js](src/api/auth.js) — signup, login, logout, getMe, forgot-password flow, addProfileInfo, updateLanguage, getGoogleLoginUrl
- [src/api/tests.js](src/api/tests.js) — getAllTests, getTestQuestions, submitTest, submitFragment, shareTest, getSharedResult
- [src/api/portrait.js](src/api/portrait.js) — getPortrait (status machine: locked / generating / ready / error)
- [src/api/friends.js](src/api/friends.js) — friends list/search/requests, invite links, per-friend results & compatibility
- [src/api/chat.js](src/api/chat.js) — AI chats; `sendMessage` streams over SSE via raw `fetch` (the one deliberate bypass of the axios client; on a 401 it calls `refreshAccessToken()` from `client.js` and retries once)
- [src/api/recommendations.js](src/api/recommendations.js) — swipe queue, swipe/rate, history, reset

New endpoints belong in a new (or existing) module under [src/api/](src/api/), in the same `(...) => client.<verb>(...).then(r => r.data)` shape.

### Module-scope caches
[tabs/testsCache.js](src/pages/tabs/testsCache.js) (test list), the portrait's `cachedData` and the reads tab's `swiped` sets live at module scope so they survive tab unmounts. **Any such cache must register a reset in [src/utils/sessionCaches.js](src/utils/sessionCaches.js)** — AuthContext fires `resetSessionCaches()` on login/logout so one account's data can't leak into the next session.

## Project layout

Type-based at the top, with feature subfolders inside `pages/`:

```
src/
├─ App.jsx                # routes + auth routing decisions
├─ main.jsx               # React DOM entry
├─ index.css              # Tailwind layers + custom utility classes
├─ api/                   # axios client + per-feature API wrappers
├─ components/            # shared UI (ProgressiveBlur, Toast, LockedCard,
│                         #   ConfirmDialog, markdown renderers, test sigils)
├─ context/               # React context providers (AuthContext)
├─ i18n/                  # i18next setup + locales/<lng>/<ns>.json
├─ utils/                 # tScore math, shared constants, sessionCaches
└─ pages/                 # top-level screens
   ├─ Onboarding.jsx, AuthScreen.jsx (+ Login/Register wrappers),
   │  ForgotPassword.jsx, Survey.jsx, Dashboard.jsx, Profile.jsx,
   │  SharePage.jsx, InvitePage.jsx
   └─ tabs/               # Dashboard sub-views (lazy-loaded chunks)
      └─ Portrait.jsx, Tests.jsx (+ result screens), Chat.jsx,
         Compatibility.jsx, Recommendations.jsx
```

Dashboard tabs and the public Share/Invite pages are `React.lazy` chunks — heavy deps (react-markdown, the result-screen suite, the swipe deck) stay out of the initial bundle. Keep new tabs lazy too.

## Styling

[tailwind.config.js](tailwind.config.js) extends the theme with project-specific tokens — **use these, don't drop in raw hex values**:

- **Colors** — `persona.bg` (#F5F5F0), `persona.card` (#FFFFFF), `persona.dark` (#1A1A1A), `persona.muted` (#6B7280), `persona.line` (#E8E5DC), `persona.warn` / `persona.danger`, and `persona.accent.{yellow, lavender, lime, pink, blue, peach}`.
- **Border radius** — `2xl`, `3xl`, `4xl` are extended (1rem / 1.5rem / 2rem).
- **Animations** — `fade-in`, `slide-up`, `pulse-soft` (custom keyframes are defined in the config; use the utility names).
- **Font** — `Inter`, with `system-ui` / `sans-serif` fallback.

[src/index.css](src/index.css) defines reusable component classes via `@layer components` — reuse before writing new ones:

```
.glass-card  .gradient-text  .btn-primary  .btn-secondary
.input-field  .card-hover
```

## Conventions

- **File names**: PascalCase for components/pages (`Onboarding.jsx`, `AuthContext.jsx`), camelCase for utilities (`client.js`, `auth.js`).
- **Imports**: relative only — there are no path aliases in [vite.config.js](vite.config.js).
- **ESLint** ([eslint.config.js](eslint.config.js)): `@eslint/js` recommended + `eslint-plugin-react-hooks` (flat recommended) + `eslint-plugin-react-refresh` (Vite). Custom: `no-unused-vars` ignores names matching `^[A-Z_]`, so unused PascalCase imports won't error — be aware when cleaning up.

## i18n (English + Russian)

The app is bilingual via **react-i18next** (`i18next` + `react-i18next`). Setup lives in [src/i18n/index.js](src/i18n/index.js), imported once in [src/main.jsx](src/main.jsx) before `App`.

- **Dictionaries** are namespaced JSON under `src/i18n/locales/<lng>/<namespace>.json` (`en` + `ru`). They're **auto-discovered** via `import.meta.glob('./locales/*/*.json')` — just drop a new file in, no config edit. One namespace per feature: `common`, `auth`, `onboarding`, `survey`, `dashboard`, `profile`, `tests`, `portrait`, `friends`, `reco`, `advice`, `results`, `share`, `invite`.
- **`common`** is the `defaultNS` and `fallbackNS`. In a component, `useTranslation('profile')` makes `t('edit.title')` resolve in `profile`; cross-namespace keys use the prefix, e.g. `t('common:save')`.
- **Interpolation** `t('key', { n: 3 })` with `{{n}}` in the JSON; **embedded markup** uses `<Trans i18nKey="..." components={{ b: <span/> }} />` (see [Profile.jsx](src/pages/Profile.jsx) password note, [BigFiveResult.jsx](src/pages/tabs/BigFiveResult.jsx) comparison line).
- **Language resolution**: `localStorage['persona:lang']` (set pre-login on the survey/anonymous screens) → on `fetchMe`, the signed-in user's `user.language` from the backend becomes the source of truth and is mirrored into i18n ([AuthContext.jsx](src/context/AuthContext.jsx) `applyUserLanguage`). Change it with `setLanguage(code)` from [src/i18n/index.js](src/i18n/index.js); the Profile selector also persists it via `authApi.updateLanguage` (`POST /auth/language`), and the survey submits it with the rest of the profile.
- **Not translated** (intentionally — professional translations land later): test questions/answers (backend `tests.seed.ts`) and backend-provided result content (portrait/compatibility markdown, Big Five/COPE/PID/Schwartz facet names + descriptions, AI text). Only **frontend-authored** strings on result screens are translated. Backend exception messages and the password-reset email are still English.

When adding UI text: add the key to **both** `en` and `ru` files for the relevant namespace, then reference it with `t(...)`. Never hard-code user-facing strings.

## Env / API URL

- The dev proxy and the axios `baseURL` both read `VITE_API_URL`:
  - [vite.config.js](vite.config.js) uses it to set the proxy target (default `http://localhost:5000`).
  - [src/api/client.js](src/api/client.js) uses it as the axios `baseURL` (default `/api`, which the Vite proxy then forwards).
- No `.env` file is committed. For non-default backends, create a local `.env` with `VITE_API_URL=...`.
