import { Express } from 'express';
import { IEntities, IRouters } from './types';
import { Controller, Service } from './tensil';
import { Entity } from './entity';
export declare class Core {
    private static _instance;
    static getInstance(app?: Express): Core;
    app: Express;
    entities: IEntities;
    routers: IRouters;
    constructor(app?: Express);
    getType(entity: Service | Controller | Entity<any, any>): any;
    registerInstance(entity: Service | Controller | Entity<any, any>): this;
}
