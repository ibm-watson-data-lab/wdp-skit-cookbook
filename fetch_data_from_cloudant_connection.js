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
    console.error('Use this sample code to learn how to connect to a Cloudant database using connectivity information from a Watson Data Platform project.');
    console.error('Usage: ' + process.argv[0] + ' ' + process.argv[1] + ' <api_token> <project_name> <cloudant_connection_name>');
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
 Use the WDP Core API and a Cloudant API to connect to a Cloudant connection that is defined in a Watson Data Platform project.
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
        - Verify that a Cloudant connection (an asset of type 'connection/cdsx-v1') exists in the specified project.
      */   
      debug('Retrieving project asset list and locating connection information...');
      WDPClient.project().listAssets({guid: project_info.guid}, 
                                     function(raw_data, response) {
                                      if(response.statusCode > 200) {
                                        return callback('Error verifying that connection ' + connection_name + ' is defined in project ' + project_name + 
                                                        '. Asset list request returned HTTP code ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                      }
                                      else {
                                        debug('Retrieved asset list - ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                        const data = JSON.parse(raw_data);
                                        const connection_asset = _.find(data.results,
                                                                        function(asset) {
                                                                          return((asset.metadata.name === connection_name) && (asset.metadata.asset_type === 'connection'));
                                                                        });
                                        if(connection_asset) {
                                            // get connection information using asset id
                                            WDPClient.project().getAsset({pguid:project_info.guid, aguid:connection_asset.metadata.asset_id},
                                                                         function(raw_data, response) {
                                                                            if(response.statusCode > 200) {
                                                                              return callback('Error verifying that connection ' + connection_name + ' is defined in project ' + project_name + 
                                                                              '. Asset fetch request returned HTTP code ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                                                            }
                                                                            else {
                                                                              debug('Retrieved asset info - ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);   
                                                                              // save connection information
/*                                                                              project_info.connection_type = connection_asset.properties.parameters.database_type;
                                                                              project_info.connection_credentials = {
                                                                                username: cloudant_connection_asset.properties.parameters.credentials.username,
                                                                                password: cloudant_connection_asset.properties.parameters.credentials.password,
                                                                                host: cloudant_connection_asset.properties.parameters.credentials.host,
                                                                                port: cloudant_connection_asset.properties.parameters.credentials.port,
                                                                                url: cloudant_connection_asset.properties.parameters.credentials.url,
                                                                                database: cloudant_connection_asset.properties.parameters.database
                                                                              };
*/
                                                                              debug('Connection credentials for Cloudant connection ' + connection_name + ': ' + JSON.stringify(project_info));
                                                                              return callback(null, "Asset verification step: OK.");    
                                                                               
                                                                            }
                                                                         });

                                        }
                                        else {
                                          return callback('Error. No Cloudant connection named ' + connection_name + ' is defined in project ' + project_name);
                                        }
                                      }
                                     });
    },
    function(callback) {
      /* 
        - Connect to Cloudant using the provided credentials. 
        Refer to https://medium.com/ibm-watson-data-lab/choosing-a-cloudant-library-d14c06f3d714 to learn more about Cloudant libraries for Node.js.
      */ 
      debug('Connecting to the database...');
      var db = require('silverlining')(project_info.connection_credentials.url, project_info.connection_credentials.database); 
      db.count().then(function(data) {
        debug('The database contains ' + data + ' documents.');
        return callback(null, "Connection step: OK.");
      }).catch(function(err) {
        return callback('Error connecting to the Cloudant database: ' + JSON.stringify(err));
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