// To use previous step data, pass the `steps` object to the run() function
export default defineComponent({
  async run({ steps, $ }) {
    if (steps.data_mapper.$return_value.isTaxAlreadyCalculated) $.flow.exit()
    return steps.trigger.event
  },
})