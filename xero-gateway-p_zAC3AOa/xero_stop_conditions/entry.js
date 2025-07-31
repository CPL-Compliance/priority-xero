// To use any npm package, just import it
// import axios from "axios"

export default defineComponent({
  async run({ steps, $ }) {
    // Reference previous step data using the steps object and return data to use it in future steps
    if (steps.complyt_put_transactions.$return_value.isTaxAlreadyCalculated|| steps.Xero_Event_Gateway.$return_value.auto_assessment) {
      $.flow.exit("Tax already calculated or auto_assessment is enabled");
    }
    if (steps.complyt_put_transactions.$return_value.transactionStatus.trim().toUpperCase() === "CANCELLED") {
      $.flow.exit("Transaction is CANCELLED, no need to update Xero");
    }
    if (steps.complyt_stop_conditions.$return_value.draft_to_invoice === true) {
      $.flow.exit("Transaction is converted from draft to invoice");
    }
  },
})