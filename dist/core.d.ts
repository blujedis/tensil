import { Express } from 'express';
import { Entity } from './entity';
import { IEntities, IRouters } from './types';
export declare class Core {
    private static _instance;
    static getInstance(app?: Express): Core;
    app: Express;
    entities: IEntities;
    routers: IRouters;
    constructor(app?: Express);
    registerEntity(entity: Entity): this;
}
