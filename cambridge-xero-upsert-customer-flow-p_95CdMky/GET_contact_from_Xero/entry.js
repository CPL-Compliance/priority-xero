// legacy_hash_id: a_52ieOd
import { axios } from "@pipedream/platform";

export default defineComponent({
  props: {
    tenant_id: {
      type: "string",
    },
    contact_id: {
      type: "string",
    },
    access_token: {
      type: "string",
      description: "jwt",
    },
  },
  async run({ $ }) {
  
  //handles missing data
    if (!this.tenant_id || !this.contact_id) {
      throw new Error("Must provide tenant_id, contact_id parameters.");
    }

    return await axios($, {
      url: `https://api.xero.com/api.xro/2.0/Contacts/${this.contact_id}`,
      headers: {
        "Authorization": `Bearer ${this.access_token}`,
        "xero-tenant-id": this.tenant_id,
      },
    })
  },
})