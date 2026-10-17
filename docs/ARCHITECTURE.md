# Implementation blueprint
- Expo SDK stable version, React Native, TypeScript, Expo Router.
- Local-first persistence: SQLite with versioned migrations for workouts/sessions; AsyncStorage for lightweight onboarding settings.
- Typed exercise content and program templates in data/.
- State: simple React context/hooks or lean store; avoid new dependencies without reason.
- Testing: pure domain logic unit tests for workout selection, session completion and progress aggregation. Strict TS and lint.
- Keep routes screens separated from components and domain services.
- Future RevenueCat/Supabase only behind approval; no credentials or paid services required for MVP.
- Exercise form/medical safety claims require independent review before publishing.
