// legacy_hash_id: a_a4ivAG
import { axios } from "@pipedream/platform";

export default defineComponent({
  props: {
    tenant_id: {
      type: "string",
      description: "Id of the organization tenant to use on the Xero Accounting API. See [Get Tenant Connections](https://pipedream.com/@sergio/xero-accounting-api-get-tenant-connections-p_OKCzOgn/edit) for a workflow example on how to pull this data.",
    },
    access_token: {
      type: "string",
      description: "jwt",
    },
    contact_guid: {
      type: "string",
      description: "Xero identifier of the document to get history changes of.",
    },
    invoice_guid: {
      type: "string",
      description: "Xero identifier of the document to get history changes of.",
    },
    contact_updated_date: {
      type: "string",
      description: "Raw UTC String Date",
    },
    invoice_updated_date: {
      type: "string",
      description: "Raw UTC String Date",
    },
  },
  async run({ $ }) {

// Notifies if data is missing
    if (!this.tenant_id || !this.contact_guid || !this.invoice_guid) {
      throw new Error("Must provide tenant_id, and guid parameters.");
    }


    let contact_history = await axios($, {
      url: `https://api.xero.com/api.xro/2.0/Contacts/${this.contact_guid}/history`,
      headers: {
        "Authorization": `Bearer ${this.access_token}`,
        "xero-tenant-id": this.tenant_id,
      },
    });


     let invoice_history = await axios($, {
      url: `https://api.xero.com/api.xro/2.0/Invoices/${this.invoice_guid}/history`,
      headers: {
        "Authorization": `Bearer ${this.access_token}`,
        "xero-tenant-id": this.tenant_id,
      },
    });

// Manipulates the data to match Complyt's format
    let contactUpdatedDate = new Date(Number(this.contact_updated_date.substring(6, this.contact_updated_date.length - 7)))
    let invoiceUpdatedDate = new Date(Number(this.invoice_updated_date.substring(6, this.invoice_updated_date.length - 7)))
    let contactCreatedDate = contact_history.HistoryRecords[contact_history.HistoryRecords.length-1].DateUTCString
    let invoiceCreatedDate = invoice_history.HistoryRecords[invoice_history.HistoryRecords.length-1].DateUTCString

    return {
      contactCreatedDate: contactCreatedDate,
      contactUpdatedDate: contactUpdatedDate,
      invoiceCreatedDate: invoiceCreatedDate,
      invoiceUpdatedDate: invoiceUpdatedDate
    }

  },
});
