
export default defineComponent({
  async run({ steps, $ }) {
    if (steps.data_mapper.$return_value.isTaxAlreadyCalculated || steps.trigger.event.body.auto_assessment) {
      $.flow.exit("Tax already calculated or auto_assessment is enabled"); // Provide a descriptive message for clarity
    }

    if (steps.data_mapper["$return_value"].transactionStatus == "CANCELLED") {
      $.flow.exit("Transaction is CANCELLED dont need to update xero"); // Provide a descriptive message for clarity
    };

    return steps.trigger.event;
  }
});
