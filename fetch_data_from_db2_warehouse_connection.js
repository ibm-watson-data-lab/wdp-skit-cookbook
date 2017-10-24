// Licensed under the Apache License, Version 2.0 (the 'License'); you may not
// use this file except in compliance with the License. You may obtain a copy of
// the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations under
// the License.

'use strict';

const async = require('async');
const debug = require('debug')('connect');
const _ = require('lodash');

const client = require('./lib/client.js');

// verify that a WDP Core API token and a Cloudant connection name have been passed as an input to this application.
if(process.argv.length < 5) {
    console.error('Use this sample code to learn how to connect to a DB2 Warehouse database using connectivity information from a Watson Data Platform project.');
    console.error('Usage: ' + process.argv[0] + ' ' + process.argv[1] + ' <api_token> <project_name> <db2_warehouse_connection_name>');
    process.exit(1);
}

var conn_options = {
  apitoken:process.argv[2]
};

if(process.env.IS_DEV) {
  conn_options.auth_url = 'https://iam.stage1.ng.bluemix.net/oidc/token';
  conn_options.base_url = 'https://apsx-api-dev.stage1.ng.bluemix.net'; 
}

var WDPClient = new client(conn_options);

const project_name = process.argv[3];
const connection_name = process.argv[4];

var project_info = {
    guid: null, // type String
    connection_type: null, // type String
    connection_credentials: null // type object (structure depends on connection_type)
};

/*
 Use the WDP Core API and a DB2 API to connect to a DB2 Warehouse connection that is defined in a Watson Data Platform project.
 */
async.series([
  function(callback) {
    /* 
      - verify that the project exists
      - retrieve project metadata
    */   
    debug('Retrieving project list and verifying project information...');   
    WDPClient.project().list({name: project_name}, 
                             function(raw_data, response) {
                                if(response.statusCode > 200) {
                                  return callback('Project ' + project_name + ' was not found. Project list request returned HTTP code ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                }
                                else {
                                  debug('Retrieved project list:' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                  const data = JSON.parse(raw_data);
                                  if(data.total_results === 0) {
                                    // project was not found; raise an error to abort processing pipeline
                                    return callback('Error. Project ' + project_name + ' was not found.');
                                  }
                                  else {
                                    // get project id
                                    project_info.guid = data.resources[0].metadata.guid;
                                    debug('Object Storage information for project ' + project_name + ': ' + JSON.stringify(project_info));
                                    return callback(null, "Project step: OK.");
                                  }                                           
                                }
                             });
    },
    function(callback) {
      /* 
        - Verify that a DB2 Warehouse connection (an asset of type 'connection/cdsx-v1') exists in the specified project.
      */   
      debug('Retrieving project asset list and locating connection information...');
      WDPClient.project().listAssets({pguid: project_info.guid,
                                      types: 'connection/cdsx-v1'}, 
                                     function(raw_data, response) {
                                      if(response.statusCode > 200) {
                                        return callback('Error verifying that connection ' + connection_name + ' is defined in project ' + project_name + 
                                                        '. Asset list request returned HTTP code ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                      }
                                      else {
                                        debug('Retrieved asset list:' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                        const data = JSON.parse(raw_data);
                                        const data_connection_asset = _.find(data.assets,
                                                                             function(asset) {
                                                                              return((asset.name === connection_name) && (asset.properties.parameters.database_type === 'dashdb'));
                                                                             });
                                        if(data_connection_asset) {
                                            // save connection information
                                            project_info.connection_type = data_connection_asset.properties.parameters.database_type;
                                            project_info.connection_credentials = {
                                              username: data_connection_asset.properties.parameters.credentials.username,
                                              password: data_connection_asset.properties.parameters.credentials.password,
                                              host: data_connection_asset.properties.parameters.credentials.host,
                                              port: data_connection_asset.properties.parameters.credentials.port,
                                              ssljdbcurl: data_connection_asset.properties.parameters.credentials.ssljdbcurl,
                                              https_url: data_connection_asset.properties.parameters.credentials.https_url,
                                              dsn: data_connection_asset.properties.parameters.credentials.dsn,
                                              ssldsn: data_connection_asset.properties.parameters.credentials.ssldsn,
                                              hostname: data_connection_asset.properties.parameters.credentials.hostname,
                                              jdbcurl: data_connection_asset.properties.parameters.credentials.jdbcurl,
                                              uri: data_connection_asset.properties.parameters.credentials.uri,
                                              database: data_connection_asset.properties.parameters.database
                                            };
                                            debug('Connection credentials for Db2 Warehouse connection ' + connection_name + ': ' + JSON.stringify(project_info));
                                            return callback(null, "Asset verification step: OK.");    
                                        }
                                        else {
                                          return callback('Error. No DB2 Warehouse connection named ' + connection_name + ' is defined in project ' + project_name);
                                        }
                                      }
                                     });
    },
    function(callback) {
      /* 
        - Connect to DB2 [Warehouse] using the provided credentials and query the database.
        - This example uses the https://www.npmjs.com/package/ibm_db package to access Db2.
      */ 
      debug('Connecting to the database...');
      require("ibm_db").open(project_info.connection_credentials.ssldsn, 
                             function (err, conn) {
                              if (err) {
                                  return callback('Error connecting to the Db2 Warehouse database using connection string ' + 
                                                  project_info.connection_credentials.ssldsn + ' : ' + JSON.stringify(err));
                              }
                              // ... fetch some data
                              debug('Querying the database...');
                              conn.query('SELECT COUNT(*) AS TABLE_COUNT FROM SYSCAT.TABLES WHERE OWNER != \'SYSIBM\'', function (err, data) {
                                if (err) {
                                  console.error('Error querying the Db2 Warehouse database: ' + JSON.stringify(err));
                                }
                                else {
                                  debug('The database contains ' + data[0].TABLE_COUNT + ' tables.');
                                }
                                // disconnect from database
                                conn.close(function (err) {
                                  if (err) {
                                    console.error('Error disconnecting from the Db2 Warehouse database: ' + JSON.stringify(err));
                                  }
                                  return callback(null, "Connection step: OK.");
                                });
                              });
      });
    },
],
function(err, results) {
    /*
        Output results or error.
     */
    if(err) {
    	console.error(err);
    }
    else {
        // Project step: OK.
        // Asset verification step: OK.
        // Connection step: OK.
        _.each(results,
               function(result) {
                    console.log(result);
               });
        if(! debug.enabled) {
          console.log('Enable debug to display additional output. Instructions: https://www.npmjs.com/package/debug');
        }
    }
});