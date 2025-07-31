// To use previous step data, pass the `steps` object to the run() function
export default defineComponent({
  async run({ steps, $ }) {
    let address = {
      city: steps.GET_contact_from_Xero["$return_value"].Contacts[0].Addresses[0].City,
      country: steps.GET_contact_from_Xero["$return_value"].Contacts[0].Addresses[0].Country,
      zip: steps.GET_contact_from_Xero["$return_value"].Contacts[0].Addresses[0].PostalCode,
      state: steps.GET_contact_from_Xero["$return_value"].Contacts[0].Addresses[0].Region,
      street: steps.GET_contact_from_Xero["$return_value"].Contacts[0].Addresses[0].AddressLine1,
    }

    console.log(address)

    
// handles "Undefined email adddress bug"
    let email
    // if there is a value
    if(steps.GET_contact_from_Xero["$return_value"].Contacts[0].EmailAddress === undefined)
    {
      email = ""
    }  
    else
    {
      email = steps.GET_contact_from_Xero["$return_value"].Contacts[0].EmailAddress
    }
    
    
    // Return data to use it in future steps
    return {
      address: JSON.stringify(address),
      email: email
    }
  },
})
