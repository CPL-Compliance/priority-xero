import base64
import requests
import os

def generate_basic_auth(client_id, client_secret):
  return base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

def refresh_token_from_xero(auth, refresh_token):
  url = "https://identity.xero.com/connect/token"
  headers = {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": f"Basic {auth}"
  }
  data = {
      "grant_type": "refresh_token",
      "refresh_token": f"{refresh_token}",
  }

  response = requests.post(url, headers=headers, data=data)

  if response.status_code == 200:
    return response.json()
  else:
    error_message = response.json().get('error_description', response.text)
    raise Exception(f"Failed to refresh access token: {response.status_code} - {error_message}")
  
def handler(pd: "pipedream"):
  # Get All reamlIds and run a loop to refresh each one
  data_store = pd.inputs["data_store"]
  auth = generate_basic_auth(os.environ["xero_app_id"] , os.environ["xero_app_secret"])

  for state in data_store.keys():
    if 'refresh_token' in data_store[state].keys():
      print(f"State: {state}, Refresh Token: {data_store[state]['refresh_token']}")
      data_store[state] = refresh_token_from_xero(auth, data_store[state]['refresh_token'])
  
