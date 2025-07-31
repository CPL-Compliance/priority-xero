import { MongoClient } from "mongodb";
import axios from "axios";

export default defineComponent({
  async run({ steps, $ }) {
    // 0) Grab Init step outputs
    const {
      xeroAccessToken,
      xeroTenantId,
      exportFlags,
    } = steps.initialize_xero_sync_parameters.$return_value;

    if (!exportFlags.contacts) {
      throw new Error("contacts export disabled.");
    }

    // 1) Connect to Mongo
    const client = new MongoClient(process.env.mongo_uri_solutions_dev, {
      useNewUrlParser:    true,
      useUnifiedTopology: true,
    });
    await client.connect();
    const db     = client.db("xero_exports");
    const rawCol = db.collection("xero_contacts_raw");

    // 2) Prepare Xero headers
    const BASE   = "https://api.xero.com/api.xro/2.0";
    const headers = {
      Authorization:   `Bearer ${xeroAccessToken}`,
      "xero-tenant-id": xeroTenantId,
      Accept:          "application/json",
    };

    // 3) Page through Contacts → write raw → build addressMap
    const addressMap = {};
    let page = 1;
    while (true) {
      const { data } = await axios.get(`${BASE}/Contacts?page=${page}`, { headers });
      const contacts = data.Contacts || [];
      if (!contacts.length) break;

      // insert raw JSON
      await rawCol.insertMany(
        contacts.map(c => ({ ...c, fetchedAt: new Date().toISOString() })),
        { ordered: false }
      );

      // build slim addressMap
      for (const c of contacts) {
        const tx = c.Addresses?.[0] || {};
        addressMap[c.ContactID] = {
          state:   tx.Region       || "",
          country: tx.Country      || "",
          line1:   tx.AddressLine1 || "",
          city:    tx.City         || "",
          zip:     tx.PostalCode   || "",
        };
      }
      page++;
    }

    await client.close();
    return {
      message:    `Exported contacts pages 1–${page - 1}`,
      addressMap,
    };
  },
});
