const i18n = require('i18n');
const path = require('path');

i18n.configure({
  locales: ['en', 'es', 'fr', 'de', 'hi'],
  directory: path.join(__dirname, 'locale'),
  defaultLocale: 'en',
  objectNotation: true,
  updateFiles: false
});

module.exports = i18n;
