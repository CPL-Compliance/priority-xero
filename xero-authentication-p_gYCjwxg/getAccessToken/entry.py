import base64
import requests
import os

def generate_basic_auth(client_id, client_secret):
  print(f"clientId: {client_id}")
  print(f"client_secret: {client_secret}")
  return base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

def get_token_from_xero(auth, code, redirect_uri):
  url = "https://identity.xero.com/connect/token"
  headers = {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": f"Basic {auth}"
  }
  data = {
      "grant_type": "authorization_code",
      "code": f"{code}",
      "redirect_uri": f"{redirect_uri}"
  }

  response = requests.post(url, headers=headers, data=data)
  print(response)
  if response.status_code != 200:
    raise Exception("Unauthorised")
  return response.json()

def handler(pd: "pipedream"):
  code = pd.steps["getCodeAndState"]["$return_value"]["code"]
  redirect_uri = "https://eovozwdx28qgkte.m.pipedream.net"
  auth = generate_basic_auth(os.environ["xero_app_id"] , os.environ["xero_app_secret"])
  return get_token_from_xero(auth, code, redirect_uri)