import { Express } from 'express';
import { IEntities, IRouters } from './types';
import { Controller, Service, Tensil } from './tensil';
import { Entity } from './entity';
export declare class Core {
    private static _instance;
    static getInstance(app?: Express): Core;
    app: Express;
    entities: IEntities;
    routers: IRouters;
    constructor(app?: Express);
    /**
     * Gets the prototypeOf name for the provided Entity class.
     *
     * @example
     * .getType(UserController);
     *
     * @param entity the Entity to get prototype name for.
     */
    getType(entity: Service | Controller | Entity): any;
    /**
     * Checks if core has already registered the entity.
     *
     * @param type the entity type name.
     */
    has(type: string): boolean;
    /**
     * Checks if core has already registered the entity.
     *
     * @param Entity the Entity instance.
     */
    has(Entity: Service | Controller | Entity | Tensil): boolean;
    /**
     * Registers an Entity instance with the Tensil Entities collection.
     *
     * @example
     * .registerInstance(UserController);
     *
     * @param entity the Entity instance to register with Tensil.
     */
    registerInstance(entity: Service | Controller | Entity | Tensil): boolean;
}
