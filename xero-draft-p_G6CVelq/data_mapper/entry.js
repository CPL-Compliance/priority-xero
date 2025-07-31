// To use previous step data, pass the `steps` object to the run() function
export default defineComponent({
  async run({ steps, $ }) {

    let taxCodeMap = {
      "PM-BR": "C3S1",
      "GB1-White": "C3S1",
      "GB3-White": "C3S1",
      "GB6-White": "C3S1",
      "GB9-White": "C3S1",
      "BOOK": "C3S1",
      "TSL - Black": "C3S1",
      "TSM - Black": "C3S1",
      "Train-MS": "C3S1",
      "Support-M": "C3S1",
      "Temp": "C3S1",
    }
    // A Rounding Fucntion as toFixed considered not consistent
    function fixRounding(value, precision) {
      let power = Math.pow(10, precision || 0);
      const res = Math.round(value * power) / power;
      return isNaN(res) ? 0 : res
    }

    let isTaxAlreadyCalculated = true
    let items = steps.get_trigger_invoice.$return_value.Invoices[0].LineItems
    .map(lineItem => { 
      let manualSalesTaxRate = 0
      let manualSalesTax = false
      if (lineItem.TaxType == steps.get_rates.$return_value.requested.TaxType ) { 
        isTaxAlreadyCalculated = false
      }  
      else if (lineItem.TaxType != steps.get_rates.$return_value.calculated.TaxType 
            && lineItem.TaxType != steps.get_rates.$return_value.exempted.TaxType) {
        manualSalesTax = true
        manualSalesTaxRate = fixRounding(lineItem.TaxAmount/lineItem.LineAmount,8)
      }
      let unitPrice = "DiscountRate" in lineItem 
        ? lineItem.UnitAmount-fixRounding(lineItem.DiscountAmount/lineItem.Quantity,8)
        : lineItem.UnitAmount
      
      return {
      unitPrice: unitPrice,
      quantity: lineItem.Quantity,
      totalPrice: lineItem.LineAmount,
      description: lineItem.Description,
      name: lineItem.LineItemID,
      taxCode: "ItemCode" in lineItem ? 
        lineItem.ItemCode in taxCodeMap ? 
        taxCodeMap[lineItem.ItemCode] : lineItem.ItemCode.split(' ')[0] : "",
      manualSalesTaxRate: manualSalesTaxRate,
      manualSalesTax: manualSalesTax
    }})

    // If all items don't require sales tax calculated or the country isn't USA than stop
    if (/*isTaxAlreadyCalculated || */steps.get_trigger_invoice.$return_value.Invoices[0].Contact.Addresses[0].Country != "USA") {
      $.flow.exit("Tax is already calculated or country isn't USA")
    }
    
    let shippingAddress = {
      city: steps.get_trigger_invoice["$return_value"].Invoices[0].Contact.Addresses[0].City,
      country: steps.get_trigger_invoice["$return_value"].Invoices[0].Contact.Addresses[0].Country,
      zip: steps.get_trigger_invoice["$return_value"].Invoices[0].Contact.Addresses[0].PostalCode,
      state: steps.get_trigger_invoice["$return_value"].Invoices[0].Contact.Addresses[0].Region,
      street: steps.get_trigger_invoice["$return_value"].Invoices[0].Contact.Addresses[0].AddressLine1,
    }

    return {
      items: JSON.stringify(items),
      shippingAddress: JSON.stringify(shippingAddress),
      taxCodeMap: taxCodeMap,
      isTaxAlreadyCalculated: isTaxAlreadyCalculated
    }
  },
})