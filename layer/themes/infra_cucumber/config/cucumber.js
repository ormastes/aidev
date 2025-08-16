module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['features/**/*.ts'],
    format: [
      'progress-bar',
      'html:cucumber-report.html',
      'json:cucumber-report.json'
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    publishQuiet: true
  }
};