import { NextFunction, Request, Response, Router } from 'express';
import { Entity } from './entity';
import { Tensil, Service, Controller } from './tensil';
export declare enum EntityType {
    Controller = "Controller",
    Service = "Service"
}
export declare enum ContextType {
    policies = "policies",
    filters = "filters",
    routes = "routes"
}
export declare type ContextTypes = keyof typeof ContextType;
export declare type Constructor<T = {}> = new (...args: any[]) => T;
export declare type Filter = string | Function | any[];
export declare type Policy = string | boolean | Function | any[];
export declare type Action = string | Function;
export declare type RequestHandler<R extends Request, S extends Response> = (req?: R, res?: S, next?: NextFunction) => any;
export declare type RequestErrorHandler<R extends Request, S extends Response> = (err: Error, req?: R, res?: S, next?: NextFunction) => any;
export declare type RequestParamHandler<R extends Request, S extends Response> = (req: R, res: S, next: NextFunction, param: any) => any;
export declare type EntityExtended = Entity & {
    name?: string;
    filters: IFilters;
    routes: IRoutes;
    policies?: IPolicies;
    generate?: boolean;
};
export interface IMap<T> {
    [name: string]: T;
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
export interface IActions<R extends Request, S extends Response> {
    [action: string]: RequestHandler<R, S> | RequestErrorHandler<R, S> | RequestParamHandler<R, S>;
}
export interface IEntities {
    [entity: string]: Entity | Service | Controller | Tensil<Request, Response>;
}
export interface IRouters {
    [router: string]: Router;
}
