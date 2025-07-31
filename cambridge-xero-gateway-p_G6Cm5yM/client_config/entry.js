import { axios } from "@pipedream/platform";

export default defineComponent({
  props: {
    xeroClientConfig: {
      type: "data_store",
    },
  },
  async run({ steps, $ }) {
    // Extract tenantId from the event
    const tenantId = steps.trigger.event?.tenantId || steps.trigger.event?.body?.tenantId;

    console.log("Extracted tenantId:", tenantId);

    if (!tenantId) {
      console.error("Tenant ID is missing from the event.");
      $.flow.exit("Stopping the workflow as Tenant ID is not provided.");
      return;
    }

    // Retrieve tenant details from the data store
    const tenantDetails = await this.xeroClientConfig.get(tenantId);

    if (!tenantDetails) {
      console.error(`Tenant details not found in the data store for tenantId: ${tenantId}`);
      $.flow.exit(`Stopping the workflow as Tenant details are not found for tenantId: ${tenantId}`);
      return;
    }

    console.log("Retrieved Tenant Details:", tenantDetails);

    // Determine the event details to support both triggers
    const eventDetails = steps.trigger.event?.body || steps.trigger.event;
    console.log("Event details:", eventDetails);

    // Retrieve auto_assessment header if available
    const autoAssessment = steps.trigger.event.headers?.auto_assessment || false;
    console.log("Auto-assessment details:", autoAssessment);
    
    // Define common headers
    const headers = {
      new_xero_token: steps["getAccessToken_pipedreamNotification"]["$return_value"]["access_token"],
      complyt_client_id: process.env[`clientId_${tenantDetails.name}`],
      complyt_client_secret: process.env[`clientSecret_${tenantDetails.name}`],
      complyt_api_environment: tenantDetails.complyt_api_environment,
    };

    let response;

    if (eventDetails.eventCategory === "INVOICE") {
      // Send to Transactions Flow
      // response = await axios($, {
      //   method: "POST",
      //   url: "https://eo6aerpozvvbepl.m.pipedream.net",
      //   headers,
      //   data: {
      //     tax_code_map: tenantDetails.tax_code_map,
      //     event_details: eventDetails,
      //     tax_rate_type_map: tenantDetails.tax_rate_type_map,
      //     name: tenantDetails.name,
      //     subsidiary: tenantDetails.subsidiary,
      //     auto_assessment: autoAssessment,
      //   },
      // });
    } else {
      // Send to Customer Flow
      response = await axios($, {
        method: "POST",
        url: "https://eoxy7ccl90kbn00.m.pipedream.net",
        headers,
        data: {
          event_details: eventDetails,
          name: tenantDetails.name,
        },
      });
      $.flow.exit("Ending Gateway/Transaction Flow ---> Entering Customer Flow");
    }

    // Return both headers and body
    return {
      xero_token: steps["getAccessToken_pipedreamNotification"]["$return_value"]["access_token"],
      complyt_client_id: process.env[`clientId_${tenantDetails.name}`],
      complyt_client_secret: process.env[`clientSecret_${tenantDetails.name}`],
      complyt_api_environment: tenantDetails.complyt_api_environment,
      tax_code_map: tenantDetails.tax_code_map,
      tax_rate_type_map: tenantDetails.tax_rate_type_map,
      name: tenantDetails.name,
      subsidiary: tenantDetails.subsidiary,
      auto_assessment: autoAssessment,
      line_item_tax: tenantDetails.line_item_tax,
      headers
      
    };
  },
});
