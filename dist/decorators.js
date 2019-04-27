"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const types_1 = require("./types");
/**
 * Adds method as filter in Service or Controller filters collection.
 *
 * @example
 * class UserService {
 *  @filter
 *  isAuthorized(req, res, next) {
 *    // check if authorized.
 *  }
 * }
 *
 * @param target the target class instance.
 * @param key the method name the decorator is bound to.
 * @param descriptor the property descriptor for the bound method.
 */
function filter(target, key, descriptor) {
    const isFunc = descriptor.value && typeof descriptor.value === 'function';
    if (!isFunc)
        throw new Error(`Cannot set "filter" decorator on ${key}`);
    target.constructor.__INIT_DATA__ = target.constructor.__INIT_DATA__ || {};
    target.constructor.__INIT_DATA__.filters = target.constructor.__INIT_DATA__.filters || {};
    target.constructor.__INIT_DATA__.filters[key] = key;
    return descriptor;
}
exports.filter = filter;
function action(methods, path = '') {
    return (target, key, descriptor) => {
        if (methods)
            path = (lodash_1.castArray(methods).join('|') + ' ' + path).trim();
        const isFunc = descriptor.value && typeof descriptor.value === 'function';
        const baseType = Object.getPrototypeOf(target).constructor.name;
        const isCtrl = baseType === types_1.EntityType.Controller;
        if (!isFunc || !isCtrl)
            throw new Error(`Cannot set "action" decorator on ${key}`);
        target.constructor.__INIT_DATA__ = target.constructor.__INIT_DATA__ || {};
        target.constructor.__INIT_DATA__.actions = target.constructor.__INIT_DATA__.actions || {};
        target.constructor.__INIT_DATA__.actions[key] = path;
        return descriptor;
    };
}
exports.action = action;
//# sourceMappingURL=decorators.js.map