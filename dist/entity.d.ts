import { Express, Router } from 'express';
import { Core } from './core';
import { Tensil } from './tensil';
import { Filter, Action, IFilters, IPolicies, IRoutes, IActions, ContextTypes } from './types';
import { Request, Response } from 'express-serve-static-core';
export declare class Entity<R extends Request, S extends Response> {
    protected _core: Core;
    protected policies: IPolicies;
    protected filters: IFilters;
    protected routes: IRoutes;
    protected actions: IActions;
    type: string;
    baseType: string;
    mountPath: string;
    basePath: string;
    constructor();
    constructor(base: string, mount?: string, app?: Express);
    protected readonly tensil: Tensil<R, S>;
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
    readonly app: Express;
    readonly router: Router;
    /**
     * Default deny handler.
     *
     * @example
     * .deny(req, res);
     *
     * @param req the Express request object.
     * @param res the Express response object.
     */
    deny(req: R, res: S): Response;
    /**
     * Returns default handler for rendering a view.
     *
     * @example
     * .view('user/create');
     * .view('user/create', { });
     *
     * @param path the path of the view.
     * @param context the context to pass to the view.
     */
    view<T extends object = any>(path: string, context?: T): (req: R, res: S) => void;
    /**
     * Returns default redirect handler.
     *
     * @example
     * .redirect('/to/some/new/path');
     *
     * @param to the path to redirect to.
     */
    redirect(to: string): (req: R, res: S) => void;
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
