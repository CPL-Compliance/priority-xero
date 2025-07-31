import { axios } from "@pipedream/platform"
export default defineComponent({
  props: {
    tenant_id: {
      type: "string",
      description: "tenant id of event",
    },
    access_token: {
      type: "string",
      description: "jwt"
    },
    contact: {
      type: "object",
      label: "Contact",
      description: "Id of the contact associated to the invoice.",
    },
    lineItems: {
      type: "string",
      description: "lineItems presented in a json string",
    },
    invoiceNumber: {
      type: "string",
      label: "Invoice Number",
      description: "Unique alpha numeric code identifying invoice (* when missing will auto-generate from your Organisation Invoice Settings*) (max length = 255)",
    },
    lineAmountType: {
      type: "string",
      label: "Line Amount Type",
      description: "Line amounts are exclusive of tax by default if you don't specify this element. See [Line Amount Types](https://developer.xero.com/documentation/api/types#LineAmountTypes)",
      optional: true,
    },
  },
  async run({ $ }) {
    const lineItems = JSON.parse(this.lineItems);

    // Ensure each line item has UnitAmount, LineAmount, and Quantity, default to 0 if missing
    const validatedLineItems = lineItems.map(item => {
      if (!item.Quantity) {
        item.Quantity = 0;
      }

      if (!item.UnitAmount && !item.LineAmount) {
        console.warn(`Line item with description "${item.Description}" is missing both UnitAmount and LineAmount, setting both to 0.`);
        item.UnitAmount = 0;
        item.LineAmount = 0;
      } else {
        if (!item.LineAmount && item.UnitAmount) {
          item.LineAmount = item.UnitAmount * item.Quantity;
        } else if (!item.UnitAmount && item.LineAmount) {
          item.UnitAmount = item.LineAmount / item.Quantity;
        }
      }

      // Remove LineItemID if it exists
      // const { LineItemID, ...rest } = item;
      return item;
    });

    let data = {
      Type: "ACCREC",
      InvoiceNumber: this.invoiceNumber,
      Contact: this.contact,
      LineAmountTypes: this.lineAmountType || "Exclusive",
      LineItems: validatedLineItems,
    }

    console.log(`Payload Data: ${JSON.stringify(data, null, 2)}`);
    return await axios($, {
      method: "POST",
      url: `https://api.xero.com/api.xro/2.0/Invoices`,
      headers: {
        Authorization: `Bearer ${this.access_token}`,
        "xero-tenant-id": this.tenant_id,
      },
      data: data
    })
  },
})
