import { axios } from "@pipedream/platform";

/**
 * ✅ Generic retry logic for Xero & Complyt API calls
 */
async function fetchWithRetry($, axiosConfig, maxRetries = 5, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios($, axiosConfig);
      return response;
    } catch (error) {
      const status = error?.response?.status || 0;
      const retryAfter = error?.response?.headers?.['retry-after'];

      console.error(`Attempt ${attempt + 1} failed: HTTP ${status}`);

      // Log Xero's error payload
      if (error?.response?.data) {
        console.error("Xero Error Payload:", JSON.stringify(error.response.data, null, 2));
      }

      if (status === 429) {
        const wait = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, attempt);
        console.warn(`429 rate limit hit. Waiting ${wait}ms`);
        await new Promise(resolve => setTimeout(resolve, wait));
      } else if ([500, 502, 503, 504].includes(status)) {
        const wait = baseDelay * Math.pow(2, attempt);
        console.warn(`Transient error. Waiting ${wait}ms`);
        await new Promise(resolve => setTimeout(resolve, wait));
      } else if ([400, 401, 403, 404].includes(status)) {
        console.error(`Permanent failure (HTTP ${status}). Not retrying.`);
        throw error;
      } else {
        if (attempt >= maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
      }
    }
  }
  throw new Error("Exceeded retry attempts");
}

export default defineComponent({
  async run({ steps, $ }) {
    const {
      tenantId, tax_code_map, resourceId: invoiceId, xero_token: xeroAccessToken,
      complyt_api_environment, headers: { complyt_client_id, complyt_client_secret },
    } = steps.Xero_Event_Gateway.$return_value;

    const xeroHeaders = { Authorization: `Bearer ${xeroAccessToken}`, "xero-tenant-id": tenantId };

    // 🔧 Prepare calls using retry function
    const fetchOrganisation = () => fetchWithRetry($, {
      url: 'https://api.xero.com/api.xro/2.0/Organisation',
      method: 'GET',
      headers: xeroHeaders,
    });

    const fetchData = (url, method = "GET", data = null, headers = xeroHeaders) => 
      fetchWithRetry($, { url, method, headers, data });

    const [invoiceResponse, taxRatesResponse, complytAuthResponse] = await Promise.all([
      fetchData(`https://api.xero.com/api.xro/2.0/Invoices/${invoiceId}`),
      fetchData("https://api.xero.com/api.xro/2.0/TaxRates"),
      fetchWithRetry($, {
        url: `https://${complyt_api_environment}.complyt.io/v1/token`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: { clientId: complyt_client_id, clientSecret: complyt_client_secret }
      }),
    ]);

    const invoiceDetails = invoiceResponse.Invoices[0];
    const { ContactID: contactGuid, UpdatedDateUTC: invoiceUpdatedDate } = invoiceDetails.Contact;

    const [contactHistoryResponse, invoiceHistoryResponse, organisationResponse] = await Promise.all([
      fetchData(`https://api.xero.com/api.xro/2.0/Contacts/${contactGuid}/history`),
      fetchData(`https://api.xero.com/api.xro/2.0/Invoices/${invoiceId}/history`),
      fetchOrganisation(),
    ]);

    let customerResponse;
    try {
      customerResponse = await fetchData(
        `https://${complyt_api_environment}.complyt.io/v1/customers/source/6/externalId/${contactGuid}`,
        "GET",
        null,
        { Authorization: `Bearer ${complytAuthResponse.accessToken}` }
      );
    } catch (error) {
      console.log("Customer not found in Complyt. Fetching from Xero...");
      try {
        const xeroCustomer = await fetchData(`https://api.xero.com/api.xro/2.0/Contacts/${contactGuid}`);
        const contact = xeroCustomer?.Contacts?.[0];
        if (!contact) throw new Error("No contact found in Xero response.");
        const putPayload = {
          externalId: contact.ContactID,
          source: "6",
          name: contact.Name,
          externalTimestamps: {
            createdDate: contactHistoryResponse?.HistoryRecords?.slice(-1)[0]?.DateUTCString || null,
            updatedDate: new Date(Number(contact.UpdatedDateUTC.substring(6, contact.UpdatedDateUTC.length - 7))),
          },
          customerType: "RETAIL",
        };
        customerResponse = await fetchWithRetry($, {
          url: `https://${complyt_api_environment}.complyt.io/v1/customers/source/6/externalId/${contact.ContactID}`,
          method: "PUT",
          headers: {
            Authorization: `Bearer ${complytAuthResponse.accessToken}`,
            "Content-Type": "application/json",
          },
          data: putPayload,
        });
      } catch (innerError) {
        console.error("Error fetching customer from Xero:", innerError);
      }
    }

    const parseDate = (dateString) => new Date(Number(dateString.substring(6, dateString.length - 7)));

    const filteredRates = taxRatesResponse.TaxRates.filter((rate) => rate.Name.includes("(Complyt)"));
    const taxRateMapping = {
      requested: filteredRates.find((rate) => rate.Name === "Request Sales Tax Calculation (Complyt)"),
      calculated: filteredRates.find((rate) => rate.Name === "Tax Calculated (Complyt)"),
      exempted: filteredRates.find((rate) => rate.Name === "Tax Exempted (Complyt)"),
    };

    if (invoiceResponse.Invoices[0].CreditNotes) {
      await fetchData("https://eolph1in5cik0ts.m.pipedream.net", "POST", {
        tax_code_map: tax_code_map,
        event_details: steps.trigger.event?.body || steps.trigger.event,
        auto_assessment: steps.trigger.event.headers?.auto_assessment || false,
        credit_note_details: invoiceResponse.Invoices[0].CreditNotes,
      });
    }

    const taxRatesArray = Array.isArray(taxRatesResponse?.TaxRates) ? taxRatesResponse.TaxRates : [];
    const firstTaxRate = taxRatesArray.length > 0 ? taxRatesArray[0] : null;
    const firstReportTaxType = firstTaxRate?.ReportTaxType ?? null;

    return {
      invoiceDetails,
      taxRates: taxRateMapping,
      originalTaxRates: taxRatesResponse,
      ReportTaxType: firstReportTaxType,
      complytAuth: complytAuthResponse,
      contactHistory: {
        contactCreatedDate: contactHistoryResponse?.HistoryRecords?.slice(-1)[0]?.DateUTCString,
        contactUpdatedDate: parseDate(invoiceDetails.Contact.UpdatedDateUTC),
      },
      invoiceHistory: {
        invoiceCreatedDate: invoiceHistoryResponse?.HistoryRecords?.slice(-1)[0]?.DateUTCString,
        invoiceUpdatedDate: parseDate(invoiceUpdatedDate),
      },
      fullInvoiceHistory: invoiceHistoryResponse,
      customerData: customerResponse,
      organisationResponse,
    };
  }
});
