import { axios } from "@pipedream/platform";

export default defineComponent({
  async run({ steps, $ }) {
    const {
      invoiceDetails: invoice,
      complytAuth: { accessToken },
      customerData: { complytId },
      invoiceHistory: { invoiceUpdatedDate },
    } = steps.HTTP_Calls.$return_value;

    const {
      tax_code_map: taxCodeMap,
      auto_assessment,
      tax_rate_type_map: taxRateTypeMap,
      subsidiary,
      headers: { complyt_api_environment },
    } = steps.Xero_Event_Gateway.$return_value;

    const xeroAccessToken = steps.Xero_Event_Gateway.$return_value.xero_token;
    const invoiceId = invoice.InvoiceID;
    const issueDate = invoice.DateString;
    const xeroCurrency = invoice?.CurrencyCode ?? 'USD';

    const shippingAddressDetails = invoice.Contact?.Addresses?.find(
      address => address.AddressType === "STREET"
    ) || {};
    const shippingAddress = {
      city: shippingAddressDetails?.City,
      country: shippingAddressDetails?.Country,
      zip: shippingAddressDetails?.PostalCode,
      state: shippingAddressDetails?.Region,
      street: shippingAddressDetails?.AddressLine1,
    };

    const xeroHeaders = {
      Authorization: `Bearer ${xeroAccessToken}`,
      "xero-tenant-id": steps.Xero_Event_Gateway.$return_value.tenantId,
    };

    const xeroFetchData = async (url, method = "GET", data = null, customHeaders = xeroHeaders) => {
      try {
        return await axios($, { url, method, headers: customHeaders, data });
      } catch (error) {
        console.error(`Error fetching data from ${url}:`, error);
        throw new Error(`Failed to fetch data from ${url}`);
      }
    };

    const fixRounding = (value, precision = 0) => {
      const power = Math.pow(10, precision);
      return isNaN(value) ? 0 : Math.round(value * power) / power;
    };

    let isTaxAlreadyCalculated = true;
  const items = invoice.LineItems.map((lineItem) => {
  let manualSalesTax = false;
  let manualSalesTaxRate = 0;

  if (lineItem.TaxType === taxRateTypeMap.exempted || lineItem.TaxType === "NONE") {
    manualSalesTax = true;
  } else if (![taxRateTypeMap.calculated, taxRateTypeMap.requested].includes(lineItem.TaxType)) {
    manualSalesTax = true;
    manualSalesTaxRate = fixRounding(lineItem.TaxAmount / lineItem.LineAmount, 8);
  }
  if (lineItem.TaxType === taxRateTypeMap.requested || auto_assessment) {
    isTaxAlreadyCalculated = false;
  }

  const taxCode = taxCodeMap[lineItem.ItemCode] || taxCodeMap.default_tax_code || "";
  const hasDiscount = "DiscountRate" in lineItem && lineItem.DiscountRate > 0;

  const unitPrice = lineItem.UnitAmount;

  if (unitPrice && lineItem.Quantity && lineItem.LineAmount) {
    const itemPayload = {
      unitPrice,
      quantity: lineItem.Quantity,
      totalPrice: unitPrice*lineItem.Quantity,
      description: lineItem.Description,
      name: lineItem.LineItemID,
      taxCode,
      manualSalesTaxRate,
      manualSalesTax,
    };

    // Add discount field only when a discount rate is provided
    if (hasDiscount) {
      const calculatedDiscount = fixRounding(lineItem.UnitAmount * lineItem.Quantity * (lineItem.DiscountRate / 100), 2);
      itemPayload.discount = calculatedDiscount;
    }

    return itemPayload;
  }
}).filter(Boolean);

    const filteredItems = items.filter((item) => item.taxCode !== "Ignore");
    const statusMapping = {
      AUTHORISED: { status: "ACTIVE", type: "INVOICE" },
      DELETED: { status: "CANCELLED", type: "ESTIMATE", delete: true },
      VOIDED: { status: "CANCELLED", type: "INVOICE", delete: true },
      DRAFT: { status: "ACTIVE", type: "ESTIMATE" },
      PAID: { status: "ACTIVE", type: "INVOICE" },
    };

    const { status: transactionStatus = "ACTIVE", type: transactionType = "INVOICE", delete: enterDeleteFlow = false } =
      statusMapping[invoice.Status] || {};

    const addHistoryNote = async (message) => {
      const historyRecord = { HistoryRecords: [{ Details: message }] };
      await xeroFetchData(`https://api.xero.com/api.xro/2.0/Invoices/${invoiceId}/history`, "POST", historyRecord);
    };

    if (enterDeleteFlow) {
      try {
        const deleteResponse = await axios($, {
          method: "DELETE",
          url: `https://${complyt_api_environment}.complyt.io/v1/transactions/source/6/externalId/${invoiceId}`,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        });

        console.log(`Successfully deleted transaction: ${invoiceId}`, deleteResponse);
        // await addHistoryNote("Successfully deleted transaction in Complyt.");
        return { response: deleteResponse, transactionStatus, transactionType };
      } catch (error) {
        // await addHistoryNote(`Complyt - Error deleting transaction: ${error.message}`);
        throw new Error(`Failed to delete transaction: ${error.message}`);
      }
    }

    const transactionPayload = {
      externalId: invoiceId,
      source: "6",
      documentName: invoice.InvoiceNumber,
      items: filteredItems,
      shippingAddress,
      customerId: complytId,
      transactionStatus,
      transactionType,
      externalTimestamps: { createdDate: issueDate, updatedDate: invoiceUpdatedDate },
      subsidiary,
      currency: xeroCurrency
    };

    try {
      const response = await axios($, {
        method: "PUT",
        url: `https://${complyt_api_environment}.complyt.io/v1/transactions/source/6/externalId/${invoiceId}`,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        data: transactionPayload,
      });

      console.log(`Successfully processed transaction: ${invoiceId}`, response);
      
      // await addHistoryNote("Successfully updated transaction in Complyt.");
      return { response, transactionPayload, transactionStatus, transactionType };
    } catch (error) {
      // await addHistoryNote(`Complyt - Error processing transaction: ${error.message}`);
      throw new Error(`Failed to process transaction: ${error.message}`);
    }
  },
});
