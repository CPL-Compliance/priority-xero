export default defineComponent({
  async run({ steps, $ }) {
    const contact = steps.GET_contact_from_Xero["$return_value"].Contacts?.[0] || {};
    const addressData = contact.Addresses?.[0] || {}; // Prevent undefined errors

    let address = {
      city: addressData.City || "",
      country: addressData.Country || "",
      zip: addressData.PostalCode || "",
      state: addressData.Region || "",
      street: addressData.AddressLine1 || "",
    };

    console.log(address);

    // Handles "Undefined email address bug" safely
    let email = contact.EmailAddress || ""; // Default to empty string if undefined

    // Return data to use in future steps
    return {
      address: JSON.stringify(address),
      email: email,
    };
  },
});
