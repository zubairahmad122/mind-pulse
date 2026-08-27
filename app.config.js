// Dynamic Expo config. Loads everything from app.json (passed in as `config`)
// and only overrides the google-services file location so EAS can inject it
// from the GOOGLE_SERVICES_JSON file secret at build time, while local/dev
// builds keep using the committed-locally ./google-services.json.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
  },
});
