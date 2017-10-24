var AWS = require('ibm-cos-sdk');
var fs = require('fs');

// dev DSX
var config = {
	apiKeyId: 'hduswH9uwDWLBxa7w6-fG7VuUbFASIN4iAg0LJEGh91b', // admin id
	serviceInstanceId: '26307b4b-186e-433f-b6bf-2234cd63d169', // storage guid 
	ibmAuthEndpoint: 'https://iam.stage1.ng.bluemix.net/oidc/token',
	endpoint: 'https://s3.us-west.objectstorage.uat.softlayer.net'
}

var cos = new AWS.S3(config);

cos.listBuckets({}, function(err, data) {
  if (err) { console.log(err, err.stack); } 
  else {
  	console.log('********************');
      console.log(data);           // successful response
		var params = {
		  Bucket: 'maybenowb68b04ccfee247aca2b5a20604dec460',
		  Key: 'customers_orders_project_1.csv', 
		};
		console.log(JSON.stringify(params));

		cos.getObject(params, function(err, data) {
		  if (err) console.log(err, err.stack); // an error occurred
		  else   {
console.log(require('util').inspect(data));		  	
		  		fs.writeFile('out.csv', 
		  			         data.Body, 
                             'utf-8',
		  			         function(err){
		  			if(err) {
		  				console.error('Error writing data file');
		  			}
		  			else {
		  				console.log('Wrote data file');	
		  			}
		  		});
		  } 
		});

  }
});