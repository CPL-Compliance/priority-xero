import { axios } from "@pipedream/platform";

export default defineComponent({
  async run({ steps, $ }) {
    // Get and process line items
    const complytLineItems = steps.complyt_put_transactions.$return_value.response.items;
    const originalLineItems = steps.HTTP_Calls.$return_value.invoiceDetails.Invoices[0].LineItems;
    var accountCode = [];
    var totalTaxAmount = 0;
    let complytItemsMap = new Map(complytLineItems.map(item => [item.name, item]));
    console.log("Complyt Items Map:", Array.from(complytItemsMap.entries()));

    // Array to hold final line items, including new ones
    let finalLineItems = [];

    originalLineItems.forEach((originalItem, index) => {
      console.log(`Processing original item ${index}:`, JSON.stringify(originalItem));

      let complytItem = complytItemsMap.get(originalItem.LineItemID);
      console.log(`Found complytItem for original item ${index}:`, JSON.stringify(complytItem));

      let isComplytCalculation = false;

      if (
        originalItem.TaxType === steps.HTTP_Calls.$return_value.taxRates.requested.TaxType ||
        originalItem.TaxType === steps.HTTP_Calls.$return_value.taxRates.exempted.TaxType ||
        originalItem.TaxType === steps.HTTP_Calls.$return_value.taxRates.calculated.TaxType
      ) {
        isComplytCalculation = true;
        console.log(`It is indeed a isComplytCalculation ${isComplytCalculation}`);
      }

      let taxType = isComplytCalculation
        ? steps.HTTP_Calls.$return_value.taxRates.calculated.TaxType
        : originalItem.TaxType;

      let taxAmount;
      if (!complytItem) {
        taxAmount = originalItem.TaxAmount;
        console.log(`Original taxAmount for index ${index}: ${taxAmount}`);
      } else {
        if (!isComplytCalculation) {
          taxAmount = originalItem.TaxAmount;
          console.log(`TaxAmount without calculation for index ${index}: ${taxAmount}`);
        } else if (complytItem.manualSalesTax === true) {
          taxAmount = complytItem.totalPrice * complytItem.manualSalesTaxRate;
          console.log(`Manual sales taxAmount for index ${index}: ${taxAmount}`);
        } else if (!complytItem.salesTaxRates) {
          taxAmount = 0;
          console.log(`Null sales tax rate for index ${index}: ${taxAmount}`);
        } 
        else {
          taxAmount = complytItem.totalPrice * (complytItem.salesTaxRates.taxRate || 0);
          console.log(`Standard sales taxAmount for index ${index}: ${taxAmount}`);
        }
      }

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

      accountCode.push(originalItem.AccountCode);
      totalTaxAmount = totalTaxAmount + taxAmount;
      

      if ("DiscountAmount" in originalItem) {
        updatedItem.DiscountAmount = originalItem.DiscountAmount;
      }

      // Add the original item to final line items
      finalLineItems.push(updatedItem);


    });


      // Add a new line item if a specific condition is met
      if (steps.client_config.$return_value.line_item_tax) {
        
        const newTaxLineItem = {
          Description: "US Sales Tax",
          UnitAmount: 0,
          Quantity: 1,
          LineAmount: totalTaxAmount, // Set this to the calculated tax amount
          TaxType: steps.HTTP_Calls.$return_value.taxRates.calculated.TaxType, // Or another relevant tax code
          TaxAmount: 0,
          AccountCode: accountCode[0], // Replace with your desired account code
        };

        console.log(`Adding new tax line item: ${JSON.stringify(newTaxLineItem)}`);
        finalLineItems.forEach(item => {
          item.TaxType = steps.HTTP_Calls.$return_value.taxRates.calculated.TaxType, // Set the TaxType to "CALCULATED"
          item.TaxAmount = 0;  // Set the TaxAmount to the desired value
        });

        finalLineItems.push(newTaxLineItem);
        
      }
    // Validate line items
    let validatedLineItems = finalLineItems.map(item => {
      if (!item.Quantity) item.Quantity = 0;

      if (!item.UnitAmount && !item.LineAmount) {
        console.warn(
          `Line item with description "${item.Description}" is missing both UnitAmount and LineAmount, setting both to 0.`
        );
        item.UnitAmount = 0;
        item.LineAmount = 0;
      } else if (!item.LineAmount && item.UnitAmount) {
        item.LineAmount = item.UnitAmount * item.Quantity;
      } else if (!item.UnitAmount && item.LineAmount) {
        item.UnitAmount = item.LineAmount / item.Quantity;
      }

      // Ensure TaxType defaults to "NONE" if missing
      if (!item.TaxType) {
        console.log(`Missing TaxType for Item: ${JSON.stringify(item)} - Setting to "NONE"`);
        item.TaxType = steps.HTTP_Calls.$return_value.taxRates.exempted.TaxType;
      }

      console.log(`Validated Item with TaxType: ${JSON.stringify(item)}`);

      return item;
    });

    const xero_contact_id = steps.HTTP_Calls.$return_value.invoiceDetails.Invoices[0].Contact.ContactID;

    // Prepare payload
    let data = {
      Type: "ACCREC",
      InvoiceNumber: steps.HTTP_Calls.$return_value.invoiceDetails.Invoices[0].InvoiceNumber,
      Contact: { ContactID: xero_contact_id },
      LineAmountTypes: "Exclusive",
      LineItems: validatedLineItems,
    };

    console.log("Payload Data:", JSON.stringify(data, null, 2));
    const tenant_id = steps.trigger.event?.tenantId || steps.trigger.event?.body?.tenantId;

    // Send request to Xero
    return await axios($, {
      method: "POST",
      url: "https://api.xero.com/api.xro/2.0/Invoices",
      headers: {
        Authorization: `Bearer ${steps.getAccessToken_pipedreamNotification.$return_value.access_token}`,
        "xero-tenant-id": tenant_id,
      },
      data: data,
    });
  },
});
