// legacy_hash_id: a_52ieOd
import { axios } from "@pipedream/platform";
 
export default defineComponent({
  props: {
    tenant_id: {
      type: "string",
    },
    invoice_id: {
      type: "string",
    },
    access_token: {
      type: "string",
      description: "jwt",
    },
  },
  async run({ $ }) {
    //notifies missing data
    if (!this.tenant_id || !this.invoice_id) {
      throw new Error("Must provide tenant_id, invoice_id parameters.");
    }
    return await axios($, {
      url: `https://api.xero.com/api.xro/2.0/Invoices/${this.invoice_id}`,
      headers: {
        "Authorization": `Bearer ${this.access_token}`,
        "xero-tenant-id": this.tenant_id,
      },
    })
  },
})
