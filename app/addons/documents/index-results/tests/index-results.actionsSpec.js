// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy of
// the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations under
// the License.

define([
  'api',
  'addons/documents/index-results/actions',
  'addons/documents/index-results/stores',
  'addons/documents/resources',
  'addons/documents/sidebar/actions',
  'testUtils'
], function (FauxtonAPI, Actions, Stores, Documents, SidebarActions, testUtils) {
  var assert = testUtils.assert;
  var restore = testUtils.restore;
  var store = Stores.indexResultsStore;

  FauxtonAPI.router = new FauxtonAPI.Router([]);

  describe('Index Results Actions', function () {

    describe('#newResultsList', function () {

      it('sends results list reset', function () {
        var collection = {
          fetch: function () {
            var promise = $.Deferred();
            promise.resolve();
            return promise;
          }
        };

        var spy = sinon.spy(Actions, 'resultsListReset');

        Actions.newResultsList({collection: collection});
        assert.ok(spy.calledOnce);
      });

    });

  });


  describe('#deleteSelected', function () {
    var confirmStub;

    beforeEach(function () {
      store._collection = new Documents.AllDocs([{_id: 'testId1'}, {_id: 'testId2'}], {
        params: {},
        database: {
          safeID: function () { return '1';}
        }
      });
      store._bulkDeleteDocCollection = Documents.BulkDeleteDocCollection;

      store._selectedItems = {
        'testId1': true,
        'testId2': true
      };

      confirmStub = sinon.stub(window, 'confirm');
      confirmStub.returns(true);

    });

    afterEach(function () {
      restore(window.confirm);
      restore(store.createBulkDeleteFromSelected);
      restore(FauxtonAPI.addNotification);
      restore(Actions.reloadResultsList);
      restore(Actions.selectListOfDocs);
      restore(SidebarActions.refresh);
    });

    it('doesn\'t delete if user denies confirmation', function () {
      window.confirm.restore();

      var stub = sinon.stub(window, 'confirm');
      stub.returns(false);

      var spy = sinon.spy(store, 'createBulkDeleteFromSelected');

      Actions.deleteSelected();

      assert.notOk(spy.calledOnce);
    });

    it('creates bulk delete', function () {
      var spy = sinon.spy(store, 'createBulkDeleteFromSelected');

      Actions.deleteSelected();

      assert.ok(spy.calledOnce);
    });

    it('on success notifies all deleted', function () {
      var spy = sinon.spy(FauxtonAPI, 'addNotification');
      var sidebarSpy = sinon.spy(SidebarActions, 'refresh');
      var promise = FauxtonAPI.Deferred();
      var ids = {
          errorIds: []
      };
      var bulkDelete = {
        bulkDelete: function () {
          promise.resolve(ids);
          return promise;
        }
      };
      var stub = sinon.stub(store, 'createBulkDeleteFromSelected');
      stub.returns(bulkDelete);
      var reloadResultsListStub = sinon.stub(Actions, 'reloadResultsList');
      var stubPromise = FauxtonAPI.Deferred();
      stubPromise.resolve();
      reloadResultsListStub.returns(stubPromise);

      Actions.deleteSelected();

      assert.ok(spy.calledOnce);
      assert.ok(sidebarSpy.calledOnce);
    });

    it('on success with some failed ids, re-selects failed', function () {
      var spy = sinon.spy(Actions, 'selectListOfDocs');
      var sidebarSpy = sinon.spy(SidebarActions, 'refresh');

      var reloadResultsListStub = sinon.stub(Actions, 'reloadResultsList');
      var stubPromise = FauxtonAPI.Deferred();
      stubPromise.resolve();
      reloadResultsListStub.returns(stubPromise);

      var promise = FauxtonAPI.Deferred();
      var ids = {
          errorIds: ['1']
      };
      var bulkDelete = {
        bulkDelete: function () {
          promise.resolve(ids);
          return promise;
        }
      };

      var stub = sinon.stub(store, 'createBulkDeleteFromSelected');
      stub.returns(bulkDelete);

      Actions.deleteSelected();
      assert.ok(spy.calledWith(ids.errorIds));
      assert.ok(sidebarSpy.calledOnce);
    });

    it('on failure notifies failed', function () {
      var spy = sinon.spy(FauxtonAPI, 'addNotification');
      var promise = FauxtonAPI.Deferred();
      var bulkDelete = {
        bulkDelete: function () {
          promise.reject();
          return promise;
        }
      };
      var stub = sinon.stub(store, 'createBulkDeleteFromSelected');
      stub.returns(bulkDelete);
      var reloadResultsListStub = sinon.stub(Actions, 'reloadResultsList');
      var stubPromise = FauxtonAPI.Deferred();
      stubPromise.resolve();
      reloadResultsListStub.returns(stubPromise);

      Actions.deleteSelected();

      assert.ok(spy.calledOnce);
    });

    it('on failure re-selects docs', function () {
      var spy = sinon.spy(Actions, 'selectListOfDocs');

      var reloadResultsListStub = sinon.stub(Actions, 'reloadResultsList');
      var stubPromise = FauxtonAPI.Deferred();
      stubPromise.resolve();
      reloadResultsListStub.returns(stubPromise);

      var promise = FauxtonAPI.Deferred();
      var errorIds = ['1'];

      var bulkDelete = {
        bulkDelete: function () {
          promise.reject(errorIds);
          return promise;
        }
      };

      var stub = sinon.stub(store, 'createBulkDeleteFromSelected');
      stub.returns(bulkDelete);

      Actions.deleteSelected();
      assert.ok(spy.calledWith(errorIds));
    });

  });

});
