import os
import requests

def handler(pd):
    url = "https://http-intake.logs.datadoghq.com/api/v2/logs"
    headers = {
        "Content-Type": "application/json",
        "DD-API-KEY": os.getenv("dd_api_key"),
        "DD-APPLICATION-KEY": os.getenv("dd_application_key"),
    }

    eventCategory = pd.steps["trigger"]["event"]["body"]["event_details"].get("eventCategory") or ""
    eventType = pd.steps["trigger"]["event"]["body"]["event_details"].get("eventType") or ""
    resourceId = pd.steps["trigger"]["event"]["body"]["event_details"].get("resourceId") or ""
    resourceUrl = pd.steps["trigger"]["event"]["body"]["event_details"].get("resourceUrl") or ""
    tenantId = pd.steps["trigger"]["event"]["body"]["event_details"].get("tenantId") or ""
    tenantType = pd.steps["trigger"]["event"]["body"]["event_details"].get("tenantType") or ""
  
    data = {
        "ddsource": "PipeDream",
        "client_name": "",
        "xero_tenant_id": tenantId,
        "env": "prod",
        "ddtags": "severity=info",
        "message": f"Flow run started for {pd.steps['trigger']['context']['workflow_name']}, {eventCategory}: {eventType}",
        "flow_name": pd.steps["trigger"]["context"]["workflow_name"],
        "service": "PipeDream",
        "externalId": resourceId,
        "integration_system": "Xero",
    }
      
    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()  # Raise an exception for HTTP errors
        print("Response from Datadog:", response.json())
        return response.json()  # Return response data
    except requests.exceptions.RequestException as error:
        print("Error sending log to Datadog:", str(error))
        raise RuntimeError(f"Error sending log to Datadog: {str(error)}")
