import Tensil from '.';
import { filter } from './decorators';
import { IFilters, IRoutes, IPolicies } from './types';

const tensil = new Tensil();

class HelperService extends Tensil.Service {

  @filter
  log(req, res, next) {
    //
  }

}

const helpers = new HelperService();

class UserService extends Tensil.Service {

  filters: IFilters = {
    isAuth: ['HelperService.log', this.isAuth],
    login: [helpers.log, 'filters.isAuth', 'login']
  };

  routes: IRoutes = {

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

class OtherController extends Tensil.Controller {

  policies: IPolicies = {
    common: ['UserService.filters.isAuth']
  };

}

tensil.registerController(OtherController, 'other');

class UserController extends Tensil.Controller {

  policies: IPolicies = {
    '*': true,
    find: ['OtherController.policies.common']
  };

  find(req, res) {
    //
  }

  create(req, res) {
    //
  }

}

tensil.registerController(UserController, 'user');

// const usrCtrl = tensil.entity<UserController>('UserController');

// const usrCtrl = new UserController('user');

// usrCtrl.policy(true);

tensil.init();
