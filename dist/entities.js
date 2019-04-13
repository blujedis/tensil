"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const entity_1 = require("./entity");
const lodash_1 = require("lodash");
class Service extends entity_1.Entity {
    constructor(name, mount) {
        super(mount && name || name, mount, 'service');
    }
}
exports.Service = Service;
class Controller extends entity_1.Entity {
    constructor(name, mount) {
        super(mount && name || name, mount, 'controller');
    }
}
exports.Controller = Controller;
class Tensil extends entity_1.Entity {
    constructor(app) {
        super(undefined, undefined, 'tensil', app);
    }
    normalizeNamespaces(entity, context) {
        const map = entity[context];
        const entityName = entity.name;
        for (const k in map) {
            // Ensure is an array if not bool.
            if (!lodash_1.isBoolean(map[k])) {
                map[k] = lodash_1.castArray(map[k]).reduce((a, c) => {
                    if (lodash_1.isString(c)) {
                        // When string normalize the namespace.
                        const parts = c.split('.');
                        if (parts.length === 1 || parts[0] === 'this') {
                            if (parts[0] === 'this')
                                parts.shift();
                            c = [entityName, ...parts].join('.');
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
        const entityName = parts.shift() || '';
        const entity = entities[entityName];
        // Ensure entity exists.
        if (!entity)
            throw new Error(`Entity ${entityName || 'undefined'} could not be found`);
        let result;
        // Check if contains context.
        if (parts[0] === context) {
            result = lodash_1.get(entity, parts.join('.'));
        }
        else {
            // Check if class contains handler.
            result = lodash_1.get(entity, parts.join('.'));
            // If result is undefined fallback to context.
            if (!result)
                result = lodash_1.get(entity[context], parts.join('.'));
        }
        return result;
    }
    normalizeFilter(handlers) {
        return lodash_1.castArray(handlers || []).reduce((result, filter) => {
            // Lookup the filter.
            if (lodash_1.isString(filter)) {
                const lookup = this.lookupHandler(filter, 'handlers');
                if (!lookup)
                    throw new Error(`${filter} filter is required but could not be found`);
                // Recurse ensure all handlers in lookup filter.
                const normalized = this.normalizeFilter(lookup);
                result = [...result, ...normalized];
            }
            else {
                result = [...result, filter];
            }
            return result;
        }, []);
    }
    normalizeFilters(entity) {
        this.normalizeNamespaces(entity, 'filters');
        for (const k in entity.filters) {
            const normalized = this.normalizeFilter(entity.filters[k]);
            entity.filters[k] = normalized;
        }
    }
    normalizePolicies(entity) {
        this.normalizeNamespaces(entity, 'policies');
    }
    normalizeControllers(entity) {
    }
    normalizeRoutes(entity) {
        //
    }
    get entities() {
        return this._core.entities;
    }
    get routers() {
        return this._core.routers;
    }
    normalize() {
        let entities = this._core.entities;
        for (const k in entities) {
            this.normalizeFilters(entities[k]);
            // this.normalizePolicies(entities[k]);
        }
        return this;
    }
    mount() {
        const mountPoints = Object.keys(this.routers).filter(v => v !== '/').sort();
        mountPoints.forEach(mount => {
            this.app.use(mount, this.routers[mount]);
        });
        return this;
    }
    init(strict = false) {
        this
            .normalize()
            .mount();
        return this;
    }
}
exports.Tensil = Tensil;
Tensil.Service = Service;
Tensil.Controller = Controller;
//# sourceMappingURL=entities.js.map