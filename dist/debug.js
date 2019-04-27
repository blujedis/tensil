"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
const decorators_1 = require("./decorators");
const types_1 = require("./types");
const tensil = new _1.default();
class HelperService extends _1.default.Service {
    log(req, res, next) {
        //
    }
}
__decorate([
    decorators_1.filter
], HelperService.prototype, "log", null);
const helpers = new HelperService();
class OtherController extends _1.default.Controller {
    constructor() {
        super(...arguments);
        this.policies = {
            common: ['UserService.filters.isAuth']
        };
    }
}
tensil.registerController(OtherController, 'other');
class UserService extends _1.default.Service {
    constructor() {
        super(...arguments);
        this.filters = {
            isAuth: ['HelperService.log', this.isAuth],
            login: [helpers.log, 'filters.isAuth', 'login']
        };
        this.routes = {
            'post /user/:id': ['UserController.find'],
            'view /some/path': [helpers.log, 'user/view'],
            'redirect /from/path/:id': [helpers.log, '/new/path']
        };
    }
    isAuth(req, res, next) {
        //
    }
    login(req, res, next) {
        //
    }
}
__decorate([
    decorators_1.filter
], UserService.prototype, "isAuth", null);
__decorate([
    decorators_1.filter
], UserService.prototype, "login", null);
const user = new UserService();
class UserController extends _1.default.Controller {
    constructor() {
        super(...arguments);
        this.policies = {
            // '*': true,
            find: ['OtherController.policies.common']
        };
        this.actions = {
            find: types_1.HttpMethod.Get
        };
    }
    find(req, res) {
        //
    }
    create(req, res) {
        //
    }
}
__decorate([
    decorators_1.action()
], UserController.prototype, "create", null);
tensil.registerController(UserController, 'user', '/id');
// const usrCtrl = tensil.entity<UserController>('UserController');
// const usrCtrl = new UserController('user');
// usrCtrl.policy(true);
tensil.init();
//# sourceMappingURL=debug.js.map