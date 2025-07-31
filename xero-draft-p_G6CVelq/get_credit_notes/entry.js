import { axios } from "@pipedream/platform"
export default defineComponent({
  props: {
    xero_accounting_api: {
      type: "app",
      app: "xero_accounting_api",
    }
  },
  async run({steps, $}) {
    const jwt = this.xero_accounting_api.$auth.oauth_access_token
      async function getNoteFromXero(creditNote) {
      return await axios($, {
        url: `https://api.xero.com/api.xro/2.0/CreditNotes/` + creditNote.CreditNoteID,
        headers: {
          Authorization: `Bearer ${jwt}`,
          "xero-tenant-id": steps.trigger.event.tenantId,
          },
        })
      }
    return "CreditNotes" in steps.get_trigger_invoice.$return_value.Invoices[0] 
      ? await Promise.all((steps.get_trigger_invoice.$return_value.Invoices[0].CreditNotes).map(getNoteFromXero))
      : []
  },
})
