module.exports = {
  root: true,
  extends: '@react-native',
  env: {
    jest: true,
  },
  rules: {
    /*
     * Disabled: eslint-plugin-prettier@4 (pulled in by @react-native) calls
     * prettier.resolveConfig.sync, which Prettier 3 removed. With this rule
     * on, ESLint crashes before linting a single file. Re-enable together
     * with a prettier@2.8.8 pin (or an upgrade to eslint-plugin-prettier@5)
     * and a one-off `--fix` formatting pass.
     */
    'prettier/prettier': 'off',

    /*
     * Disabled: this app is bilingual (Arabic RTL / English LTR) and every
     * screen resolves layout direction at runtime, e.g.
     *
     *   <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
     *
     * Those values depend on the active locale, so they cannot live in a
     * static StyleSheet.create() block. The rule fires on all 21 of them and
     * offers no autofix. Re-enable if the RTL styles are ever extracted into
     * memoised per-direction StyleSheets.
     */
    'react-native/no-inline-styles': 'off',

    /*
     * Braces are required whenever a branch body spans more than one line —
     * that is the case where a missing brace silently changes behaviour.
     * Single-line guards (`if (!db) return null;`) stay as-is: the stricter
     * default rewrites them to `if (!db) {return null;}`, which is harder to
     * read, and Prettier is not currently running to reflow them.
     */
    curly: ['error', 'multi-line'],
  },
};
