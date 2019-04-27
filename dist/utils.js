"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Parses out the caller from stack trace using an error.
 *
 * @param err the Error to be parsed.
 * @param split the index which to split stack trace at.
 */
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
//# sourceMappingURL=utils.js.map