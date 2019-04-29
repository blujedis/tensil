import { Router } from 'express';
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
export declare type Filter = string | Function | any[];
export declare type Policy = string | boolean | Function | any[];
export declare type Action = string | Function;
export declare type AwaiterResponse<T = any, K extends string = 'data'> = Promise<{
    err?: Error;
} & Record<K, T>>;
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
export interface IRouteMap {
    [mount: string]: {
        [method: string]: {
            [path: string]: Function[];
        };
    };
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
export interface IOptions {
    templates?: IActions;
    formatter?: (key: string, path: string, type: 'rest' | 'crud') => string;
    rest?: boolean;
    crud?: boolean;
    sort?: boolean;
    themes?: {
        [theme: string]: ITheme;
    };
}
