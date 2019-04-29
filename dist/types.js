"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
})(HttpMethod = exports.HttpMethod || (exports.HttpMethod = {}));
class HttpError extends Error {
    constructor(message, status, statusText, theme) {
        super(message);
        this.status = status;
        if (typeof statusText === 'object') {
            theme = statusText;
            statusText = undefined;
        }
        this.title = message;
        this.statusText = statusText || message;
        const defaultTheme = {
            primary: '#1E152A',
            accent: '#444c99'
        };
        this.theme = { ...defaultTheme, ...theme };
    }
}
exports.HttpError = HttpError;
//# sourceMappingURL=types.js.map