"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const entity_1 = require("./entity");
const lodash_1 = require("lodash");
const types_1 = require("./types");
class Service extends entity_1.Entity {
    constructor(mount) {
        super(undefined, mount);
    }
}
exports.Service = Service;
class Controller extends entity_1.Entity {
    constructor(base, mount) {
        super(base, mount);
        this.generate = true;
    }
}
exports.Controller = Controller;
class Tensil extends entity_1.Entity {
    constructor(app) {
        super(undefined, undefined, app);
        this._allowHandler = (req, res, next) => next;
        this._denyHandler = (req, res, next) => res.status(403).send;
        this._viewHandler = (req, res, next) => res.status(403).send;
        this.events = {};
    }
    normalizeNamespaces(entity, context) {
        const map = entity[context];
        const entityType = entity.type;
        for (const k in map) {
            // Ensure is an array if not bool.
            if (!lodash_1.isBoolean(map[k])) {
                map[k] = lodash_1.castArray(map[k]).reduce((a, c) => {
                    if (lodash_1.isString(c)) {
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
                    return [...a, c];
                }, []);
            }
        }
    }
    lookupHandler(namespace, context) {
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
        return lodash_1.castArray(handlers || []).reduce((result, handler) => {
            // Lookup the filter.
            if (lodash_1.isString(handler)) {
                const lookup = this.lookupHandler(handler, context);
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
                        context.slice(1)} "${key}" cannot contain boolean handler.`);
                result = (handler === true) ? this._allowHandler || [] : this._denyHandler || [];
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
    get allowHandler() {
        return this._allowHandler;
    }
    set allowHandler(fn) {
        this._allowHandler = fn;
    }
    get denyHandler() {
        return this._denyHandler;
    }
    set denyHandler(fn) {
        this._denyHandler = fn;
    }
    get viewHandler() {
        return this._viewHandler;
    }
    set viewHandler(fn) {
        this._viewHandler = fn;
    }
    on(event, handler) {
        this.events[event] = this.events[event] || [];
        this.events[event].push(handler);
        return this;
    }
    emit(event, ...args) {
        (this.events[event] || []).forEach(fn => fn(...args));
    }
    off(event, handler) {
        const idx = this.events[event] && this.events[event].indexOf(handler);
        if (~idx)
            this.events[event].splice(idx, 1);
        return this;
    }
    removeEvents(event) {
        delete this.events[event];
    }
    entity(name) {
        return this.entities[name];
    }
    registerService(Klass, mount) {
        new Klass(undefined, mount);
        return this;
    }
    registerController(Klass, base, mount) {
        new Klass(base, mount);
        return this;
    }
    parseRoutes(route, handlers) {
        //
    }
    initEntity(entity, data) {
        entity.filters = entity.filters || {};
        entity.routes = entity.routes || {};
        if (entity.baseType === types_1.EntityType.Controller)
            entity.policies = entity.policies || {};
        else if (entity.baseType === types_1.EntityType.Service && entity.policies)
            throw new Error(`Service ${entity.type} cannot contain "policies", did you mean to use a Controller?`);
        for (const k in data) {
            entity[k] = { ...data[k], ...entity[k] };
        }
        return entity;
    }
    normalizeEntity(entity) {
        const ctrl = (entity.baseType === types_1.EntityType.Controller) && entity;
        // When controller we need to get the global policy.
        if (ctrl) {
            ctrl.policies = ctrl.policies || {};
            ctrl.policies['*'] = ctrl.policies['*'] || true;
            ctrl.policies['*'] = this.normalizeHandlers(ctrl.policies['*'], types_1.ContextType.policies, '*');
        }
        const contexts = ctrl ? ['filters', 'policies', 'routes'] : ['filters', 'routes'];
        contexts.forEach((context) => {
            this.normalizeNamespaces(entity, context);
            for (const key in entity[context]) {
                let handlers = entity[context][key];
                if (lodash_1.isUndefined(handlers))
                    continue;
                handlers = this.normalizeHandlers(handlers, context, key);
                // When context is policies merge global policy.
                if (ctrl && context === types_1.ContextType.policies)
                    handlers = [...ctrl.policies['*'], ...handlers];
                entity[context][key] = lodash_1.uniq(handlers);
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
        const mountPoints = Object.keys(this.routers)
            .filter(v => v !== '/')
            .sort();
        mountPoints.forEach(mount => {
            this.app.use(mount, this.routers[mount]);
        });
        return this;
    }
    init(isProduction = true) {
        this
            .normalize()
            .mount();
        return this;
    }
}
exports.Tensil = Tensil;
Tensil.Service = Service;
Tensil.Controller = Controller;
//# sourceMappingURL=tensil.js.map