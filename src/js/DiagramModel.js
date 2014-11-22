var DiagramModel;

(function(){

(DiagramModel = function(conf){

  if (!conf) {
    conf = {};
  }

  this.pedisCache = conf.pedisCache;
  this.clear();
  if (conf.listeners) {
    this.listen(conf.listeners);
  }

  arguments.callee._super.apply(this, [conf]);
}).prototype = {
  getRelationalOperator: function(){
    return this.relationalOperator || "=";
  },
  clear: function(){
    if (this.fireEvent("clearModel", null) === false) {
      return false;
    }
    this.initModel();
    this.fireEvent("modelCleared", null);
    return true;
  },
  getTableCount: function(){
    return this.tables.length;
  },
  getTable: function(index) {
    return this.tables[index];
  },
  removeTable: function(index){
    return this.tables.splice(index, 1);
  },
  getTableIndex: function(rec){
    var index = -1;
    this.eachTable(function(table, i){
      var metadata = table.metadata;
      if (
          (iDef(table.alias) && iDef(rec.alias) && (table.alias === rec.alias)) ||
          (rec.TABLE_NAME === metadata.TABLE_NAME &&
           rec.TABLE_SCHEM === metadata.TABLE_SCHEM)
      ){
        index = i;
        return false;
      }
    }, this);
    return  index;
  },
  eachTableRelationship: function(callback, scope, filter){
    var relationships = this.relationships, n = relationships.length, relationships;
    var key, value;
    outer: for (i = 0; i < n; i++) {
      relationship = relationships[i];
      if (filter) {
        for (key in filter) {
          if (filter[key] !== relationship[key]) {
            continue outer;
          }
        }
      }
      if (callback.call(scope || null, relationship, i) === false) {
        return false;
      }
    }
    return true;
  },
  getTableRelationship: function(index) {
    var relationships = this.relationships;
    return relationships[index];
  },
  indexOfTableRelationship: function(relationship) {
    var index = -1;
    this.eachTableRelationship(function(relationship, i){
      index = i;
      return false;
    }, this, relationship);
    return index;
  },
  addTableRelationship: function(relationship){
    var index = this.indexOfTableRelationship(relationship);
    if (index !== -1) {
      throw "Duplicate relationship!";
    }
    var reverseRelationship = {
      leftTable: relationship.rightIndex,
      leftColumn: relationship.rightColumn,
      rightTable: relationship.leftIndex,
      rightColumn: relationship.leftColumn
    };
    if (index !== -1) {
      throw "Duplicate relationship (reverse)!";
    }
    var relationships = this.relationships;
    var eventData = {
      relationship: relationship,
      index: relationships.length
    };
    this.fireEvent("addingTableRelationship", eventData);
    relationships.push(relationship);
    this.fireEvent("tableRelationshipAdded", eventData);
  },
  addTable: function(conf, callback, scope){
    var me = this;
    function action(){
      var tables = me.tables;
      tables.push(conf);
      var eventData = {
        table: conf,
        index: tables.length - 1
      };
      me.fireEvent("tableAdded", eventData);
      if (callback) {
        callback.call(scope || null, eventData);
      }
    }
    var metadata = conf.metadata;
    if (metadata.info) {
      action();
    }
    else {
      var connectionId = this.pedisCache.getConnection();
      this.pedisCache.getTableInfo(connectionId, metadata, function(tableInfo){
        action();
      });
    }
  },
  eachTable: function(callback, scope){
    var i, tables = this.tables, table, n = tables.length;
    for (i = 0; i < n; i++) {
      table = tables[i];
      if (callback.call(scope || this, table, i) === false) {
        return false;
      }
    }
    return true;
  },
  eachColumnOfTable: function(index, callback, scope){
    var table = this.getTable(index);
    var metadata = table.metadata;
    var info = metadata.info;
    var columns = info.columns;
    var i, n = columns.length, column;
    for (i = 0; i < n; i++) {
      column = columns[i];
      if (callback.call(scope || this, column, i) === false) {
        return false;
      }
    }
    return true;
  },
  eachTableColumn: function(callback, scope){
    return this.eachTable(function(table, tableIndex){
      if (this.eachColumnOfTable(tableIndex, function(column, columnIndex){
        return callback.call(scope || this, table, tableIndex, column, columnIndex);
      }) === false) {
        return false;
      }
    });
  },
  getTableAlias: function(index) {
    var table = this.getTable(index);
    if (table.alias) return table.alias;
    return "table" + (index + 1);
  },
  quoteIdentifier: function(identifier) {
    var connection = this.pedisCache.getConnection(this.pedisCache.getConnection());
    var quote = connection.identifierQuoteString;
    //todo: escape quote characters appearing in the name
    return quote + identifier + quote;
  },
  quoteIdentifierIfRequired: function(identifier) {
    if (!/^\w+$/.test(identifier)) {
      identifier = this.quoteIdentifier(identifier);
    }
    return identifier;
  },
  getFullyQualifiedTableName: function(index, quotes) {
    var quoter = quotes ? this.quoteIdentifier : this.quoteIdentifierIfRequired;
    var connection = this.pedisCache.getConnection(this.pedisCache.getConnection());
    var table = this.getTable(index);
    var metadata = table.metadata;
    var key = quoter.call(this, (metadata.TABLE_NAME || metadata.table_name));
    if (connection.schemaTerm && connection.schemaTerm.length && metadata.TABLE_SCHEM) {
      key = quoter.call(this, metadata.TABLE_SCHEM) + "." + key;
    }
    if (connection.catalogTerm && connection.catalogTerm.length && metadata.TABLE_CAT) {
      key = quoter.call(this, metadata.TABLE_CAT) + "." + key;
    }
    return key;
  }
};

adopt(DiagramModel, Observable);

})();