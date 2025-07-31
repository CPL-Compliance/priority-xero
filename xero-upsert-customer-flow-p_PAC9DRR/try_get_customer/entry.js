import { axios } from "@pipedream/platform";

export default defineComponent({
  props: {
    complyt_api_environment: {
      type: "string",
      label: "Complyt API Environment",
    },
    contactID: {
      type: "string",
      label: "Contact ID from Xero",
    },
    accessToken: {
      type: "string",
      label: "Access Token for Complyt",
    },
  },
  async run({ steps, $ }) {
    const api_url = `https://${this.complyt_api_environment}.complyt.io/v1/customers/source/6/externalId/${this.contactID}`;
    try {
      const response = await axios($, {
        method: "GET",
        url: api_url,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      return response;
    } catch (error) {
      return { error: `An error occurred: ${error}`,
               customerType: `RETAIL`
             };
    }
  },
});