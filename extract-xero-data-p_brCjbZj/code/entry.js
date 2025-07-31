import { MongoClient } from "mongodb";
import axios from "axios";

export default defineComponent({
  async run({ steps, $ }) {
    // Config
    const MONGO_URI = "mongodb+srv://pipedream-solutions:DwdgfAaIqsQ3mvup@solutions.6ek6dxt.mongodb.net/erp_exports?retryWrites=true&w=majority";
    const DB_NAME = "xero_exports";
    const customer_name = "customer_name";
    const Date_2 = new Date().toISOString();
    const COLLECTION = `${customer_name}-${Date_2}`;

    const TOKEN = steps.getToken.$return_value;
    const TENANT_ID = "48bb8c3c-68ae-4a64-bdc4-8900c8f95853";
    const BASE_URL = "https://api.xero.com/api.xro/2.0";

    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "xero-tenant-id": TENANT_ID,
      Accept: "application/json"
    };

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection(COLLECTION);

    const invoiceTypes = ["ACCREC", "ACCRECCREDIT"];
    const results = [];

    for (const type of invoiceTypes) {
      let page = 1;
      while (true) {
        const url = `${BASE_URL}/Invoices?where=Type%3D%3D%22${type}%22&page=${page}`;
        const res = await axios.get(url, { headers });

        if (!res.data.Invoices || res.data.Invoices.length === 0) break;

        const invoicesWithTimestamp = res.data.Invoices.map(inv => ({
          ...inv,
          exportedTime: new Date(), // “now” as a BSON Date
        }));
        
        await col.insertMany(invoicesWithTimestamp);
        console.log(`📥 Inserted ${res.data.Invoices.length} invoices of type ${type} from page ${page}`);

        page++;
      }
    }

    await client.close();
    return { summary: "Xero invoice sync completed", results };
  }
});

