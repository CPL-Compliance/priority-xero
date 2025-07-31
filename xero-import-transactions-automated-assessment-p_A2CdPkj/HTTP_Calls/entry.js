import axios from "axios";

export default defineComponent({
  async run({ steps, $ }) {
    const accessToken = steps.get_xero_access_token.$return_value.Connection.access_token;
    const tenantId = "4ad11270-2a10-4818-8580-5974cb13827c";

    let invoices = [];
    let invoicePage = 1;
    let hasMoreInvoices = true;

    // --- Pull all Invoices ---
    while (hasMoreInvoices) {
      const invoiceUrl = `https://api.xero.com/api.xro/2.0/invoices?page=${invoicePage}&where=Type=="ACCREC" AND (Status=="PAID" OR Status=="SUBMITTED" OR Status=="DRAFT" OR Status=="AUTHORISED") AND Date>=DateTime(2022,01,01)`;

      const { data } = await axios({
        method: "GET",
        url: invoiceUrl,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "xero-tenant-id": tenantId,
          Accept: "application/json",
        },
      });

      if (data.Invoices.length > 0) {
        invoices = invoices.concat(data.Invoices);
        invoicePage++;
      } else {
        hasMoreInvoices = false;
      }
    }

    // --- Pull all Credit Notes ---
    let creditNotes = [];
    let creditNotePage = 1;
    let hasMoreCreditNotes = true;

    while (hasMoreCreditNotes) {
      const creditNoteUrl = `https://api.xero.com/api.xro/2.0/CreditNotes?page=${creditNotePage}&where=Type=="ACCRECCREDIT" AND (Status=="PAID" OR Status=="SUBMITTED" OR Status=="AUTHORISED") AND Date>=DateTime(2022,01,01)`;

      const { data } = await axios({
        method: "GET",
        url: creditNoteUrl,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "xero-tenant-id": tenantId,
          Accept: "application/json",
        },
      });

      if (data.CreditNotes.length > 0) {
        creditNotes = creditNotes.concat(data.CreditNotes);
        creditNotePage++;
      } else {
        hasMoreCreditNotes = false;
      }
    }

    // --- Pull all Customers ---
    let customers = [];
    let customerPage = 1;
    let moreCustomers = true;

    while (moreCustomers) {
      const customerUrl = `https://api.xero.com/api.xro/2.0/contacts?page=${customerPage}&where=IsCustomer==true`;

      const { data } = await axios({
        method: "GET",
        url: customerUrl,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "xero-tenant-id": tenantId,
          Accept: "application/json",
        },
      });

      if (data.Contacts.length > 0) {
        customers = customers.concat(data.Contacts);
        customerPage++;
      } else {
        moreCustomers = false;
      }
    }

    // --- Final result ---
    return {
      invoices,
      creditNotes,
      customers,
    };
  },
});
