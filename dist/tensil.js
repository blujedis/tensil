"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stream_1 = require("stream");
const http_1 = require("http");
const https_1 = require("https");
const entity_1 = require("./entity");
const lodash_1 = require("lodash");
const statuses_1 = require("statuses");
const path_1 = require("path");
const fs_1 = require("fs");
const types_1 = require("./types");
const utils_1 = require("./utils");
lodash_1.templateSettings.interpolate = /{{([\s\S]+?)}}/g;
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
    },
    themes: {
        500: { primary: '#661717', accent: '#dd0d2c' },
        406: { primary: '#6d0227', accent: '#c10043' },
        404: { primary: '#1E152A', accent: '#444c99' },
        403: { primary: '#661717', accent: '#dd0d2c' },
        401: { primary: '#661717', accent: '#dd0d2c' },
        400: { primary: '#ad3826', accent: '#f95036' },
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
    // PRIVATE & PROTECTED // 
    /**
     * Creates transform to be used with ReadStream.
     *
     * @example
     * res.write('<!-- BEGIN WRITE -->') // optional
     * createReadStream('/path/to.html')
     *  .pipe(.transformContext({}))
     *  .on('end', () => res.write('<!-- END WRITE -->'))
     *  .pipe(res);
     *
     * @param context the context object to render to string template.
     */
    transformContext(context) {
        const transformer = new stream_1.Transform();
        transformer._transform = (data, enc, done) => {
            transformer.push(lodash_1.template(data.toString())(context));
            done();
        };
    }
    /**
     * Clone an error into plain object.
     *
     * @param err the error to be cloned.
     */
    cloneError(err, pick) {
        pick = lodash_1.castArray(pick);
        return Object.getOwnPropertyNames(err)
            .reduce((a, c) => {
            if (~pick.indexOf(c))
                return a;
            if (!a.name)
                a.name = err.name;
            a[c] = err[c];
            return a;
        }, {});
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
                result = (handler === true) ? [] : this.deny() || [];
            }
            else {
                result = [...result, handler];
            }
            return result;
        }, []);
    }
    /**
     * Renders Express view or static html file.
     *
     * @param res the Express Request handler.
     * @param next the Express Next Function handler.
     */
    renderFileOrView(res, next) {
        return async (view, context, status) => {
            const result = await utils_1.awaiter(this.isView(view));
            if (result.data)
                return res.status(status).render(view, context);
            fs_1.readFile(view, (err, html) => {
                if (err)
                    return next(err);
                res.status(status).send(lodash_1.template(html.toString())(context));
            });
        };
    }
    // EVENTS //
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
    // GETTERS //
    get entities() {
        return this._core.entities;
    }
    get routers() {
        return this._core.routers;
    }
    get routeMap() {
        return this._routeMap;
    }
    get isProd() {
        return this.isEnv('production');
    }
    get isDev() {
        return this.isEnv('') || !this.isEnv('production');
    }
    // HELPERS //
    /**
     * Checks if process.env.NODE_ENV contains specified environment.
     *
     * @param env the environment to inspect process.env.NODE_ENV for.
     */
    isEnv(env) {
        return process.env.NODE_ENV === env;
    }
    /**
     * Checks if Request is of type XHR.
     *
     * @param req Express Request
     */
    isXHR(req) {
        return req.xhr || req.get('X-Requested-With') || req.is('*/json');
    }
    isView(view, sync) {
        const filename = path_1.resolve(this.app.get('view'), view);
        if (sync) {
            const stats = fs_1.statSync(filename);
            return stats.isFile();
        }
        return new Promise((_resolve, _reject) => {
            fs_1.stat(filename, (err, stats) => {
                if (err)
                    return _reject(err);
                _resolve(stats.isFile());
            });
        });
    }
    demandXhr(status, text, view) {
        if (lodash_1.isString(status)) {
            view = text;
            text = status;
            status = undefined;
        }
        status = status || 406;
        text = text || statuses_1.STATUS_CODES[status];
        view = view || path_1.resolve(__dirname, 'views/error.html');
        const theme = this.options.themes[status];
        const err = new types_1.HttpError(text, status, text, theme);
        const payload = this.isProd ? this.cloneError(err, 'stack') : this.cloneError(err);
        return (req, res, next) => {
            if (!this.isXHR(req))
                return this.renderFileOrView(res, next)(view, payload, status);
            next();
        };
    }
    rejectXhr(status, text) {
        if (lodash_1.isString(status)) {
            text = status;
            status = undefined;
        }
        status = status || 406;
        text = text || statuses_1.STATUS_CODES[status];
        const theme = this.options.themes[status];
        const err = new types_1.HttpError(text, status, text, theme);
        const payload = this.isProd ? this.cloneError(err, 'stack') : this.cloneError(err);
        return (req, res, next) => {
            if (this.isXHR(req))
                return res.status(status).json(payload);
            next();
        };
    }
    deny(status, text, view) {
        if (lodash_1.isString(status)) {
            text = status;
            status = undefined;
        }
        status = status || 403;
        text = text || statuses_1.STATUS_CODES[status];
        view = view || path_1.resolve(__dirname, 'views/error.html');
        const theme = this.options.themes[status];
        const err = new types_1.HttpError(text, status, text, theme);
        const payload = this.isProd ? this.cloneError(err, 'stack') : this.cloneError(err);
        return (req, res, next) => {
            if (this.isXHR(req))
                return res.status(status).json(payload);
            return this.renderFileOrView(res, next)(view, payload, status);
        };
    }
    /**
     * Returns default handler for rendering a view.
     *
     * @example
     * .view('user/create');
     * .view('user/create', { });
     *
     * @param view the path of the view.
     * @param context the context to pass to the view.
     */
    view(view, context) {
        return (req, res) => {
            return res.render(view, context);
        };
    }
    /**
     * Returns default redirect handler.
     *
     * @example
     * .redirect('/to/some/new/path');
     *
     * @param to the path to redirect to.
     */
    redirect(to) {
        return (req, res) => {
            return res.render(to);
        };
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
    /**
     * Enables 404 Error handling.
     *
     * @example
     * .notFound('Custom 404 error message');
     * .notFound('Custom 404 error message', '/path/to/file.html');
     * .notFound(null, '/path/to/file.html');
     *
     * @param text method to be displayed on 404 error.
     * @param view optional view/filename to render (default: 'dist/views/error.html')
     */
    notFound(text, view) {
        text = text || statuses_1.STATUS_CODES[404];
        view = view || path_1.resolve(__dirname, 'views/error.html');
        const theme = this.options.themes[404];
        const handler = async (req, res, next) => {
            const err = new types_1.HttpError(text, 404, text, theme);
            const payload = this.isProd ? this.cloneError(err, 'stack') : this.cloneError(err);
            if (this.isXHR(req))
                return res.status(404).json(payload);
            return this.renderFileOrView(res, next)(view, payload, 404);
        };
        return handler;
    }
    /**
     * Creates 500 Error handler.
     * NOTE: if next(err) and err contains status/statusText it will be used instead.
     *
     * @example
     * .serverError();
     * .serverError('Server Error', '/some/path/to/error.html');
     * .serverError(null, '/some/path/to/error.html');
     *
     * @param text the Server Error status text.
     * @param view optional view/filename (default: /tensil/dist/views/error.html)
     */
    serverError(text, view) {
        text = text || statuses_1.STATUS_CODES[500];
        view = view || path_1.resolve(__dirname, 'views/error.html');
        const handler = async (err, req, res, next) => {
            const status = err.status || 500;
            const statusText = err.status ? err.statusText || statuses_1.STATUS_CODES[status] : text;
            const theme = this.options.themes[status];
            err = new types_1.HttpError(err.message, status, statusText, theme);
            const payload = this.isProd ? this.cloneError(err, 'stack') : this.cloneError(err);
            if (this.isXHR(req))
                return res.status(status).json(payload);
            return this.renderFileOrView(res, next)(view, payload, status);
            // const result = await awaiter(this.isView(filename));
            // if (result.data)
            //   return res.status(status).render(filename, payload);
            // readFile(filename, (_err, html) => {
            //   if (err)
            //     return next(_err);
            //   res.status(status).send(template(html.toString())(payload));
            // });
        };
        return handler;
    }
    // SERVICE & CONTROLLER //
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
    // CONFIGURATION //
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
    createServer(app, options, isSSL) {
        const args = [app];
        if (options)
            args.unshift(options);
        let server;
        if (isSSL)
            server = https_1.createServer.apply(null, args);
        server = http_1.createServer.apply(null, args);
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