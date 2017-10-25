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

const AWS = require('ibm-cos-sdk');
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
else {
  conn_options.auth_url = 'https://iam.ng.bluemix.net/oidc/token';
  conn_options.base_url = 'https://api.dataplatform.ibm.com';  
}

var WDPClient = new client(conn_options);

const project_name = process.argv[3];
const data_file_name = process.argv[4];

var download_information = {
    project_id: null, // type String
    asset_id: null, // type String
    storage_type: null, // type String
    storage_info: null
      /* BM COS
        {
         auth_url: null, // type String
         endpoint_url: null, // type String
         bucket_name: null, // type String
         bucket_region: null, // type String
         object_key: null, // type String
         api_key: null, // type String
         service_instance_id: null // type String
        }
      */
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
                                    return callback('Error. Project "' + project_name + '" was not found.');
                                  }
                                  else {
                                    // store project id; it is required by the next steps
                                    download_information.project_id = data.resources[0].metadata.guid; 
                                    // get BM COS credentials for the project
                                    if(data.resources[0].entity.hasOwnProperty('storage')) {
                                      download_information.storage_type = data.resources[0].entity.storage.type;                                                
                                      if (data.resources[0].entity.storage.type === 'bmcos_object_storage') {
                                            download_information.storage_info = {
                                              endpoint_url: data.resources[0].entity.storage.properties.endpoint_url, 
                                              bucket_name: data.resources[0].entity.storage.properties.bucket_name,
                                              bucket_region: data.resources[0].entity.storage.properties.bucket_region,
                                              api_key: data.resources[0].entity.storage.properties.credentials.admin.api_key,
                                              service_instance_id: data.resources[0].entity.storage.guid
                                            };
                                        }
                                        else {
                                            console.error('Project is configured for unknown storage type: ' + download_information.storage_type);
                                        }
                                    }
                                    debug('Cloud Object Storage information for project ' + project_name + ': ' + JSON.stringify(download_information));
                                    return callback(null, "Project step: OK.");
                                  }                                           
                                }
                             });
    },
    function(callback) {
      /* 
        - Verify that the data file exists in the specified project.
      */   
      debug('Retrieving project asset list and locating data file information...');
      WDPClient.project().listAssets({guid: download_information.project_id}, 
                                     function(raw_data, response) {
                                      if(response.statusCode > 200) {
                                        return callback('Error. Cannot verify that data file "' + data_file_name + '" exists in project "' + project_name + 
                                                        '". Asset list API call returned HTTP code ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                      }
                                      else {
                                        debug('Retrieved asset list:' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                        const data = JSON.parse(raw_data);
                                        const data_asset = _.find(data.results,
                                                                  function(asset) {
                                                                    return ((asset.metadata.asset_type === 'data_asset') && (asset.metadata.name === data_file_name));
                                                                  });
                                        if(data_asset){
                                            download_information.asset_id = data_asset.metadata.asset_id;
                                            return callback(null, "Asset verification step: OK.");    
                                        }
                                        else {
                                          return callback('Error. Data file "' + data_file_name + '"" does not exist in project "' + project_name + '"');
                                        }
                                      }
                                     });
    },
    function(callback) {
      /* 
        - Obtain asset key
      */   
      debug('Retrieving asset list and locating data file information...');
      WDPClient.project().getAsset({pguid: download_information.project_id,
                                    aguid: download_information.asset_id
                                   }, 
                                   function(raw_data, response) {
                                      if(response.statusCode > 200) {
                                        return callback('Error. Cannot obtain Cloud Object Storage object key for "' + data_file_name +
                                                        '". Asset retrieval API call returned HTTP code ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                      }
                                      else {
                                        debug('Retrieved asset - ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                        const data = JSON.parse(raw_data);
                                        download_information.storage_info.object_key = data.attachments[0].object_key;

                                        debug('BM COS access configuration: ' + JSON.stringify(download_information));

                                        return callback(null, "Asset key lookup step: OK.");    
                                      }
                                   });
    },    
    function(callback) {
      /* 
        - Download the data file from the project's Object Storage instance using the Object Storage API.
        - Store downloaded in local file system using the asset name.
      */ 
      debug('Downloading data file "' + data_file_name + 
            '" from Bluemix Cloud Object Storage bucket "' + download_information.storage_info.bucket_name + 
            '" ...');

      const cos_config = {
        endpoint: download_information.storage_info.endpoint_url,
        apiKeyId: download_information.storage_info.api_key,
        serviceInstanceId: download_information.storage_info.service_instance_id,
        ibmAuthEndpoint: conn_options.auth_url
      };

      debug('BM COS config: ' + JSON.stringify(cos_config));

      const cos = new AWS.S3(cos_config);

      const object_spec = {
        Bucket: '/' + download_information.storage_info.bucket_name, 
        Key: download_information.storage_info.object_key
      };

      debug('BM COS object spec: ' + JSON.stringify(object_spec));

      cos.getObject(object_spec, 
                     function(err, data) {
                          if (err) {
                            return callback('Error retrieving object ' + download_information.storage_info.object_key + 
                                            ' from bucket ' + download_information.storage_info.bucket_name + 
                                            ': ' + JSON.stringify(err));  
                          }
                          else   {   
                              fs.writeFile(download_information.storage_info.object_key, 
                                           data.Body, 
                                           'utf-8',
                                           function(err){
                                            if(err) {
                                              return callback('Error writing object ' + download_information.storage_info.object_key + 
                                                              ' from bucket ' + download_information.storage_info.bucket_name + 
                                                              ' to disk: ' + JSON.stringify(err));  
                                            }
                                            else {
                                              return callback(null, 'Store object step: OK');
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