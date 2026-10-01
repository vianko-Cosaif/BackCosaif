const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const localRequire = createRequire(path.join(root, 'package.json'));
const logger = { info() {}, warn() {}, error() {}, debug() {} };
function loader(mocks = {}, globals = {}, sources = {}) {
  const cache = new Map();
  function load(file, extra = '') {
    const absolute = path.resolve(root, file);
    if (!extra && cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} };
    cache.set(absolute, module);
    const context = {
      module, exports: module.exports, Buffer, URL, URLSearchParams, console: logger,
      Date, Math, setImmediate, AbortSignal,
      process: { env: { NODE_ENV: 'test', AUDIT_ENABLED: 'false', JWT_SECRET: 'synthetic-test-secret-not-for-use' }, cwd: () => root, pid: 1, hrtime: process.hrtime },
      setTimeout: () => ({ unref() {} }), clearTimeout() {}, setInterval: () => ({ unref() {} }), clearInterval() {},
      require(name) {
        if (name in mocks) return mocks[name];
        if (name.startsWith('.')) {
          const resolved = path.resolve(path.dirname(absolute), name);
          const relative = path.relative(root, resolved).replaceAll(path.sep, '/');
          if (relative in mocks) return mocks[relative];
          if (fs.existsSync(resolved + '.ts')) return load(relative + '.ts');
          return localRequire(resolved);
        }
        return localRequire(name);
      }, ...globals,
    };
    const code = ts.transpileModule((sources[file] ?? fs.readFileSync(absolute, 'utf8')) + '\n' + extra, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, context, { filename: absolute });
    return module.exports;
  }
  return load;
}
function invoke(handler, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200, status(n) { this.statusCode = n; return this; }, setHeader() {},
      json(body) { this.body = body; resolve(this); return this; }, send(body) { this.body = body; resolve(this); return this; },
      end() { resolve(this); return this; }, once() {}, on() {},
    };
    const promise = handler({ headers: {}, query: {}, params: {}, body: {}, originalUrl: '/', ...req }, res, error => error ? reject(error) : resolve({ ...res, allowed: true }));
    promise?.catch(reject);
  });
}
module.exports = { loader, invoke, logger, root };
