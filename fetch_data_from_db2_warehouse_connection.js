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

// verify that a WDP Core API token and a DB2 Warehouse connection name have been passed as an input to this application.
if(process.argv.length < 5) {
    console.error('Use this sample code to learn how to connect to a Db2 Warehouse database using connectivity information from a Watson Data Platform project.');
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
 Use the WDP Core API and a Db2 Warehouse API to connect to a Db2 Warehouse connection that is defined in a Watson Data Platform project.
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
                                    return callback(null, "Project step: OK.");
                                  }                                           
                                }
                             });
    },
    function(callback) {
      /* 
        - Verify that a Db2 Warehouse connection with the specified name was defined in the project.
      */   
      debug('Retrieving connection list and locating connection information for ' + connection_name + ' ...');
      WDPClient.project().listConnections({guid: project_info.guid}, 
                                     function(raw_data, response) {
                                      if(response.statusCode > 200) {
                                        return callback('Error verifying that connection ' + connection_name + ' is defined in project ' + project_name + 
                                                        '. Connection list request returned HTTP code ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                      }
                                      else {
                                        debug('Retrieved connection list - ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                        const data = JSON.parse(raw_data);
                                        const connection_asset = _.find(data.resources,
                                                                        function(asset) {
                                                                          return((asset.entity.name === connection_name) && (asset.metadata.asset_type === 'connection'));
                                                                        });
                                        if(connection_asset) {
                                          project_info.connection_type = 'dashdb';
                                          project_info.connection_credentials = {
                                            username: connection_asset.entity.properties.username,
                                            password: connection_asset.entity.properties.password,
                                            host: connection_asset.entity.properties.host,
                                            database: connection_asset.entity.properties.database,
                                            ssldsn: 'DATABASE=' + connection_asset.entity.properties.database + 
                                                    ';HOSTNAME=' + connection_asset.entity.properties.host + 
                                                    ';PORT=50001;PROTOCOL=TCPIP;UID=' + connection_asset.entity.properties.username +
                                                    ';PWD=' + connection_asset.entity.properties.password +  
                                                    ';Security=SSL;'
                                          };
                                          debug('Connection information: ' + JSON.stringify(project_info.connection_credentials));
                                          return callback(null, 'Connection lookup step: OK.');
                                        }
                                        else {
                                          return callback('Error. No Db2 Warehouse connection named ' + connection_name + ' is defined in project ' + project_name);
                                        }
                                      }
                                     });
    },
    function(callback) {
      /* 
        - Connect to Db2 Warehouse using the provided credentials. 

      */ 

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