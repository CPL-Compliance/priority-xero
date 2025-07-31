import { axios } from "@pipedream/platform"

export default defineComponent({
  props: {
    xeroClientConfig: { type: "data_store" },
    xeroAccessTokens: { type: "data_store" },
    xeroAccessTokensCambridge: { type: "data_store" },
  }, 

  async run({ steps, $ }) {
    // ─── 1) Capture and validate the incoming payload ───────────────────────
    const body = steps.trigger.event.body;
    if (!body || typeof body !== "object") {
      throw new Error("Request body must be a JSON object.");
    }

    const {
      complytCustomer,
      export: exportFlags = {},
      export_filters = {},
      import: importFlags = {},
      import_filters = {},
      outputOptions = {},
    } = body;

    if (!complytCustomer?.name) {
      throw new Error("`complytCustomer.name` is required in the payload.");
    }
    // Extract xeroTenantId from complytCustomer["xero-id"]
    const xeroTenantId = complytCustomer["xero-id"];
    if (!xeroTenantId) {
      throw new Error("`complytCustomer[\"xero-id\"]` is required in the payload.");
    }

    // ─── 2) Select the appropriate Xero token store ─────────────────────────
    const tokenStore =
      xeroTenantId === "deed4fec-5dcc-4603-8b01-418c9b0fc9d6"
        ?  this.xeroCambridgeAccessTokens
        :  this.xeroAccessTokens;

    console.log(tokenStore)
    console.log(this.xeroCambridgeAccessTokens)

    const stored = await tokenStore.get("Connection");
    if (!stored?.access_token) {
      throw new Error(`No Xero access token found for tenant ${xeroTenantId}.`);
    }
    const xeroAccessToken = stored.access_token;

    // ─── 3) Normalize and cast all flags and filters ───────────────────────
    const parsedExportFlags = {
      contacts: Boolean(exportFlags.contacts),
      invoices: Boolean(exportFlags.invoices),
      creditNotes: Boolean(exportFlags.creditNotes),
    };
    const parsedExportFilters = {
      sinceDate: export_filters.sinceDate || null,
      onlyXeroCustomerId: export_filters.onlyXeroCustomerId || null,
    };

    const parsedImportFlags = {
      contacts: Boolean(importFlags.contacts),
      invoices: Boolean(importFlags.invoices),
      creditNotes: Boolean(importFlags.creditNotes),
    };
    const parsedImportFilters = {
      onlyCountry: import_filters.onlyCountry || null,
      onlyStatus: import_filters.onlyStatus || null,
      onlyContactId: import_filters.onlyContactId || null,
    };

    const parsedOutputOptions = {
      generateCSV: Boolean(outputOptions.generateCSV),
      csvFileName: outputOptions.csvFileName || null,
    };

    // ─── 4) Return everything for downstream steps ──────────────────────────
    return {
      complytCustomer: {
        name: complytCustomer.name,
        xeroTenantId: xeroTenantId || null,
      },
      exportFlags: parsedExportFlags,
      exportFilters: parsedExportFilters,
      importFlags: parsedImportFlags,
      importFilters: parsedImportFilters,
      outputOptions: parsedOutputOptions,
      xeroAccessToken,
    };
  },
});
