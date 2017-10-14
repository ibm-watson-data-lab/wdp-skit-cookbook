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

const debug = require('debug')('os_client');
const _ = require('lodash');
const rest = require('restler');
const util = require('util');
const pkg = require('../package.json'); 

function client(config) {
	config = config || {};
	/*jshint validthis:true */
	this.userId = config.userId;
	this.password = config.password;
	this.projectId = config.projectId;
	this.region = config.region;
	this.auth_token = null;
	this.token_expires = null;
	this.auth_url = 'https://identity.open.softlayer.com/v3/auth/tokens';
	this.base_url = '';
    this.useragent = 'nodejs-wdpc/' + pkg.version + ' (Node.js ' +  process.version + ')';

	return this;
}

client.prototype.authenticate = function(callback) {
	// see https://console.bluemix.net/docs/services/ObjectStorage/os_authenticate.html
	var authData = {
		auth: {
           identity: {
               methods: [
                   'password'
               ],
               'password': {
                   'user': {
                       id: this.userId,
                       password: this.password
                   }
               }
           },
           scope: {
               project: {
                   id: this.projectId
               }
           }
		}
	};

    rest.post(this.auth_url,
		      {
		       timeout: 2000,
		       headers : {
		       	 'Content-Type' : 'application/json', 
		         'User-Agent' : this.useragent
		       },
			   data: JSON.stringify(authData)
			  }).on('complete', 
		     	function(data, response) {
		     		debug('OAuthToken request returned ' + util.inspect(response));
		     		if(response.statusCode === 201) {

		     			// X-Subject-Token
		     			this.auth_token = response.headers['x-subject-token'];

		     			const swift_catalog = _.find(data.token.catalog,
		     				   						 function(catalog) {
		     				   	 						return(catalog.name === 'swift');
		     				   						 }); 
		     			if(swift_catalog) {
		     				const public_endpoint = _.find(swift_catalog.endpoints,
		     											   function(endpoint) {
		     											   		return((endpoint.interface === 'public') && (endpoint.region_id === this.region));
		     											   }.bind(this));
		     				if(public_endpoint) {
		     					/*
		     					    "region_id": "dallas",
                        			"url": "https://dal.objectstorage.open.softlayer.com/v1/AUTH_f...5",
                        			"region": "dallas",
                        			"interface": "public",
                        			"id": "4...b"
		     					 */
		     					this.base_url = public_endpoint.url;
		     					return callback();
		     				}
		     				else {
			     				// mimic HTTP response; this error indicates that this implementation is buggy
			     				return callback({statusCode:400, 
			     							     statusMessage: 'Error. No public endpoint configuration was found for region ' + this.region,
		    	 							     rawEncoded: JSON.stringify(data) 
		     							    });	
		     				}
		     			}
		     			else {
		     				// mimic HTTP response; this error indicates that this implementation is buggy
		     				return callback({statusCode:400, 
		     							     statusMessage: 'Response parsing error. No catalog entry for swift was found.',
		     							     rawEncoded: JSON.stringify(data) 
		     							    });	
		     			}
		     		}
		     		else {
	     				// the authorization request failed
	     				return callback(response);	

		     		}
				}.bind(this));
};

client.prototype.displayEndPoint = function() {
	console.log(this.base_url);
};

client.prototype.downloadObject = function(container, objectname, callback) {
	// see https://developer.openstack.org/api-ref/object-store/index.html
   	var options = {
      		url : '/'+ container + '/' + objectname,
		    method: 'GET'
    };
	return this.apiCall(options, callback);	
};

client.prototype.apiCall = function(options, callback) {
	options = options || {};
	if(! this.auth_token) {
		this.authenticate(function(err) {
			if(err) {
				return callback(null, err);
			}
			else {
				options.headers = options.headers || {};
				options.headers['User-Agent'] = this.useragent;
				options.headers['X-Auth-Token'] = this.auth_token;
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
		options.headers = options.headers || {};
		options.headers['User-Agent'] = this.useragent;
		options.headers['X-Auth-Token'] = this.auth_token;
		debug('apiCall()' + util.inspect(options));
		rest.request(this.base_url + options.url,
			      	 options).on('complete', 
		    	 				 function(data, response) {
		     						return callback(data, response);
								 });		
	}
};

module.exports = client;