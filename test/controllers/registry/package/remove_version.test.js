'use strict';

var should = require('should');
var request = require('supertest');
var mm = require('mm');
var app = require('../../../../servers/registry');
var utils = require('../../../utils');
var packageService = require('../../../../services/package');
var nfs = require('../../../../common/nfs');
var config = require('../../../../config');

describe('test/controllers/registry/package/remove_version.test.js', function () {
  afterEach(mm.restore);

  var lastRev;
  before(function (done) {
    var pkg = utils.getPackage('@cnpmtest/testmodule-remove_version-1', '0.0.1', utils.otherUser);
    request(app)
    .put('/' + pkg.name)
    .set('authorization', utils.otherUserAuth)
    .send(pkg)
    .expect(201, function (err, res) {
      should.not.exist(err);
      lastRev = res.body.rev;
      done();
    });
  });

  it('should 404 when version format error', function (done) {
    request(app)
    .del('/@cnpmtest/testmodule-remove_version-1/download/@cnpmtest/testmodule_remove_version123.tgz/-rev/112312312321')
    .set('authorization', utils.adminAuth)
    .expect({
      error: '[not_found] document not found',
      reason: '[not_found] document not found',
    })
    .expect(404, done);
  });

  it('should 404 when rev format error', function (done) {
    request(app)
    .del('/@cnpmtest/testmodule-remove_version-1/download/@cnpmtest/testmodule-remove_version-1-1.0.1.tgz/-rev/abc')
    .set('authorization', utils.adminAuth)
    .expect({
      error: '[not_found] document not found',
      reason: '[not_found] document not found',
    })
    .expect(404, done);
  });

  it('should 404 when version not exists', function (done) {
    request(app)
    .del('/@cnpmtest/testmodule-remove_version-1/download/@cnpmtest/testmodule-remove_version-1-1.0.1.tgz/-rev/112312312321')
    .set('authorization', utils.adminAuth)
    .expect({
      error: '[not_found] document not found',
      reason: '[not_found] document not found',
    })
    .expect(404, done);
  });

  it('should 401 when no auth', function (done) {
    request(app)
    .del('/@cnpmtest/testmodule-remove_version-1/download/@cnpmtest/testmodule-remove_version-1-0.0.1.tgz/-rev/' + lastRev)
    .expect(401, done);
  });

  it('should 403 when not admin', function (done) {
    request(app)
    .del('/@cnpmtest/testmodule-remove_version-1/download/@cnpmtest/testmodule-remove_version-1-0.0.1.tgz/-rev/' + lastRev)
    .set('authorization', utils.otherUserAuth)
    .expect(403, done);
  });

  it('should 200 when delete success', function (done) {
    request(app)
    .del('/@cnpmtest/testmodule-remove_version-1/download/@cnpmtest/testmodule-remove_version-1-0.0.1.tgz/-rev/' + lastRev)
    .set('authorization', utils.adminAuth)
    .expect(200, done);
  });

  it('should not remove nfs', function (done) {
    let called = false;
    mm(config, 'unpublishRemoveTarball', false);
    mm(nfs, 'remove', function* () {
      called = true;
    });

    var pkg = utils.getPackage('@cnpmtest/testmodule-remove_version-2', '3.0.0', utils.otherUser);
    request(app)
      .put('/' + pkg.name)
      .set('authorization', utils.otherUserAuth)
      .send(pkg)
      .expect(201, function() {
        request(app)
          .del('/@cnpmtest/testmodule-remove_version-2/download/@cnpmtest/testmodule-remove_version-2-3.0.0.tgz/-rev/1')
          .set('authorization', utils.adminAuth)
          .expect(200, function (err) {
            called.should.equal(false);
            should.not.exist(err);
            request(app)
              .get('/@cnpmtest/testmodule-remove-2')
              .expect(404, done);
          });
      });
  });

  describe('mock error', function () {
    before(function (done) {
      var pkg = utils.getPackage('@cnpmtest/testmodule-remove_version-1', '0.0.2', utils.otherUser);
      request(app)
      .put('/' + pkg.name)
      .set('authorization', utils.otherUserAuth)
      .send(pkg)
      .expect(201, done);
    });

    it('should auto add cdn key', function (done) {
      var getModule = packageService.getModule;
      mm(packageService, 'getModule', function* (name, version) {
        var mod = yield getModule.call(packageService, name, version);
        delete mod.package.dist.key;
        return mod;
      });

      request(app)
      .del('/@cnpmtest/testmodule-remove_version-1/download/@cnpmtest/testmodule-remove_version-1-0.0.2.tgz/-rev/' + lastRev)
      .set('authorization', utils.adminAuth)
      .expect(200, done);
    });
  });
});
