// To use any npm package, just import it
// import axios from "axios"

export default defineComponent({
  async run({ steps, $ }) {
    // Reference the previous step data using the steps object
    const invoices = steps.sort_invoices_and_match_country.$return_value;

    // Define all variations of "United States"
    const usaVariations = [
      'usa', 'us', 'united states', 'united states of america',
      'USA', 'US', 'United States', 'United States of America',
      'united states', 'United states', 'united States', 'United States',
      'united states of america', 'United states of america', 'united States of America', 'United States of America'
    ];

    // Filter invoices to only include those from the USA
    const filteredInvoices = invoices.filter(invoice => {
      return usaVariations.includes(invoice.country);
    });

    // Return the filtered list of invoices
    return filteredInvoices;
  },
})
