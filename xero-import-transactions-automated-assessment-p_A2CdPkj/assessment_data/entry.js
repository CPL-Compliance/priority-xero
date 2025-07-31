import { stringify } from "csv-stringify/sync"; // Built-in in Pipedream!

export default defineComponent({
  async run({ steps, $ }) {
    const invoices = steps.HTTP_Calls.$return_value.invoices || [];
    const creditNotes = steps.HTTP_Calls.$return_value.creditNotes || [];
    const customers = steps.HTTP_Calls.$return_value.customers || [];

    // Robust list of USA variations
    const usaVariations = [
      'usa', 'us', 'u.s.', 'u.s.a.', 'united states', 'united states of america',
      'USA', 'US', 'U.S.', 'U.S.A.', 'United States', 'United States of America',
      'united states', 'United states', 'united States', 'United States',
      'united states of america', 'United states of america', 'united States of America', 'United States of America',
      'america', 'America'
    ];

    // Quick lookup of customers
    const customerMap = {};
    customers.forEach(customer => {
      customerMap[customer.ContactID] = customer;
    });

    const rows = [];

    function processDocument(doc, transactionType) {
      const contact = customerMap[doc.Contact?.ContactID];
      if (!contact) return;

      const address = contact.Addresses?.[0] || {};
      const country = address.Country?.trim() || "";

      // Apply USA country filter
      const isUSA = usaVariations.includes(country.toLowerCase());
      if (!isUSA) return;

      const customerId = contact.ContactID;
      const customerName = contact.Name || "";
      const customerType = "RETAIL";
      const transactionCountry = country;
      const transactionState = address.Region || "";
      const transactionCity = address.City || "";
      const transactionAddress = address.AddressLine1 || "";
      const transactionZip = address.PostalCode || "";
      const transactionCreatedDate = doc.DateString?.split("T")[0] || "";

      doc.LineItems?.forEach(lineItem => {
        const itemName = lineItem?.Item?.Name || lineItem?.Description || "";
        const lineAmount = lineItem?.LineAmount || 0;

        rows.push({
          "Customer ID": customerId,
          "Customer Name": customerName,
          "Customer Type": customerType,
          "Transaction ID": doc.InvoiceID || doc.CreditNoteID,
          "Transaction Name": doc.InvoiceNumber || doc.CreditNoteNumber,
          "Transaction Type": transactionType,
          "Transaction Country": transactionCountry,
          "Transaction State": transactionState,
          "Transaction City": transactionCity,
          "Transaction Address": transactionAddress,
          "Transaction ZIP": transactionZip,
          "Transaction Created Date": transactionCreatedDate,
          "Item Name": itemName,
          "Item Quantity": 1,
          "Item Unit Price": lineAmount,
          "Item Amount": lineAmount,
        });
      });
    }

    // Process Invoices
    invoices.forEach(invoice => {
      processDocument(invoice, "INVOICE");
    });

    // Process Credit Notes
    creditNotes.forEach(creditNote => {
      processDocument(creditNote, "REFUND");
    });

    // Create CSV string from rows
    const csv = stringify(rows, {
      header: true,
    });

    return {
      rows,
      csv,
    };
  },
});
