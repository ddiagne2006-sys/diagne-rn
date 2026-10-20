// Signe la build release avec le keystore dédié, sans éditer /android à la main (survit à `prebuild --clean`).
// Les chemins et mots de passe viennent des propriétés Gradle VIRAL_UPLOAD_*, définies dans
// %USERPROFILE%\.gradle\gradle.properties, jamais dans le projet. Sans elles, la clé debug reste utilisée.
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_SIGNING = `
        release {
            if (project.hasProperty('VIRAL_UPLOAD_STORE_FILE')) {
                storeFile file(VIRAL_UPLOAD_STORE_FILE)
                storePassword VIRAL_UPLOAD_STORE_PASSWORD
                keyAlias VIRAL_UPLOAD_KEY_ALIAS
                keyPassword VIRAL_UPLOAD_KEY_PASSWORD
            }
        }`;

function applySigning(gradle) {
  if (gradle.includes('VIRAL_UPLOAD_STORE_FILE')) return gradle;

  const withConfig = gradle.replace(/signingConfigs\s*\{/, (m) => `${m}${RELEASE_SIGNING}`);

  const releaseType = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/;
  if (!releaseType.test(withConfig)) {
    throw new Error('withReleaseSigning : bloc buildTypes.release introuvable dans android/app/build.gradle');
  }
  return withConfig.replace(
    releaseType,
    "$1signingConfig project.hasProperty('VIRAL_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
  );
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = applySigning(cfg.modResults.contents);
    return cfg;
  });
};
