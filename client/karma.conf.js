module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-headless'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        // Configurações do Jasmine
      },
      clearContext: false // deixa a saída do Jasmine e Reporter visível no navegador
    },
    jasmineHtmlReporter: {
      suppressAll: true // remove traços duplicados
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/client'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['ChromeHeadless'],
    restartOnFileChange: true
  });
};