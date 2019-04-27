"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const entity_1 = require("./entity");
const lodash_1 = require("lodash");
const path_1 = require("path");
const types_1 = require("./types");
const util_1 = require("util");
const DEFAULT_OPTIONS = {
    actions: {
        find: types_1.HttpMethod.Get + ' ' + '/{{action}}',
        findById: types_1.HttpMethod.Get + ' ' + '/{{action}}/:id',
        create: types_1.HttpMethod.Get + ' ' + '/{{action}}',
        update: types_1.HttpMethod.Get + ' ' + '/{{action}}',
        updateById: types_1.HttpMethod.Get + ' ' + '/{{action}}/:id',
        delete: types_1.HttpMethod.Get + ' ' + '/{{action}}',
        deleteById: types_1.HttpMethod.Get + ' ' + '/{{action}}/:id',
    },
    rest: true,
    crud: false,
    formatter: (key, path, type) => {
        if (type === 'rest')
            return path.replace(/{{action}}/, '').replace(/^\/\//, '/');
        key = key.replace(/ById$/, '');
        return path.replace(/{{action}}/, '');
    }
};
class Service extends entity_1.Entity {
    constructor(mount) {
        super(undefined, mount);
    }
}
exports.Service = Service;
class Controller extends entity_1.Entity {
    constructor(base, mount) {
        super(base, mount);
    }
}
exports.Controller = Controller;
class Tensil extends entity_1.Entity {
    constructor(app, options) {
        super(undefined, undefined, (lodash_1.isFunction(app) && app));
        this._events = {};
        this._routeMap = {};
        if (util_1.isObject(app)) {
            options = app;
            app = undefined;
        }
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    normalizeNamespaces(entity, context) {
        const map = entity[context];
        const entityType = entity.type;
        for (const k in map) {
            // When handler is a string and 
            // method type is view or redirect
            // we don't want to process the string.
            const ignore = lodash_1.includes(['view', 'redirect'], k.split(' ').shift());
            // Ensure is an array if not bool.
            if (!lodash_1.isBoolean(map[k])) {
                const arr = lodash_1.castArray(map[k]);
                map[k] = arr.reduce((a, c, i) => {
                    if (lodash_1.isString(c)) {
                        if (ignore && (arr.length - 1 === i)) {
                            c = [c, {}];
                        }
                        else {
                            // When string normalize the namespace.
                            const parts = c.split('.');
                            // If a local lookup and starts with context
                            // prepend "this" so the type name is looked up.
                            if (parts[0] === context)
                                parts.unshift('this');
                            if (parts.length === 1 || parts[0] === 'this') {
                                if (parts[0] === 'this')
                                    parts.shift();
                                c = [entityType, ...parts].join('.');
                            }
                        }
                    }
                    return [...a, c];
                }, []);
            }
        }
    }
    lookupHandler(namespace) {
        const entities = this._core.entities;
        const parts = namespace.split('.');
        const entityType = parts.shift() || '';
        const entity = entities[entityType];
        // Ensure entity exists.
        if (!entity)
            throw new Error(`Entity ${entityType || 'undefined'} is required but could not be found`);
        let result;
        // If no result fallback check if class contains handler.
        result = lodash_1.get(entity, parts.join('.'));
        // Since this was looked up bind the context.
        if (result && lodash_1.isFunction(result))
            result.bind(entity);
        return result;
    }
    normalizeHandlers(handlers, context, key) {
        // If a route check if is redirect or view route.
        if (context === types_1.ContextType.routes) {
            const parts = key.split(' ');
            // lookup default handler if needed.
            if (lodash_1.includes(['view', 'redirect'], parts[0].toLowerCase())) {
                const idx = handlers.length - 1;
                const handler = handlers[idx];
                handlers[idx] = parts[0] === 'view'
                    ? this.view(handler[0].replace(/^\//, ''), handler[1])
                    : this.redirect(handler[0]);
            }
        }
        return lodash_1.castArray(handlers || []).reduce((result, handler) => {
            // Lookup the filter.
            if (lodash_1.isString(handler)) {
                const lookup = this.lookupHandler(handler);
                if (!lookup)
                    throw new Error(`${handler} filter is required but could not be found`);
                // Recurse ensure all handlers in lookup filter.
                const normalized = this.normalizeHandlers(lookup, context, key);
                result = [...result, ...normalized];
            }
            else if (lodash_1.isBoolean(handler)) {
                // Only policies can contain boolean handlers.
                if (context !== types_1.ContextType.policies)
                    throw new Error(`${context.charAt(0).toUpperCase() +
                        context.slice(1)} "${key || 'unknown'}" cannot contain boolean handler.`);
                result = (handler === true) ? [] : this.deny || [];
            }
            else {
                result = [...result, handler];
            }
            return result;
        }, []);
    }
    get entities() {
        return this._core.entities;
    }
    get routers() {
        return this._core.routers;
    }
    get routeMap() {
        return this._routeMap;
    }
    on(event, handler) {
        this._events[event] = this._events[event] || [];
        this._events[event].push(handler);
        return this;
    }
    emit(event, ...args) {
        (this._events[event] || []).forEach(fn => fn(...args));
    }
    off(event, handler) {
        const idx = this._events[event] && this._events[event].indexOf(handler);
        if (~idx)
            this._events[event].splice(idx, 1);
        return this;
    }
    removeEvents(event) {
        delete this._events[event];
    }
    getService(name) {
        const entity = this.entities[name];
        if (entity.baseType !== types_1.EntityType.Service)
            return null;
        return entity;
    }
    getController(name) {
        const entity = this.entities[name];
        if (entity.baseType !== types_1.EntityType.Controller)
            return null;
        return entity;
    }
    registerService(Klass, mount) {
        new Klass(undefined, mount);
        return this;
    }
    registerController(Klass, base, mount) {
        new Klass(base, mount);
        return this;
    }
    parseRoute(route, base = '') {
        const parts = route.trim().toLowerCase().split(' ');
        if (parts.length === 1)
            parts.unshift(types_1.HttpMethod.Get);
        const methods = parts.shift().split('|');
        let path = parts.shift();
        // Normalize starting '/' and remove trailing '/';
        path = '/' + path.replace(/^\//, '').replace(/\/$/, '');
        const fullPath = path_1.join(base, path).replace(/\/$/, '');
        return {
            methods,
            path,
            fullPath
        };
    }
    registerRoute(mount, base, route, handlers, controller) {
        if (lodash_1.isString(handlers)) {
            controller = handlers;
            handlers = route;
            route = base;
            base = undefined;
        }
        if (Array.isArray(route)) {
            handlers = route;
            route = base;
            base = undefined;
        }
        if (arguments.length === 3) {
            handlers = route;
            route = base;
            base = undefined;
        }
        base = base || '/';
        const root = this._routeMap[mount] = this._routeMap[mount] || {};
        const config = this.parseRoute(route, base);
        config.methods.forEach(m => {
            root[m] = root[m] || {};
            const path = path_1.join(mount, config.fullPath);
            // Show warning overriding path.
            if (lodash_1.has(root[m], path) && process.env.NODE_ENV !== 'production') {
                console.warn(`[Tensil] WARN: overriding route path "${path}" mounted at "${mount}"`);
            }
            lodash_1.set(root, `${m}.${path}`, handlers);
            // root[m][path] = handlers;
            // For redirect/view we need to add to get collection.
            if (lodash_1.includes(['view', 'redirect'], m)) {
                root.get = root.get || {};
                // root.get[path] = handlers;
                lodash_1.set(root, `get.${path}`, handlers);
            }
            if (controller)
                lodash_1.set(root, `${controller}.${m}.${path}`, handlers);
        });
        return this;
    }
    initEntity(entity, contexts) {
        entity.filters = entity.filters || {};
        entity.routes = entity.routes || {};
        if (entity.baseType === types_1.EntityType.Controller) {
            const ctrl = entity;
            ctrl.policies = ctrl.policies || {};
            ctrl.actions = ctrl.actions || {};
        }
        else if (entity.baseType === types_1.EntityType.Service && entity.policies) {
            throw new Error(`Service ${entity.type} cannot contain "policies", did you mean to use a Controller?`);
        }
        for (const k in contexts) {
            entity[k] = { ...contexts[k], ...entity[k] };
        }
        return entity;
    }
    normalizeEntity(entity) {
        const ctrl = (entity.baseType === types_1.EntityType.Controller) && entity;
        // Entity is a controller.
        if (ctrl) {
            // Check global policy.
            ctrl.policies = ctrl.policies || {};
            const globalPol = lodash_1.isUndefined(ctrl.policies['*']) ? [] : ctrl.policies['*'];
            ctrl.policies['*'] = this.normalizeHandlers(ctrl.policies['*'], types_1.ContextType.policies, '*');
            // Generate routes for controllers.
            if (ctrl.actions) {
                const merged = { ...(ctrl.actions), ...this.options.actions };
                for (const k in ctrl.actions) {
                    const route = merged[k];
                    const actionKey = `${entity.type}.${k}`;
                    // Lookup the policies for action.
                    let handlers = this.normalizeHandlers(actionKey, types_1.ContextType.actions, k);
                    handlers = lodash_1.uniq([...ctrl.policies['*'], ...handlers]);
                    // Generate rest route.
                    if (this.options.rest) {
                        const restPath = this.options.formatter(k, route, 'rest');
                        this.registerRoute(ctrl.mountPath, ctrl.basePath, restPath, handlers, entity.type);
                    }
                    // Generate crud route.
                    if (this.options.crud) {
                        const crudPath = this.options.formatter(k, route, 'crud');
                        this.registerRoute(ctrl.mountPath, ctrl.basePath, crudPath, handlers, entity.type);
                    }
                }
            }
        }
        const contexts = ctrl ? ['filters', 'policies', 'routes'] : ['filters', 'routes'];
        contexts.forEach((context) => {
            this.normalizeNamespaces(entity, context);
            for (const key in entity[context]) {
                let handlers = entity[context][key];
                if (lodash_1.isUndefined(handlers))
                    continue;
                // Store the last handler as we'll need it
                // to lookup policies for routes.
                const lastHandler = handlers[handlers.length - 1];
                handlers = this.normalizeHandlers(handlers, context, key);
                // When context is policies merge global policy.
                if (ctrl && context === types_1.ContextType.policies)
                    handlers = [...ctrl.policies['*'], ...handlers];
                // If route we need to lookup the policy for 
                // the route when last handler is string.
                if (context === types_1.ContextType.routes) {
                    if (lodash_1.isString(lastHandler)) {
                        const lastHandlerPolicy = lastHandler.split('.');
                        lastHandlerPolicy.splice(1, 0, 'policies');
                        const policyHandlers = this.normalizeHandlers([lastHandlerPolicy.join('.')], 'routes', key);
                        handlers = [...policyHandlers, ...handlers];
                    }
                }
                entity[context][key] = handlers = lodash_1.uniq(handlers);
                // If route bind to router.
                if (context === types_1.ContextType.routes)
                    this.registerRoute(entity.mountPath, entity.basePath, key, handlers);
            }
        });
        return entity;
    }
    normalize() {
        const entities = this.entities;
        for (const k in entities) {
            // Extend the filters, policies and routes with initialized properties.
            const entity = this.initEntity(entities[k], entities[k].constructor.__INIT_DATA__);
            this.normalizeEntity(entity);
        }
        return this;
    }
    mount() {
        // Add routes to routers.
        // Map is structured as
        // routeMap = {
        //   '/mount-point': {
        //       'get': {
        //          '/some/path': [ handlers ]
        //        }
        //    }
        // }
        for (const k in this.routeMap) {
            const router = this.routers[k];
            const methods = this.routeMap[k];
            Object.keys(methods)
                .filter(m => lodash_1.includes(['get', 'put', 'post', 'delete'], m))
                .forEach(m => {
                Object.keys(methods[m])
                    .reverse()
                    .forEach(r => {
                    router[m](r, ...methods[m][r]);
                });
            });
            // Default router is already mounted.
            if (k !== '/')
                this.app.use(k, router);
        }
        return this;
    }
    init(strict = true) {
        this
            .normalize()
            .mount();
        return this;
    }
}
Tensil.Service = Service;
Tensil.Controller = Controller;
exports.Tensil = Tensil;
//# sourceMappingURL=tensil.js.map