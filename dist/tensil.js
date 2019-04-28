"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_1 = require("http");
const https_1 = require("https");
const entity_1 = require("./entity");
const lodash_1 = require("lodash");
const path_1 = require("path");
const types_1 = require("./types");
const DEFAULT_OPTIONS = {
    templates: {
        get: types_1.HttpMethod.Get + ' ' + '/{{action}}',
        put: types_1.HttpMethod.Put + ' ' + '/{{action}}/:id?',
        post: types_1.HttpMethod.Post + ' ' + '/{{action}}',
        del: types_1.HttpMethod.Del + ' ' + '/{{action}}/:id?',
        find: types_1.HttpMethod.Get + ' ' + '/{{action}}/:id?',
        create: types_1.HttpMethod.Post + ' ' + '/{{action}}',
        update: types_1.HttpMethod.Put + ' ' + '/{{action}}/:id?',
        delete: types_1.HttpMethod.Del + ' ' + '/{{action}}/:id?',
    },
    rest: true,
    crud: false,
    sort: true,
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
    policy(key, policies, force = false) {
        if (lodash_1.isObject(key)) {
            this.policies = { ...(this.policies), ...key };
            this.tensil.emit('policy', key, this.policies);
            return this;
        }
        if (lodash_1.isBoolean(key)) {
            policies = key;
            key = '*';
        }
        policies = lodash_1.castArray(policies);
        const validKey = this.validateKey(key, 'policies', force);
        if (!validKey)
            throw new Error(`Policy key "${key}" exists set force to true to overwrite`);
        this.policies = this.policies || {};
        this.policies[validKey] = policies;
        this.tensil.emit('policy', { [validKey]: policies }, this.policies);
        return this;
    }
}
exports.Controller = Controller;
class Tensil extends entity_1.Entity {
    constructor(app, options) {
        super(undefined, undefined, (lodash_1.isFunction(app) && app));
        this._initialized = false;
        this._normalized = false;
        this._events = {};
        this._routeMap = {};
        if (lodash_1.isObject(app)) {
            options = app;
            app = undefined;
        }
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Normalizes namespaces for lookups.
     *
     * @param entity the Service or Controller to normalize.
     * @param context the context to normalize in
     */
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
    /**
     * Looks up namespace within a given Entity.
     *
     * @example
     * .lookupHandler('UserController.find');
     *
     * @param namespace the namespace to be looked up.
     */
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
    /**
     * Iterates a context normalizing all handlers looking up handler when required.
     *
     * @example
     * .normalizeHandlers(['CommonService.log', (req, res, next) => next], 'filters', 'isAuthorized');
     *
     * @param handlers an array containing handlers to be looked up when string.
     * @param context the context to look up.
     * @param key the property key within the context.
     */
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
    /**
     * Binds event listener to event.
     *
     * @example
     * .on('start', () => { console.log('server started'); });
     *
     * @param event the event to listen on.
     * @param handler the handler to be called on emit.
     */
    on(event, handler) {
        this._events[event] = this._events[event] || [];
        this._events[event].push(handler);
        return this;
    }
    /**
     * Emits events by name.
     *
     * @example
     * .emit('register', SomeEntity);
     *
     * @param event the event to be emitted.
     * @param args the arguments to be passed to the handler.
     */
    emit(event, ...args) {
        (this._events[event] || []).forEach(fn => fn(...args));
    }
    /**
     * Disables an event removing it from the collection.
     *
     * @example
     * .off('register', (entity: Entity) => {});
     *
     * @param event the event to be disabled.
     * @param handler the handler within event collection to be removed.
     */
    off(event, handler) {
        const idx = this._events[event] && this._events[event].indexOf(handler);
        if (~idx)
            this._events[event].splice(idx, 1);
        return this;
    }
    /**
     * Removes all handlers for the specified event.
     *
     * @example
     * .removeEvents('register');
     *
     * @param event the event name to remove handlers for.
     */
    removeEvents(event) {
        delete this._events[event];
    }
    /**
     * Gets a Service by name.
     *
     * @example
     * .getService('LogService');
     * .getService<Request, Response>('LogService');
     *
     * @param name the name of the Service to get.
     */
    getService(name) {
        const entity = this.entities[name];
        if (entity.baseType !== types_1.EntityType.Service)
            return null;
        return entity;
    }
    /**
     * Gets a Controller by name.
     *
     * @example
     * .getController('UserController');
     * .getController<Request, Response>('LogService');
     *
     * @param name the name of the Controller to get.
     */
    getController(name) {
        const entity = this.entities[name];
        if (entity.baseType !== types_1.EntityType.Controller)
            return null;
        return entity;
    }
    /**
     * Registers a Service with Tensil.
     *
     * @example
     * .registerService(LogService);
     * .registerService(LogService, '/log');
     *
     * @param Klass the Service class to be registered.
     * @param mount the optional router mount point to use.
     */
    registerService(Klass, mount) {
        new Klass(undefined, mount);
        return this;
    }
    /**
     * Registers a Controller with Tensil.
     *
     * @example
     * .registerController(UserController, 'user');
     * .registerController(UserController, 'user', '/identity');
     *
     * @param Klass the Controller class to be registered.
     * @param mount the optional router mount point to use.
     */
    registerController(Klass, base, mount) {
        new Klass(base, mount);
        return this;
    }
    /**
     * Parses a route returning config object.
     *
     * @example
     * .parseRoute('get /user');
     * .parseRoute('get|put /user/:id?');
     * .parseRoute('get /user', '/identity');
     *
     * @param route the route to parse for methods and path.
     * @param base a base path to be prefixed to route.
     */
    parseRoute(route, base = '') {
        const parts = route.trim().toLowerCase().split(' ');
        if (parts.length === 1)
            parts.unshift(types_1.HttpMethod.Get);
        const methods = parts.shift().split('|').map(m => m === 'del' ? 'delete' : m);
        let path = parts.shift();
        // Normalize starting '/' and remove trailing '/';
        path = '/' + path.replace(/^\//, '').replace(/\/$/, '');
        let fullPath = path_1.join(base, path);
        fullPath = '/' + fullPath.replace(/^\//, '').replace(/\/$/, '');
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
            const path = config.fullPath; // join(mount, config.fullPath);
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
    /**
     * Configures constructed class merging in initialized data from decorators.
     *
     * @param entity the Service or Controller to configure init data for.
     * @param contexts the configuration contexts to merge/init data for.
     */
    configure(entity, contexts) {
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
    /**
     * Iterates configuration contexts normalizing them for the purpose of building routes.
     *
     * @example
     * .normalizeEntity(UserController);
     *
     * @param entity the Service or Controller to be normalized.
     */
    normalizeEntity(entity) {
        const ctrl = (entity.baseType === types_1.EntityType.Controller) && entity;
        // Entity is a controller.
        if (ctrl) {
            // Check global policy.
            ctrl.policies = ctrl.policies || {};
            ctrl.policies['*'] = this.normalizeHandlers(ctrl.policies['*'], types_1.ContextType.policies, '*');
            // Generate routes for controllers.
            if (ctrl.actions) {
                for (const k in ctrl.actions) {
                    let route = ctrl.actions[k] || this.options.templates[k];
                    route = this.options.templates[route] || route;
                    // If no route by this point throw error.
                    if (!route)
                        throw new Error(`Action ${entity.type}.${k} route could NOT be generated using path ${route}`);
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
    /**
     * Iterates each entity, loads init data then normalizes.
     *
     * @example
     * .normalize();
     */
    normalize() {
        const entities = this.entities;
        for (const k in entities) {
            // Extend the filters, policies and routes with initialized properties.
            const entity = this.configure(entities[k], entities[k].constructor.__INIT_DATA__);
            this.normalizeEntity(entity);
        }
        this._normalized = true;
        return this;
    }
    /**
     * Binds static path for resolving static content (images, styles etc)
     *
     * @example
     * app.use('./public', {  });
     * app.use('./public', true);
     * app.use('./public', {}, true);
     *
     * @param path the path to the directory for static content.
     * @param options any ServeStaticOptions to be applied.
     * @param bind when true same as calling app.use(express.static('./public)).
     */
    static(path, options, bind) {
        if (lodash_1.isBoolean(options)) {
            bind = options;
            options = undefined;
        }
        const staticMiddleware = express_1.static(path, options);
        if (bind)
            this.app.use(staticMiddleware);
        return staticMiddleware;
    }
    createServer(app, options, isSSL) {
        options = options || {};
        let server;
        if (isSSL)
            server = https_1.createServer(options, app);
        server = http_1.createServer(options, app);
        this.server = server;
        return server;
    }
    /**
     * Binds the Http Server instance to Tensil.
     *
     * @example
     * import { createServer } from 'http';
     * import * as express from 'express';
     * const server = createServer(express());
     * .bindServer(server);
     *
     * @param server the server to use for listening to requests.
     */
    bindServer(server) {
        this.server = server;
        return this;
    }
    /**
     * Mounts the routes from the generated routeMap to their respective routers.
     *
     * @example
     * .mount();
     */
    mount() {
        if (!this._normalized)
            this.normalize();
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
                .filter(m => lodash_1.includes(['get', 'put', 'post', 'delete', 'param'], m))
                .forEach(m => {
                const routes = Object.keys(methods[m]);
                if (this.options.sort)
                    routes.reverse();
                routes
                    .forEach(r => {
                    router[m](r, ...methods[m][r]);
                });
            });
            // Default router is already mounted.
            if (k !== '/') {
                this.app.use(k, router);
            }
        }
        return this;
    }
    /**
     * Initializes Tensil ensuring Server, normalizing routes, mounting routes.
     *
     * @example
     * .init();
     */
    init() {
        if (this._initialized)
            return this;
        this
            .normalize()
            .mount();
        this._initialized = true;
        return this;
    }
    start(port, host, fn) {
        if (typeof host === 'function') {
            fn = host;
            host = undefined;
        }
        port = port || 3000;
        host = (host || '127.0.0.1');
        fn = fn || (() => {
            if (process.env.NODE_ENV !== 'test')
                console.log(`[TENSIL]: SERVER Listening at ${host}:${port}`);
        });
        // Ensure Tensil is initialized.
        this.init();
        const server = (this.server || this.app)
            .listen(port, host, () => {
            this.emit('start');
            fn();
        });
        // If no server then we started using
        // Express app, save the server reference.
        if (!this.server)
            this.server = server;
        return this;
    }
}
Tensil.Service = Service;
Tensil.Controller = Controller;
exports.Tensil = Tensil;
//# sourceMappingURL=tensil.js.map