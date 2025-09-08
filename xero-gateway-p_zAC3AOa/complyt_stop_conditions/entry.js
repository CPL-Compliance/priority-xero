import axios from 'axios';

export default defineComponent({
  async run({ steps, $ }) {
    // Extract invoice details safely
    var draft_to_invoice = false;
    const invoice = steps.HTTP_Calls.$return_value.invoiceDetails || {};
    const invoiceId = invoice.InvoiceID;
    const lineItems = invoice.LineItems || [];
    const shippingAddress = invoice.Contact?.Addresses?.find(
      address => address.AddressType === "STREET"
    );
    const country = shippingAddress?.Country || "";
    const transactionType = invoice.Type;
    const transactionStatus = invoice.Status;
    const fullInvoiceHistory = steps.HTTP_Calls.$return_value.fullInvoiceHistory || { HistoryRecords: [] };
    const {
      complytAuth: { accessToken },
      customerData: { complytId },
    } = steps.HTTP_Calls.$return_value;

    const {
      headers: { complyt_api_environment },
    } = steps.Xero_Event_Gateway.$return_value;

    console.log("Invoice: ", invoice);

    // Use system time directly
    const now = new Date();  // ✅ No need to adjust for Xero
    const thresholdTime = new Date(now.getTime() - 60 * 1000);  // ✅ 60 seconds ago

    console.log("System Time:", now);
    console.log("Threshold Time (60 sec ago):", thresholdTime);

    // Define stop conditions
    const allowedCountries = new Set(["USA", "United States", "US", "united states", "United states", "usa"]);
    if (!allowedCountries.has(country)) {
      $.flow.exit("Country isn't USA");
    }

    if (["ACCPAY", "ACCPAYCREDIT"].includes(transactionType)) {
      $.flow.exit("Transaction Type is ACCPAY or ACCPAYCREDIT - e.g., Supplier Invoice or Credit Note");
    }

    // Extract tax types from line items
    const taxTypes = lineItems.map(item => item.TaxType).filter(Boolean);

    // Get tax rate types
    const { requested: requestedTaxType, exempted: exemptedTaxType } =
      steps.Xero_Event_Gateway.$return_value.tax_rate_type_map;
    const allowedTaxTypes = new Set([requestedTaxType]);

    // 🔎 NEW RULE: if there’s a "Sales Tax" line AND no other line requests Complyt calc → stop
    const isSalesTaxLine = (li) =>
      typeof li?.Description === "string" &&
      li.Description.trim() === "Sales Tax";  // <-- exact, case-sensitive match

    const hasSalesTaxLine = lineItems.some(isSalesTaxLine);
    const hasRequestedOnNonSalesTax = lineItems.some(
      (li) => !isSalesTaxLine(li) && li?.TaxType === requestedTaxType
    );

    if (hasSalesTaxLine && !hasRequestedOnNonSalesTax) {
      $.flow.exit(
        "Found a 'Sales Tax' line but no other line items are set to request Complyt tax calculation."
      );
    }

    // Check if any tax type matches the allowed types
    const hasMatchingTaxType = taxTypes.some(taxType => allowedTaxTypes.has(taxType));

    // Case-insensitive check for Approved in history
    const hasApprovedChange = fullInvoiceHistory.HistoryRecords
      .some(r => String(r.Changes || "").toLowerCase().includes("approved"));

    console.log("hasApprovedChange: ", hasApprovedChange);

    // Flag for downstream (optional use)
    const approval_recalc = hasApprovedChange && !["DELETED", "VOIDED"].includes(transactionStatus);

    // Update existing condition to include the extra check
    if (!hasMatchingTaxType && !["DELETED", "VOIDED"].includes(transactionStatus)) {
      if (hasApprovedChange) {
        console.log("url: ", `https://api.complyt.io/v1/transactions/source/6/externalId/${invoiceId}`);
        let transactionTypeFromComplyt;

        try {
          const transactionResponse = await axios.get(
            `https://api.complyt.io/v1/transactions/source/6/externalId/${invoiceId}`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          console.log("Transaction Response:", transactionResponse.data);
          transactionTypeFromComplyt = transactionResponse.data.transactionType;
        } catch (error) {
          console.log("Error fetching transaction from Complyt:", error.response?.data || error.message);
        }

        if (transactionTypeFromComplyt !== "ESTIMATE") {
          $.flow.exit("'Approved' & already set to INVOICE/CREDIT_MEMO");
        } else {
          draft_to_invoice = true;
        }

      } else {
        $.flow.exit("No matching TaxType found and no 'Approved' change in history. Exiting the flow.");
      }
    }

    // **Check the most recent "complyt - error processing" note**
    const latestHistoryRecord = fullInvoiceHistory.HistoryRecords
      .filter(record =>
        record.Changes === "Note" &&
        record.User === "System Generated" &&
        record.Details.includes("Complyt - Error processing")
      )
      .sort((a, b) => new Date(b.DateUTCString) - new Date(a.DateUTCString)) // Sort by latest first
      [0]; // Get the latest record

    console.log("latestHistoryRecord: ", latestHistoryRecord);
    if (latestHistoryRecord) {
      const recordTime = new Date(latestHistoryRecord.DateUTCString);
      const isRecent = recordTime >= thresholdTime;

      console.log(`Latest Complyt Error - Time: ${recordTime}, Recent: ${isRecent}`);

      if (isRecent) {
        $.flow.exit("Recent Complyt error detected within the last 60 seconds. Exiting the flow.");
      }
    }

    // Return success message
    return {
      message: "Continuing the flow.",
      transactionStatus,
      matchingTaxTypes: taxTypes,
      allowedTaxTypes: [...allowedTaxTypes],
      exemptedTaxType,
      requestedTaxType,
      country,
      transactionType,
      draft_to_invoice,
      approval_recalc,
    };
  },
});
