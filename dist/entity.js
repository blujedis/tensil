"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const core_1 = require("./core");
const lodash_1 = require("lodash");
const types_1 = require("./types");
class Entity {
    constructor(name, mount, type, app) {
        const ctorName = this.constructor.name;
        // If NOT known base type use constructor name first param is mount.
        if (!~types_1.ENTITY_TYPES[ctorName] && !mount) {
            mount = name;
            name = undefined;
        }
        if (typeof type === 'function') {
            app = type;
            type = undefined;
        }
        this._core = core_1.Core.getInstance(app);
        this._type = type || 'service';
        this.name = (name || ctorName).trim();
        this.mountPath = (mount || '/').trim().toLowerCase();
        // Check if router exists
        if (this.mountPath && !this._core.routers[this.mountPath])
            this._core.routers[this.mountPath] = express_1.Router();
        // Set readonly properties.
        Object.defineProperties(this, {
            _core: { enumerable: false },
            _type: { enumerable: false, writable: false },
            name: { writable: false }
        });
        // Register the service with core.
        this._core.registerEntity(this);
    }
    validateKey(key, context, force) {
        key = key.trim();
        if (lodash_1.has(this[context], key) && !force)
            return '';
        return key;
    }
    get app() {
        return this._core.app;
    }
    get router() {
        return this._core.routers[this.mountPath];
    }
    policy(key, policies, force = false) {
        if (lodash_1.isObject(key)) {
            this.policies = key;
            return this;
        }
        if (lodash_1.isBoolean(key)) {
            policies = [key];
            key = '*';
        }
        policies = lodash_1.castArray(policies);
        key = this.validateKey(key, 'policies', force);
        if (!key)
            throw new Error(`Policy key "${key}" exists set force to true to overwrite`);
        this.policies[key] = policies;
        return this;
    }
    filter(key, filters, force = false) {
        if (lodash_1.isObject(key)) {
            this.filters = key;
            return this;
        }
        filters = lodash_1.castArray(filters);
        key = this.validateKey(key, 'filters', force);
        if (!key)
            throw new Error(`Filter key "${key}" exists set force to true to overwrite`);
        this.filters[key] = filters;
        return this;
    }
    route(route, actions, force = false) {
        if (lodash_1.isObject(route)) {
            this.routes = route;
            return this;
        }
        actions = lodash_1.castArray(actions);
        route = this.validateKey(route, 'routes', force);
        if (!route)
            throw new Error(`Route "${route}" exists set force to true to overwrite`);
        this.routes[route] = actions;
        return this;
    }
}
exports.Entity = Entity;
//# sourceMappingURL=entity.js.map