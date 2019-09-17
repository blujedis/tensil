import tensil, { IPolicies, filter, action, Service, route, HttpMethod } from '../';
import { Request, Response } from 'express';
import users from './data';

export class UserService extends Service {

  @route(HttpMethod.Get, '/', tensil.demandXhr())
  home(req, res, next) {
    res.send('test-home');
  }

}

new UserService();
