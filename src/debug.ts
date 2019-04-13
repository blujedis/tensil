import Tensil from '.';
import { IFilters, IRoutes } from './types';

// const tensil = new Tensil();

// class HelperService extends Tensil.Service {

//   log(req, res, next) {

//   }

// }

// const helper = new HelperService();

class AuthSerivce extends Tensil.Service {


  isAuth(req, res, next) {

  }

  login(req, res, next) {

  }

}

const auth = new AuthSerivce();


// tensil.init();

// console.log(auth.config);