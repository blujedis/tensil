import { Router, Request, Response, NextFunction } from 'express';
import { Entity } from './entity';
import { Tensil, Service, Controller } from './tensil';
export declare enum EntityType {
    Controller = "Controller",
    Service = "Service"
}
export declare enum ContextType {
    policies = "policies",
    filters = "filters",
    routes = "routes",
    actions = "actions"
}
export declare enum HttpMethod {
    Get = "get",
    Put = "put",
    Post = "post",
    Del = "delete"
}
export declare type ContextTypes = keyof typeof ContextType;
export declare type Constructor<T = {}> = new (...args: any[]) => T;
export declare type Noop = (...args: any[]) => void;
export declare type AwaiterResponse<T = any, K extends string = 'data'> = Promise<{
    err?: Error;
} & Record<K, T>>;
export declare type RequestHandler<R, S> = (req: R, res: S, next?: NextFunction) => any;
export declare type RequestErrorHandler<R, S> = (err: Error, req: R, res: S, next: NextFunction) => any;
export declare type RequestParamHandler<R, S> = (req: R, res: S, next: NextFunction, param: any) => any;
export declare type RequestHandlers<R, S> = RequestHandler<R, S> | RequestErrorHandler<R, S> | RequestParamHandler<R, S>;
export declare type Filter<R extends Request = Request, S extends Response = Response> = string | RequestHandlers<R, S>;
export declare type Policy<R extends Request = Request, S extends Response = Response> = string | boolean | RequestHandlers<R, S>;
export declare type Action<R extends Request = Request, S extends Response = Response> = string | RequestHandlers<R, S>;
export declare type ContextHandlers<R extends Request = Request, S extends Response = Response> = Filter<R, S> | Policy<R, S> | Action<R, S>;
export declare class HttpError extends Error {
    status: number;
    title: string;
    statusText: string;
    theme: ITheme;
    constructor(message: string, status: number, theme?: ITheme);
    constructor(message: string, status: number, statusText: string, theme?: ITheme);
}
export interface IFilters {
    [filter: string]: Filter | Filter[];
}
export interface IPolicies {
    [policy: string]: Policy | Policy[];
}
export interface IRoutes {
    [route: string]: Filter | Filter[] | Action | Action[];
}
export interface IRouteConfig<R, S> {
    method: string;
    handlers: (RequestHandlers<R, S> & {
        __namespace__: string;
    })[];
    isView?: boolean;
    isRedirect?: boolean;
    isParam?: boolean;
    entity: Service | Controller | Tensil | Entity;
    namespaces: string[];
}
export interface IRouteConfigs<R, S> {
    [route: string]: IRouteConfig<R, S>;
}
export interface IMethods<R, S> {
    [method: string]: IRouteConfigs<R, S>;
}
export interface IRouteMap<R extends Request = Request, S extends Response = Response> {
    [mount: string]: IMethods<R, S>;
}
export interface IActions {
    [action: string]: string;
}
export interface IEntities {
    [entity: string]: Service | Controller | Tensil | Entity;
}
export interface IRouters {
    [router: string]: Router;
}
export interface IConfig {
    policies: IPolicies;
    filters: IFilters;
    routes: IRoutes;
    actions: IActions;
}
export interface ITheme {
    primary: string;
    accent: string;
}
export interface ITemplates {
    [action: string]: string;
}
export interface IOptions {
    templates?: ITemplates;
    formatter?: (key: string, path: string, type: 'rest' | 'crud') => string;
    rest?: boolean;
    crud?: boolean;
    sort?: boolean;
    themes?: {
        [theme: string]: ITheme;
    };
}
