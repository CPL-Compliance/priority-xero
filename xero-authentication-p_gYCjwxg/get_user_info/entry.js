import axios from "axios";
import { jwtDecode } from "jwt-decode";

export default defineComponent({
  async run({ steps, $ }) {
    const accessToken = steps.getAccessToken.$return_value.access_token;

    console.log("Access Token:", accessToken);

    // Decode access token to extract authentication_event_id
    const decoded = jwtDecode(accessToken);
    console.log("Decoded JWT:", decoded);

    const authEventId = decoded.authentication_event_id;

    if (!authEventId) {
      throw new Error("authentication_event_id not found in access token");
    }

    // Get newly connected tenants
    const connectionsUrl = `https://api.xero.com/connections?authEventId=${authEventId}`;
    console.log("Fetching connections from:", connectionsUrl);

    try {
      const connectionsResponse = await axios({
        method: "GET",
        url: connectionsUrl,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Connections Response:", connectionsResponse.data);

      // Get user info
      const userInfoUrl = "https://identity.xero.com/connect/userinfo";
      console.log("Fetching userinfo from:", userInfoUrl);

      const userinfoResponse = await axios({
        method: "GET",
        url: userInfoUrl,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log("User Info Response:", userinfoResponse.data);

      return {
        authEventId,
        user: userinfoResponse.data,
        newlyConnectedTenants: connectionsResponse.data,
      };

    } catch (error) {
      console.error("Request failed:", {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
      });

      throw new Error(`Request to Xero API failed: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
    }
  },
});
