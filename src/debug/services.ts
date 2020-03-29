import tensil, { IPolicies, filter, action, Service, route, HttpMethod } from '../';
import { Request, Response } from 'express';

export class UserService extends Service {

  @filter
  isAuthenticated(req, res, next) {
    req.isAuthenticated = true;
    next();
  }

  @route(HttpMethod.Get, '/', tensil.demandXhr())
  home(req, res, next) {
    res.send('test-home');
  }

}

new UserService();
