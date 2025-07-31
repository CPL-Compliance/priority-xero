import { axios } from "@pipedream/platform";

export default defineComponent({
  props: {
    url: {
      type: "string",
      description: "URL for the API endpoint",
    }
  },
  async run({ steps, $ }) {
    // Check if there are credit notes to process. If not, exit the function early.
    if (steps.get_credit_notes_xero.$return_value.length === 0) return;

    // Function to correct rounding issues for financial values.
    function fixRounding(value, precision) {
      let power = Math.pow(10, precision || 0);
      const res = Math.round(value * power) / power;
      return isNaN(res) ? 0 : res;
    }

    // Set the base URL for API requests.
    const url = this.url;

    // Function to process and update each credit note.
    async function putCreditNote(creditNote) {
      // Parse and format the update date of the credit note.
      let creditUpdatedDate = new Date(Number(creditNote.UpdatedDateUTC.substring(6, creditNote.UpdatedDateUTC.length - 7)));


      // Process each line item in the credit note.
      let items = creditNote.LineItems.map(lineItem => {
        return {
          unitPrice: lineItem.UnitAmount,
          quantity: lineItem.Quantity,
          totalPrice: lineItem.LineAmount,
          description: lineItem.Description,
          name: lineItem.LineItemID,
          // Determine the tax code for the line item
          // If ItemCode exists and it's in the taxCodeMap
          taxCode: "ItemCode" in lineItem && lineItem.ItemCode in steps.data_mapper.$return_value.taxCodeMap ?
              // If yes, use the corresponding tax code from taxCodeMap
              steps.data_mapper.$return_value.taxCodeMap[lineItem.ItemCode] : 
              // If no, set tax code to an empty string
              "",
          manualSalesTaxRate: 0,
          salesTaxRates: {
            taxRate: fixRounding(lineItem.TaxAmount/lineItem.LineAmount, 8),
          },
        };
      });


      console.log("items: " + items)
      console.log("JSON.stringify(items): " + JSON.stringify(items))

      // Send the updated credit note information to the specified URL.
      return await axios($, {
        method: "PUT",
        url: `${url}` + creditNote.CreditNoteID,
        headers: {
          "Authorization": `Bearer ${steps.get_token_complyt.$return_value.accessToken}`,
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
          customerId: steps.put_customer.$return_value.complytId,
          items: items,
          salesTax: {
            amount: creditNote.TotalTax
          },
          subsidiary: `${steps.trigger.event.body.subsidiary}`
        },
      });
    }

    // Process each credit note and update them using the putCreditNote function.
    return await Promise.all(steps.get_credit_notes_xero.$return_value
      .map(response => response.CreditNotes[0])
      .map(putCreditNote));
  },
});
