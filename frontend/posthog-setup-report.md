<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Persona frontend (Vite + React + react-router-dom v7). PostHog is initialised in `main.jsx` with `PostHogProvider` and `PostHogErrorBoundary` wrapping the entire app. Users are identified by their backend ID on login, signup, and Google OAuth, and their session is reset on logout. Thirteen business-critical events have been instrumented across eight files, covering the full user lifecycle: signup → onboarding → tests → portrait → AI chat → paywall → subscription.

| Event | Description | File |
|---|---|---|
| `user_signed_up` | User successfully created an account with email and password. | `src/context/AuthContext.jsx` |
| `user_logged_in` | User successfully authenticated with email and password. | `src/context/AuthContext.jsx` |
| `user_logged_in_google` | User successfully authenticated via Google OAuth. | `src/context/AuthContext.jsx` |
| `profile_completed` | User submitted their onboarding profile (name, gender, birth year). | `src/pages/Survey.jsx` |
| `test_started` | User began taking one of the six psychological tests. | `src/pages/tabs/Portrait.jsx`, `src/pages/tabs/Tests.jsx` |
| `test_completed` | User successfully submitted answers for a psychological test. | `src/pages/tabs/Tests.jsx` |
| `portrait_viewed` | User viewed their AI-generated personality portrait. | `src/pages/tabs/Portrait.jsx` |
| `chat_opened` | User opened an AI chat conversation (portrait or compatibility). | `src/pages/tabs/Chat.jsx` |
| `chat_message_sent` | User sent a message in an AI chat conversation. | `src/pages/tabs/Chat.jsx` |
| `paywall_shown` | Paywall modal appeared after user exhausted free chat messages. | `src/pages/tabs/Chat.jsx` |
| `subscription_checkout_started` | User clicked the CTA button to begin Paddle checkout for Persona Pro. | `src/utils/proCheckout.js` |
| `subscription_confirmed` | Persona Pro subscription successfully confirmed after Paddle checkout. | `src/utils/proCheckout.js` |
| `recommendation_swiped` | User swiped a book or film recommendation card. | `src/pages/tabs/Recommendations.jsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://eu.posthog.com/project/216162/dashboard/794392)
- [New User Signups](https://eu.posthog.com/project/216162/insights/3pO8v8PV)
- [User Activation Funnel](https://eu.posthog.com/project/216162/insights/9fg4AOvU)
- [AI Chat Message Activity](https://eu.posthog.com/project/216162/insights/ICgJZJsj)
- [Test Started vs Completed](https://eu.posthog.com/project/216162/insights/gff07n2Y)
- [AI Chat Paywall Conversion](https://eu.posthog.com/project/216162/insights/03TECiF5)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` to `.env.example` and any monorepo bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — the mount effect in `AuthContext.jsx` handles this for token-refresh sessions, but verify it fires correctly when the access token is still valid on page load.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
