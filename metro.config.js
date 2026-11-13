const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// No navegador, troca o datetimepicker nativo por um <input type="date">.
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === '@react-native-community/datetimepicker') {
    return { type: 'sourceFile', filePath: path.resolve(__dirname, 'src/web/DateTimePicker.web.js') };
  }
  return (defaultResolve || context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
