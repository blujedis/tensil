"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
function getDescriptor(target, key, attrs) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (!attrs)
        return descriptor;
    return { ...(descriptor || {}), ...(attrs || {}) };
}
exports.getDescriptor = getDescriptor;
function mergeDescriptor(target, key, attrs) {
    attrs = getDescriptor(target, key, attrs);
    Object.defineProperty(target, key, attrs);
    return attrs;
}
exports.mergeDescriptor = mergeDescriptor;
function defineDescriptor(target, key, attrs) {
    Object.defineProperty(target, key, attrs);
    return attrs;
}
exports.defineDescriptor = defineDescriptor;
function filter(target, key, descriptor) {
    const filtersDescriptor = getDescriptor(target, '_config');
    let value = filtersDescriptor && filtersDescriptor.value;
    if (!value) {
        defineDescriptor(target, '_config', {
            writable: false,
            enumerable: false,
            configurable: false,
            value: { ...constants_1.CONFIG_DEFAULTS }
        });
    }
    target._config.filters[key] = key;
    return descriptor;
}
exports.filter = filter;
function Service(ctor) {
    ctor.prototype.init = true;
}
exports.Service = Service;
//# sourceMappingURL=decorators.js.map