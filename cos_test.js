var AWS = require('ibm-cos-sdk');
var fs = require('fs');

/*

                "storage": {
                    "type": "bmcos_object_storage",
                    "properties": {
                        "bucket_name": "myfirststandaloneprojecte1f7a2b222694a549090da08422334fe",
                        "credentials": {
                            "admin": {
                                "api_key": "hduswH9uwDWLBxa7w6-fG7VuUbFASIN4iAg0LJEGh91b",
                                "service_id": "iam-ServiceId-934ada6f-cf2f-4933-aa75-cb45bf5b03b6"
                            },
                            "editor": {
                                "service_id": "iam-ServiceId-de628c43-f3e6-4fc9-8db9-e8c02c085b56",
                                "api_key": "11352UMWqmAeKniPzRibicWx2neM7ZYQRUf01ltCnIK-"
                            },
                            "viewer": {
                                "service_id": "iam-ServiceId-88ff63c6-71ba-428e-b412-106e2f956d68",
                                "api_key": "Zmo9T_-XGBVEsmtNn6VT-7PLN4dJpR-5YiqES6D1Pmi9"
                            }
                        }
                    },


 */


var config = {
    endpoint: 's3-api.dal-us-geo.objectstorage.softlayer.net',
    apiKeyId: 'B9fclua4ppJkWMbki0FTsKP5Q0jiLgRv6cVIIu2gFlyp',
    ibmAuthEndpoint: 'https://iam.ng.bluemix.net/oidc/token',
    serviceInstanceId: 'e102cbf7-3914-4f26-a2f2-ffea64638c86' // 'crn:v1:bluemix:public:cloud-object-storage:global:a/908bf67ad8602999ea8c4fb3105b9cef:e102cbf7-3914-4f26-a2f2-ffea64638c86::',
};

var cos = new AWS.S3(config);

cos.listBuckets({}, function(err, data) {
  if (err) { console.log(err, err.stack); } 
  else {
  	console.log('********************');
      console.log(data);           // successful response
		var params = {
		  // Bucket: 'myfirststandaloneprojecte1f7a2b222694a549090da08422334fe', /* required */
		  Bucket: '/abcd',
		  Key: 'customers_orders1 - Copy.csv', /* required */
		};
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