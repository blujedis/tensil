/// <reference types="node" />
import { Router, Express } from 'express';
import { Core } from './core';
import { EventEmitter } from 'events';
import { Filter, Action, IFilters, IPolicies, IRoutes, IActions, ContextTypes, ITemplates, IEntities } from './types';
import { Service, Controller } from './tensil';
export declare class Entity extends EventEmitter {
    protected core: Core;
    protected policies: IPolicies;
    protected filters: IFilters;
    protected routes: IRoutes;
    protected actions: IActions;
    type: string;
    baseType: string;
    mountPath: string;
    basePath: string;
    templates: ITemplates;
    constructor();
    constructor(base: string, mount?: string, app?: Express);
    /**
     * Helper method for emitting events.
     *
     * @param key the group key of the event.
     * @param type the subtype of the group.
     * @param args arguments to pass to the emit event.
     */
    protected emitter(key: string, type: string, ...args: any[]): this;
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
    protected validateKey(key: string, context: ContextTypes, force?: boolean): string;
    app: Express;
    readonly router: Router;
    readonly entities: IEntities;
    /**
     * Returns value indicating if running in strict mode.
     */
    isStrict(): boolean;
    /**
     * Gets the base class type for a given class.
     *
     * @param Type the type to inspect for base type.
     */
    /**
     * Gets an entity by it's type.
     *
     * @param name the name of the entity to get.
     */
    getAs<T extends Entity>(name: string): T;
    /**
     * Gets a property on the entity as type.
     *
     * @example
     * .getPropAs('UserController', 'MyCustomProp');
     *
     * @param name the name of an entity.
     * @param prop the property on the entity to get.
     */
    getPropAs<T>(name: string, prop: string): T;
    /**
     * Gets a Service by name.
     *
     * @example
     * .getService('LogService');
     *
     * @param name the name of the Service to get.
     */
    getService<T extends Service = Service>(name: string): T;
    /**
     * Gets a Controller by name.
     *
     * @example
     * .getController('UserController');
     *
     * @param name the name of the Controller to get.
     */
    getController<T extends Controller = Controller>(name: string): T;
    /**
     * Merges policies with the provided object.
     *
     * @example
     * .policy({
     *   find: ['isAuthorized']
     * });
     *
     * @param policies the filter collection object.
     */
    filter(filters: IFilters): this;
    /**
     * Adds policy to collection.
     *
     * @example
     * .policy('find', 'isAuthorized');
     * .policy('find', 'isAuthorized', true);
     *
     * @param key the filters's key.
     * @param filters the filters or array of filters.
     * @param force when true overwrites existing.
     */
    filter(key: string, filters: Filter | Filter[], force?: boolean): this;
    /**
     * Merges routes with the provided object.
     *
     * @example
     * .route({
     *   'get /user': ['isAuthorized', 'UserController.find']
     * });
     *
     * @param routes the route collection object.
     */
    route(routes: IRoutes): this;
    /**
     * Adds route to collection.
     *
     * @example
     * .route('get /user', ['isAuthorized', 'UserController.find']);
     * .route('get /user', ['isAuthorized', 'UserController.find', true]);
     *
     * @param route the route path.
     * @param actions the action or array of actions.
     * @param force when true overwrites existing.
     */
    route(route: string, actions: Filter | Filter[] | Action | Action[], force?: boolean): this;
}
