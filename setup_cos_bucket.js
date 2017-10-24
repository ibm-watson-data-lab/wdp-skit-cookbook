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

const debug = require('debug');
const async = require('async');
const AWS = require('ibm-cos-sdk');
const util = require('util');


if (process.argv.length <= 2) {
	console.log("Usage: node " + __filename + " <BUCKET>");
    process.exit(-1);	
}


var dev_config = {
    endpoint: 's3.us-west.objectstorage.uat.softlayer.net', // from BM service conf
    apiKeyId: 'hduswH9uwDWLBxa7w6-fG7VuUbFASIN4iAg0LJEGh91b',  // from BM service creds
    ibmAuthEndpoint: 'https://iam.stage1.ng.bluemix.net/oidc/token',  // from BM service creds
    serviceInstanceId: 'crn:v1:staging:public:cloud-object-storage:global:a/36c7003c9469933827881b9b0de64f62:26307b4b-186e-433f-b6bf-2234cd63d169::', // from BM service creds
};

var prod_config = {
    endpoint: 's3-api.dal-us-geo.objectstorage.softlayer.net', // from BM service conf
    apiKeyId: 'ngpaE_Q4hlgFBTDedWkNSIuLOGvaI1VDmRM3PWZKU-ww',  // from BM service creds
    ibmAuthEndpoint: 'https://iam.ng.bluemix.net/oidc/token',  // from BM service creds
    serviceInstanceId: 'crn:v1:bluemix:public:cloud-object-storage:global:a/908bf67ad8602999ea8c4fb3105b9cef:e102cbf7-3914-4f26-a2f2-ffea64638c86::', // from BM service creds
};

var config = prod_config;

var cos = new AWS.S3(config);

function doCreateBucket(bucket_name) {
    console.log('Creating bucket');
    return cos.createBucket({
        Bucket: bucket_name,
        CreateBucketConfiguration: {
          LocationConstraint: 'us-standard'
        },
    }).promise();
}

doCreateBucket(process.argv[2]).then(function() {
	console.log('Bucket was created.');
}).catch(function(err) {
	console.error('Bucket creation failed: ' + err);
});
