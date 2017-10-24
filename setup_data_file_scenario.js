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

const client = require('./lib/client.js');

if (process.argv.length <= 2) {
	console.log("Usage: node " + __filename + " <API_TOKEN>");
    process.exit(-1);	
}

var WDPClient = new client({
							auth_url:'https://iam.stage1.ng.bluemix.net/oidc/token', 
							base_url:'https://apsx-api-dev.stage1.ng.bluemix.net',
							apitoken:process.argv[2]});

var project = {
	name: 'new1',
	description: 'created it through the API',
	public: true,
	generator: 'SKIT',
	storage: {
		type: 'bmcos_object_storage',
		guid: '26307b4b-1111-2222-3333-2234cd63d169',
		properties: {
			bucket_name: 'abcdefghijk',
			credentials: {
                            admin: {
                                api_key: "hduswH9uwDWLBxa7w6-fG7VuUbFASIN4iAg0LJEGh91b",
                                service_id: "iam-ServiceId-934ada6f-cf2f-4933-aa75-cb45bf5b03b6"
                            },
                            editor: {
                                service_id: "iam-ServiceId-ddb2c644-5d6b-4da2-bc36-afa57441a077",
                                api_key: "tCjjZuVwtrukrG9DkjLiFLRhjbgz6q2get7Ljr-rx3SA"
                            },
                            viewer: {
                                service_id: "iam-ServiceId-d0485d0e-8318-4a6e-a20b-dcb8974ae8ec",
                                api_key: "tyzFJBFSmNzZ5zORXD4dn2BgB4DE5hxx4vMFbdiOIbR1"
                            }
            }
		}
	}
};




async.series([
    function(callback) {
        WDPClient.project().create(project, function(data, response) {
        					if(response.statusCode != 201) {
								require('util').inspect(response);
								callback('Error. HTTP status code: ' + response.statusCode + ' Message: ' + response.statusMessage + ' ' + JSON.stringify(data));
							}
							else {
								callback(null, data);
							}
						  	
 						 });
    },
    function(callback) {
        // do some more stuff ...
        callback(null, 'two');
    }
],
// optional callback
function(err, results) {
    if(err) {
    	console.error(err);
    }
    else {
    	console.log(JSON.stringify(results));
    }
});