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
  'app',
  'api',
  'react',
  'addons/components/react-components.react',
  'addons/fauxton/components.react',
  'addons/databases/stores',
  'addons/databases/resources',
  'addons/databases/actions',
  'helpers'
], function (app, FauxtonAPI, React, Components, ComponentsReact, Stores, Resources, Actions, Helpers) {

  var ToggleHeaderButton = Components.ToggleHeaderButton;
  var databasesStore = Stores.databasesStore;

  var DatabasesController = React.createClass({

    getStoreState: function () {
      return {
        collection: databasesStore.getCollection(),
        loading: databasesStore.isLoading()
      };
    },

    getInitialState: function () {
      return this.getStoreState();
    },

    componentDidMount: function () {
      databasesStore.on('change', this.onChange, this);
    },

    componentWillUnmount: function () {
      databasesStore.off('change', this.onChange, this);
    },

    onChange: function () {
      this.setState(this.getStoreState());
    },

    render: function () {
      var collection = this.state.collection;
      var loading = this.state.loading;
      return (
        <DatabaseTable body={collection} loading={loading} />
      );
    }
  });

  var DatabaseTable = React.createClass({

    createRows: function () {
      return _.map(this.props.body, function (item, iteration) {
        return (
          <DatabaseRow row={item} key={iteration} />
        );
      });
    },

    getExtensionColumns: function () {
      var cols = FauxtonAPI.getExtensions('DatabaseTable:head');
      return _.map(cols, function (Item, index) {
        return <Item key={index} />;
      });
    },

    render: function () {
      if (this.props.loading) {
        return (
          <div className="view">
            <Components.LoadLines />
          </div>
        );
      }
      var rows = this.createRows();
      return (
        <div className="view">
          <table className="databases table table-striped">
            <thead>
              <th>Name</th>
              <th>Size</th>
              <th># of Docs</th>
              <th>Update Seq</th>
              {this.getExtensionColumns()}
              <th>Actions</th>
            </thead>
            <tbody>
            {rows}
            </tbody>
          </table>
        </div>
      );
    }
  });

  var DatabaseRow = React.createClass({

    propTypes: {
      row: React.PropTypes.object
    },

    renderGraveyard: function (row) {
      if (row.status.isGraveYard()) {
        return (
          <GraveyardInfo row={row} />
        );
      } else {
        return null;
      }
    },

    getExtensionColumns: function (row) {
      var cols = FauxtonAPI.getExtensions('DatabaseTable:databaseRow');
      return _.map(cols, function (Item, index) {
        return <Item row={row} key={index} />;
      });
    },

    render: function () {
      var row = this.props.row;
      var name = row.get("name");

      // if the row status failed to load, inform the user
      if (!row.status.loadSuccess) {
        return (
          <tr>
            <td>{name}</td>
            <td colSpan="4" className="database-load-fail">This database failed to load.</td>
          </tr>
        );
      }
      var encoded = app.utils.safeURLName(name);
      var size = Helpers.formatSize(row.status.dataSize());

      return (
        <tr>
          <td>
            <a href={"#/database/" + encoded + "/_all_docs"}>{name}</a>
          </td>
          <td>{size}</td>
          <td>{row.status.numDocs()} {this.renderGraveyard(row)}</td>
          <td>{row.status.updateSeq()}</td>
          {this.getExtensionColumns(row)}
          <td>
            <a
              className="db-actions btn fonticon-replicate set-replication-start"
              title={"Replicate " + name}
              href={"#/replication/" + encoded}></a>&#160;
            <a
              className="db-actions btn icon-lock set-permissions"
              title={"Set permissions for " + name} href={"#/database/" + encoded + "/permissions"}></a>
          </td>
        </tr>
      );
    }
  });

  var GraveyardInfo = React.createClass({

    componentDidMount: function () {
      $(React.findDOMNode(this.refs.myself)).tooltip();
    },

    render: function () {
      var row = this.props.row;
      var graveyardTitle = "This database has just " + row.status.numDocs() +
        " docs and " + row.status.numDeletedDocs() + " deleted docs";
      return (
        <i className="js-db-graveyard icon icon-exclamation-sign" ref="myself" title={graveyardTitle}></i>
      );
    }
  });

  var RightDatabasesHeader = React.createClass({

    render: function () {
      return (
        <div className="header-right right-db-header flex-layout flex-row">
          <JumpToDatabaseWidget />
          <AddDatabaseWidget />
        </div>
      );
    }
  });

  var AddDatabaseWidget = React.createClass({

    onTrayToggle: function (e) {
      e.preventDefault();

      this.setState({isPromptVisible: !this.state.isPromptVisible});

      this.refs.newDbTray.toggle(function (shown) {
        if (shown) {
          React.findDOMNode(this.refs.newDbName).focus();
        }
      }.bind(this));
    },

    onKeyUpInInput: function (e) {
      if (e.which === 13) {
        this.onAddDatabase();
      }
    },

    getInitialState: function () {
      return {
        isPromptVisible: false
      };
    },

    onAddDatabase: function () {
      var databaseName = React.findDOMNode(this.refs.newDbName).value;
      Actions.createNewDatabase(databaseName);
    },

    render: function () {
      var headerButtonContainerClasses = 'header-control-box add-new-database-btn';

      return (
        <div>
          <ToggleHeaderButton
            selected={this.state.isPromptVisible}
            toggleCallback={this.onTrayToggle}
            containerClasses={headerButtonContainerClasses}
            title="Create Database"
            fonticon="fonticon-new-database"
            text="Create Database" />
          <ComponentsReact.Tray ref="newDbTray" className="new-database-tray">
            <span className="add-on">Create Database</span>
            <input id="js-new-database-name" type="text" onKeyUp={this.onKeyUpInInput} ref="newDbName" className="input-xxlarge" placeholder="Name of database" />
            <a className="btn" id="js-create-database" onClick={this.onAddDatabase}>Create</a>
          </ComponentsReact.Tray>
        </div>
      );
    }
  });

  var JumpToDatabaseWidget = React.createClass({

    getStoreState: function () {
      return {
        databaseNames: databasesStore.getDatabaseNames()
      };
    },

    getInitialState: function () {
      return this.getStoreState();
    },

    componentDidMount: function () {
      databasesStore.on('change', this.onChange, this);
    },

    componentDidUpdate: function () {
      $(React.findDOMNode(this.refs.searchDbName)).typeahead({
        source: this.state.databaseNames,
        updater: function (item) {
          this.jumpToDb(item);
        }.bind(this)
      });
    },

    componentWillUnmount: function () {
      databasesStore.off('change', this.onChange, this);
    },

    onChange: function () {
      this.setState(this.getStoreState());
    },

    jumpToDb: function (databaseName) {
      databaseName = databaseName || React.findDOMNode(this.refs.searchDbName).value;
      Actions.jumpToDatabase(databaseName);
    },

    jumpToDbHandler: function (e) {
      e.preventDefault();
      this.jumpToDb();
    },

    render: function () {
      return (
        <div className="searchbox-wrapper">
          <div id="header-search" className="js-search searchbox-container">
            <form onSubmit={this.jumpToDbHandler} id="jump-to-db" className="navbar-form pull-right database-search">
              <div className="input-append">
                <input type="text" className="search-autocomplete" ref="searchDbName" name="search-query" placeholder="Database name" autoComplete="off" />
                <span><button className="btn btn-primary" type="submit"><i className="icon icon-search"></i></button></span>
              </div>
            </form>
          </div>
        </div>
      );
    }
  });

  var DatabasePagination = React.createClass({

    getDefaultProps: function () {
      return {
        linkPath: '_all_dbs'
      };
    },

    getStoreState: function () {
      return {
        databaseNames: databasesStore.getDatabaseNames(),
        page: databasesStore.getPage()
      };
    },

    getInitialState: function () {
      return this.getStoreState();
    },

    componentDidMount: function () {
      databasesStore.on('change', this.onChange, this);
    },

    componentWillUnmount: function () {
      databasesStore.off('change', this.onChange, this);
    },

    onChange: function () {
      this.setState(this.getStoreState());
    },

    render: function () {
      var page = this.state.page;
      var total = this.props.total || this.state.databaseNames.length;
      var urlPrefix = '#/' + this.props.linkPath + '?page=';

      return (
        <footer className="all-db-footer pagination-footer">
          <div id="database-pagination">
            <ComponentsReact.Pagination page={page} total={total} urlPrefix={urlPrefix} />
          </div>
        </footer>
      );
    }
  });

  return {
    DatabasesController: DatabasesController,
    DatabaseTable: DatabaseTable,
    DatabaseRow: DatabaseRow,
    RightDatabasesHeader: RightDatabasesHeader,
    GraveyardInfo: GraveyardInfo,
    AddDatabaseWidget: AddDatabaseWidget,
    JumpToDatabaseWidget: JumpToDatabaseWidget,
    DatabasePagination: DatabasePagination
  };
});
