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
    registerEntity(entity) {
        if (lodash_1.has(this.entities, entity.name))
            throw new Error(`Entity ${entity.name} failed to register, already exists`);
        this.entities[entity.name] = entity;
        return this;
    }
}
exports.Core = Core;
//# sourceMappingURL=core.js.map