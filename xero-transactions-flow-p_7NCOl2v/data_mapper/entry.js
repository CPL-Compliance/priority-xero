//This step organizes all the data

export default defineComponent({
  async run({ steps, $ }) {

    console.log(steps.GET_invoice_Xero.$return_value.Invoices[0].Contact.Addresses[1].Country)
    
    // STOP Condition: If country isn't USA then stop
    if (!["USA", "United States","US","united states","United states","usa"].includes(steps.GET_invoice_Xero.$return_value.Invoices[0].Contact.Addresses[1].Country)) {
      $.flow.exit("Country isn't USA");
    }

    if (steps.GET_invoice_Xero.$return_value.Invoices[0].Type == "ACCPAY") {
      $.flow.exit("Transaction Type is ACCPAY - e.g Supplier Invoice");
    }

    let shippingAddress = {
      // Shipping address is the second element in the contact address array, therefore Addresses[1]
      city: steps.GET_invoice_Xero["$return_value"].Invoices[0].Contact.Addresses[1].City,
      country: steps.GET_invoice_Xero["$return_value"].Invoices[0].Contact.Addresses[1].Country,
      zip: steps.GET_invoice_Xero["$return_value"].Invoices[0].Contact.Addresses[1].PostalCode,
      state: steps.GET_invoice_Xero["$return_value"].Invoices[0].Contact.Addresses[1].Region,
      street: steps.GET_invoice_Xero["$return_value"].Invoices[0].Contact.Addresses[1].AddressLine1,
    }

    let taxCodeMap = steps.trigger.event.body.tax_code_map

    // A custom rounding function.  (toFixed function os not suitable (considered not consistent)) 
    function fixRounding(value, precision) {
      let power = Math.pow(10, precision || 0);
      const res = Math.round(value * power) / power;
      return isNaN(res) ? 0 : res
    }




    let isTaxAlreadyCalculated = true
    let warning_message = false
    let auto_assessment = steps.trigger.event.body.auto_assessment;

//Iterates between the items and checks if they have the Request Tax Rate
// Creates an array for every line items of Xero in Complyt Format
    let items = steps.GET_invoice_Xero.$return_value.Invoices[0].LineItems
    .map(lineItem => { 
      let manualSalesTaxRate = 0
      let manualSalesTax = false



      // If a single line item has a tax code value not 
      // "Request Sales Tax Calculation (Complyt) (0%)" - don't updated Xero
      console.log("lineItem.TaxType: " + lineItem.TaxType)
      if (lineItem.TaxType === steps.trigger.event.body.tax_rate_type_map.requested || auto_assessment) { 
        isTaxAlreadyCalculated = false
      }

      // If the selected tax rate is not one of our 3 tax rate, put user's selected tax rate
      else if (lineItem.TaxType !== steps.trigger.event.body.tax_rate_type_map.calculated
            && lineItem.TaxType !== steps.trigger.event.body.tax_rate_type_map.exempted) {
        manualSalesTax =  true
        manualSalesTaxRate = fixRounding(lineItem.TaxAmount/lineItem.LineAmount, 8)
      }
      
      else if(lineItem.TaxType === steps.trigger.event.body.tax_rate_type_map.exempted) {
        manualSalesTax = true
        manualSalesTaxRate = 0
      }



      let unitPrice;
      if ("DiscountRate" in lineItem) {
        unitPrice = lineItem.UnitAmount - fixRounding(lineItem.DiscountAmount / lineItem.Quantity, 8);
      } 
      else {
        unitPrice = lineItem.UnitAmount;
      }


// in Xero a line item name can be empty and its field will not shown in the api call at all
      let taxCode;
      
      if ("ItemCode" in lineItem && lineItem.ItemCode in taxCodeMap) {
            taxCode = taxCodeMap[lineItem.ItemCode];
          } 
      else {
        // no item code field
          taxCode = taxCodeMap.default_tax_code || "";
          warning_message = true
      }
      
      console.log(taxCode)


      if (unitPrice !== undefined && lineItem.Quantity !== undefined && lineItem.LineAmount !== undefined) {
        return {
          unitPrice: unitPrice,
          quantity: lineItem.Quantity,
          totalPrice: lineItem.LineAmount,
          description: lineItem.Description,
          name: lineItem.LineItemID,
          taxCode: taxCode,
          manualSalesTaxRate: manualSalesTaxRate,
          manualSalesTax: manualSalesTax
        }
      }
    }).filter(item => item !== undefined);

    let items_transactions = items.filter(item => item.taxCode !== "Ignore");

/*    
      return {
        unitPrice: unitPrice,
        quantity: lineItem.Quantity,
        totalPrice: lineItem.LineAmount,
        description: lineItem.Description,
        name: lineItem.LineItemID,
        taxCode: taxCode,
        manualSalesTaxRate: manualSalesTaxRate,
        manualSalesTax: manualSalesTax
      }
    });  
    */

    let xeroStatus = steps.GET_invoice_Xero.$return_value.Invoices[0].Status;
    console.log("Xero Status Recieved: ", xeroStatus)
    let transactionStatus;
    let transactionType;

    if (xeroStatus == "AUTHORISED"){
      console.log("Entered AUTHORISED block")
      transactionStatus =  "ACTIVE";
      transactionType=  "INVOICE";
    }
    else if (xeroStatus == "DELETED"){
      console.log("Entered DELETED block")
      transactionStatus = "CANCELLED";
      transactionType = "ESTIMATE";
    }
    else if (xeroStatus == "VOIDED"){
      console.log("Entered VOIDED block")
      transactionStatus = "CANCELLED";
      transactionType = "INVOICE";
    }
    else if (xeroStatus == "DRAFT"){
      console.log("Entered DRAFT block")
      transactionStatus = "ACTIVE";
      transactionType = "ESTIMATE";
    }
    else if (xeroStatus == "PAID"){
      console.log("Entered PAID block")
      transactionStatus = "ACTIVE";
      transactionType = "INVOICE";
    }
    else{
      console.log("entered catch")
      transactionStatus = "ACTIVE";
      transactionType = "INVOICE";
    }

    return {
      items: JSON.stringify(items),
      items_transactions: JSON.stringify(items_transactions),
      shippingAddress: JSON.stringify(shippingAddress),
      taxCodeMap: taxCodeMap, // Needs to be addressed
      isTaxAlreadyCalculated: isTaxAlreadyCalculated,
      transactionStatus: transactionStatus,
      transactionType: transactionType
    }
  },
})
