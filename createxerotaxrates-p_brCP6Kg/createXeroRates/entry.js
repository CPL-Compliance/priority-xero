import { axios } from "@pipedream/platform";

export default defineComponent({
  async run({ steps, $ }) {
    // Extract the distinct tax rates from the previous step
    const distinctTaxRates = steps.getDistinctTaxRates.$return_value.distinctTaxRates;

    if (!distinctTaxRates || distinctTaxRates.length === 0) {
      throw new Error("No distinct tax rates found to create in Xero.");
    }

    // Xero API credentials and endpoint
    const xeroEndpoint = "https://api.xero.com/api.xro/2.0/TaxRates";
    const accessToken = steps.get_client_config.$return_value.access_token; // Use Xero access token from authentication step
    const tenantId = steps.trigger.event.body["xero-tenant-id"]; // Use Xero tenant ID from authentication step

    // Iterate through the distinct tax rates and create POST requests
    const results = [];

    for (const rate of distinctTaxRates) {
      const taxRateValue = rate * 100; // Convert rate to percentage
      const taxRatePayload = {
        Name: `US Sales Tax (${taxRateValue.toFixed(2)}%)`,
        TaxComponents: [
          {
            Name: "Total Sales Tax",
            Rate: taxRateValue.toFixed(2), // Rate in percentage format
            IsCompound: false,
            IsNonRecoverable: false,
          },
        ],
      };

      try {
        const response = await axios($, {
          method: "POST",
          url: xeroEndpoint,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "xero-tenant-id": tenantId,
          },
          data: taxRatePayload,
        });

        console.log(`Successfully created tax rate: ${taxRatePayload.Name}`);
        results.push({
          success: true,
          taxRateName: taxRatePayload.Name,
          response: response.data,
        });
      } catch (error) {
        console.error(`Failed to create tax rate for ${rate}: ${error.message}`);
        results.push({
          success: false,
          taxRateName: taxRatePayload.Name,
          error: error.message,
        });
      }
    }

    // Return the results of the API calls
    return { results };
  },
});
