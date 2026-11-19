const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support WebAssembly assets required by expo-sqlite (wa-sqlite) on web.
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// Inject COEP/COOP headers required for SharedArrayBuffer in expo-sqlite web dev server.
config.server = config.server || {};
const prevEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const baseMiddleware = prevEnhanceMiddleware ? prevEnhanceMiddleware(middleware, server) : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return baseMiddleware(req, res, next);
  };
};

module.exports = config;
