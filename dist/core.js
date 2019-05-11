"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const lodash_1 = require("lodash");
// templateSettings.interpolate = /{{([\s\S]+?)}}/g;
class Core {
    constructor(app) {
        this.entities = {};
        this.routers = {};
        this.app = app || express();
        this.routers['/'] = this.app;
        // Define singleton instance.
        Core._instance = this;
    }
    static getInstance(app) {
        return (this._instance || (this._instance = new this(app)));
    }
    /**
     * Gets the prototypeOf name for the provided Entity class.
     *
     * @example
     * .getType(UserController);
     *
     * @param entity the Entity to get prototype name for.
     */
    getType(entity) {
        const type = Object.getPrototypeOf(Object.getPrototypeOf(entity)).constructor.name;
        // if (type !== 'Service' && type !== 'Controller')
        //   return this.getType((entity as any).constructor.prototype);
        // console.log((entity as any).__proto__.constructor.__proto__.constructor.__proto__);
        return type;
    }
    has(entity) {
        let type = entity;
        if (typeof entity !== 'string')
            type = entity.type;
        return lodash_1.has(this.entities, type);
    }
    /**
     * Registers an Entity instance with the Tensil Entities collection.
     *
     * @example
     * .registerInstance(UserController);
     *
     * @param entity the Entity instance to register with Tensil.
     */
    registerInstance(entity) {
        if (this.has(entity))
            return false;
        this.entities[entity.type] = entity;
        return true;
    }
}
exports.Core = Core;
//# sourceMappingURL=core.js.map