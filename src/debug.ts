import { Tensil } from '.';
import { filter, action } from './decorators';
import { IFilters, IRoutes, IPolicies, IActions, HttpMethod } from './types';

const tensil = new Tensil();

class HelperService extends Tensil.Service {

  @filter
  log(req, res, next) {
    //
  }

}

const helpers = new HelperService();

class OtherController extends Tensil.Controller {

  policies: IPolicies = {
    common: ['UserService.filters.isAuth']
  };

}

tensil.registerController(OtherController, 'other');

class UserService extends Tensil.Service {

  filters: IFilters = {
    isAuth: ['HelperService.log', this.isAuth],
    login: [helpers.log, 'filters.isAuth', 'login']
  };

  routes: IRoutes = {
    'post /user/:id': ['UserController.find'],
    'view /some/path': [helpers.log, 'user/view'],
    'redirect /from/path/:id': [helpers.log, '/new/path']
  };

  @filter
  isAuth(req, res, next) {
    //
  }

  @filter
  login(req, res, next) {
    //
  }

}

const user = new UserService();

class UserController extends Tensil.Controller {

  policies: IPolicies = {
    // '*': true,
    find: ['OtherController.policies.common']
  };

  actions: IActions = {
    find: HttpMethod.Get
  };

  find(req, res) {
    //
  }

  @action(HttpMethod.Del)
  create(req, res) {
    //
  }

}

const ctrl = new UserController('user', '/id');

// const usrCtrl = tensil.entity<UserController>('UserController');

// const usrCtrl = new UserController('user');

// usrCtrl.policy(true);

tensil.init();

console.log(tensil.routeMap);
