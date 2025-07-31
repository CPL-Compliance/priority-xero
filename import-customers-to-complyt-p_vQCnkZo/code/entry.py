import requests

def handler(pd: "pipedream"):
    # Reference data from previous steps
    contacts = pd.steps["get_request"]["$return_value"]["Contacts"]
    contact_ids = [contact["ContactID"] for contact in contacts]
    
    # Define the endpoint and headers for the POST request
    endpoint = "https://your-api-endpoint.com/post"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer your_api_token"
    }

    # Iterate over each ContactID and execute the POST request
    for contact_id in contact_ids:
        payload = {"ContactID": contact_id}
        response = requests.post(endpoint, json=payload, headers=headers)
        
        # Print the response for debugging purposes
        print(f"POST request for ContactID {contact_id}: {response.status_code} - {response.text}")
    
    # Return the array of ContactIDs for use in future steps
    return {"contact_ids": contact_ids}
