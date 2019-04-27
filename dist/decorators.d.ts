import { HttpMethod } from './types';
/**
 * Adds method as filter in Service or Controller filters collection.
 *
 * @example
 * class UserService {
 *  @filter
 *  isAuthorized(req, res, next) {
 *    // check if authorized.
 *  }
 * }
 *
 * @param target the target class instance.
 * @param key the method name the decorator is bound to.
 * @param descriptor the property descriptor for the bound method.
 */
export declare function filter(target: any, key: string, descriptor: PropertyDescriptor): PropertyDescriptor;
/**
 * Adds method as filter in Service or Controller filters collection.
 * Accepts an Http Method or Methods or a template name as the first argument.
 * A path argument can be passed to statically define the action's path.
 *
 * @example
 * class UserController {
 *  @action('create')
 *  create(req, res, next) {
 *    // check if authorized.
 *  }
 * }
 *
 * @param target the target class instance.
 * @param key the method name the decorator is bound to.
 * @param descriptor the property descriptor for the bound method.
 */
export declare type Descriptor = (target: any, key: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function action(): Descriptor;
export declare function action(template: string): Descriptor;
export declare function action(methods: HttpMethod | HttpMethod[], path: string): Descriptor;
