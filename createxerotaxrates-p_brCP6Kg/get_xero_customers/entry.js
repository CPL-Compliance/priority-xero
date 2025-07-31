import axios from "axios";

export default defineComponent({
  async run({ steps, $ }) {

    // Replace these with your actual Xero credentials
    const TOKEN = steps.get_client_config.$return_value.access_token; // Token retrieved from previous step
    const TENANT_ID = steps.trigger.event.body["xero-tenant-id"]; // Tenant ID from trigger
    const BASE_URL = "https://api.xero.com/api.xro/2.0";
    const HEADERS = {
      Authorization: `Bearer ${TOKEN}`,
      "xero-tenant-id": TENANT_ID,
      Accept: "application/json",
    };

    let page = 1;
    let allContacts = [];
    let hasMoreData = true;

    // Helper function for adding a delay
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      while (hasMoreData) {
        const url = `${BASE_URL}/Contacts?page=${page}`;
        const response = await axios.get(url, { headers: HEADERS });

        if (response.status === 200) {
          const contacts = response.data.Contacts || [];
          allContacts = allContacts.concat(contacts);

          console.log(`Fetched page ${page}: ${contacts.length} contacts`);

          // Check if there are more contacts to fetch
          hasMoreData = contacts.length > 0;
          page++;

          // Add delay to comply with API rate limits
          if (hasMoreData) {
            console.log("Rate limit control: Waiting 1 second before the next request...");
            await delay(1000); // 1-second delay
          }
        } else {
          console.error(`Failed to fetch page ${page}. Status: ${response.status}`);
          hasMoreData = false;
        }
      }

      // Return all contacts for further use in future steps
      return { allContacts };
    } catch (error) {
      console.error("Error fetching contacts:", error.message);
      throw error;
    }
  },
});
