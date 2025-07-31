import requests
import json
from datetime import datetime, timezone

def handler(pd: "pipedream"):
    # Extract and parse the event data from the trigger step
    event_data = pd.steps["trigger"]["event"]  # Convert JSON string to dictionary
    print("event_data: ", event_data)
  
    # Extract and parse the 'body' (which is a JSON string)
    parsed_body = json.loads(event_data["body"])  # Convert JSON string to dictionary
    print("parsed_body: ", parsed_body)

    # Get the list of events from the parsed body
    events = parsed_body.get("events", [])
    print("events: ", events)
  
    # Replace with your actual Pipedream destination URL
    PIPEDREAM_WEBHOOK_URL = "https://eozg38fqfmoa41y.m.pipedream.net"

    # Function to send event to Pipedream
    def send_event_to_pipedream(event):
        payload = {
            "context": {
                "id": pd.steps["trigger"]["context"]["id"],
                "ts": pd.steps["trigger"]["context"]["ts"],
                "pipeline_id": pd.steps["trigger"]["context"]["pipeline_id"],
                "workflow_id": pd.steps["trigger"]["context"]["workflow_id"],
                "deployment_id": pd.steps["trigger"]["context"]["deployment_id"],
                "source_type": pd.steps["trigger"]["context"]["source_type"],
                "verified": pd.steps["trigger"]["context"]["verified"],
                "hops": pd.steps["trigger"]["context"]["hops"],
                "test": pd.steps["trigger"]["context"]["test"],
                "replay": pd.steps["trigger"]["context"]["replay"],
                "owner_id": pd.steps["trigger"]["context"]["owner_id"],
                "platform_version": pd.steps["trigger"]["context"]["platform_version"],
                "workflow_name": pd.steps["trigger"]["context"]["workflow_name"],
                "resume": pd.steps["trigger"]["context"]["resume"],
                "emitter_id": pd.steps["trigger"]["context"]["emitter_id"],
                "external_user_id": pd.steps["trigger"]["context"]["external_user_id"],
                "external_user_environment": pd.steps["trigger"]["context"]["external_user_environment"],
                "trace_id": pd.steps["trigger"]["context"]["trace_id"],
                "project_id": pd.steps["trigger"]["context"]["project_id"],
            },
            "event": event
        }

        headers = {"Content-Type": "application/json"}
        response = requests.post(PIPEDREAM_WEBHOOK_URL, data=json.dumps(payload), headers=headers)
        return {"status_code": response.status_code, "response": response.text}

    # Iterate over events and send them
    results = []
    for event in events:
        result = send_event_to_pipedream(event)
        results.append({"resourceId": event["resourceId"], "status": result})

    # Return results for logging in Pipedream
    return {"processed_events": results}


