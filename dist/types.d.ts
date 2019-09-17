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
    Del = "delete",
    Patch = "patch",
    Param = "param"
}
export declare enum DecoratorType {
    Action = "action",
    Route = "route",
    Filter = "filter"
}
export declare enum RouteType {
    Crud = "crud",
    Rest = "rest"
}
export declare type ValuesOf<T> = {
    [K in keyof T]: T[K];
};
export declare type EntityTypes = keyof typeof EntityType;
export declare type ContextTypes = keyof typeof ContextType;
export declare type DecoratorTypes = ValuesOf<DecoratorType>;
export declare type HttpMethods = ValuesOf<HttpMethod>;
export declare type RouteTypes = ValuesOf<RouteType>;
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
export declare type Descriptor = (target: any, key: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export interface IGenerateConfigBase {
    key: string;
    methods: HttpMethod | HttpMethod[];
    decorator: DecoratorType;
}
export interface IGenerateActionConfig extends IGenerateConfigBase {
    template?: string;
}
export interface IGenerateRouteConfig extends IGenerateConfigBase {
    path: string;
    filters?: Policy | Policy[] | Filter | Filter[];
    [key: string]: any;
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
export interface IActions {
    [action: string]: Action | Action[];
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
    routes: IGenerateRouteConfig[];
    actions: IGenerateRouteConfig[];
}
export interface IRouteConfig<R, S> {
    mount?: string;
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
export interface ITheme {
    primary: string;
    accent: string;
}
export interface ITemplates {
    [action: string]: string;
}
export interface IOptions {
    templates?: ITemplates;
    formatter?: (type: RouteType, template: string, options: Partial<IGenerateActionConfig>) => string;
    themes?: {
        [theme: string]: ITheme;
    };
    rest?: boolean;
    crud?: boolean;
    sort?: boolean;
    strict?: boolean;
}
export declare class HttpError extends Error {
    title: string;
    status: number;
    url: string;
    theme: ITheme;
    constructor(message: string, status: number, theme?: ITheme);
    constructor(message: string, status: number, title: string, theme?: ITheme);
}
