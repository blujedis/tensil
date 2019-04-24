"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const entity_1 = require("./entity");
const lodash_1 = require("lodash");
class Service extends entity_1.Entity {
    constructor(name, mount) {
        super(mount && name || name, mount, 'service');
    }
}
class Controller extends entity_1.Entity {
    constructor(name, mount) {
        super(mount && name || name, mount, 'controller');
    }
}
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
            throw new Error(`Entity ${entityName || 'undefined'} is required but could not be found`);
        let result;
        // Check if contains key.
        if (parts[0] === context)
            parts.shift();
        // Check if class contains handler.
        result = lodash_1.get(entity, parts.join('.'));
        // If result is undefined fallback to context.
        if (!result)
            result = lodash_1.get(entity[context], parts.join('.'));
        return result;
    }
    normalizeHandlers(handlers, context) {
        return lodash_1.castArray(handlers || []).reduce((result, handler) => {
            // Lookup the filter.
            if (lodash_1.isString(handler)) {
                const lookup = this.lookupHandler(handler, context);
                if (!lookup)
                    throw new Error(`${handler} filter is required but could not be found`);
                // Recurse ensure all handlers in lookup filter.
                const normalized = this.normalizeHandlers(lookup, context);
                result = [...result, ...normalized];
            }
            else {
                result = [...result, handler];
            }
            return result;
        }, []);
    }
    normalizeEntity(entity) {
        ['filters', 'policies', 'routes'].forEach((type) => {
            this.normalizeNamespaces(entity, type);
            for (const key in entity[type]) {
                let handlers = entity[type][key];
                if (lodash_1.isUndefined(handlers))
                    continue;
                handlers = this.normalizeHandlers(handlers, type);
                entity[type][key] = handlers;
            }
        });
    }
    get routers() {
        return this._core.routers;
    }
    normalize() {
        const entities = this._core.entities;
        for (const k in entities) {
            this.normalizeEntity(entities[k]);
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
//# sourceMappingURL=tensil.js.map