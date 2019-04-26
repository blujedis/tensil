"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
function parseCaller(err, split) {
    let message = '';
    if (typeof err === 'string') {
        message = err;
        err = undefined;
    }
    if (typeof err === 'number') {
        split = err;
        err = undefined;
    }
    if (err && !split)
        split = 1;
    err = err || new Error(message);
    let line = err.stack.split('\n')[split || 2];
    const idx = line.indexOf('at ');
    line = line.slice(idx + 2, line.length).trim().replace(/\(|\)/, '');
    const parts = line.split(' ');
    parts[1] = parts[1].split(':');
    const result = {
        name: err.name,
        message: err.message,
        source: line,
        function: parts[0],
        filepath: parts[1][0],
        filename: '',
        line: parseInt(parts[1][1], 10),
        column: parseInt(parts[1][2], 10),
        ministack: '',
        stack: err.stack
    };
    result.filename = result.filepath.replace(/^\//, '').split('/').pop();
    result.ministack = `(${result.filename}:${result.line}:${result.column})`;
    return result;
}
exports.parseCaller = parseCaller;
function parseRoute(route, handlers) {
    const parts = route.split(' ');
    let method = 'get';
    let methods = [];
    let path = parts[0];
    if (parts.length > 1) {
        path = parts[1].toLowerCase();
        methods = parts[0].toLowerCase().split('|');
        method = methods.shift();
    }
    // Normalize starting '/' and remove trailing '/';
    path = '/' + path.replace(/^\//, '').replace(/\/$/, '');
    handlers = lodash_1.castArray(handlers);
    // When view handler may be a view path.
    // Check if exists in handlers if not assume path.
    if (method === 'view') {
        method = 'get';
        if (lodash_1.isString(handlers[0])) {
            // const fn = get(policy, viewHandler);
            // Converting
            // view /some/path: 'view_name' to:
            // get /some/path: [handler, view_name]
            // handlers[0] = [fn, handlers[0]];
        }
    }
    if (method === 'param') {
        method = 'get';
        if (lodash_1.isString(handlers[0])) {
            // const fn = get(policy, paramHandler);
            // let paramPath = mount.length ? join(mount, path) : path;
            // paramPath = '/' + paramPath.replace(/^\//, '');
            // handlers[0] = [fn, paramPath];
        }
    }
}
exports.parseRoute = parseRoute;
//# sourceMappingURL=utils.js.map