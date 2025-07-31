import { axios } from "@pipedream/platform";

export default defineComponent({
  async run({ steps, $ }) {
    // Extract the list of unique street addresses and product classifications
    const uniqueStreetAddresses = steps.proccess_addresses.$return_value.unique_street_addresses;
    const uniqueProductClassifications = steps.get_client_config.$return_value.unique_product_classifications;

    if (!uniqueStreetAddresses || uniqueStreetAddresses.length === 0) {
      throw new Error("No unique street addresses found.");
    }

    if (!uniqueProductClassifications || uniqueProductClassifications.length === 0) {
      throw new Error("No unique product classifications found.");
    }

    // Extract other required data
    const complytApiEnvironment = "api";
    // Generate customerId
    const customerId = `XeroRateSetup${steps.trigger.event.body?.name || "Unknown"}`;

    let authToken;

    try {
      const complytAuthResponse = await axios($, {
        method: "POST",
        url: `https://api.complyt.io/v1/token`,
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          clientId: process.env["clientId_xerogetrates"], // Use process.env instead of os.environ
          clientSecret: process.env["clientSecret_xerogetrates"], // Fix syntax for env access
        },
      });
      console.log("Complyt auth response received successfully:", complytAuthResponse);
      authToken = complytAuthResponse.accessToken;
    } catch (error) {
      console.error("Error during Complyt authentication:", error.message);
      throw new Error("Failed to authenticate with Complyt.");
    }

    // Prepare customer payload
    const customerPayload = {
      externalId: customerId,
      source: "9",
      name: customerId,
      externalTimestamps: {
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
      },
      customerType: "RETAIL",
    };

    let customerComplytId;
    
    try {
      const customerResponse = await axios($, {
        method: "PUT",
        url: `https://${complytApiEnvironment}.complyt.io/v1/customers/source/9/externalId/${customerId}`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        data: customerPayload,
      });

      console.log("Customer PUT response:", customerResponse);

      // Extract complytId from the response
      customerComplytId = customerResponse.complytId;
      if (!customerComplytId) {
        throw new Error("comlytId not found in the customer response.");
      }
    } catch (error) {
      console.error("Failed to process customer:", error.message);
      throw new Error("Failed to process customer.");
    }

    console.log("Complyt ID (Customer ID):", customerComplytId);


    const transactionResponses = []; // Store responses for each transaction

    let count = 0;
    for (const shippingAddress of uniqueStreetAddresses) {
      // Create an item for each unique product classification
      const items = uniqueProductClassifications.map((classification) => ({
        unitPrice: 1, // Fixed price
        quantity: 1, // Fixed quantity
        totalPrice: 1, // Derived from unitPrice * quantity
        description: `Product Classification: ${classification}`, // Description from classification
        name: classification, // Use classification as the name
        taxCode: classification, // Use classification as the tax code
        manualSalesTaxRate: 0,
        manualSalesTax: false,
      }));

      // Prepare transaction payload
      const transactionPayload = {
        externalId: `XeroRatesSetup-${steps.trigger.event.body?.name || "Unknown"}-${count}`, // Unique ID
        source: "9",
        documentName: `XeroRatesSetup-${steps.trigger.event.body?.name || "Unknown"}-${count}`,
        items: items,
        shippingAddress: shippingAddress,
        customerId: customerComplytId,
        transactionStatus: "ACTIVE",
        transactionType: "ESTIMATE",
        externalTimestamps: {
          createdDate: new Date().toISOString(),
          updatedDate: new Date().toISOString(),
        },
      };

      try {
        // Perform PUT transaction
        const response = await axios($, {
          method: "PUT",
          url: `https://${complytApiEnvironment}.complyt.io/v1/transactions/source/9/externalId/${transactionPayload.externalId}`,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          data: transactionPayload,
        });

        console.log(`Successfully processed transaction for ${shippingAddress.street}`);
        transactionResponses.push({
          success: true,
          transactionPayload,
          response: response,
        });
        count++;
      } catch (error) {
        console.error(`Failed to process transaction for ${shippingAddress.street}: ${error.message}`);
        transactionResponses.push({
          success: false,
          transactionPayload,
          error: error.message,
        });
      }
    }

    // Return the responses for all transactions
    return { transactionResponses };
  },
});
