import { axios } from "@pipedream/platform";

export default defineComponent({
  props: {
    xeroClientConfig: { type: "data_store" },
    data_store: { type: "data_store" }, // Default token store
    data_store_1: { type: "data_store" }, // Special Cambridge token store
  },

  async run({ steps, $ }) {
    console.log("Starting Pipedream Component...");

    async function logToDatadog(level, message, event, extraData = {}) {
      console[level](message);
      const workflowName = steps.trigger.context.workflow_name || "";
      const tenantId = event.tenantId || "";
      const externalId = event.resourceId || "";
      const clientName = extraData.client_name || "";
      const integrationSystem = "Xero";
      const environment = "prod";
      const eventCategory = event.eventCategory || "";
      const eventType = event.eventType || "";
      const severityMap = { info: "info", warn: "warning", error: "error" };

      const logData = {
        ddsource: "PipeDream",
        env: environment,
        ddtags: `severity=${level}`,
        status: severityMap[level] || "info",
        message,
        service: "PipeDream",
        flow_name: workflowName,
        integration_system: integrationSystem,
        xero_tenant_id: tenantId,
        client_name: clientName,
        eventCategory,
        eventType,
        externalId,
        ...extraData,
      };

      try {
        await axios($, {
          method: "POST",
          url: "https://http-intake.logs.datadoghq.com/api/v2/logs",
          headers: {
            "Content-Type": "application/json",
            "DD-API-KEY": process.env.dd_api_key,
            "DD-APPLICATION-KEY": process.env.dd_application_key,
          },
          data: logData,
        });
      } catch (error) {
        console.error("Failed to log to Datadog:", error);
      }
    }

    console.log("RAW EVENT DATA:", JSON.stringify(steps.trigger.event, null, 2));
    let event_data = steps.trigger.event;
    let event;

    if (event_data.headers && event_data.body) {
      console.log("DEBUG: Detected Nested Event Format");
      event = event_data.body.event || event_data.body || {};
    } else if (event_data.event) {
      console.log("DEBUG: Detected Standard Event Format");
      event = event_data.event || {};
    } else {
      console.log("WARNING: Unexpected Event Format, using fallback.");
      event = event_data || {};
    }

    console.log("EXTRACTED EVENT:", JSON.stringify(event, null, 2));
    const tenantId = event.tenantId || "";
    if (!tenantId) {
      await logToDatadog("error", "XERO: ❌ Tenant ID is missing.", event);
      $.flow.exit("Stopping workflow: Tenant ID is missing.");
      return;
    }
    await logToDatadog("info", `XERO: 🔹 Extracted tenantId: ${tenantId}`, event);

    const resourceId = event.resourceId || "";
    if (!resourceId) {
      await logToDatadog("error", "XERO: ❌ resourceId is missing.", event);
      $.flow.exit("Stopping workflow: resourceId is missing.");
      return;
    }
    await logToDatadog("info", `XERO: 🔹 Extracted resourceId: ${resourceId}`, event);

    // 1️⃣ Retrieve tenant config
    const tenantDetails = await this.xeroClientConfig.get(tenantId);
    if (!tenantDetails) {
      await logToDatadog("error", `XERO: ❌ Tenant details not found for tenantId: ${tenantId}`, event);
      $.flow.exit(`Stopping workflow: Tenant details missing for ${tenantId}`);
      return;
    }
    await logToDatadog("info", "XERO: 📄 Tenant Details Retrieved.", event, { client_name: tenantDetails.name });

    // 2️⃣ Determine token store and key
    let tokenKey = "Connection";
    let dataStore;

    if (tenantDetails.auth_name) {
      tokenKey = tenantDetails.auth_name;
      dataStore = this.data_store;
      await logToDatadog("info", `XERO: 🔐 auth_name '${tokenKey}' found in config, using as token key.`, event, { client_name: tenantDetails.name });
    } else if (tenantId === "deed4fec-5dcc-4603-8b01-418c9b0fc9d6") {
      dataStore = this.data_store_1;
      await logToDatadog("info", "XERO: 🏫 Cambridge tenant detected, using data_store_1.", event);
    } else {
      dataStore = this.data_store;
      await logToDatadog("info", "XERO: 🗃️ Using default token data store.", event);
    }

    const storedValue = await dataStore.get(tokenKey) || {};
    const access_token = storedValue.access_token ?? "MISSING_TOKEN";

    if (!access_token || access_token === "MISSING_TOKEN") {
      await logToDatadog("error", "XERO: ❌ Xero Access Token is missing.", event);
      $.flow.exit("Stopping workflow: Missing Xero Token.");
      return;
    }
    await logToDatadog("info", "XERO: 🔑 Xero Access Token Retrieved.", event);

    // 3️⃣ Auto-assessment header
    const autoAssessment = event_data.headers?.auto_assessment || false;
    await logToDatadog("info", `XERO: 🔍 Auto-assessment details: ${autoAssessment}`, event, {
      client_name: tenantDetails.name,
    });

    // 4️⃣ API headers
    const apiHeaders = {
      new_xero_token: access_token,
      complyt_client_id: process.env[`clientId_${tenantDetails.name}`],
      complyt_client_secret: process.env[`clientSecret_${tenantDetails.name}`],
      complyt_api_environment: tenantDetails.complyt_api_environment,
    };
    console.log("apiHeaders:   ", apiHeaders);

    // 5️⃣ Route based on event category
    if (event.eventCategory === "CONTACT") {
      await logToDatadog("info", "XERO: 📌 Processing a Customer Flow event... Routing to Customer Flow.", event, {
        client_name: tenantDetails.name,
      });
      try {
        await axios($, {
          method: "POST",
          url: "https://eoxy7ccl90kbn00.m.pipedream.net",
          headers: apiHeaders,
          data: {
            event_details: event,
            name: tenantDetails.name,
          },
        });
        await logToDatadog("info", "XERO: ✅ Successfully sent to Customer Flow.", event, {
          client_name: tenantDetails.name,
        });
      } catch (error) {
        await logToDatadog("error", "XERO: ⚠️ Error sending to Customer Flow.", { error: error.message }, event, {
          client_name: tenantDetails.name,
        });
      }
      $.flow.exit(" Exiting Workflow - Entering Customer Flow.");
    } else if (event.eventCategory === "INVOICE") {
      await logToDatadog("info", "XERO: ✅ INVOICE event detected. Continuing current flow.", event, {
        client_name: tenantDetails.name,
      });
    } else {
      await logToDatadog("error", `XERO: ❌ Unrecognized event type detected: ${event.eventCategory}`, event, {
        client_name: tenantDetails.name,
      });
      $.flow.exit(`Stopping workflow: Unrecognized event type '${event.eventCategory}'`);
    }

    return {
      xero_token: access_token,
      complyt_client_id: process.env[`clientId_${tenantDetails.name}`],
      complyt_client_secret: process.env[`clientSecret_${tenantDetails.name}`],
      complyt_api_environment: tenantDetails.complyt_api_environment,
      tax_code_map: tenantDetails.tax_code_map,
      tax_rate_type_map: tenantDetails.tax_rate_type_map,
      name: tenantDetails.name,
      subsidiary: tenantDetails.subsidiary,
      auto_assessment: autoAssessment,
      line_item_tax: tenantDetails.line_item_tax,
      headers: apiHeaders,
      tenantId,
      resourceId,
    };
  },
});
