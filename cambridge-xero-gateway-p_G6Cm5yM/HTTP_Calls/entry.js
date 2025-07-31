import { axios } from "@pipedream/platform";

export default defineComponent({
  async run({ steps, $ }) {
    // Retrieve necessary values from the steps
    const tenant_id =
      steps.trigger.event?.tenantId || steps.trigger.event?.body?.tenantId;
    const invoice_id =
      steps.trigger.event?.resourceId || steps.trigger.event?.body?.resourceId;
    const xero_access_token = steps.client_config?.$return_value?.xero_token;
    var cusomterResponse;

    // Define common headers for Xero API requests
    const headers = {
      Authorization: `Bearer ${xero_access_token}`,
      "xero-tenant-id": tenant_id,
    };

    // Define API calls with error handling
    let invoiceResponse, taxRatesResponse, complytAuthResponse;
    try {
      invoiceResponse = await axios($, {
        url: `https://api.xero.com/api.xro/2.0/Invoices/${invoice_id}`,
        headers,
      });
      console.log("Invoice response received successfully:", invoiceResponse);
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      throw new Error("Failed to fetch invoice details.");
    }

    try {
      taxRatesResponse = await axios($, {
        url: `https://api.xero.com/api.xro/2.0/TaxRates`,
        headers,
      });
      console.log("Tax rates response received successfully:", taxRatesResponse);
    } catch (error) {
      console.error("Error fetching tax rates:", error);
      throw new Error("Failed to fetch tax rates.");
    }

    try {
      complytAuthResponse = await axios($, {
        method: "POST",
        url: `https://${steps.client_config.$return_value.complyt_api_environment}.complyt.io/v1/token`,
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          clientId: steps.client_config.$return_value.complyt_client_id,
          clientSecret: steps.client_config.$return_value.complyt_client_secret,
        },
      });
      console.log("Complyt auth response received successfully:", complytAuthResponse);
    } catch (error) {
      console.error("Error during Complyt authentication:", error);
      throw new Error("Failed to authenticate with Complyt.");
    }

    // Process invoice details for subsequent API calls
    const invoiceDetails = invoiceResponse.Invoices[0];
    const contact_guid = invoiceDetails.Contact.ContactID;
    const contact_updated_date = invoiceDetails.Contact.UpdatedDateUTC;
    const invoice_updated_date = invoiceDetails.UpdatedDateUTC;

    // Define dependent API calls
    let contactHistoryResponse, invoiceHistoryResponse, customerResponse;

    try {
      contactHistoryResponse = await axios($, {
        url: `https://api.xero.com/api.xro/2.0/Contacts/${contact_guid}/history`,
        headers,
      });
      console.log("Contact history response received successfully:", contactHistoryResponse);
    } catch (error) {
      console.error("Error fetching contact history:", error);
    }

    try {
      invoiceHistoryResponse = await axios($, {
        url: `https://api.xero.com/api.xro/2.0/Invoices/${invoice_id}/history`,
        headers,
      });
      console.log("Invoice history response received successfully:", invoiceHistoryResponse);
    } catch (error) {
      console.error("Error fetching invoice history:", error);
      throw new Error("Failed to fetch invoice history.");
    }

    try {
       customerResponse = await axios($, {
        url: `https://${steps.client_config.$return_value.complyt_api_environment}.complyt.io/v1/customers/source/6/externalId/${contact_guid}`,
        headers: {
          Authorization: `Bearer ${complytAuthResponse.accessToken}`,
        },
      });
      console.log("Customer response received successfully:", customerResponse);
    } catch (error) {
      console.log("Error fetching customer from Complyt:", error.message);
    
        try {
          const xeroCustomer = await axios($, {
            url: `https://api.xero.com/api.xro/2.0/Contacts/${contact_guid}`,
            headers,
          });
          console.log("Xero Customer response received successfully:", xeroCustomer);
        
          const contacts = xeroCustomer?.Contacts;
          if (!contacts || contacts.length === 0) {
            console.error("No Contacts found in Xero response.");
            return; // Exit gracefully if no contacts are found
          }
        
          const contact = contacts[0]; // Use the first contact
          console.log("Contact retrieved successfully:", contact);
        
          // Construct the payload for the PUT request
          const putPayload = {
            externalId: contact.ContactID,
            source: "6",
            name: contact.Name,
            externalTimestamps: {
              createdDate: contactHistoryResponse?.HistoryRecords?.[contactHistoryResponse.HistoryRecords.length - 1]?.DateUTCString || null,
              updatedDate: contact_updated_date
                ? new Date(Number(contact_updated_date.substring(6, contact_updated_date.length - 7)))
                : null,
            },
            customerType: "RETAIL",
          };
        
          try {
            customerResponse = await axios($, {
              method: "PUT",
              url: `https://${steps.client_config.$return_value.complyt_api_environment}.complyt.io/v1/customers/source/6/externalId/${contact.ContactID}`,
              headers: {
                Authorization: `Bearer ${complytAuthResponse.accessToken}`,
                "Content-Type": "application/json",
              },
              data: putPayload,
            });
        
            console.log("Customer successfully created/updated in Complyt:", customerResponse);
          } catch (putError) {
            console.error("Error updating/creating customer in Complyt:", putError.message);
          }
        } catch (innerError) {
          console.error("Error fetching customer from Xero:", innerError.message);
        }


    }




    // Manipulate data for Complyt's format
    const contactUpdatedDate = new Date(
      Number(contact_updated_date.substring(6, contact_updated_date.length - 7))
    );
    const invoiceUpdatedDate = new Date(
      Number(invoice_updated_date.substring(6, invoice_updated_date.length - 7))
    );
    const contactCreatedDate =
      contactHistoryResponse.HistoryRecords[
        contactHistoryResponse.HistoryRecords.length - 1
      ].DateUTCString;
    const invoiceCreatedDate =
      invoiceHistoryResponse.HistoryRecords[
        invoiceHistoryResponse.HistoryRecords.length - 1
      ].DateUTCString;

    // Filter the tax rates to include only those with "(Complyt)"
    const rates = taxRatesResponse.TaxRates.filter((taxRate) =>
      taxRate.Name.includes("(Complyt)")
    );

    const filteredRates = {
      requested: rates.find(
        (rate) => rate.Name === "Request Sales Tax Calculation (Complyt)"
      ),
      calculated: rates.find(
        (rate) => rate.Name === "Tax Calculated (Complyt)"
      ),
      exempted: rates.find((rate) => rate.Name === "Tax Exempted (Complyt)"),
    };

    if ("CreditNotes" in invoiceResponse.Invoices[0]) {
      const response = await axios($, {
        method: "POST",
        url: "https://eolph1in5cik0ts.m.pipedream.net",
        headers: steps.client_config.$return_value.headers,
        data: {
          tax_code_map: steps.client_config.$return_value.tax_code_map,
          event_details: steps.trigger.event?.body || steps.trigger.event,
          tax_rate_type_map:  steps.client_config.$return_value.tax_rate_type_map,
          name: steps.client_config.$return_value.name,
          subsidiary: steps.client_config.$return_value.subsidiary,
          auto_assessment: steps.trigger.event.headers?.auto_assessment || false,
          credit_note_details: invoiceResponse.Invoices[0].CreditNotes
        },
      });
    }
    // Return the results from all calls
    return {
      invoiceDetails: invoiceResponse,
      taxRates: filteredRates,
      originalTaxRates: taxRatesResponse,
      complytAuth: complytAuthResponse,
      contactHistory: {
        contactCreatedDate,
        contactUpdatedDate,
      },
      invoiceHistory: {
        invoiceCreatedDate,
        invoiceUpdatedDate,
      },
      customerData: customerResponse,
    };
  },
});
