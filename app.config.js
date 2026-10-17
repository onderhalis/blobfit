// Extends app.json. EXPO_BASE_URL exports the web build for a sub-path, e.g. "/blobfit" for the
// GitHub Pages preview (`npm run build:pages`); every other build is unchanged.
module.exports = ({ config }) =>
  process.env.EXPO_BASE_URL
    ? { ...config, experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL } }
    : config;
