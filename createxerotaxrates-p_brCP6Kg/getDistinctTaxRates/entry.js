export default defineComponent({
  async run({ steps, $ }) {
    // Extract the transaction responses
    const transactionResponses = steps.put_transactions_to_get_rates.$return_value.transactionResponses;

    if (!transactionResponses || transactionResponses.length === 0) {
      throw new Error("No transaction responses found.");
    }

    // Extract unique tax rates
    const taxRatesSet = new Set();

    for (const transaction of transactionResponses) {
      const items = transaction.response?.items || [];
      for (const item of items) {
        const taxRate = item.salesTaxRates?.taxRate;
        if (taxRate !== undefined) {
          taxRatesSet.add(taxRate);
        }
      }
    }

    // Convert the set to a sorted array
    const distinctTaxRates = Array.from(taxRatesSet).sort((a, b) => a - b);

    console.log("Distinct Tax Rates:", distinctTaxRates);

    // Return the distinct tax rates
    // help 2
    return { distinctTaxRates };
  },
});
