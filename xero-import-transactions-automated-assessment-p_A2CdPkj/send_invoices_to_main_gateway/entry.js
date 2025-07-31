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
      "Authorization": `Bearer ${accessToken}`,
      "auto_assessment": true
    };

    // Function to wait for a specified amount of time
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Iterate over each sorted invoice and execute the POST request with a delay
    for (const invoice of sortedInvoices) {
      const payload = {
        eventCategory: "INVOICE",
        eventType: "UPDATE",
        resourceId: invoice.id,
        resourceUrl: `https://api.xero.com/api.xro/2.0/Invoices/${invoice.id}`,
        tenantId: tenantId,
        invoiceNumber: invoice.number
      };
      try {
        const response = await axios.post(endpoint, payload, { headers });
        // Print the response for debugging purposes
        console.log(`POST request for InvoiceID ${invoice.id}: ${response.status} - ${response.data}`);
      } catch (error) {
        console.error(`Error posting InvoiceID ${invoice.id}: ${error.response?.status} - ${error.response?.data}`);
      }
      
      // Wait for 5000 milliseconds before making the next request
      await delay(5000);
    }

    return { invoiceIds: sortedInvoices.map(invoice => invoice.id) };
  },
});
