"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const types_1 = require("./types");
/**
 * Helper function to convert decorator params to array of config objects.
 *
 * @private
 */
function normalizeDecorator(target, key, methodsOrConfigs, path, filters = [], type = types_1.DecoratorType.Action) {
    let methods;
    let configs;
    const template = (path && !/^\//.test(path) && path) || undefined;
    // Set the default path.
    path = template ? '' : path;
    if (Array.isArray(methodsOrConfigs) && lodash_1.isPlainObject(methodsOrConfigs[0])) {
        configs = methodsOrConfigs;
        methodsOrConfigs = undefined;
    }
    else {
        methods = (methodsOrConfigs && lodash_1.castArray(methodsOrConfigs)) || undefined;
        configs = [
            {
                methods,
                filters,
                template,
                path
            }
        ];
    }
    configs = configs.map(c => {
        c.key = c.key || key;
        c.methods = lodash_1.castArray(c.methods || [types_1.HttpMethod.Get]);
        c.decorator = type;
        c.path = c.path || '';
        c.filters = lodash_1.castArray(c.filters || []);
        return c;
    });
    return configs;
}
/**
 * Adds method as filter in Service or Controller filters collection.
 *
 * @example
 *  @filter
 *  isAuthorized(req, res, next) {
 *    // check if authorized.
 *  }
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
function action(methods, pathOrTemplate) {
    if (methods === types_1.HttpMethod.Param)
        throw new Error('Whoops method "Param" is not valid for action decorator, did you mean to use "@param()"?');
    return (target, key, descriptor) => {
        const isFunc = descriptor.value && typeof descriptor.value === 'function';
        const baseType = target.constructor.__BASE_TYPE__;
        const isCtrl = baseType === types_1.EntityType.Controller;
        if (!isFunc || !isCtrl)
            throw new Error(`Cannot set "action" decorator on ${key}, is this a method and controller?`);
        target.constructor.__INIT_DATA__ = target.constructor.__INIT_DATA__ || {};
        target.constructor.__INIT_DATA__.actions = target.constructor.__INIT_DATA__.actions || {};
        target.constructor.__INIT_DATA__.actions[key] = normalizeDecorator(target, key, methods, pathOrTemplate);
        return descriptor;
    };
}
exports.action = action;
function route(methods, path, filters) {
    if (methods === types_1.HttpMethod.Param)
        throw new Error('Whoops method "Param" is not valid for action decorator, did you mean to use "@param()"?');
    return (target, key, descriptor) => {
        const isFunc = descriptor.value && typeof descriptor.value === 'function';
        if (!isFunc)
            throw new Error(`Cannot set "router" decorator on ${key}, is this a method?`);
        if (lodash_1.isString(methods) && !path)
            path = `/${key}`;
        target.constructor.__INIT_DATA__ = target.constructor.__INIT_DATA__ || {};
        target.constructor.__INIT_DATA__.routes = target.constructor.__INIT_DATA__.routes || {};
        target.constructor.__INIT_DATA__.routes[key] =
            normalizeDecorator(target, key, methods, path, filters, types_1.DecoratorType.Route);
        return descriptor;
    };
}
exports.route = route;
//# sourceMappingURL=decorators.js.map