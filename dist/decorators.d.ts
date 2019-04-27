import { HttpMethod } from './types';
export declare function filter(target: any, key: string, descriptor: PropertyDescriptor): PropertyDescriptor;
export declare type Descriptor = (target: any, key: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function action(): Descriptor;
export declare function action(methods: HttpMethod | HttpMethod[], path: string): Descriptor;
