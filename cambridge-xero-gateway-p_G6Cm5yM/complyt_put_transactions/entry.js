import { axios } from "@pipedream/platform";
export default defineComponent({
  async run({ steps, $ }) {
    // Extract invoice details from HTTP_Calls step
    const invoice = steps.HTTP_Calls.$return_value.invoiceDetails.Invoices[0];
    const shippingAddressDetails = invoice.Contact.Addresses[1];
    const taxCodeMap = steps.client_config.$return_value.tax_code_map;
    const auto_assessment = steps.client_config.$return_value.auto_assessment;
    const tax_rate_type_map = steps.client_config.$return_value.tax_rate_type_map;

    // Construct the shipping address
    const shippingAddress = {
      city: shippingAddressDetails?.City,
      country: shippingAddressDetails?.Country,
      zip: shippingAddressDetails?.PostalCode,
      state: shippingAddressDetails?.Region,
      street: shippingAddressDetails?.AddressLine1,
    };

    // Custom rounding function
    function fixRounding(value, precision) {
      const power = Math.pow(10, precision || 0);
      const res = Math.round(value * power) / power;
      return isNaN(res) ? 0 : res;
    }

    let isTaxAlreadyCalculated = true;

   // Process LineItems

    const items = invoice.LineItems.map((lineItem) => {

      let manualSalesTax = false;
      let manualSalesTaxRate = 0;

      // Determine if manualSalesTax applies
      if (
        lineItem.TaxType === tax_rate_type_map.exempted || 
        lineItem.TaxType === "NONE"
      ) {
        manualSalesTax = true;
        manualSalesTaxRate = 0;
      } else if (
        lineItem.TaxType !== tax_rate_type_map.calculated && 
        lineItem.TaxType !== tax_rate_type_map.requested
      ) {
        manualSalesTax = true;
        manualSalesTaxRate = fixRounding(lineItem.TaxAmount / lineItem.LineAmount, 8);
      }

      if (lineItem.TaxType === tax_rate_type_map.requested || auto_assessment) {
        isTaxAlreadyCalculated = false;
      }


      let unitPrice;
      if ("DiscountRate" in lineItem) {
        unitPrice =
          lineItem.UnitAmount -
          fixRounding(lineItem.DiscountAmount / lineItem.Quantity, 8);
      } else {
        unitPrice = lineItem.UnitAmount;
      }

      let taxCode;
      if ("ItemCode" in lineItem && lineItem.ItemCode in taxCodeMap) {
        taxCode = taxCodeMap[lineItem.ItemCode];
      } else {
        taxCode = taxCodeMap.default_tax_code || "";
      }

      if (
        unitPrice !== undefined &&
        lineItem.Quantity !== undefined &&
        lineItem.LineAmount !== undefined
      ) {
        return {
          unitPrice,
          quantity: lineItem.Quantity,
          totalPrice: lineItem.LineAmount,
          description: lineItem.Description,
          name: lineItem.LineItemID,
          taxCode,
          manualSalesTaxRate,
          manualSalesTax,
        };
      }
    }).filter((item) => item !== undefined);

    const filtered_items = items.filter((item) => item.taxCode !== "Ignore");

    const xeroStatus = invoice.Status;

    // Determine transaction status and type
    let transactionStatus;
    let transactionType;
    let enterDeleteFlow = false;

    switch (xeroStatus) {
      case "AUTHORISED":
        transactionStatus = "ACTIVE";
        transactionType = "INVOICE";
        break;
      case "DELETED":
        enterDeleteFlow = true;
        transactionStatus = "CANCELLED";
        transactionType = "ESTIMATE";
        break;
      case "VOIDED":
        enterDeleteFlow = true;
        transactionStatus = "CANCELLED";
        transactionType = "INVOICE";
        break;
      case "DRAFT":
        transactionStatus = "ACTIVE";
        transactionType = "ESTIMATE";
        break;
      case "PAID":
        transactionStatus = "ACTIVE";
        transactionType = "INVOICE";
        break;
      default:
        transactionStatus = "ACTIVE";
        transactionType = "INVOICE";
    }

    if(enterDeleteFlow===true){
      let delete_response = null; // Declare outside try-catch
      try {
        delete_response = await axios($, {
          method: "DELETE",
          url: `https://${steps.client_config.$return_value.complyt_api_environment}.complyt.io/v1/transactions/source/6/externalId/${invoice.InvoiceID}`,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${steps.HTTP_Calls.$return_value.complytAuth.accessToken}`,
          },
        });
        console.log(`Successfully deleted transaction with externalId: ${invoice.InvoiceID}`);
        console.log("Full API response:", delete_response);
      } catch (error) {
        console.error(`Error processing transaction with externalId: ${invoice.InvoiceID}. Error: ${error.message}`);
        throw new Error(`Failed to process transaction: ${error.message}`);
      } finally {
        return {
          response: delete_response,
          all_line_items: items,
          filtered_line_items: filtered_items,
          isTaxAlreadyCalculated: isTaxAlreadyCalculated,
          transactionStatus: transactionStatus,
          transactionType: transactionType,
        };
      }
    }
    // Prepare transaction payload
    const transaction_payload = {
      externalId: invoice.InvoiceID,
      source: "6",
      documentName: invoice.InvoiceNumber,
      items: filtered_items,
      shippingAddress,
      customerId: steps.HTTP_Calls.$return_value.customerData.complytId,
      transactionStatus,
      transactionType,
      externalTimestamps: {
        createdDate: steps.HTTP_Calls.$return_value.invoiceHistory.invoiceCreatedDate,
        updatedDate: steps.HTTP_Calls.$return_value.invoiceHistory.invoiceUpdatedDate,
      },
      subsidiary: steps.client_config.$return_value.subsidiary,
    };

    // PUT Transaction Step
    let response; // Declare response variable outside of try-catch-finally

    try {
      response = await axios($, {
        method: "PUT",
        url: `https://${steps.client_config.$return_value.complyt_api_environment}.complyt.io/v1/transactions/source/6/externalId/${steps.HTTP_Calls.$return_value.invoiceDetails.Invoices[0].InvoiceID}`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${steps.HTTP_Calls.$return_value.complytAuth.accessToken}`,
        },
        data: transaction_payload,
      });
    
      console.log(`Successfully processed transaction with externalId: ${transaction_payload.externalId}`);
      console.log("Full API response:", response);
    
    } catch (error) {
      console.error(`Error processing transaction with externalId: ${transaction_payload.externalId}. Error: ${error.message}`);
      throw new Error(`Failed to process transaction: ${error.message}`);
    } finally {
      // Return even if the API call fails
      return {
        response: response ? response : null, // Return the response data if defined, otherwise null
        transaction_payload,
        all_line_items: items,
        filtered_line_items: filtered_items,
        isTaxAlreadyCalculated: isTaxAlreadyCalculated,
        transactionStatus: transactionStatus,
        transactionType: transactionType
      };
    }


  },
});
