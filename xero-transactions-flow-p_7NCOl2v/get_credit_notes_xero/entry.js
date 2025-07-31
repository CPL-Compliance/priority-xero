import { axios } from "@pipedream/platform"
export default defineComponent({
  props: {
  },
  async run({steps, $}) {
    const jwt = steps.trigger.event.headers.new_xero_token
      async function getNoteFromXero(creditNote) {
      return await axios($, {
        url: `https://api.xero.com/api.xro/2.0/CreditNotes/` + creditNote.CreditNoteID,
        headers: {
          Authorization: `Bearer ${jwt}`,
          "xero-tenant-id": steps.trigger.event.body.event_details.tenantId,
          },
        })
      }

    let result;
    if ("CreditNotes" in steps.GET_invoice_Xero.$return_value.Invoices[0]) {
        // If "CreditNotes" field exists, process each CreditNote with getNoteFromXero
        result = await Promise.all(steps.GET_invoice_Xero.$return_value.Invoices[0].CreditNotes.map(getNoteFromXero));
    } else {
        // If "CreditNotes" does not exist, return an empty array
        result = [];
    }
    return result;

  },
})
