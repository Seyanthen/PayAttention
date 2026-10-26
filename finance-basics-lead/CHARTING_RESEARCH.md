# Sprint 2 charting research

The app uses Expo and React Native for Android, iOS, and web. The first library to prototype is **Victory Native XL** because its current documentation describes a React Native charting API and Expo setup. It has a heavier native dependency stack (Skia, Reanimated, Worklets, and the New Architecture), so compatibility with this app's Expo SDK must be checked before adoption.

**Backup candidate:** `react-native-gifted-charts`. Its installation guidance supports Expo through `npx expo install` and it includes line, bar, and pie charts, which match the planned income/expense and spending-by-category views.

**Not selected for the shared mobile implementation:** Recharts is primarily a web React library and is not a drop-in React Native solution.

Recommended proof of concept:

1. Line chart: monthly income versus expenses.
2. Bar chart: spending by category.
3. Empty, loading, negative-value, and accessibility-label states.
4. Verify web plus Android/iOS builds before adding the dependency to the app.

References:

- [Victory Native documentation](https://nearform.com/open-source/victory-native/docs/)
- [Victory Native getting started](https://nearform.com/open-source/victory-native/docs/getting-started)
- [react-native-gifted-charts package guidance](https://www.npmjs.com/package/react-native-gifted-charts)
- [Recharts guide](https://recharts.github.io/en-US/guide/)
