'use strict';

const BbPromise = require('bluebird');

class OpenWhiskCompileServiceBindings {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('openwhisk');

    this.hooks = {
      'package:compileEvents': this.compileServiceBindings.bind(this)
    };
  }

  calculateFunctionName(name, props) {
    return props.name || `${this.serverless.service.service}_${name}`;
  }

  parseServiceBindings(action, properties) {
    const name = { action: this.calculateFunctionName(action, properties) }
    const bindings = properties.bind || []
    const servicebindings = bindings.filter(b => b.service)
      .map(b => Object.assign(b.service, name))

    const serviceNames = new Set()

    for (let sb of servicebindings) {
      if (!sb.hasOwnProperty('name')) {
        throw new Error(`service binding missing name parameter: ${JSON.stringify(sb)}`)
      }

      if (serviceNames.has(sb.name)) {
        throw new Error(`multiple bindings for same service not supported: ${sb.name}`)
      }

      serviceNames.add(sb.name)
    }

    return servicebindings
  }

  compileFnServiceBindings() {
    return this.serverless.service.getAllFunctions()
      .map(name => this.parseServiceBindings(name, this.serverless.service.getFunction(name)))
  }

  compilePkgServiceBindings() {
    const manifestResources = this.serverless.service.resources || {}
    const packages = manifestResources.packages || {}

    return Object.keys(packages).map(name => this.parseServiceBindings(name, packages[name]))
  }

  compileServiceBindings() {
    this.serverless.cli.log('Compiling Service Bindings...');

    const fnServiceBindings = this.compileFnServiceBindings()
    const pkgServiceBindings = this.compilePkgServiceBindings()

    this.serverless.service.bindings = [].concat(...pkgServiceBindings, ...fnServiceBindings)
    return BbPromise.resolve();
  }
}

module.exports = OpenWhiskCompileServiceBindings;
