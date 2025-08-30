export interface CucumberConfig {
  default: {
    requireModule: string[];
    require: string[];
    format: string[];
    formatOptions: {
      snippetInterface: string;
    };
    publishQuiet: boolean;
  };
}

const config: CucumberConfig = {
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

export = config;