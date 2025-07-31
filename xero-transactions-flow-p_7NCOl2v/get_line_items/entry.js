// To use previous step data, pass the `steps` object to the run() function
export default defineComponent({
  async run({ steps, $ }) {
    let complytLineItems = steps.put_transaction.$return_value.items;
    let originalLineItems = steps.GET_invoice_Xero.$return_value.Invoices[0].LineItems;

    // Create a map of complytLineItems for quick lookup by a unique identifier (using name as LineItemID)
    let complytItemsMap = new Map(complytLineItems.map(item => [item.name, item]));
    console.log("Complyt Items Map:", Array.from(complytItemsMap.entries()));

    let lineItems = originalLineItems.map((originalItem, index) => {
      console.log(`Processing original item ${index}:`, JSON.stringify(originalItem));

      // Use the name field from complyt items to match with LineItemID of original items
      let complytItem = complytItemsMap.get(originalItem.LineItemID);
      console.log(`Found complytItem for original item ${index}:`, JSON.stringify(complytItem));

      let isComplytCalculation = false;

      if (originalItem.TaxType === steps.trigger.event.body.tax_rate_type_map.requested ||
          originalItem.TaxType === steps.trigger.event.body.tax_rate_type_map.exempted ||
          originalItem.TaxType === steps.trigger.event.body.tax_rate_type_map.calculated) {
        isComplytCalculation = true;
        console.log(`It is indeed a isComplytCalculation ${isComplytCalculation}`);
      }

      let taxType;
      if (isComplytCalculation) {
        taxType = steps.trigger.event.body.tax_rate_type_map.calculated;
      } else {
        taxType = originalItem.TaxType;
      }

      let taxAmount;
      if (!complytItem) {
        // If no corresponding complytItem, use original tax amount
        taxAmount = originalItem.TaxAmount;
        console.log(`Original taxAmount for index ${index}: ${taxAmount}`);
      } else {
        if (!isComplytCalculation) {
          taxAmount = originalItem.TaxAmount;
          console.log(`TaxAmount without calculation for index ${index}: ${taxAmount}`);
        } else if (complytItem.manualSalesTax === true) {
          taxAmount = complytItem.totalPrice * complytItem.manualSalesTaxRate;
          console.log(`Manual sales taxAmount for index ${index}: ${taxAmount}`);
        } else if (complytItem.salesTaxRates === null) {
          taxAmount = 0;
          console.log(`Null sales tax rate for index ${index}: ${taxAmount}`);
        } else {
          taxAmount = complytItem.totalPrice * complytItem.salesTaxRates.taxRate;
          console.log(`Standard sales taxAmount for index ${index}: ${taxAmount}`);
        }
      }

      // Log all relevant values
      console.log(`originalItem_${index}:`, JSON.stringify(originalItem));
      if (complytItem) {
        console.log(`complytItem_${index}:`, JSON.stringify(complytItem));
      }
      console.log(`taxType_${index}: ${taxType}`);
      console.log(`taxAmount_${index}: ${taxAmount}`);

      // Construct the updated line item
      let updatedItem = {
        LineItemID: originalItem.LineItemID,
        UnitAmount: originalItem.UnitAmount,
        Quantity: originalItem.Quantity,
        ItemCode: "ItemCode" in originalItem ? originalItem.ItemCode : "",
        Description: originalItem.Description,
        LineAmount: originalItem.LineAmount,
        TaxType: taxType,
        TaxAmount: taxAmount,
        Tracking: originalItem.Tracking,
        AccountCode: originalItem.AccountCode,
      };

      if ("DiscountAmount" in originalItem) updatedItem.DiscountAmount = originalItem.DiscountAmount;

      return updatedItem;
    });

    return {
      lineItems: JSON.stringify(lineItems)
    };
  },
});
