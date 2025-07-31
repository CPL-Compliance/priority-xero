export default defineComponent({
  async run({ steps, $ }) {
    // Extracting invoices and customers
    const invoices = steps.get_xero_invoices.$return_value.Invoices;
    const customers = steps.get_xero_customers.$return_value.Contacts;

    // Map invoices to include necessary fields and convert DateString to Date object
    const invoiceList = invoices.map(invoice => ({
      date: new Date(invoice.DateString),
      id: invoice.InvoiceID,
      number: invoice.InvoiceNumber,
      contactId: invoice.Contact.ContactID
    }));

    // Sort the invoices by date
    invoiceList.sort((a, b) => a.date - b.date);

    // Return the sorted IDs, numbers, and country
    return invoiceList.map(item => {
      const matchingCustomer = customers.find(customer => customer.ContactID === item.contactId);
      const country = matchingCustomer ? 
                      (matchingCustomer.Addresses.find(address => address.Country)?.Country || 'Country Not Found') 
                      : 'Customer Not Found';
      
      return {
        id: item.id,
        number: item.number,
        country: country
      };
    });
  },
});
