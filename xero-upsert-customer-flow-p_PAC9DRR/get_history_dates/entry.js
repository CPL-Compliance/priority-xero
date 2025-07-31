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
    contact_updated_date: {
      type: "string",
      description: "Raw UTC String Date",
    }
  },
  async run({ $ }) {

//handles missing data 
    if (!this.tenant_id || !this.contact_guid) {
      throw new Error("Must provide tenant_id, and guid parameters.");
    }

    let contact_history = await axios($, {
      url: `https://api.xero.com/api.xro/2.0/Contacts/${this.contact_guid}/history`,
      headers: {
        "Authorization": `Bearer ${this.access_token}`,
        "xero-tenant-id": this.tenant_id,
      },
    });


    let contactCreatedDate = contact_history.HistoryRecords[contact_history.HistoryRecords.length-1].DateUTCString
    let contactUpdatedDate=new Date(Number(this.contact_updated_date.substring(6, this.contact_updated_date.length - 7)))
    
    return {
      contactCreatedDate: contactCreatedDate,
      contactUpdatedDate: contactUpdatedDate
    }
  },
});