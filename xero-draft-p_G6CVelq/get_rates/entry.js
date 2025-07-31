import { axios } from "@pipedream/platform"
export default defineComponent({
  props: {
    xero_accounting_api: {
      type: "app",
      app: "xero_accounting_api",
    }
  },
  async run({steps, $}) {
    let response = await axios($, {
      url: `https://api.xero.com/api.xro/2.0/TaxRates`,
      headers: {
        Authorization: `Bearer ${this.xero_accounting_api.$auth.oauth_access_token}`,
        "xero-tenant-id": steps.trigger.event.tenantId,
      },
      data: {
        dfs: steps.trigger.context
      },
    })

    let rates = response.TaxRates.filter(taxRate => taxRate.Name.includes("(Complyt)"))
    return {
      requested: rates.find(rate => rate.Name == "Request Sales Tax Calculation (Complyt)"),
      calculated: rates.find(rate => rate.Name == "Tax Calculated (Complyt)"),
      exempted: rates.find(rate => rate.Name == "Tax Exempted (Complyt)"),
    }
  },
})
