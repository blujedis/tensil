"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function filter(target, key, descriptor) {
    const isFunc = descriptor.value && typeof descriptor.value === 'function';
    if (!isFunc)
        return descriptor;
    target.constructor.__INIT_DATA__ = target.constructor.__INIT_DATA__ || {};
    target.constructor.__INIT_DATA__.filters = target.constructor.__INIT_DATA__.filters || {};
    target.constructor.__INIT_DATA__.filters[key] = key;
    return descriptor;
}
exports.filter = filter;
//# sourceMappingURL=decorators.js.map