import axios from "axios";

export default defineComponent({
  async run({ steps, $ }) {
    // Reference data from previous steps
    const contacts = steps.get_xero_customers.$return_value.Contacts;
    const contactIds = contacts.map(contact => contact.ContactID);
    
    // Get the access token and tenant ID from the previous step
    const accessToken = steps.get_xero_access_token.$return_value.Connection.access_token;
    const tenantId = steps.trigger.event.body.tenantId;

    // Define the endpoint and headers for the POST request
    const endpoint = "https://eozg38fqfmoa41y.m.pipedream.net";
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    };

    // Function to wait for a specified amount of time
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Iterate over each ContactID and execute the POST request with a delay
    for (const contactId of contactIds) {
      const payload = {
        eventCategory: "CONTACT",
        eventType: "UPDATE",
        resourceId: contactId,
        resourceUrl: `https://api.xero.com/api.xro/2.0/Contacts/${contactId}`,
        tenantId: tenantId,
      };
      try {
        const response = await axios.post(endpoint, payload, { headers });
        // Print the response for debugging purposes
        console.log(`POST request for ContactID ${contactId}: ${response.status} - ${response.data}`);
      } catch (error) {
        console.error(`Error posting ContactID ${contactId}: ${error.response?.status} - ${error.response?.data}`);
      }
      
      // Wait for 300 milliseconds before making the next request
      await delay(3000);
    }

    // Return the array of ContactIDs for use in future steps
    return { contactIds };
  },
});
