"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const core_1 = require("./core");
const events_1 = require("events");
const lodash_1 = require("lodash");
const types_1 = require("./types");
class Entity extends events_1.EventEmitter {
    constructor(base, mount, app) {
        super();
        const ctorName = this.constructor.name;
        this.core = core_1.Core.getInstance(app);
        this.type = ctorName;
        this.baseType = this.getType;
        this.mountPath = '/' + ((mount || '/').trim().toLowerCase()).replace(/^\/\/?/, '');
        // Defaults basePath to controller name without "Controller"
        if (this.baseType === types_1.EntityType.Controller) {
            base = base || ctorName.toLowerCase().replace(/controller$/, '');
            this.basePath = base.replace(/^\//, '');
        }
        this.basePath = this.basePath || '';
        // Check if router exists
        if (this.mountPath && !this.core.routers[this.mountPath])
            this.core.routers[this.mountPath] = express_1.Router();
        // Set readonly properties.
        Object.defineProperties(this, {
            _core: { enumerable: false },
            name: { writable: false }
        });
        // Register the service with core.
        const registered = this.core.registerInstance(this);
        if (!registered)
            this.emitter('entity', 'duplicate', new Error(`Skipping duplicate registration for ${this.baseType} "${this.type}"`));
        else
            this.emitter('entity', 'registered', registered);
    }
    /**
     * Helper method for emitting events.
     *
     * @param key the group key of the event.
     * @param type the subtype of the group.
     * @param args arguments to pass to the emit event.
     */
    emitter(key, type, ...args) {
        // First arg is error.
        const isError = args[0] instanceof Error;
        this.emit('*', key, type, ...args);
        this.emit(key, type, ...args);
        this.emit(`${key}:${type}`, ...args);
        // If in strict mode after emitting 
        // events by type emit the error.
        if (isError && this.isStrict())
            this.emit('error', args[0]);
        return this;
    }
    /**
     * Ensures a key does not exist in a context collection.
     *
     * @example
     * .validKey('isAuthorized', 'filters');
     * .validKey('isAuthorized', 'filters', true);
     *
     * @param key checks if a key exists in the collection.
     * @param context the context to inspect in.
     * @param force when true allows overwrite of existing key.
     */
    validateKey(key, context, force) {
        key = key.trim();
        if (lodash_1.has(this[context], key) && !force)
            return '';
        return key;
    }
    get app() {
        return this.core.app;
    }
    set app(app) {
        this.core.app = app;
    }
    get router() {
        return this.core.routers[this.mountPath];
    }
    get entities() {
        return this.core.entities;
    }
    /**
     * Returns value indicating if running in strict mode.
     */
    isStrict() {
        const strict = this.core.entities.Tensil.options.strict;
        if (typeof strict === 'undefined' && process.env.NODE_ENV === 'production')
            return true;
        return strict;
    }
    /**
     * Gets the base class type for a given class.
     *
     * @param Type the type to inspect for base type.
     */
    // getType(Type: Entity) {
    //   return this.core.getType(Type);
    // }
    /**
     * Gets an entity by it's type.
     *
     * @param name the name of the entity to get.
     */
    getAs(name) {
        return this.entities[name];
    }
    /**
     * Gets a property on the entity as type.
     *
     * @example
     * .getPropAs('UserController', 'MyCustomProp');
     *
     * @param name the name of an entity.
     * @param prop the property on the entity to get.
     */
    getPropAs(name, prop) {
        return this.entities[name][prop];
    }
    /**
     * Gets a Service by name.
     *
     * @example
     * .getService('LogService');
     *
     * @param name the name of the Service to get.
     */
    getService(name) {
        const entity = this.getAs(name);
        if (!entity) {
            this.emitter('entity', 'undefined', name);
            return null;
        }
        if (entity.baseType !== types_1.EntityType.Service) {
            this.emitter('entity', 'mismatch', name);
            return null;
        }
        return entity;
    }
    /**
     * Gets a Controller by name.
     *
     * @example
     * .getController('UserController');
     *
     * @param name the name of the Controller to get.
     */
    getController(name) {
        const entity = this.getAs(name);
        if (!entity) {
            this.emitter('entity', 'undefined', name);
            return null;
        }
        if (entity.baseType !== types_1.EntityType.Service) {
            this.emitter('entity', 'mismatch', name);
            return null;
        }
        return entity;
    }
    filter(key, filters, force = false) {
        if (lodash_1.isObject(key)) {
            this.filters = { ...key };
            this.emitter('filter', 'create', this.filters);
            return this;
        }
        filters = lodash_1.castArray(filters);
        const validKey = this.validateKey(key, 'filters', force);
        if (!validKey) {
            this.emitter('filter', 'invalid', new Error(`Filter key "${key}" exists set force to true to overwrite`));
            return this;
        }
        this.filters = this.filters || {};
        this.filters[validKey] = filters;
        this.emitter('filter', 'create', { [validKey]: filters });
        return this;
    }
    route(route, actions, force = false) {
        if (lodash_1.isObject(route)) {
            this.routes = { ...route };
            this.emitter('route', 'create', this.routes);
            return this;
        }
        actions = lodash_1.castArray(actions);
        const validRoute = this.validateKey(route, 'routes', force);
        if (!validRoute) {
            this.emitter('route', 'invalid', new Error(`Route "${route}" exists set force to true to overwrite`));
            return this;
        }
        this.routes = this.routes || {};
        this.routes[validRoute] = actions;
        this.emitter('route', 'create', { [validRoute]: actions });
        return this;
    }
}
exports.Entity = Entity;
//# sourceMappingURL=entity.js.map