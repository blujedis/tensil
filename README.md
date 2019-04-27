# Tensil

Express server Service, Controller and Routing framework.

## Introduction

Tensil flexible and lightweight. It intentionally leaves out opinion and focuses on painless secure routing. The idea behind Tensil is flexibilty with just enough magic. Services and Controllers can be mounted to the root router or their own router for app segregation. 

## Install

```sh
$ npm install tensil -s
```

## Usage

```ts
import Tensil from 'tensil';
import * as bodyParser from 'body-parser';

const tensil = new Tensil();

class MyController extends Tensil.Controller {
  // See below for configuring Controllers & Services
  // Excluded here for clarity sake of how to wire up Tensil.
}

tensil.app.use(bodyParser.json());
tensil.app.use(bodyParser.urlencoded({ extended: true }));
tensil.app.use(bodyParser.text());
tensil.app.use(bodyParser.json({ type: 'application/json' }));

tensil
  .registerController(MyController)
  .start();

```

## With App

Using Tensil with external express() app.

```ts
import Tensil from 'tensil';
import * as express from 'express';

const app = express();
const tensil = new Tensil(app);
```

## With Http Server

Using Tensil with http.createServer

```ts
import Tensil from 'tensil';
import * as express from 'express';
import { createServer } from 'http';

const app = express();
const tensil = new Tensil(app);
tensil.bindServer(createServer(app)); // or .bindServer(createServer(tensil.app));
```

## Server

Configuring a Tensil Service.

```ts
import Tensil, { filter } from 'tensil';
import { format } from 'util';
class MyService extends Tensil.Service {

  filters: {
    canCreate: ['log', 'isAuthorized']
  }

  private formatMessage(message, ...args) {
    return format(message, args);
  }

  @filter
  log(req, res, next) {
    // Log a message when this filter is hit.
    console.log(this.formatMessage('Request id', 123456));
    next();
  }

  @filter
  isAuthorized(req, res, next) {
    if ('authorized')
      return next();
    res.status(403).send();
  }

}

const myService = new MyService();
// OR
tensil.registerSerivce(MyService);
```

## Controller

Configuring a Tensil Controller.

```ts
import Tensil, { action, HttpMethod } from 'tensil';
class MyController extends Tensil.Controller {

  // When a custom route or generated route
  // calls "MyController.create" as it's action method
  // the MyService filter "canCreate" is injected.

  // The result would be as if you did the following manually:
  // app.post('/user/:id?, ['Myservice.log', 'Myservice.isAuthorized', 'MyController.create'])

  policies: {
    create: ['MyService.filters.canCreate'] // 
  }
  
  // or use HttpMethod.Get 
  // or template defined in options like "find"
  // or define with path @action('get', '/some/path/:id?')
  @action('get') 
  find(req, res) {
    // find a record.
    res.json({});
  }

  @action('post') 
  create(req, res) {
    // create a record
    res.status(201).json({})
  }

}

const myController = new MyController('user');
// OR
tensil.registerController(MyController, 'user');
```

## Default Action Templates

Templates allow you to map your action decorators to a key to make the defining of generated routes for controller actions less verbose. You can always override and defined a specific path. 

Simply define a template below then use as:

```ts
@action('my-template-name')
create(req, res) {
  //
}
```

```ts
const options = {
  templates: {
   get: 'get /{{action}}',
   put: 'put /{{action}}/:id?',
   post: 'post /{{action}}',
   del: 'delete /{{action}}/:id?',
   find: 'get /{{action}}/:id?',
   create: 'post /{{action}}',
   update: 'put /{{action}}/:id?',
   delete: 'delete /{{action}}/:id?',
  }
  formattter: (key, path, type) => {
    // override default formatter function
    // to handle formatting of above templates
    // by default rest routes remove {{action}}
  }
  rest: true,
  crud: false
}
```

## Docs

See [https://blujedis.github.io/tensil/](https://blujedis.github.io/tensil/)

## Change

See [CHANGE.md](CHANGE.md)

## License

See [LICENSE.md](LICENSE)

