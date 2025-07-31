import { axios } from "@pipedream/platform"
export default defineComponent({
  props: {
    url: {
      type: "string",
      description: "URL",
    }
  },
  async run({steps, $}) {

    if (steps.get_credit_notes.$return_value.length == 0) return;

    function fixRounding(value, precision) {
      let power = Math.pow(10, precision || 0);
      const res = Math.round(value * power) / power;
      return isNaN(res) ? 0 : res
    }
    const url = this.url

    async function putCreditNote(creditNote) {
      let creditUpdatedDate = new Date(Number(creditNote.UpdatedDateUTC.substring(6, creditNote.UpdatedDateUTC.length - 7)))
      let items = creditNote.LineItems.map(lineItem => { 
      return {
        unitPrice: lineItem.UnitAmount,
        quantity: lineItem.Quantity,
        totalPrice: lineItem.LineAmount,
        description: lineItem.Description,
        name: lineItem.LineItemID,
        taxCode: "ItemCode" in lineItem ? 
          lineItem.ItemCode in steps.data_mapper.$return_value.taxCodeMap ? 
            steps.data_mapper.$return_value.taxCodeMap[lineItem.ItemCode] : 
            lineItem.ItemCode.split(' ')[0] : 
          "",
        manualSalesTaxRate: 0,
        salesTaxRates: {
          taxRate: fixRounding(lineItem.TaxAmount/lineItem.LineAmount,8),
        },
      }})
      
      return await axios($, {
        method: "PUT",
        url: `${url}` + creditNote.CreditNoteID,
        headers: {
            "Authorization": `Bearer ${steps.get_token.$return_value.accessToken}`,
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
          }
        },
      }
    )}
    steps.get_credit_notes.$return_value[0].CreditNotes[0].TotalTax
    return await Promise.all(steps.get_credit_notes.$return_value
    .map(response => response.CreditNotes[0]).map(putCreditNote))
  },
})
