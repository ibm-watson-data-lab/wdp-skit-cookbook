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

const debug = require('debug')('client');
const rest = require('restler');
const util = require('util');
const pkg = require('../package.json'); 

function client(config) {
	config = config || {};
	/*jshint validthis:true */
	this.bmapitoken = config.apitoken;
	this.authtoken = null;
	this.auth_url = 'https://iam.ng.bluemix.net/oidc/token';
	// Watson Data Platform Core base URL
	this.base_url = config.base_url || 'https://api.dataplatform.ibm.com';
    this.useragent = 'nodejs-wdpc/' + pkg.version + ' (Node.js ' +  process.version + ')';

	return this;
}

client.prototype.authenticate = function(callback) {
    rest.post(this.auth_url,
		      {
		       username: 'Yng6Yng=',
		       timeout: 2000,
		       headers : {
		         'User-Agent' : this.useragent
		       },
			   data: {
			  	apikey: this.bmapitoken,
			  	grant_type: 'urn:ibm:params:oauth:grant-type:apikey'
			   }
			  }).on('complete', 
		     	function(data, response) {
		     		debug('OAuthToken request returned ' + util.inspect(response));
		     		if(response.statusCode === 200) {
		     			this.authtoken = data.access_token;
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

client.prototype.project = require('./project.js');

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
				debug('apiCall()' + util.inspect(options));
				rest.request(this.base_url + options.url,
			    	  	 	 options).on('complete', 
		    	 						 function(data, response) {
		     								return callback(data, response);
										 });		
			}
		}.bind(this));
	}
	else {
		options.accessToken = this.authtoken;
		options.headers = options.headers || {};
		options.headers['User-Agent'] = this.useragent;
		debug('apiCall()' + util.inspect(options));
		rest.request(this.base_url + options.url,
			      	 options).on('complete', 
		    	 				 function(data, response) {
		     						return callback(data, response);
								 });		
	}
};

module.exports = client;