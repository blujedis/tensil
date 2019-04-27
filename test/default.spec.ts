import * as chai from 'chai';
import * as mocha from 'mocha';
import http = require('chai-http'); // required due to chai typings arrrrrggggh
import tensil from './server';

const assert = chai.assert;

chai.use(http);

describe('Tensil', () => {

  it('should verify route map keys', () => {
    assert.deepEqual(Object.keys(tensil.routeMap), ['/id']);
    assert.deepEqual(Object.keys(tensil.routeMap['/id']), ['get', 'UserController']);
  });

  it('should request user from find method', (done) => {

    chai.request(tensil.server)
      .get('/id/user')
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.equal(res.body.length, 2);
        done();
      });

  });


  it('should request user by id', (done) => {

    chai.request(tensil.server)
      .get('/id/user/1')
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, {
          firstName: 'Milton',
          lastName: 'Waddams',
          username: 'milton@officespace.com',
          password: 'swingline',
          location: 'basement'
        });
        done();
      });

  });

  after(() => {
    tensil.server.close();
  });

});
