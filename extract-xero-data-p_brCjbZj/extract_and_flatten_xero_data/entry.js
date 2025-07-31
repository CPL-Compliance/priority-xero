import { MongoClient } from "mongodb";
import axios from "axios";

  async run({ steps, $ }) {
    // ─── 0) Pull in values from Step 1
    const {
      xeroAccessToken,
      xeroTenantId,
      exportFlags,
    } = steps.initialize_xero_sync_parameters.$return_value;

    if (!exportFlags.contacts) {
      throw new Error("Contacts export is disabled (exportFlags.contacts=false).");
    }

    // ─── 1) Open Mongo once
    const client = new MongoClient(process.env.mongo_uri_solutions_dev, {
      useNewUrlParser:    true,
      useUnifiedTopology: true,
    });
    await client.connect();
    const db     = client.db("xero_exports");
    const rawCol = db.collection("xero_contacts_raw");

    // ─── 2) Prepare Xero API headers
    const BASE_URL = "https://api.xero.com/api.xro/2.0";
    const headers  = {
      Authorization:   `Bearer ${xeroAccessToken}`,
      "xero-tenant-id": xeroTenantId,
      Accept:          "application/json",
    };

    // ─── 3) Page through Contacts, write raw, build addressMap
    const addressMap = {};
    let page = 1;
    while (true) {
      const { data } = await axios.get(
        `${BASE_URL}/Contacts?page=${page}`,
        { headers }
      );
      const contacts = data.Contacts || [];
      if (!contacts.length) break;

      // 3a) Insert full JSON
      const rawDocs = contacts.map(c => ({
        ...c,
        fetchedAt: new Date().toISOString(),
      }));
      await rawCol.insertMany(rawDocs, { ordered: false });

      // 3b) Extract minimal address info
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

    // ─── 4) Tear down and return
    await client.close();
    return {
      message:    `Exported contacts pages 1–${page - 1}`,
      addressMap,
    };
  },
});
