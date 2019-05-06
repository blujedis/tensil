import { HttpMethod, Filter, Descriptor, IGenerateRouteConfig } from './types';
/**
 * Adds method as filter in Service or Controller filters collection.
 *
 * @example
 *  @filter
 *  isAuthorized(req, res, next) {
 *    // check if authorized.
 *  }
 *
 * @param target the target class instance.
 * @param key the method name the decorator is bound to.
 * @param descriptor the property descriptor for the bound method.
 */
export declare function filter(target: any, key: string, descriptor: PropertyDescriptor): PropertyDescriptor;
/**
 * Creates action route with Http Method Get
 *
 * @example
 * .action();
 * find(req, res, next) {
 *    // handle request.
 * }
 */
export declare function action(): Descriptor;
/**
 * Creates an action route for each specified Http method.
 *
 * @example
 * .action(HttpMethod.Get, '/some/path');
 * .action([HttpMethod.Get, HttpMethod.Post], '/some/path');
 * find(req, res, next) {
 *    // handle request.
 * }
 *
 * @param methods the Http Methods to apply to each route.
 * @param path the path or template to be used, paths begin with /
 */
export declare function action(methods?: HttpMethod | HttpMethod[], pathOrTemplate?: string): Descriptor;
/**
 * Creates multiple routes defined by array of configs.
 *
 * @example
 * .route([
 *   { method: HttpMethod.Get, path: '/some/path' },
 *   { method: HttpMethod.Get, path: '/some/other/path' },
 * ]);
 *
 * @param routes route configuration objects.
 */
export declare function route(methods: IGenerateRouteConfig[]): Descriptor;
/**
 * Creates route for each specified Http method.
 *
 * @example
 * .route(HttpMethod.Get, '/some/path');
 * .route([HttpMethod.Get, HttpMethod.Post], '/some/path');
 *
 * @param methods the Http Methods to apply to each route.
 * @param path a custom path to use for the route.
 */
export declare function route(methods: HttpMethod | HttpMethod[], path?: string, filters?: Filter | Filter[]): Descriptor;
