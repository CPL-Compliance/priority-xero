import { axios } from "@pipedream/platform";

export default defineComponent({
  async run({ steps, $ }) {

    // BOOLEAN FLAG FOR TESTS
    const FORCE_SALES_TAX = false;
    // Xero API Configuration
    const xeroEndpoint = "https://api.xero.com/api.xro/2.0/TaxRates";
    // const accessToken = steps.Xero_Event_Gateway.$return_value.xero_token;
    const event = steps.Xero_Event_Gateway?.$return_value || {};
    const headers = event.headers || {};
    const accessToken = headers.new_xero_token || event.xero_token || "MISSING_TOKEN";
    console.log("Xero Token:", accessToken);

    // const tenantId = steps.trigger.event.tenantId;
    const tenantId = steps.Xero_Event_Gateway.$return_value.tenantId;
    // Extract & Filter only the ACTIVE “Sales Tax” rates
    const originalTaxRates = steps.HTTP_Calls.$return_value
      .originalTaxRates.TaxRates;
    const activeTaxRates = originalTaxRates.filter(rate => rate.Status === "ACTIVE" && rate.Name.includes("Sales Tax"));

   // Tax Rate Map: DisplayTaxRate -> TaxType (now only for “Sales Tax” codes)
    const taxRateMap = new Map(activeTaxRates.map(rate => [rate.DisplayTaxRate, rate.TaxType]));

    console.log("Filtered Active Tax Rates:", Array.from(taxRateMap.entries()));

    // Extract & Map Complyt Line Items
    const complytLineItems = steps.complyt_put_transactions.$return_value.response.items;
    const originalLineItems = steps.HTTP_Calls.$return_value.invoiceDetails.LineItems;
    const complytItemsMap = new Map(complytLineItems.map(item => [item.name, item]));

    console.log("Complyt Items:", Array.from(complytItemsMap.entries()));

    let finalLineItems = [];
    let totalTaxAmount = 0;


    // Process Each Line Item
for (const [index, originalItem] of originalLineItems.entries()) {
  if (!originalItem) continue;

  console.log(`Processing Item ${index}:`, JSON.stringify(originalItem));

  // Retrieve Complyt Item
  const complytItem = complytItemsMap.get(originalItem.LineItemID);

  let taxType = originalItem.TaxType;  // ✅ Keep original tax type
  let taxAmount = calculateTaxAmount(originalItem, complytItem);

const requestedTaxType = steps.HTTP_Calls.$return_value.taxRates.requested.TaxType;
  
// Only recalc if either the customer asked (REQUESTED) or we’ve forced it
if (FORCE_SALES_TAX || originalItem.TaxType === requestedTaxType) {
  console.log(`🚨 TaxType is "REQUEST" (or ${requestedTaxType}) for ${originalItem.Description}. Calling determineTaxType()...`);
  taxType = await determineTaxType(originalItem, complytItem, taxRateMap, activeTaxRates, steps, xeroEndpoint, accessToken, tenantId, $);
  console.log(`✅ After determineTaxType(): TaxType=${taxType} for ${originalItem.Description}`);
}


  if (steps.Xero_Event_Gateway.$return_value.line_item_tax) {
    // 🚨 Override Tax for line items and sum it up separately
    console.log(`🚨 Overriding Tax for ${originalItem.Description} - Setting to "NONE"`);
    taxType = "NONE";
    totalTaxAmount += taxAmount;  // ✅ Collect tax to add in separate line
    taxAmount = 0; // ✅ Zero out tax for individual items
  }

  console.log(`✅ Final Tax for ${originalItem.Description}: TaxType=${taxType}, TaxAmount=${taxAmount}`);

  // Construct Updated Line Item
  const newLineItem = {
    LineItemID: originalItem.LineItemID,
    UnitAmount: originalItem.UnitAmount,
    Quantity: originalItem.Quantity,
    ItemCode: originalItem.ItemCode || "",
    Description: originalItem.Description,
    LineAmount: originalItem.LineAmount,
    TaxType: taxType,
    TaxAmount: taxAmount,
    Tracking: originalItem.Tracking || [],
    AccountCode: originalItem.AccountCode,
  };

// ✅ Add DiscountRate only if the complyt item has a meaningful discount
if (
  complytItem?.discount &&
  complytItem.discount > 0 &&
  complytItem.unitPrice &&
  complytItem.quantity
) {
  const fullAmount = complytItem.unitPrice * complytItem.quantity + complytItem.discount;
  if (fullAmount > 0) {
    const discountRate = (complytItem.discount / fullAmount) * 100;
    newLineItem.DiscountRate = parseFloat(discountRate.toFixed(2));
    console.log(`✅ Adding DiscountRate: ${newLineItem.DiscountRate}% for "${originalItem.Description}"`);
  }
} else {
  console.log(`ℹ️ No discount applied to "${originalItem.Description}"`);
}

finalLineItems.push(newLineItem);

}

// ✅ If `line_item_tax = true`, add a separate tax line item
if (steps.Xero_Event_Gateway.$return_value.line_item_tax && totalTaxAmount > 0) {
  console.log(`✅ Adding Sales Tax Line Item: ${totalTaxAmount.toFixed(2)}`);

  finalLineItems.push({
    Description: "Sales Tax",
    UnitAmount: totalTaxAmount,
    Quantity: 1,
    LineAmount: totalTaxAmount,
    TaxType: "NONE",
    TaxAmount: 0,
    AccountCode: finalLineItems[0]?.AccountCode || "TAX_ACCOUNT",
  });
}

    // Validate & Prepare Payload
    const validatedLineItems = validateLineItems(finalLineItems);
    const xero_contact_id = steps.HTTP_Calls.$return_value.invoiceDetails.Contact.ContactID;

    const payload = {
      Type: "ACCREC",
      InvoiceNumber: steps.HTTP_Calls.$return_value.invoiceDetails.InvoiceNumber,
      Contact: { ContactID: xero_contact_id },
      LineAmountTypes: "Exclusive",
      LineItems: validatedLineItems,
    };

    console.log("Final Payload:", JSON.stringify(payload, null, 2));

    // Send to Xero
    return await fetchWithRetry($, {
      method: "POST",
      url: "https://api.xero.com/api.xro/2.0/Invoices",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "xero-tenant-id": tenantId,
      },
      data: payload,
    });    

  },
});

async function determineTaxType(originalItem, complytItem, taxRateMap, activeTaxRates, steps, xeroEndpoint, accessToken, tenantId, $) {
  const calculatedTaxRate = complytItem?.salesTaxRates?.taxRate || 0;
  const taxRatePercentage = (calculatedTaxRate * 100).toFixed(2);

  console.log(`Calculated Tax Rate for ${originalItem.Description}: ${taxRatePercentage}%`);
  if (Number(taxRatePercentage) === 0) {
    return "NONE";
  }
  // Look for an existing tax rate
  let existingTaxRate = taxRateMap.get(Number(taxRatePercentage));

  if (existingTaxRate) {
    console.log(`Checking TaxType '${existingTaxRate}' for Account '${originalItem.AccountCode}'`);

    // ✅ Ensure TaxType can apply to revenue before using it
    const taxRateObject = activeTaxRates.find(rate => rate.TaxType === existingTaxRate);

    if (taxRateObject) {
      if (taxRateObject.CanApplyToRevenue) {
        console.log(`✅ Using Existing Allowed Tax Rate: ${existingTaxRate}`);
        return existingTaxRate;
      } else {
        console.warn(`🚨 TaxType '${existingTaxRate}' cannot be used with Account '${originalItem.AccountCode}'. Updating Tax Rate...`);
        return await updateTaxRate(existingTaxRate, xeroEndpoint, accessToken, tenantId, $);
      }
    }
  }



  // Create or update tax rate
  return await createOrUpdateTaxRate(taxRatePercentage, steps, xeroEndpoint, accessToken, tenantId, $);
}


async function createTaxRate(taxRatePercentage, steps, xeroEndpoint, accessToken, tenantId, $) {
  // Fetch the country code from the organisation data
  const countryCode = steps.HTTP_Calls.$return_value.organisationResponse.Organisations[0].CountryCode;
  const org = steps.HTTP_Calls.$return_value.organisationResponse.Organisations[0];
  const isGlobal = org.Version === "GLOBAL";

  // Determine the tax rate payload based on the country code
  let taxRatePayload;

  if (countryCode === "AU" || countryCode === "NZ" || countryCode === "UK" || countryCode === "GB") {
    // For AU, NZ, GB, or UK, include ReportTaxType
    taxRatePayload = {
      Name: `Sales Tax (${taxRatePercentage}%)`,
      ReportTaxType: "OUTPUT",  // Include ReportTaxType for these countries
      TaxComponents: [
        {
          Name: "Total Sales Tax",
          Rate: taxRatePercentage,
          IsCompound: false,
          IsNonRecoverable: false,
        },
      ],
    };
  } else if (countryCode === "US" || isGlobal) {
    // For US or GLOBAL, do not include ReportTaxType
    taxRatePayload = {
      Name: `Sales Tax (${taxRatePercentage}%)`,
      TaxComponents: [
        {
          Name: "Total Sales Tax",
          Rate: taxRatePercentage,
          IsCompound: false,
          IsNonRecoverable: false,
        },
      ],
    };
  } else {
    // Default payload if country code doesn't match the above cases
    taxRatePayload = {
      Name: `Sales Tax (${taxRatePercentage}%)`,
      ReportTaxType: "OUTPUT",  // Default to "OUTPUT" if country is not recognized
      TaxComponents: [
        {
          Name: "Total Sales Tax",
          Rate: taxRatePercentage,
          IsCompound: false,
          IsNonRecoverable: false,
        },
      ],
    };
  }

    const response = await fetchWithRetry($, {
      method: "POST",
      url: xeroEndpoint,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "xero-tenant-id": tenantId,
      },
      data: taxRatePayload,
    });


    const newTaxRate = response?.TaxRates?.[0]?.TaxType || "NONE";
    console.log(`Created New Tax Rate: ${newTaxRate}`);
    return newTaxRate;
}


/**
 * Calculates the tax amount for a line item.
 */
function calculateTaxAmount(originalItem, complytItem) {
  if (!complytItem) return originalItem.TaxAmount || 0;

  let taxAmount = 0;

  if (complytItem.manualSalesTax) {
    // ✅ Always use manualSalesTaxRate when manualSalesTax is true
    taxAmount = complytItem.totalPrice * complytItem.manualSalesTaxRate;
    console.log(`🔄 Using manual sales tax rate for ${originalItem.Description}: ${complytItem.manualSalesTaxRate} -> ${taxAmount.toFixed(2)}`);
  } else {
    // ✅ Otherwise, use calculated sales tax rate
    taxAmount = complytItem.totalPrice * (complytItem.salesTaxRates?.taxRate || 0);
    console.log(`✅ Using calculated tax rate for ${originalItem.Description}: ${complytItem.salesTaxRates?.taxRate || 0} -> ${taxAmount.toFixed(2)}`);
  }

  return parseFloat(taxAmount.toFixed(2));  // ✅ Ensures correct rounding
}



/**
 * Adds a new sales tax line item if required.
 */
async function addSalesTaxLineItem(finalLineItems, totalTaxAmount, taxRateMap, xeroEndpoint, accessToken, tenantId, steps, $) {
  if (totalTaxAmount <= 0) {
    console.warn("🚨 No total tax amount to add.");
    return;
  }

  

  const totalItemsAmount = steps.complyt_put_transactions.$return_value.response.totalItemsAmount || 1;
  const taxRatePercentage = (totalTaxAmount / totalItemsAmount) * 100;
    
  let taxType = taxRateMap.get(Number(taxRatePercentage)) || await createTaxRate(taxRatePercentage, steps, xeroEndpoint, accessToken, tenantId, $);

  const newTaxLineItem = {
    Description: "US Sales Tax",
    UnitAmount: totalTaxAmount,
    Quantity: 1,
    LineAmount: totalTaxAmount,
    TaxType: taxType,  // ✅ Ensure correct tax type
    TaxAmount: totalTaxAmount,  // ✅ Ensure correct amount
    AccountCode: finalLineItems[0]?.AccountCode || "TAX_ACCOUNT",
  };

  console.log("✅ Adding Sales Tax Line Item:", JSON.stringify(newTaxLineItem));
  finalLineItems.push(newTaxLineItem);
}

/**
 * Validates and cleans line items before sending to Xero.
 */
function validateLineItems(lineItems) {
  return lineItems.map(item => {
    item.Quantity = item.Quantity || 1;
    item.UnitAmount = item.UnitAmount || (item.LineAmount ? item.LineAmount / item.Quantity : 0);
    item.LineAmount = item.LineAmount || item.UnitAmount * item.Quantity;
    item.TaxType = item.TaxType || "NONE";
    return item;
  });
}

async function updateTaxRate(taxType, xeroEndpoint, accessToken, tenantId, $) {
  const taxRatePayload = {
    TaxRates: [
      {
        TaxType: taxType,
        CanApplyToRevenue: true,  // Ensure it can apply to revenue
      }
    ]
  };

  try {
    const response = await fetchWithRetry($, {
      method: "POST",
      url: `${xeroEndpoint}`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "xero-tenant-id": tenantId,
      },
      data: taxRatePayload,
    });
    

    console.log(`✅ Successfully Updated Tax Rate '${taxType}' to Apply to Revenue`);
    return taxType;
  } catch (error) {
    console.error(`🚨 Failed to Update Tax Rate '${taxType}':`, error.response?.data || error.message);
    return "NONE";
  }
}

async function createOrUpdateTaxRate(taxRatePercentage, steps, xeroEndpoint, accessToken, tenantId, $) {
  try {
    const taxRatesResponse = await fetchWithRetry($, {
      method: "GET",
      url: xeroEndpoint,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "xero-tenant-id": tenantId,
      },
    });
    
    const allTaxRates = taxRatesResponse?.TaxRates || [];
    
    // ✅ ONLY look for "Sales Tax" rates, not Avalara state-specific rates
    const salesTaxRates = allTaxRates.filter(rate => 
      rate.Status === "ACTIVE" && rate.Name.includes("Sales Tax")
    );

    // Find matching "Sales Tax" rate ONLY
    let existingTaxRate = salesTaxRates.find(rate => rate.DisplayTaxRate === Number(taxRatePercentage));

    if (existingTaxRate) {
      console.log(`🔍 Found existing Sales Tax rate: ${existingTaxRate.TaxType}`);

      // ✅ If CanApplyToRevenue is false, update it
      if (!existingTaxRate.CanApplyToRevenue) {
        console.log(`🚨 Updating TaxType '${existingTaxRate.TaxType}' to allow revenue...`);

        const updatedTaxRatePayload = {
          Name: existingTaxRate.Name,
          TaxType: existingTaxRate.TaxType,
          ReportTaxType: existingTaxRate.ReportTaxType,
          CanApplyToAssets: existingTaxRate.CanApplyToAssets,
          CanApplyToEquity: existingTaxRate.CanApplyToEquity,
          CanApplyToExpenses: existingTaxRate.CanApplyToExpenses,
          CanApplyToLiabilities: existingTaxRate.CanApplyToLiabilities,
          CanApplyToRevenue: true, // ✅ Enable revenue usage
          DisplayTaxRate: existingTaxRate.DisplayTaxRate,
          EffectiveRate: existingTaxRate.EffectiveRate,
          Status: existingTaxRate.Status,
          TaxComponents: existingTaxRate.TaxComponents,
        };

        await fetchWithRetry($, {
          method: "PUT",
          url: xeroEndpoint,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "xero-tenant-id": tenantId,
          },
          data: { TaxRates: [updatedTaxRatePayload] },
        });

        console.log(`✅ Successfully updated TaxType '${existingTaxRate.TaxType}' to allow revenue.`);
        return existingTaxRate.TaxType;
      }

      // ✅ If it's already allowed for revenue, use it
      console.log(`✅ Using Existing Sales Tax TaxType '${existingTaxRate.TaxType}'`);
      return existingTaxRate.TaxType;
    }

    // 🚨 If no existing "Sales Tax" rate found, create a new one
    console.log(`🚨 No matching "Sales Tax" rate found for ${taxRatePercentage}%. Creating a new one...`);
    return await createTaxRate(taxRatePercentage, steps, xeroEndpoint, accessToken, tenantId, $);

  } catch (error) {
    console.error("🚨 Error Fetching/Updating Tax Rate:", error.response?.data || error.message);
    return "NONE";
  }
}

async function fetchWithRetry($, axiosConfig, maxRetries = 5, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios($, axiosConfig);
      return response;
    } catch (error) {
      const status = error?.response?.status || 0;
      const retryAfter = error?.response?.headers?.['retry-after'];
      console.error(`Attempt ${attempt + 1} failed: HTTP ${status}`);
      if (error?.response?.data) {
        console.error("Error Payload:", JSON.stringify(error.response.data, null, 2));
      }
      if (status === 429) {
        const wait = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, wait));
      } else if ([500, 502, 503, 504].includes(status)) {
        const wait = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, wait));
      } else if ([400, 401, 403, 404].includes(status)) {
        throw error;
      } else {
        if (attempt >= maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
      }
    }
  }
  throw new Error("Exceeded retry attempts");
}
