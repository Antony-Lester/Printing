const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
	resolver: {
		// Work around RN 0.87 internal imports like
		// react-native/src/private/featureflags/ReactNativeFeatureFlags
		// that are not listed in package "exports".
		unstable_enablePackageExports: false,
	},
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
