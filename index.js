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

const client = require('./lib/client.js');

if (process.argv.length <= 2) {
	console.log("Usage: node " + __filename + " <API_TOKEN>");
    process.exit(-1);	
}

var WDPClient = new client({apitoken:process.argv[2]});

WDPClient.project().list(function(data, response) {
							if(! data){
								console.error('Error. HTTP status code: ' + response.statusCode + ' Message: ' + response.statusMessage);
								require('util').inspect(response);
							}
							else {
								console.log('Data' + data);	
							}
						  	
 						 });
