import { axios } from "@pipedream/platform"
export default defineComponent({
  props: {
  },
  async run({steps, $}) {
    let response = await axios($, {
      url: `https://api.xero.com/api.xro/2.0/TaxRates`,
      headers: {
        "Authorization": `Bearer ${steps.trigger.event.headers.new_xero_token}`,
        "xero-tenant-id": steps.trigger.event.body.event_details.tenantId,
      },
      data: {
        dfs: steps.trigger.context
      },
    })

    //Filters all the tax rate list to include only with "(Complyt)"
    let rates = response.TaxRates.filter(taxRate => taxRate.Name.includes("(Complyt)"))
    return {
      requested: rates.find(rate => rate.Name == "Request Sales Tax Calculation (Complyt)"),
      calculated: rates.find(rate => rate.Name == "Tax Calculated (Complyt)"),
      exempted: rates.find(rate => rate.Name == "Tax Exempted (Complyt)")
    }
  },
})
