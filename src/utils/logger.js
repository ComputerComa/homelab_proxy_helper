const chalk = require('chalk');
const ora = require('ora');

class Logger {
  constructor() {
    this.spinner = null;
  }

  info(message, ...args) {
    console.log(chalk.blue('ℹ'), message, ...args);
  }

  success(message, ...args) {
    console.log(chalk.green('✓'), message, ...args);
  }

  warn(message, ...args) {
    console.log(chalk.yellow('⚠'), message, ...args);
  }

  error(message, ...args) {
    console.log(chalk.red('✗'), message, ...args);
  }

  debug(message, ...args) {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🐛'), message, ...args);
    }
  }

  startSpinner(message) {
    this.spinner = ora(message).start();
    return this.spinner;
  }

  stopSpinner(message, success = true) {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(message);
      } else {
        this.spinner.fail(message);
      }
      this.spinner = null;
    }
  }

  updateSpinner(message) {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  table(data) {
    const { table } = require('table');
    console.log(table(data));
  }

  json(data) {
    console.log(JSON.stringify(data, null, 2));
  }

  header(title) {
    console.log(chalk.cyan.bold(`\n=== ${title} ===`));
  }

  separator() {
    console.log(chalk.gray('─'.repeat(50)));
  }
}

module.exports = { Logger };
