# WDP Core API sample cookbook

To follow these Node.js recipes clone this repository:

 ```
 $ https://github.com/ibm-watson-data-lab/wdp-skit-cookbook.git
 $ cd wdp-skit-cookbook
 ```

Before you can connect to DSX using the WDP Core API you have to create an API key:
 * Sign in to [Bluemix](https://console.bluemix.net) 
 * Select **Manage** > **Security** > **Bluemix API Keys**
 * Create a new key and save it.

# Accessing project data from Bluemix hosted data sources
## Recipe 1: Downloading data files from Bluemix Object Storage
* Log in to DSX.  
* Create a project.
* Upload a data file to the project.
* Explore (and run) `download_file_asset_from_bmos.js`

  ```
  $ node download_file_asset_from_bmos.js <api_key> <project_name> <data_file_name>
  ```

## Recipe 2: Fetching data from a Bluemix hosted Cloudant 
* Log in to DSX.  
* Create a project.
* Add a Bluemix hosted Cloudant connection for an existing database to the project. (The database can be empty!)
* Explore (and run) `fetch_data_from_cloudant_connection.js`

  ```
  $ node fetch_data_from_db2_warehouse_connection.js <api_key> <project_name> <bluemix_cloudant_connection_name>
  ```
 
## Recipe 3: Fetching data from a Bluemix hosted Db2 Warehouse on Cloud
* Log in to DSX.  
* Create a project.
* Add a Bluemix hosted Db2 Warehouse connection for to the project.
* Explore (and run) `fetch_data_from_db2_warehouse_connection.js`

  ```
  $ node fetch_data_from_db2_warehouse_connection.js <api_key> <project_name> <bluemix_db2_warehouse_connection_name>
  ```

# Accessing project data from externally hosted data sources
## Recipe 4: Fetching data from an external Cloudant service instance
* Log in to DSX.  
* Create a project.
* Add an external Cloudant connection for an existing database to the project. (The database can be empty!)
* Explore (and run) `fetch_data_from_external_cloudant_connection.js`

  ```
  $ node fetch_data_from_external_cloudant_connection <api_key> <project_name> <external_cloudant_connection_name>
  ```
