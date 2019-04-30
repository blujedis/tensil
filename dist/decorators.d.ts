import { HttpMethod, Filter } from './types';
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
export declare type Descriptor = (target: any, key: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
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
 * Creates action route using specified template.
 *
 * @example
 * .action('my-template-name');
 * find(req, res, next) {
 *    // handle request.
 * }
 *
 * @param template the template name from options.templates
 */
export declare function action(template: string | HttpMethod): Descriptor;
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
 * @param path a custom path to use for the route.
 */
export declare function action(methods: HttpMethod | HttpMethod[], path: string): Descriptor;
/**
 * Creates a route for each specified Http method.
 *
 * @example
 * .action(HttpMethod.Get, '/some/path');
 * .action([HttpMethod.Get, HttpMethod.Post], '/some/path');
 *
 * @param methods the Http Methods to apply to each route.
 * @param path a custom path to use for the route.
 */
export declare function route(methods: HttpMethod | HttpMethod[], path: string, filters?: Filter | Filter[]): (target: any, key: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
