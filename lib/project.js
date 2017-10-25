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

module.exports = function () {

	this.list = function(opts, callback) {

		if(! callback) {
			callback = opts;
			opts = null;
		}
    	var options = {
      		url: '/v2/projects',
		    method: 'GET',
		    query: opts
    	};

		return this.apiCall(options, callback);		
	};

	this.listAssets = function(opts, callback) {
		if(! callback) {
			callback = opts;
			opts = null;
		}
    	var options = {
      		url: '/v2/asset_types/asset/search',
		    method: 'POST',
		    headers: {
		    	['Content-Type'] : 'application/json'
		    },
		    query: {
		    	project_id: opts.guid,
		    },
		    data: JSON.stringify({query: "*:*"})
    	};
		return this.apiCall(options, callback);		
	};

	this.getAsset = function(opts, callback) {
		if(! callback) {
			callback = opts;
			opts = null;
		}
    	var options = {
      		url: '/v2/assets/' + opts.aguid,
		    method: 'GET',
		    query: {
		    	project_id: opts.pguid,
		    }
    	};

		return this.apiCall(options, callback);		
	};

	this.listConnections = function(opts, callback) {
		if(! callback) {
			callback = opts;
			opts = null;
		}
    	var options = {
      		url: '/v2/connections',
		    method: 'GET',
		    headers: {
		    	['Content-Type'] : 'application/json'
		    },
		    query: {
		    	project_id: opts.guid,
		    }
    	};
		return this.apiCall(options, callback);		
	};

	return this;
};