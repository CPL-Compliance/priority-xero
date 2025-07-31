export default defineComponent({
  props: {
    xeroAuthorizationCodes: { type: "data_store" },
    xeroAccessTokens: { type: "data_store" },
  },
  async run({ steps, $ }) {
    const tenants = steps.get_user_info?.$return_value?.newlyConnectedTenants;

    // Guard clause: stop if tenant data is missing or empty
    if (!Array.isArray(tenants) || tenants.length === 0 || !tenants[0]?.tenantName) {
      $.export("message", "No newly connected tenants found — skipping step.");
      return;
    }
    const tenant = tenants[0].tenantName;

    // 1. Store the authorization code
    const code = steps.getCodeAndState.$return_value.code;
    
    await this.xeroAuthorizationCodes.set(tenant, code);

    // 2. Store access and refresh tokens
    const accessToken = steps.getAccessToken.$return_value.access_token;
    const refreshToken = steps.getAccessToken.$return_value.refresh_token;

    const tokenObject = {
      access_token: accessToken,
      refresh_token: refreshToken,
    };

    await this.xeroAccessTokens.set(tenant, tokenObject);

    $.export("message", `Stored auth code and tokens for client state '${tenant}'`);
  },
});
