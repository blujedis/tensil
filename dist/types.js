"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ENUMS //
var EntityType;
(function (EntityType) {
    EntityType["Controller"] = "Controller";
    EntityType["Service"] = "Service";
})(EntityType = exports.EntityType || (exports.EntityType = {}));
var ContextType;
(function (ContextType) {
    ContextType["policies"] = "policies";
    ContextType["filters"] = "filters";
    ContextType["routes"] = "routes";
    ContextType["actions"] = "actions";
})(ContextType = exports.ContextType || (exports.ContextType = {}));
var HttpMethod;
(function (HttpMethod) {
    HttpMethod["Get"] = "get";
    HttpMethod["Put"] = "put";
    HttpMethod["Post"] = "post";
    HttpMethod["Del"] = "delete";
    HttpMethod["Patch"] = "patch";
    HttpMethod["Param"] = "param";
})(HttpMethod = exports.HttpMethod || (exports.HttpMethod = {}));
var DecoratorType;
(function (DecoratorType) {
    DecoratorType["Action"] = "action";
    DecoratorType["Route"] = "route";
    DecoratorType["Filter"] = "filter";
})(DecoratorType = exports.DecoratorType || (exports.DecoratorType = {}));
var RouteType;
(function (RouteType) {
    RouteType["Crud"] = "crud";
    RouteType["Rest"] = "rest";
})(RouteType = exports.RouteType || (exports.RouteType = {}));
// HTTP ERROR EXTENDED //
class HttpError extends Error {
    constructor(message, status, title, theme) {
        super(message);
        if (typeof title === 'object') {
            theme = title;
            title = undefined;
        }
        this.title = title;
        this.status = status;
        const defaultTheme = {
            primary: '#1E152A',
            accent: '#444c99'
        };
        this.theme = { ...defaultTheme, ...theme };
    }
}
exports.HttpError = HttpError;
//# sourceMappingURL=types.js.map