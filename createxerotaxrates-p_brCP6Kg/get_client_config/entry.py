import os

def handler(pd: "pipedream"):
    # Retrieve data store and access token
    data_store_access_tokens = pd.inputs["data_store"]
    access_token = data_store_access_tokens["Connection"]
    data_store_client_config = pd.inputs["data_store_1"]
    client_config = data_store_client_config.get(pd.steps["trigger"]["event"]["body"]["xero-tenant-id"])

    print("client_config: ", client_config)
    # Convert the name from the trigger event body to lowercase
    name = pd.steps["trigger"]["event"]["body"]["name"].lower()
    print("name: ", name)

    # Retrieve client-specific environment variables from inputs
    complyt_client_id = os.environ[f"clientId_{name}"]
    complyt_client_secret = os.environ[f"clientSecret_{name}"]
    complyt_api_environment = client_config["complyt_api_environment"]

    # Extract tax code map and get unique classifications
    tax_code_map = client_config["tax_code_map"]
        # Extract unique classifications and filter out unwanted values
    ignore_list = ["Ignore"]  # List of values to exclude
    unique_classifications = [
        classification for classification in set(tax_code_map.values()) if classification not in ignore_list
    ]


    # Return all gathered data
    return {
        "name": name,
        "access_token": access_token["access_token"],
        "complyt_client_id": complyt_client_id,
        "complyt_client_secret": complyt_client_secret,
        "complyt_api_environment": complyt_api_environment,
        "unique_product_classifications": unique_classifications,
    }
