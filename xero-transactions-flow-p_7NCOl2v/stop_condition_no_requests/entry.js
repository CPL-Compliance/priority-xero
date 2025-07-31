export default defineComponent({
  async run({ steps, $ }) {
    // Extract TaxType values from LineItems in the first Invoice
    const invoices = steps.GET_invoice_Xero.$return_value.Invoices || [];
    const lineItems = invoices[0]?.LineItems || [];
    const taxTypes = lineItems.map(item => item.TaxType);

    // Get the requested and exempted tax rate types
    const requestedTaxType = steps.trigger.event.body.tax_rate_type_map?.requested;
    const exemptedTaxType = steps.trigger.event.body.tax_rate_type_map?.exempted;

    // Allow "NONE", exemptedTaxType, and requestedTaxType
    const allowedTaxTypes = ["NONE", exemptedTaxType, requestedTaxType];

    // Check if any TaxType matches the allowed types
    const hasMatchingTaxType = taxTypes.some(taxType => allowedTaxTypes.includes(taxType));

    if (!hasMatchingTaxType) {
      $.flow.exit("No matching TaxType found. Exiting the flow.");
    }

    // Return success message if a match exists
    return {
      message: "Matching TaxType found. Continuing the flow.",
      matchingTaxTypes: taxTypes,
      allowedTaxTypes: allowedTaxTypes,
      exemptedTaxType: exemptedTaxType,
      requestedTaxType: requestedTaxType
    };
  },
});
