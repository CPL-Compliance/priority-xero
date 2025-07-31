// To use any npm package, just import it
// import axios from "axios"

// credit note against an existing invoice - full credit 
// credit note against an existing invoice - partial credit
// standalone credit note against customer
// you can allocate a standalone credit note to an existing invoice

export default defineComponent({
  async run({ steps, $ }) {
    // Reference previous step data using the steps object and return data to use it in future steps
    return steps.trigger.event
  },
})
