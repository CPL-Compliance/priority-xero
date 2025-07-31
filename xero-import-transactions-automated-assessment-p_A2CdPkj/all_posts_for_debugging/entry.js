import axios from "axios";

export default defineComponent({
  async run({ steps, $ }) {
    // Get the sorted invoices from the previous step
    const sortedInvoices = steps.only_usa_transactions.$return_value;

    // Get the access token and tenant ID from the previous step
    const accessToken = steps.get_xero_access_token.$return_value.Connection.access_token;
    const tenantId = steps.trigger.event.body.tenantId;

    // Define the endpoint and headers for the POST request
    const endpoint = "https://eozg38fqfmoa41y.m.pipedream.net";
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    };

    // Function to wait for a specified amount of time
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Array to store debug information
    const debugInfo = [];

    // Iterate over each sorted invoice and prepare the POST request payload with a delay
    for (const invoice of sortedInvoices) {
      const payload = {
        eventCategory: "INVOICE",
        eventType: "UPDATE",
        resourceId: invoice.id,
        resourceUrl: `https://api.xero.com/api.xro/2.0/Invoices/${invoice.id}`,
        tenantId: tenantId,
        invoiceNumber: invoice.number
      };

      // Push the debug info to the array instead of making the POST request
      debugInfo.push({
        payload: payload,
        headers: headers
      });

      // Print the payload for debugging purposes
      console.log(`Prepared POST request for InvoiceID ${invoice.id}`, payload);


    }

    // Return the debug information for use in future steps
    return { debugInfo };
  },
});
