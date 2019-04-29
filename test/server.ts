
import Tensil, { filter, action, IPolicies } from '../src';
import * as bodyParser from 'body-parser';
import { Request, Response } from 'express';

// Sample Data //

const users = {
  '1': {
    firstName: 'Milton',
    lastName: 'Waddams',
    username: 'milton@officespace.com',
    password: 'swingline',
    location: 'basement'
  },
  '2': {
    firstName: 'Peter',
    lastName: 'Gibbons',
    username: 'peter@officespace.com',
    password: 'tpsreport',
    location: 'home'
  }
};

// Init Tensil Class //

const tensil = new Tensil();

class UserController extends Tensil.Controller {

  policies: IPolicies = {
    find: 'log'
  };

  @filter
  // @ts-ignore
  log(req, res, next) {
    console.log(`[TENSIL]: REQ id ${Date.now()}`);
    next();
  }

  @action()
  // @ts-ignore
  find(req: Request, res: Response) {
    if (req.params.id)
      return res.json(users[req.params.id]);
    res.json(Object.keys(users).map(k => users[k]));
  }

}

tensil.app.use(bodyParser.json());
tensil.app.use(bodyParser.urlencoded({ extended: true }));
tensil.app.use(bodyParser.text());
tensil.app.use(bodyParser.json({ type: 'application/json' }));

tensil
  .registerController(UserController, 'user', '/id')
  .start();

export default tensil;