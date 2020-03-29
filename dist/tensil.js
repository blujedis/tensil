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
const BASE_DIR = path_1.join(__dirname, '../');
const ERROR_VIEW = path_1.join(BASE_DIR, 'dist/views/error.html');
const DEFAULT_OPTIONS = {
    templates: {
        get: '/{{key}}',
        put: '/{{key}}/:id?',
        post: '/{{key}}',
        read: '/{{key}}/:id?',
        create: '/{{key}}',
        update: '/{{key}}/:id?',
        patch: '/{{key}}/:id',
        delete: '/{{key}}/:id?',
    },
    rest: true,
    crud: false,
    sort: true,
    strict: undefined,
    formatter: (type, tplt, props) => {
        if (type === types_1.RouteType.Rest)
            props.key = '';
        const compiled = lodash_1.template(tplt)(props);
        return compiled.replace(/\/\//g, '/');
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
    get getType() {
        return Service.__BASE_TYPE__;
    }
}
exports.Service = Service;
Service.__BASE_TYPE__ = 'Service';
class Controller extends entity_1.Entity {
    constructor(base, mount) {
        super(base, mount);
    }
    get getType() {
        return Controller.__BASE_TYPE__;
    }
    policy(key, policies, force = false) {
        if (lodash_1.isObject(key)) {
            this.policies = { ...key };
            this.emitter('policy', 'create', this.policies);
            return this;
        }
        if (lodash_1.isBoolean(key)) {
            policies = key;
            key = '*';
        }
        policies = lodash_1.castArray(policies);
        const validKey = this.validateKey(key, 'policies', force);
        if (!validKey) {
            this.emitter('policy', 'invalid', new Error(`Policy key "${key}" exists set force to true to overwrite`));
            return this;
        }
        this.policies = this.policies || {};
        this.policies[validKey] = policies;
        this.emitter('policy', 'create', { [validKey]: policies });
        return this;
    }
}
exports.Controller = Controller;
Controller.__BASE_TYPE__ = 'Controller';
class Tensil extends entity_1.Entity {
    constructor(app, options) {
        super(undefined, undefined, (lodash_1.isFunction(app) && app));
        this._initialized = false;
        this._normalized = false;
        this._routeMap = {};
        if (lodash_1.isObject(app)) {
            options = app;
            app = undefined;
        }
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    // PRIVATE & PROTECTED // 
    get getType() {
        return Tensil.__BASE_TYPE__;
    }
    /**
     * Binds the context to a looked up handler method.
     *
     * @param entity the entity context to be bound to function.
     * @param fn the function whose context should be bound to entity.
     */
    wrapContext(entity, fn) {
        return function () {
            const args = [].slice.call(arguments);
            try {
                return fn.apply(entity, args);
            }
            catch (ex) {
                const next = args[args.length - 1];
                if (lodash_1.isFunction(next))
                    return next(ex);
                // As last resort throw the error.
                throw ex;
            }
        };
    }
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
     * Converts entity type or entity with key property to namespace.
     *
     * @example
     * .toNamespace(UserController, 'create');
     * .toNamespace('UserController', 'create');
     *
     * @param entity an entity type name or entity.
     * @param key the key to be joined to namespace.
     */
    toNamespace(entity, key) {
        if (!lodash_1.isString(entity))
            entity = entity.type;
        return `${entity}.${key}`;
    }
    /**
     * Takes a namespaces and converts to key value of entity or entity type and key.
     *
     * @example
     * .fromNamespace('UserController.create');
     * .fromNamespace('UserController.create', true);
     *
     * @param namespace the namspace to be split to entity and key.
     * @param asEntity when true returns an entity instead of entity type.
     */
    fromNamespace(namespace, asEntity) {
        const parts = namespace.split('.');
        if (asEntity)
            return {
                entity: this.entities[parts[0]],
                key: parts[1]
            };
        return {
            entity: parts[0],
            key: parts[1]
        };
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
        const entities = this.core.entities;
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
        if (result && lodash_1.isFunction(result)) {
            result = this.wrapContext(entity, result);
            // Store the namespace
            result.__namespace__ = namespace;
        }
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
            // Is view/redirect
            else if (Array.isArray(handler)) {
                const parts = key.toLowerCase().split(' ');
                if (lodash_1.includes(['view', 'redirect'], parts[0])) {
                    const actionHandler = this[parts[0]];
                    const args = [handler[0].replace(/^\//, '')];
                    if (parts[0] === 'view')
                        args.push(handler[1] || {});
                    handler = actionHandler(...args);
                }
                result = [...result, handler];
            }
            else {
                result = [...result, handler];
            }
            return result;
        }, []);
    }
    // GETTERS //
    get options() {
        return this._options;
    }
    set options(options) {
        this._options = options;
    }
    get routers() {
        return this.core.routers;
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
        return req.xhr || req.accepts(['json']) || req.get('X-Requested-With') || req.is('*/json') ||
            (req.headers && req.headers.accept && ~req.headers.accept.indexOf('json'));
    }
    isView(view, sync) {
        const dir = this.app.get('views');
        const engine = this.app.get('view engine');
        const filename = path_1.resolve(dir, view);
        if (sync) {
            if (!engine)
                return false;
            const stats = fs_1.statSync(filename);
            return stats.isFile();
        }
        return new Promise((_resolve, _reject) => {
            if (!engine)
                return _resolve(false);
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
        view = view || ERROR_VIEW;
        const theme = this.options.themes[status];
        const err = new types_1.HttpError(text, status, text, theme);
        const payload = this.isProd ? this.cloneError(err, 'stack') : this.cloneError(err);
        return (req, res, next) => {
            if (!this.isXHR(req))
                return this.renderFileOrView(req, res, next)(view, payload, status);
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
        view = view || ERROR_VIEW;
        const theme = this.options.themes[status];
        const err = new types_1.HttpError(text, status, text, theme);
        const payload = this.isProd ? this.cloneError(err, 'stack') : this.cloneError(err);
        return (req, res, next) => {
            if (this.isXHR(req))
                return res.status(status).json(payload);
            return this.renderFileOrView(req, res, next)(view, payload, status);
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
     * .static('./public', {  });
     * .static('./public', true);
     * .static('./public', {}, true);
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
        view = view || ERROR_VIEW;
        const theme = this.options.themes[404];
        const handler = async (req, res, next) => {
            const err = new types_1.HttpError(text, 404, text, theme);
            const payload = this.isProd ? this.cloneError(err, 'stack') : this.cloneError(err);
            if (this.isXHR(req))
                return res.status(404).json(payload);
            return this.renderFileOrView(req, res, next)(view, payload, 404);
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
        view = view || ERROR_VIEW;
        const handler = async (err, req, res, next) => {
            const status = err.status || 500;
            const theme = this.options.themes[status];
            text = err.status ? statuses_1.STATUS_CODES[status] : text;
            err = new types_1.HttpError(err.message, status, text, theme);
            const payload = this.isProd ? this.cloneError(err, 'stack') : this.cloneError(err);
            if (this.isXHR(req))
                return res.status(status).json(payload);
            return this.renderFileOrView(req, res, next)(view, payload, status);
        };
        return handler;
    }
    /**
     * Renders Express view or static html file.
     *
     * @param req the Express Request handler.
     * @param res the Express Response handler.
     * @param next the Express Next Function handler.
     */
    renderFileOrView(req, res, next) {
        return async (view, context, status) => {
            const result = await utils_1.awaiter(this.isView(view));
            status = status || 200;
            if (!result.err && result.data)
                return res.status(status).render(view, context);
            fs_1.readFile(view, (err, html) => {
                if (err)
                    return next(err);
                res.status(status).send(lodash_1.template(html.toString())(context));
            });
        };
    }
    // SERVICE & CONTROLLER //
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
    registerService(Klass, mount, ...args) {
        new Klass(mount, ...args);
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
    registerController(Klass, base, mount, ...args) {
        new Klass(base, mount, ...args);
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
    registerRoute(mount, base, route, handlers, entity, isGenerated) {
        if (lodash_1.isString(handlers)) {
            entity = handlers;
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
        config.methods.forEach(method => {
            const origMethod = method;
            // For redirect, view, param we need to add to get collection.
            if (lodash_1.includes(['view', 'redirect'], method))
                method = 'get';
            root[method] = root[method] || {};
            const path = config.fullPath;
            // Show warning overriding path.
            if (lodash_1.has(root[method], path)) {
                this.emitter('route', 'duplicate', new Error(`Duplicate route "${path}" mounted at "${mount}" detected`));
                // If generated don't overwrite defined route.
                if (this.options.strict)
                    return this;
            }
            const _handlers = handlers;
            const isRedirect = origMethod === 'redirect';
            const isParam = origMethod === 'param';
            const isView = origMethod === 'view';
            const namespaces = _handlers.map(handler => {
                return handler.__namespace__ || handler.name || 'Anonymous';
            });
            const routeKey = `${method}.${path}`;
            const routeConfig = { mount, handlers, entity, method, isRedirect, isParam, isView, namespaces };
            lodash_1.set(root, routeKey, routeConfig);
            this.emitter('route', 'registered', `${method} ${path}`, routeConfig);
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
        // Ensure templates.
        // Not sure I like this, maybe a 
        this.templates = this.templates || { ...(this.options.templates) };
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
            if ((k === types_1.ContextType.actions || k === types_1.ContextType.routes)) {
                for (const n in contexts[k]) {
                    if (lodash_1.isEmpty(contexts[k]))
                        continue;
                    const decorators = contexts[k][n];
                    // This is a decorator config.
                    if (Array.isArray(decorators) && lodash_1.isPlainObject(decorators[0])) {
                        decorators.forEach((d) => {
                            const methods = lodash_1.castArray(d.methods);
                            const ns = this.toNamespace(entity.type, d.key);
                            const handler = this.lookupHandler(ns);
                            let policyFilters = lodash_1.castArray(d.filters || []);
                            // Handle Route Config
                            if (d.decorator === types_1.DecoratorType.Route) {
                                // If no route emit error.
                                if (!d.path)
                                    this.emitter('route', 'invalid', new Error(`Route failed, path for namespace "${ns}" is undefined`));
                                else
                                    contexts[k][`${methods.join('|')} ${d.path}`] = [...policyFilters, handler];
                            }
                            // Handle Action Config
                            else {
                                const tpltKey = d.template || (!d.path && d.key);
                                const tplt = !d.path && tpltKey && this.templates[tpltKey];
                                // For actions we need to lookup the policy.
                                const policies = entity.policies;
                                const globalPol = lodash_1.castArray(policies['*'] || []);
                                policyFilters = [...globalPol, ...lodash_1.castArray(policies[d.key] || [])];
                                // Has known template.
                                if (tplt) {
                                    const props = {
                                        key: d.key,
                                        methods: d.methods,
                                        decorator: d.decorator
                                    };
                                    if (this.options.crud)
                                        contexts[k][methods.join('|') + ' ' +
                                            this.options.formatter(types_1.RouteType.Crud, tplt, props)] = [...policyFilters, handler];
                                    if (this.options.rest)
                                        contexts[k][methods.join('|') + ' ' +
                                            this.options.formatter(types_1.RouteType.Rest, tplt, props)] = [...policyFilters, handler];
                                }
                                else {
                                    if (!d.path)
                                        d.path = `/${d.key}`;
                                    contexts[k][`${methods.join('|')} ${d.path}`] = [...policyFilters, ...d.filters, handler];
                                }
                            }
                        });
                        // Delete the original key
                        delete contexts[k][n];
                    }
                }
            }
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
        let globalPolicies = [];
        // If controller lookup global policies.
        if (ctrl) {
            ctrl.policies['*'] = this.normalizeHandlers(ctrl.policies['*'], types_1.ContextType.policies, '*');
            globalPolicies = ctrl.policies['*'];
        }
        const contexts = ctrl ? ['filters', 'policies', 'routes', 'actions'] : ['filters', 'routes'];
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
                if (ctrl) {
                    // If route we need to lookup the policy for 
                    // the route when last handler is string.
                    if (context === types_1.ContextType.routes || context === types_1.ContextType.actions) {
                        if (lodash_1.isString(lastHandler)) {
                            const lastHandlerPolicy = lastHandler.split('.');
                            // If policy exists look it up and ensure handlers.
                            if (ctrl.policies[lastHandlerPolicy[lastHandlerPolicy.length - 1]]) {
                                lastHandlerPolicy.splice(1, 0, 'policies');
                                const policies = this.normalizeHandlers([lastHandlerPolicy.join('.')], 'routes', key);
                                handlers = [...globalPolicies, ...policies, ...handlers];
                            }
                        }
                    }
                }
                entity[context][key] = handlers = lodash_1.uniq(handlers);
                // If route bind to router.
                if (context === types_1.ContextType.routes || context === types_1.ContextType.actions)
                    this.registerRoute(entity.mountPath, entity.basePath, key, handlers, entity.type, context === types_1.ContextType.actions);
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
    withServer(app, options, isSSL) {
        // An app was passed in.
        if (typeof app === 'function') {
            this.app = app;
        }
        else if (app) {
            isSSL = options;
            options = app;
            app = undefined;
        }
        const args = [this.app];
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
     * Sets whether or not to run in strict mode.
     *
     * @param strict boolean value indicating strict mode.
     */
    strict(strict = true) {
        this.options.strict = strict;
        return this;
    }
    /**
     * Mounts the routes from the generated routeMap to their respective routers.
     *
     * @example
     * .mount();
     */
    mount() {
        const self = this;
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
            for (const m in methods) {
                const routes = Object.keys(methods[m]);
                if (this.options.sort)
                    routes.reverse();
                routes
                    .forEach(r => {
                    const config = methods[m][r];
                    // const rtr = { router: k };
                    self.emitter('route', 'mounted', { ...config, ...({ mount: k }) });
                    router[m](r, ...(config.handlers));
                });
            }
            // // Default router is already mounted.
            if (k !== '/')
                this.app.use(k, router);
        }
        this.emitter('mount', 'completed');
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
        this.emitter('init', 'completed');
        return this;
    }
    start(port, host, fn) {
        if (typeof port === 'function') {
            fn = port;
            port = undefined;
        }
        if (typeof host === 'function') {
            fn = host;
            host = undefined;
        }
        this.port = port = (port || 3000);
        this.host = host = (host || '127.0.0.1');
        fn = fn || (() => {
            const msg = `[TENSIL]: SERVER Listening at ${host}:${port}`;
            if (process.env.NODE_ENV !== 'test')
                console.log(msg);
        });
        // Ensure Tensil is initialized.
        this.init();
        const server = (this.server || this.app)
            .listen(port, host, () => {
            this.emitter('start', 'completed');
            fn();
        });
        // If no server then we started using
        // Express app, save the server reference.
        if (!this.server)
            this.server = server;
        return this;
    }
}
exports.Tensil = Tensil;
Tensil.__BASE_TYPE__ = 'Tensil';
let _instance;
function initTensil() {
    if (!_instance)
        _instance = new Tensil();
    return _instance;
}
exports.default = initTensil();
//# sourceMappingURL=tensil.js.map