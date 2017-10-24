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
const debug = require('debug')('download');
const fs = require('fs');
const _ = require('lodash');

const OSClient = require('./lib/bmos_client.js');
const client = require('./lib/client.js');


// verify that an Object Storage container name and asset name have been passed as an input to this utility
if(process.argv.length < 5) {
    console.error('Use this utility to download a file asset from Bluemix Object Storage.');
    console.error('Usage: ' + process.argv[0] + ' ' + process.argv[1] + ' <api_token> <project_name> <file_asset_name>');
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
const data_file_name = process.argv[4];

var project_info = {
    guid: null, // type String
    storage_type: null, // type String
    storage_credentials: null // type object (structure depends on storage_type)
};

/*
 Use the WDP Core API and Object Storage API to download a file data asset from a project.
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
                                    // get bmos credentials for the project
                                    if(data.resources[0].entity.hasOwnProperty('storage')) 
                                    {
                                      project_info.storage_type = data.resources[0].entity.storage.type;                                                
                                      if (data.resources[0].entity.storage.type === 'object_storage') {
                                            project_info.storage_credentials = {
                                                    container: data.resources[0].entity.storage.properties.container,
                                                    projectId: data.resources[0].entity.storage.properties.credentials.projectId,
                                                    userId: data.resources[0].entity.storage.properties.credentials.userId,
                                                    password: data.resources[0].entity.storage.properties.credentials.password,
                                                    region: data.resources[0].entity.storage.properties.credentials.region
                                            };
                                        }
                                        else {
                                            console.error('Project is configured for unknown storage type: ' + project_info.storage_type);
                                        }
                                        // TODO support BMCOS 
                                    }
                                    debug('Object Storage information for project ' + project_name + ': ' + JSON.stringify(project_info));
                                    return callback(null, "Project step: OK.");
                                  }                                           
                                }
                             });
    },
    function(callback) {
      /* 
        - Verify that the data file (an asset of type 'file/bmos-v3') exists in the specified project.
      */   
      debug('Retrieving project asset list and locating data file information...');
      WDPClient.project().listAssets({pguid: project_info.guid,
                                      types: 'file/bmos-v3'}, 
                                     function(raw_data, response) {
                                      if(response.statusCode > 200) {
                                        return callback('Error verifying that data file ' + data_file_name + ' exists in project ' + project_name + 
                                                        '. Asset list request returned HTTP code ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                      }
                                      else {
                                        debug('Retrieved asset list:' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                        const data = JSON.parse(raw_data);
                                        if(_.find(data.assets,
                                                  function(asset) {
                                                    return ((asset.name === data_file_name) && (asset.properties.project_storage === true));
                                                  })) {
                                            return callback(null, "Asset verification step: OK.");    
                                        }
                                        else {
                                          return callback('Error. Data file ' + data_file_name + ' does not exist in project ' + project_name);
                                        }
                                      }
                                     });
    },
    function(callback) {
      /* 
        - Download the data file from the project's Object Storage instance using the Object Storage API.
        - Store downloaded in local file system using the asset name.
      */ 
      debug('Downloading data file from Bluemix Object Storage...');
      var os_client = new OSClient(project_info.storage_credentials);
      os_client.downloadObject(project_info.storage_credentials.container, // container name
                               data_file_name, // object name
                               function(data, response) {
                                  if(response.statusCode !== 200) {
                                      return callback('Error downloading ' + data_file_name + ' from container ' +  project_info.storage_credentials.container + ':' + response.statusCode + ' (' + response.statusMessage +')');
                                  }
                                  else {
                                      fs.writeFile(data_file_name, 
                                                   data, 
                                                   'utf-8', 
                                                   function(err) {
                                                      if(err) {
                                                          return callback('Error saving ' + data_file_name + ' in local file system: ' + err);
                                                      }
                                                      else {
                                                          return callback(null, "Asset download step: OK.");
                                                      }
                                                   });
                                  }
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
        // Asset download step: OK.
        _.each(results,
               function(result) {
                    console.log(result);
               });
    }
});