// To use previous step data, pass the `steps` object to the run() function
export default defineComponent({
  async run({ steps, $ }) {
    let lineItems = steps.put_transaction.$return_value.items
    let originalLineItems = steps.get_trigger_invoice.$return_value.Invoices[0].LineItems

    for (let i = 0; i < lineItems.length; i++) {
      lineItems[i] = {
        LineItemID: originalLineItems[i].LineItemID,
        UnitAmount: originalLineItems[i].UnitAmount,
        Quantity: originalLineItems[i].Quantity,
        ItemCode: "ItemCode" in originalLineItems[i] ? originalLineItems[i].ItemCode : "",
        Description: originalLineItems[i].Description, 
        LineAmount: originalLineItems[i].LineAmount,
        TaxType: lineItems[i].salesTaxRates.taxRate != 0 ? steps.get_rates.$return_value.calculated.TaxType : steps.get_rates.$return_value.exempted.TaxType ,
        TaxAmount: lineItems[i].totalPrice*lineItems[i].salesTaxRates.taxRate,
        Tracking: originalLineItems[i].Tracking,
        AccountCode: originalLineItems[i].AccountCode,
        }
        if ("DiscountAmount" in originalLineItems[i]) lineItems[i].DiscountAmount = originalLineItems[i].DiscountAmount
    }

    return {
      lineItems: lineItems
    }
  },
})