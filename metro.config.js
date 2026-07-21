// Extends the Expo defaults; lets Metro treat .wasm files as assets so
// require('sql.js/dist/sql-wasm.wasm') could be resolved via expo-asset if we
// ever bundle the binary. At runtime today the wasm is served straight from
// public/sql-wasm-browser.wasm (see src/lib/sqljs.ts), which needs no config.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

module.exports = config;
