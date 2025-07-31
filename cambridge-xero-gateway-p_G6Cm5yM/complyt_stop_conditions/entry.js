export default defineComponent({
  async run({ steps, $ }) {
    // Extract invoice details
    const invoice = steps.HTTP_Calls.$return_value.invoiceDetails.Invoices[0] || [];
    const lineItems = invoice?.LineItems || [];
    const country = invoice?.Contact?.Addresses[1]?.Country;
    const transactionType = invoice?.Type;
    const transactionStatus = invoice.Status
    
    // STOP Condition: If country isn't USA, then stop
    const allowedCountries = ["USA", "United States", "US", "united states", "United states", "usa"];
    if (!allowedCountries.includes(country)) {
      $.flow.exit("Country isn't USA");
    }
    
    // STOP Condition: If transaction type is ACCPAY or ACCPAYCREDIT, then stop
    if (transactionType === "ACCPAY" || transactionType === "ACCPAYCREDIT") {
      $.flow.exit("Transaction Type is ACCPAY or ACCPAYCREDIT - e.g., Supplier Invoice or Credit Note");
    }
    
    // Extract TaxType values from LineItems in the first Invoice
    const taxTypes = lineItems.map(item => item.TaxType);

    // Get the requested and exempted tax rate types
    const requestedTaxType = steps.client_config.$return_value.tax_rate_type_map.requested;
    const exemptedTaxType = steps.client_config.$return_value.tax_rate_type_map.exempted;

    // Allow requestedTaxType
    const allowedTaxTypes = [ requestedTaxType];

    // Check if any TaxType matches the allowed types
    const hasMatchingTaxType = taxTypes.some(taxType => allowedTaxTypes.includes(taxType));

    if (!hasMatchingTaxType && (transactionStatus !== "DELETED" && transactionStatus !== "VOIDED" && transactionStatus !== "AUTHORISED")) {
      $.flow.exit("No matching TaxType found. Exiting the flow. ");
    }

    // Return success message if a match exists
    return {
      message: "Continuing the flow.",
      transactionStatus,
      matchingTaxTypes: taxTypes,
      allowedTaxTypes: allowedTaxTypes,
      exemptedTaxType: exemptedTaxType,
      requestedTaxType: requestedTaxType,
      country,
      transactionType,
    };
  },
});
