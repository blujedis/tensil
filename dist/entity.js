"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const core_1 = require("./core");
const lodash_1 = require("lodash");
const types_1 = require("./types");
class Entity {
    constructor(base, mount, app) {
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
        this._core.registerInstance(this);
    }
    get tensil() {
        return this._core.entities.Tensil;
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
    get router() {
        return this._core.routers[this.mountPath];
    }
    // HELPERS //
    /**
     * Default deny handler.
     *
     * @example
     * .deny(req, res);
     *
     * @param req the Express request object.
     * @param res the Express response object.
     */
    deny(req, res) {
        return res.status(403).send();
    }
    /**
     * Returns default handler for rendering a view.
     *
     * @example
     * .view('user/create');
     * .view('user/create', { });
     *
     * @param path the path of the view.
     * @param context the context to pass to the view.
     */
    view(path, context) {
        return (req, res) => {
            return res.render(path, context);
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
    filter(key, filters, force = false) {
        if (lodash_1.isObject(key)) {
            this.filters = { ...(this.filters), ...key };
            this.tensil.emit('filter', key, this.filters);
            return this;
        }
        filters = lodash_1.castArray(filters);
        const validKey = this.validateKey(key, 'filters', force);
        if (!validKey)
            throw new Error(`Filter key "${key}" exists set force to true to overwrite`);
        this.filters = this.filters || {};
        this.filters[validKey] = filters;
        this.tensil.emit('filter', { [validKey]: filters }, this.filters);
        return this;
    }
    route(route, actions, force = false) {
        if (lodash_1.isObject(route)) {
            this.routes = { ...(this.routes), ...route };
            this.tensil.emit('route', route, this.routes);
            return this;
        }
        actions = lodash_1.castArray(actions);
        const validRoute = this.validateKey(route, 'routes', force);
        if (!validRoute)
            throw new Error(`Route "${route}" exists set force to true to overwrite`);
        this.routes = this.routes || {};
        this.routes[validRoute] = actions;
        this.tensil.emit('route', { [validRoute]: actions }, this.routes);
        return this;
    }
}
exports.Entity = Entity;
//# sourceMappingURL=entity.js.map