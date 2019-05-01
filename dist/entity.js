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
        this._core = core_1.Core.getInstance(app);
        this.type = ctorName;
        this.baseType = this._core.getType(this);
        this.mountPath = '/' + ((mount || '/').trim().toLowerCase()).replace(/^\/\/?/, '');
        // Defaults basePath to controller name without "Controller"
        if (this.baseType === types_1.EntityType.Controller) {
            base = base || ctorName.toLowerCase().replace(/controller$/, '');
            this.basePath = base.replace(/^\//, '');
        }
        // Check if router exists
        if (this.mountPath && !this._core.routers[this.mountPath])
            this._core.routers[this.mountPath] = express_1.Router();
        // Set readonly properties.
        Object.defineProperties(this, {
            _core: { enumerable: false },
            name: { writable: false }
        });
        // Register the service with core.
        const registered = this._core.registerInstance(this);
        if (!registered)
            this.emit('register', 'error', new Error(`${this.type} failed to register, already exists`));
        else
            this.emit('register', 'success', true);
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
        return this._core.app;
    }
    set app(app) {
        this._core.app = app;
    }
    get router() {
        return this._core.routers[this.mountPath];
    }
    filter(key, filters, force = false) {
        if (lodash_1.isObject(key)) {
            this.filters = { ...key };
            this.emit('filter', 'add', this.filters);
            return this;
        }
        filters = lodash_1.castArray(filters);
        const validKey = this.validateKey(key, 'filters', force);
        if (!validKey) {
            this.emit('filter', 'error', new Error(`Filter key "${key}" exists set force to true to overwrite`));
            return this;
        }
        this.filters = this.filters || {};
        this.filters[validKey] = filters;
        this.emit('filter', 'add', { [validKey]: filters });
        return this;
    }
    route(route, actions, force = false) {
        if (lodash_1.isObject(route)) {
            this.routes = { ...route };
            this.emit('route', 'add', this.routes);
            return this;
        }
        actions = lodash_1.castArray(actions);
        const validRoute = this.validateKey(route, 'routes', force);
        if (!validRoute) {
            this.emit('route', 'error', new Error(`Route "${route}" exists set force to true to overwrite`));
            return this;
        }
        this.routes = this.routes || {};
        this.routes[validRoute] = actions;
        this.emit('route', 'add', { [validRoute]: actions });
        return this;
    }
}
exports.Entity = Entity;
//# sourceMappingURL=entity.js.map