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

const debug = require('debug')('WDP_API:wrapper');
const rest = require('restler');
const pkg = require('../package.json'); 

function client(config) {
	config = config || {};
	/*jshint validthis:true */
	this.bmapitoken = config.apitoken;
	this.authtoken = null;
	this.auth_url = config.auth_url || 'https://iam.ng.bluemix.net/oidc/token';
	// Watson Data Platform Core base URL
	this.base_url = config.base_url || 'https://api.dataplatform.ibm.com';
    this.useragent = 'nodejs-wdpc/' + pkg.version + ' (Node.js ' +  process.version + ')';

	return this;
}

/*
 * Send authentication request to WDP.
 */
client.prototype.authenticate = function(callback) {

	const options = {
			username: 'Yng6Yng=',
		    timeout: 2000,
		    headers : {
		      'User-Agent' : this.useragent
		    },
		    method: 'POST',
			data: {
			  	apikey: this.bmapitoken,
			  	grant_type: 'urn:ibm:params:oauth:grant-type:apikey'
			}
	};

	debug('> Calling WDP authentication API ############################ \n%O',options);

	rest.request(this.auth_url,
			     options).on('complete',
		     	 function(data, response) {
		     		
	    	 		debug('< WDP authentication API call returned HTTP status: %s (%s) ======= \n' +
		 		          ' Data: \n %s\n' +
		 		          '< ================================================================= \n',
		 		          response.statusCode, response.statusMessage, JSON.stringify(data));

		     		if(response.statusCode === 200) {
		     			this.authtoken = JSON.parse(data).access_token;
	  					return callback();
		     		}
		     		else {
			     		this.authtoken = null;
  						//return callback({'errorCode': data.errorCode,'errorMessage': data.errorMessage});
  						response.statusMessage = response.statusMessage + ' (' + this.auth_url + ' returned error code: ' + data.errorCode + ' and error message: ' + data.errorMessage + ')';
  						return callback(response);
		     		}
		}.bind(this));
};

/*
 * Project API call wrapper
 */
client.prototype.project = require('./project.js');

/*
 * Call WDP API. Invoked by the ^^ wrappers.
 */
client.prototype.apiCall = function(options, callback) {

	options = options || {};

	if(! this.authtoken) {
		this.authenticate(function(err) {
			if(err) {
				return callback(null, err);
			}
			else {
				options.accessToken = this.authtoken;
				options.headers = options.headers || {};
				options.headers['User-Agent'] = this.useragent;
				debug('> Calling WDP API ############################ \n%O',options);
				rest.request(this.base_url + options.url,
			    	  	 	 options).on('complete', 
		    	 						 function(data, response) {
		    	 				 			debug('< WDP API call returned HTTP status: %s (%s) ======= \n' +
		    	 				 		  		  ' Data: \n %s\n' +
		    	 				 		  		  '< ================================================== \n',
		    	 				 		  		  response.statusCode, response.statusMessage, data);		    	 						 	
		     								return callback(data, response);
										 });		
			}
		}.bind(this));
	}
	else {
		options.accessToken = this.authtoken;
		options.headers = options.headers || {};
		options.headers['User-Agent'] = this.useragent;
		debug('> Calling WDP API ############################ \n%O',options);
		rest.request(this.base_url + options.url,
			      	 options).on('complete', 
		    	 				 function(data, response) {
		    	 				 	debug('< WDP API call returned HTTP status: %s (%s) ======= \n' +
		    	 				 		  ' Data: \n %s\n' +
		    	 				 		  '< ================================================== \n',
		    	 				 		  response.statusCode, response.statusMessage, data);
		     						return callback(data, response);
								 });		
	}
};

module.exports = client;