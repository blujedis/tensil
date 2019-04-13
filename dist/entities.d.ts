import { Express } from 'express';
import { Entity } from './entity';
export declare class Service extends Entity {
    constructor();
    constructor(mount: string);
    constructor(name: string, mount: string);
}
export declare class Controller extends Entity {
    constructor();
    constructor(mount: string);
    constructor(name: string, mount: string);
}
export declare class Tensil extends Entity {
    static Service: typeof Service;
    static Controller: typeof Controller;
    constructor();
    constructor(app: Express);
    private normalizeNamespaces;
    private lookupHandler;
    private normalizeFilter;
    private normalizeFilters;
    private normalizePolicies;
    private normalizeControllers;
    private normalizeRoutes;
    readonly entities: import("./types").IMap<Entity>;
    readonly routers: import("./types").IMap<import("express").Router>;
    normalize(): this;
    mount(): this;
    init(strict?: boolean): this;
}
