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
        return this._instance || (this._instance = new this(app));
    }
    // PLACEHOLDER
    // formatMessage(message: string, map?: IMap<any>) {
    //   message = template(message)(map || {});
    //   const caller = parseCaller(3);
    //   return template(this.config.messageTemplate)
    // ({ program: this.config.program, ministack: caller.ministack, message });
    // }
    /**
     * Gets the prototypeOf name for the provided Entity class.
     *
     * @example
     * .getType(UserController);
     *
     * @param entity the Entity to get prototype name for.
     */
    getType(entity) {
        return Object.getPrototypeOf(Object.getPrototypeOf(entity)).constructor.name;
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
        if (lodash_1.has(this.entities, entity.type))
            throw new Error(`Entity ${entity.type} failed to register, already exists`);
        this.entities[entity.type] = entity;
        return this;
    }
}
exports.Core = Core;
//# sourceMappingURL=core.js.map