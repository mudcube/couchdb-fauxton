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

/* global FormData */

define([
  'app',
  'api',
  'addons/documents/doc-editor/actiontypes'
],
function (app, FauxtonAPI, ActionTypes) {

  var xhr;

  function initDocEditor (params) {
    var doc = params.doc;

    // ensure a clean slate
    FauxtonAPI.dispatch({ type: ActionTypes.RESET_DOC });

    doc.fetch().then(function () {
      FauxtonAPI.dispatch({
        type: ActionTypes.DOC_LOADED,
        options: {
          doc: doc
        }
      });

      if (params.onLoaded) {
        params.onLoaded();
      }
    }, function (xhr, reason, msg) {
      errorNotification('The document does not exist.');
      FauxtonAPI.navigate(FauxtonAPI.urls('allDocs', 'app', params.database.id, ''));
    });
  }

  function saveDoc (doc, isValidDoc, onSave) {
    var databaseLink = doc.database.safeID();

    if (isValidDoc) {
      FauxtonAPI.addNotification({
        msg: 'Saving document.',
        clear: true
      });

      doc.save().then(function () {
        onSave(doc.prettyJSON());
        FauxtonAPI.navigate(FauxtonAPI.urls('document', 'app', databaseLink, doc.id));
      }).fail(function (xhr) {
        FauxtonAPI.addNotification({
          msg: 'Save failed: ' + JSON.parse(xhr.responseText).reason,
          type: 'error',
          fade: false,
          clear: true
        });
      });

    } else if (doc.validationError && doc.validationError === 'Cannot change a documents id.') {
      errorNotification('You cannot edit the _id of an existing document. Try this: Click \'Clone Document\', then change the _id on the clone before saving.');
      delete doc.validationError;
    } else {
      errorNotification('Please fix the JSON errors and try saving again.');
    }
  }

  function showDeleteDocModal () {
    FauxtonAPI.dispatch({ type: ActionTypes.SHOW_DELETE_DOC_CONFIRMATION_MODAL });
  }

  function hideDeleteDocModal () {
    FauxtonAPI.dispatch({ type: ActionTypes.HIDE_DELETE_DOC_CONFIRMATION_MODAL });
  }

  function deleteDoc (doc) {
    var databaseName = doc.database.id;
    doc.destroy().then(function () {
      FauxtonAPI.addNotification({
        msg: 'Your document has been successfully deleted.',
        clear: true
      });
      FauxtonAPI.navigate(FauxtonAPI.urls('allDocs', 'app', databaseName, ''));
    }, function () {
      FauxtonAPI.addNotification({
        msg: 'Failed to delete your document!',
        type: 'error',
        clear: true
      });
    });
  }

  function showCloneDocModal () {
    FauxtonAPI.dispatch({ type: ActionTypes.SHOW_CLONE_DOC_MODAL });
  }

  function hideCloneDocModal () {
    FauxtonAPI.dispatch({ type: ActionTypes.HIDE_CLONE_DOC_MODAL });
  }

  function cloneDoc (newId) {
    var isDDoc = newId.match(/^_design\//),
      removeDDocID = newId.replace(/^_design\//, ''),
      encodedID = isDDoc ? '_design/' + app.utils.safeURLName(removeDDocID) : app.utils.safeURLName(newId);

    this.hideCloneDocModal();
    FauxtonAPI.triggerRouteEvent('duplicateDoc', encodedID);
  }

  function showUploadModal () {
    FauxtonAPI.dispatch({ type: ActionTypes.SHOW_UPLOAD_MODAL });
  }

  function hideUploadModal () {
    FauxtonAPI.dispatch({ type: ActionTypes.HIDE_UPLOAD_MODAL });
  }

  function uploadAttachment (params) {
    if (params.files.length === 0) {
      FauxtonAPI.dispatch({
        type: ActionTypes.FILE_UPLOAD_ERROR,
        options: {
          error: 'Please select a file to be uploaded.'
        }
      });
      return;
    }

    FauxtonAPI.dispatch({ type: ActionTypes.START_FILE_UPLOAD });

    // store the xhr in parent scope to allow us to cancel any uploads if the user closes the modal
    xhr = $.ajaxSettings.xhr();

    var query = '?rev=' + params.rev;
    var db = params.doc.getDatabase().safeID();
    var docId = params.doc.safeID();
    var file = params.files[0];

    $.ajax({
      url: FauxtonAPI.urls('document', 'attachment', db, docId, file.name, query),
      type: 'PUT',
      data: file,
      contentType: file.type,
      processData: false,
      xhrFields: {
        withCredentials: true
      },
      xhr: function () {
        xhr.upload.onprogress = function (evt) {
          var percentComplete = evt.loaded / evt.total * 100;
          FauxtonAPI.dispatch({
            type: ActionTypes.SET_FILE_UPLOAD_PERCENTAGE,
            options: {
              percent: percentComplete
            }
          });
        };
        return xhr;
      },
      success: function () {

        // re-initialize the document editor. Only announce it's been updated when
        initDocEditor({
          doc: params.doc,
          onLoaded: function () {
            FauxtonAPI.dispatch({ type: ActionTypes.FILE_UPLOAD_SUCCESS });
            FauxtonAPI.addNotification({
              msg: 'Document saved successfully.',
              type: 'success',
              clear: true
            });
          }.bind(this)
        });

      },
      error: function (resp) {
        // cancelled uploads throw an ajax error but they don't contain a response. We don't want to publish an error
        // event in those cases
        if (_.isEmpty(resp.responseText)) {
          return;
        }
        FauxtonAPI.dispatch({
          type: ActionTypes.FILE_UPLOAD_ERROR,
          options: {
            error: JSON.parse(resp.responseText).reason
          }
        });
      }
    });
  }

  function cancelUpload () {
    xhr.abort();
  }

  function resetUploadModal () {
    FauxtonAPI.dispatch({ type: ActionTypes.RESET_UPLOAD_MODAL });
  }


  // helpers

  function errorNotification (msg) {
    FauxtonAPI.addNotification({
      msg: msg,
      type: 'error',
      clear: true
    });
  }

  return {
    initDocEditor: initDocEditor,
    saveDoc: saveDoc,

    // clone doc
    showCloneDocModal: showCloneDocModal,
    hideCloneDocModal: hideCloneDocModal,
    cloneDoc: cloneDoc,

    // delete doc
    showDeleteDocModal: showDeleteDocModal,
    hideDeleteDocModal: hideDeleteDocModal,
    deleteDoc: deleteDoc,

    // upload modal
    showUploadModal: showUploadModal,
    hideUploadModal: hideUploadModal,
    uploadAttachment: uploadAttachment,
    cancelUpload: cancelUpload,
    resetUploadModal: resetUploadModal
  };

});
