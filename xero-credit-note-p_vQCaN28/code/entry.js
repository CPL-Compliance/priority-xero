import { axios } from "@pipedream/platform";

export default defineComponent({
  async run({ steps, $ }) {
    const jwt =  steps.getAccessToken_pipedreamNotification.$return_value.access_token;
    const tenant_id = steps.trigger.event?.tenantId || steps.trigger.event?.body?.tenantId;
    // Function to fetch detailed credit notes from Xero
    async function getNoteFromXero(creditNote) {
      return await axios($, {
        url: `https://api.xero.com/api.xro/2.0/CreditNotes/` + creditNote.CreditNoteID,
        headers: {
          Authorization: `Bearer ${jwt}`,
          "xero-tenant-id": tenant_id,
        },
      });
    }

    // Fetch credit notes if they exist in the invoice
    let detailedCreditNotes = [];
    if ("CreditNotes" in steps.HTTP_Calls.$return_value.invoiceDetails.Invoices[0]) {
      detailedCreditNotes = await Promise.all(
        steps.HTTP_Calls.$return_value.invoiceDetails.Invoices[0].CreditNotes.map(getNoteFromXero)
      );
    }

    // Exit early if there are no credit notes to process
    if (detailedCreditNotes.length === 0) return [];

    // Utility function to correct rounding issues
    function fixRounding(value, precision) {
      let power = Math.pow(10, precision || 0);
      const res = Math.round(value * power) / power;
      return isNaN(res) ? 0 : res;
    }

    // Function to process and update each credit note
    async function putCreditNote(creditNote) {
      let creditUpdatedDate = new Date(
        Number(
          creditNote.UpdatedDateUTC.substring(
            6,
            creditNote.UpdatedDateUTC.length - 7
          )
        )
      );

      // Map line items with calculated tax rates and codes
      let items = creditNote.LineItems.map(lineItem => {
        return {
          unitPrice: lineItem.UnitAmount,
          quantity: lineItem.Quantity,
          totalPrice: lineItem.LineAmount,
          description: lineItem.Description,
          name: lineItem.LineItemID,
          taxCode:
            "ItemCode" in lineItem &&
            lineItem.ItemCode in steps.client_config.$return_value.tax_code_map
              ? steps.client_config.$return_value.tax_code_map[lineItem.ItemCode]
              : "",
          manualSalesTaxRate: 0,
          salesTaxRates: {
            taxRate: fixRounding(lineItem.TaxAmount / lineItem.LineAmount, 8),
          },
        };
      });

      console.log("Processed Items: ", JSON.stringify(items));

      // Send updated credit note data to the API
      return await axios($, {
        method: "PUT",
        url: `https://${steps.client_config.$return_value.complyt_api_environment}.complyt.io/v1/transactions/source/6/externalId/${creditNote.CreditNoteID}`,
        headers: {
          Authorization: `Bearer ${steps.HTTP_Calls.$return_value.complytAuth.accessToken}`,
          "Content-Type": "application/json",
        },
        data: {
          externalId: creditNote.CreditNoteID,
          source: 6,
          documentName: creditNote.CreditNoteNumber,
          createdFrom: creditNote.Allocations[0].Invoice.InvoiceID,
          shippingAddress: JSON.parse(steps.data_mapper.$return_value.shippingAddress),
          transactionStatus: "ACTIVE",
          externalTimestamps: {
            createdDate: creditNote.DateString,
            updatedDate: creditUpdatedDate,
          },
          transactionType: "REFUND",
          customerId: steps.HTTP_Calls.$return_value.customerData.complytId,
          items: items,
          salesTax: {
            amount: creditNote.TotalTax,
          },
          subsidiary: `${steps.client_config.$return_value.subsidiary}`,
        },
      });
    }

    // Process and update all credit notes
    return await Promise.all(
      detailedCreditNotes.map(response => response.CreditNotes[0]).map(putCreditNote)
    );
  },
});
