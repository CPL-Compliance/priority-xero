# Priority-Xero Integration Rebuild Guide

## 📋 Overview

This comprehensive guide provides step-by-step instructions for rebuilding the Priority-Xero integration from scratch. The integration synchronizes data between Priority ERP and Xero accounting software, handling customers, invoices, and tax calculations.

## 🏗️ Architecture Overview

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Xero Gateway  │────│  Authentication │────│   Token Mgmt    │
│   (Routing)     │    │     Service     │    │   (Refresh)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ├─────────────────┬─────────────────┬─────────────────┐
         │                 │                 │                 │
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Customer      │ │   Transaction   │ │   Tax Rate      │ │   Data Extract  │
│   Upsert Flow   │ │   Flow          │ │   Management    │ │   Utilities     │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Data Flow

1. **Webhook/Event Trigger** → Gateway routing
2. **Authentication** → Token validation/refresh
3. **Data Extraction** → Xero API calls
4. **Data Transformation** → Mapping to Complyt format
5. **Business Logic** → Tax calculations, validations
6. **Data Persistence** → Complyt API calls
7. **Response Handling** → Update Xero with results

## 🚀 Implementation Steps

### Phase 1: Foundation Setup

#### 1.1 Authentication Service

**File: `xero-authentication/entry.js`**

```javascript
import { axios } from "@pipedream/platform";

export default defineComponent({
  props: {
    client_id: { type: "string" },
    client_secret: { type: "string" },
    redirect_uri: { type: "string" }
  },
  async run({ $ }) {
    // OAuth2 token exchange
    const tokenResponse = await axios($, {
      method: "POST",
      url: "https://identity.xero.com/connect/token",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      data: {
        grant_type: "authorization_code",
        client_id: this.client_id,
        client_secret: this.client_secret,
        redirect_uri: this.redirect_uri,
        code: this.authorization_code
      }
    });

    // Get tenant connections
    const connections = await axios($, {
      url: "https://api.xero.com/connections",
      headers: {
        "Authorization": `Bearer ${tokenResponse.access_token}`
      }
    });

    return {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      tenant_id: connections[0].tenantId,
      expires_in: tokenResponse.expires_in
    };
  }
});
```

#### 1.2 Token Refresh Service

**File: `xero-refresh-token/entry.js`**

```javascript
export default defineComponent({
  async run({ steps, $ }) {
    const refreshToken = await this.getStoredRefreshToken();
    
    const response = await axios($, {
      method: "POST",
      url: "https://identity.xero.com/connect/token",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      data: {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.XERO_CLIENT_ID,
        client_secret: process.env.XERO_CLIENT_SECRET
      }
    });

    await this.storeRefreshToken(response.refresh_token);
    
    return {
      access_token: response.access_token,
      expires_in: response.expires_in
    };
  }
});
```

### Phase 2: Gateway Implementation

#### 2.1 Main Gateway Router

**File: `xero-gateway/entry.js`**

```javascript
export default defineComponent({
  async run({ steps, $ }) {
    const eventType = steps.trigger.event.body.eventType;
    const resourceType = steps.trigger.event.body.resourceType;
    
    // Route based on event type
    switch (eventType) {
      case "CREATE":
      case "UPDATE":
        if (resourceType === "INVOICE") {
          return await this.routeToTransactionFlow(steps.trigger.event);
        } else if (resourceType === "CONTACT") {
          return await this.routeToCustomerFlow(steps.trigger.event);
        }
        break;
      case "DELETE":
        return await this.routeToDeleteFlow(steps.trigger.event);
      default:
        $.flow.exit("Unsupported event type");
    }
  },

  async routeToTransactionFlow(event) {
    // Trigger transaction processing workflow
    return {
      workflow: "xero-transactions-flow",
      payload: event
    };
  },

  async routeToCustomerFlow(event) {
    // Trigger customer processing workflow
    return {
      workflow: "xero-customer-flow", 
      payload: event
    };
  }
});
```

### Phase 3: Customer Integration

#### 3.1 Customer Data Mapper

**File: `xero-customer-flow/data-mapper/entry.js`**

```javascript
export default defineComponent({
  async run({ steps, $ }) {
    const contact = steps.get_contact_from_xero.$return_value.Contacts?.[0] || {};
    const addressData = contact.Addresses?.[0] || {};

    // Map Xero contact to Complyt customer format
    const customerData = {
      externalId: contact.ContactID,
      source: "6", // Xero source ID
      name: contact.Name,
      email: contact.EmailAddress || "",
      customerType: "RETAIL",
      address: {
        street: addressData.AddressLine1 || "",
        city: addressData.City || "",
        state: addressData.Region || "",
        zip: addressData.PostalCode || "",
        country: addressData.Country || ""
      },
      externalTimestamps: {
        createdDate: this.parseXeroDate(contact.CreatedDateUTC),
        updatedDate: this.parseXeroDate(contact.UpdatedDateUTC)
      }
    };

    return {
      customerData: JSON.stringify(customerData)
    };
  },

  parseXeroDate(xeroDate) {
    if (!xeroDate) return null;
    // Parse Xero date format: /Date(1234567890000+0000)/
    const timestamp = xeroDate.match(/\d+/)?.[0];
    return timestamp ? new Date(parseInt(timestamp)).toISOString() : null;
  }
});
```

#### 3.2 Customer API Integration

**File: `xero-customer-flow/complyt-upsert/entry.js`**

```javascript
export default defineComponent({
  async run({ steps, $ }) {
    const customerData = JSON.parse(steps.data_mapper.$return_value.customerData);
    const complytToken = steps.get_complyt_token.$return_value.accessToken;

    const response = await axios($, {
      method: "PUT",
      url: `https://${process.env.COMPLYT_ENVIRONMENT}.complyt.io/v1/customers/source/6/externalId/${customerData.externalId}`,
      headers: {
        "Authorization": `Bearer ${complytToken}`,
        "Content-Type": "application/json"
      },
      data: customerData
    });

    return {
      complytId: response.complytId,
      status: "success"
    };
  }
});
```

### Phase 4: Transaction Integration

#### 4.1 Transaction Data Mapper

**File: `xero-transaction-flow/data-mapper/entry.js`**

```javascript
export default defineComponent({
  async run({ steps, $ }) {
    const invoice = steps.get_invoice_from_xero.$return_value.Invoices[0];
    
    // Validate USA transactions only
    const shippingCountry = invoice.Contact.Addresses[1]?.Country;
    if (!["USA", "United States", "US"].includes(shippingCountry)) {
      $.flow.exit("Non-USA transaction");
    }

    // Filter out supplier invoices
    if (invoice.Type === "ACCPAY") {
      $.flow.exit("Supplier invoice - not processed");
    }

    // Map transaction status
    const statusMapping = {
      "AUTHORISED": { status: "ACTIVE", type: "INVOICE" },
      "DELETED": { status: "CANCELLED", type: "ESTIMATE" },
      "VOIDED": { status: "CANCELLED", type: "INVOICE" },
      "DRAFT": { status: "ACTIVE", type: "ESTIMATE" },
      "PAID": { status: "ACTIVE", type: "INVOICE" }
    };

    const transactionStatus = statusMapping[invoice.Status] || 
                             { status: "ACTIVE", type: "INVOICE" };

    // Map shipping address
    const shippingAddress = {
      street: invoice.Contact.Addresses[1]?.AddressLine1 || "",
      city: invoice.Contact.Addresses[1]?.City || "",
      state: invoice.Contact.Addresses[1]?.Region || "",
      zip: invoice.Contact.Addresses[1]?.PostalCode || "",
      country: invoice.Contact.Addresses[1]?.Country || ""
    };

    // Map line items
    const items = this.mapLineItems(invoice.LineItems, steps.trigger.event.body.tax_code_map);

    return {
      transactionData: JSON.stringify({
        externalId: invoice.InvoiceID,
        source: "6",
        documentName: invoice.InvoiceNumber,
        customerId: steps.upsert_customer.$return_value.complytId,
        items: items.filter(item => item.taxCode !== "Ignore"),
        shippingAddress: shippingAddress,
        transactionStatus: transactionStatus.status,
        transactionType: transactionStatus.type,
        externalTimestamps: {
          createdDate: invoice.DateString,
          updatedDate: steps.get_history_dates.$return_value.invoiceUpdatedDate
        }
      }),
      allItems: JSON.stringify(items),
      isTaxCalculationNeeded: this.checkTaxCalculationNeeded(invoice.LineItems)
    };
  },

  mapLineItems(lineItems, taxCodeMap) {
    return lineItems.map(lineItem => {
      // Calculate unit price with discounts
      let unitPrice = lineItem.UnitAmount;
      if (lineItem.DiscountRate) {
        unitPrice = lineItem.UnitAmount - (lineItem.DiscountAmount / lineItem.Quantity);
      }

      // Determine tax code
      let taxCode = "";
      if (lineItem.ItemCode && taxCodeMap[lineItem.ItemCode]) {
        taxCode = taxCodeMap[lineItem.ItemCode];
      } else {
        taxCode = taxCodeMap.default_tax_code || "";
      }

      // Calculate manual tax rate if needed
      let manualSalesTaxRate = 0;
      let manualSalesTax = false;
      
      if (this.isManualTaxRate(lineItem.TaxType)) {
        manualSalesTax = true;
        manualSalesTaxRate = this.calculateTaxRate(lineItem.TaxAmount, lineItem.LineAmount);
      }

      return {
        name: lineItem.LineItemID,
        description: lineItem.Description,
        quantity: lineItem.Quantity,
        unitPrice: unitPrice,
        totalPrice: lineItem.LineAmount,
        taxCode: taxCode,
        manualSalesTax: manualSalesTax,
        manualSalesTaxRate: manualSalesTaxRate
      };
    }).filter(item => item !== undefined);
  },

  checkTaxCalculationNeeded(lineItems) {
    return lineItems.some(item => 
      item.TaxType === "Request Sales Tax Calculation (Complyt)"
    );
  },

  isManualTaxRate(taxType) {
    const complytTaxTypes = [
      "Request Sales Tax Calculation (Complyt)",
      "Tax Calculated (Complyt)",
      "Tax Exempted (Complyt)"
    ];
    return !complytTaxTypes.includes(taxType);
  },

  calculateTaxRate(taxAmount, lineAmount) {
    if (lineAmount === 0) return 0;
    return Math.round((taxAmount / lineAmount) * 100000000) / 100000000; // 8 decimal precision
  }
});
```

#### 4.2 Tax Rate Management

**File: `tax-rate-manager/entry.js`**

```javascript
export default defineComponent({
  async run({ steps, $ }) {
    const complytResponse = steps.put_transaction.$return_value;
    const distinctTaxRates = this.extractDistinctTaxRates(complytResponse.items);

    // Create tax rates in Xero
    const createdRates = [];
    for (const rate of distinctTaxRates) {
      const taxRatePayload = {
        Name: `US Sales Tax (${(rate * 100).toFixed(2)}%)`,
        TaxComponents: [{
          Name: "Total Sales Tax",
          Rate: (rate * 100).toFixed(2),
          IsCompound: false,
          IsNonRecoverable: false
        }]
      };

      try {
        const response = await axios($, {
          method: "POST",
          url: "https://api.xero.com/api.xro/2.0/TaxRates",
          headers: {
            "Authorization": `Bearer ${steps.get_xero_token.$return_value.access_token}`,
            "xero-tenant-id": steps.trigger.event.body.event_details.tenantId,
            "Content-Type": "application/json"
          },
          data: taxRatePayload
        });

        createdRates.push({
          rate: rate,
          name: taxRatePayload.Name,
          xeroId: response.TaxRates[0].TaxType
        });
      } catch (error) {
        console.error(`Failed to create tax rate ${rate}:`, error.message);
      }
    }

    return { createdRates };
  },

  extractDistinctTaxRates(items) {
    const rates = new Set();
    items.forEach(item => {
      if (item.salesTaxRates && item.salesTaxRates.taxRate) {
        rates.add(item.salesTaxRates.taxRate);
      }
    });
    return Array.from(rates);
  }
});
```

### Phase 5: Data Synchronization

#### 5.1 Xero Invoice Update

**File: `xero-transaction-flow/update-invoice/entry.js`**

```javascript
export default defineComponent({
  async run({ steps, $ }) {
    const originalInvoice = steps.get_invoice_from_xero.$return_value.Invoices[0];
    const complytItems = steps.put_transaction.$return_value.items;
    
    // Map Complyt response back to Xero format
    const updatedLineItems = this.mapComplytToXeroLineItems(
      originalInvoice.LineItems,
      complytItems
    );

    const updatePayload = {
      Type: "ACCREC",
      InvoiceNumber: originalInvoice.InvoiceNumber,
      Contact: { ContactID: originalInvoice.Contact.ContactID },
      LineAmountTypes: "Exclusive",
      LineItems: updatedLineItems
    };

    const response = await axios($, {
      method: "POST",
      url: "https://api.xero.com/api.xro/2.0/Invoices",
      headers: {
        "Authorization": `Bearer ${steps.get_xero_token.$return_value.access_token}`,
        "xero-tenant-id": steps.trigger.event.body.event_details.tenantId,
        "Content-Type": "application/json"
      },
      data: updatePayload
    });

    // Add history record
    await this.addHistoryRecord(
      originalInvoice.InvoiceID,
      "Tax calculation completed by Complyt",
      steps.get_xero_token.$return_value.access_token,
      steps.trigger.event.body.event_details.tenantId
    );

    return { 
      status: "success",
      invoiceId: response.Invoices[0].InvoiceID 
    };
  },

  mapComplytToXeroLineItems(originalItems, complytItems) {
    const complytItemsMap = new Map(
      complytItems.map(item => [item.name, item])
    );

    return originalItems.map(originalItem => {
      const complytItem = complytItemsMap.get(originalItem.LineItemID);
      
      let taxType = "Tax Calculated (Complyt)";
      let taxAmount = 0;

      if (complytItem) {
        if (complytItem.manualSalesTax) {
          taxAmount = complytItem.totalPrice * complytItem.manualSalesTaxRate;
        } else if (complytItem.salesTaxRates) {
          taxAmount = complytItem.totalPrice * complytItem.salesTaxRates.taxRate;
        }
      }

      return {
        LineItemID: originalItem.LineItemID,
        UnitAmount: originalItem.UnitAmount,
        Quantity: originalItem.Quantity,
        ItemCode: originalItem.ItemCode || "",
        Description: originalItem.Description,
        LineAmount: originalItem.LineAmount,
        TaxType: taxType,
        TaxAmount: taxAmount,
        Tracking: originalItem.Tracking,
        AccountCode: originalItem.AccountCode,
        ...(originalItem.DiscountAmount && { DiscountAmount: originalItem.DiscountAmount })
      };
    });
  },

  async addHistoryRecord(invoiceId, details, accessToken, tenantId) {
    const historyPayload = {
      HistoryRecords: [{
        Details: details
      }]
    };

    await axios($, {
      method: "POST",
      url: `https://api.xero.com/api.xro/2.0/Invoices/${invoiceId}/history`,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "xero-tenant-id": tenantId,
        "Content-Type": "application/json"
      },
      data: historyPayload
    });
  }
});
```

### Phase 6: Error Handling & Utilities

#### 6.1 Error Handler

**File: `utils/error-handler.js`**

```javascript
export class IntegrationError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'IntegrationError';
    this.code = code;
    this.details = details;
  }
}

export const errorHandler = {
  handleXeroApiError(error, context = {}) {
    if (error.response?.status === 401) {
      throw new IntegrationError(
        'Xero authentication failed',
        'XERO_AUTH_ERROR',
        { ...context, originalError: error.message }
      );
    }
    
    if (error.response?.status === 429) {
      throw new IntegrationError(
        'Xero rate limit exceeded',
        'XERO_RATE_LIMIT',
        { ...context, retryAfter: error.response.headers['retry-after'] }
      );
    }

    throw new IntegrationError(
      'Xero API error',
      'XERO_API_ERROR',
      { ...context, status: error.response?.status, originalError: error.message }
    );
  },

  handleComplytApiError(error, context = {}) {
    if (error.response?.status === 401) {
      throw new IntegrationError(
        'Complyt authentication failed',
        'COMPLYT_AUTH_ERROR',
        { ...context, originalError: error.message }
      );
    }

    throw new IntegrationError(
      'Complyt API error',
      'COMPLYT_API_ERROR',
      { ...context, status: error.response?.status, originalError: error.message }
    );
  }
};
```

#### 6.2 Data Validation Utilities

**File: `utils/validators.js`**

```javascript
export const validators = {
  validateUSATransaction(invoice) {
    const shippingAddress = invoice.Contact?.Addresses?.[1];
    if (!shippingAddress) {
      throw new IntegrationError('Missing shipping address', 'VALIDATION_ERROR');
    }

    const validCountries = ['USA', 'United States', 'US', 'united states', 'United states', 'usa'];
    if (!validCountries.includes(shippingAddress.Country)) {
      throw new IntegrationError('Non-USA transaction', 'COUNTRY_VALIDATION_ERROR');
    }
  },

  validateInvoiceType(invoice) {
    if (invoice.Type === 'ACCPAY') {
      throw new IntegrationError('Supplier invoice not supported', 'INVOICE_TYPE_ERROR');
    }
  },

  validateLineItems(lineItems) {
    if (!lineItems || lineItems.length === 0) {
      throw new IntegrationError('No line items found', 'VALIDATION_ERROR');
    }

    lineItems.forEach((item, index) => {
      if (!item.LineItemID) {
        console.warn(`Line item ${index} missing LineItemID`);
      }
      
      if (item.Quantity === undefined || item.UnitAmount === undefined) {
        throw new IntegrationError(
          `Line item ${index} missing required fields`,
          'VALIDATION_ERROR'
        );
      }
    });
  },

  validateTaxCodeMapping(taxCodeMap) {
    if (!taxCodeMap || typeof taxCodeMap !== 'object') {
      throw new IntegrationError('Invalid tax code mapping', 'VALIDATION_ERROR');
    }

    if (!taxCodeMap.default_tax_code) {
      console.warn('No default tax code specified');
    }
  }
};
```

## 🔧 Configuration & Environment Setup

### Environment Variables

```bash
# Xero Configuration
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_REDIRECT_URI=your_redirect_uri

# Complyt Configuration  
COMPLYT_CLIENT_ID=your_complyt_client_id
COMPLYT_CLIENT_SECRET=your_complyt_client_secret
COMPLYT_ENVIRONMENT=staging|production

# Database/Storage
DATA_STORE_ID=your_data_store_id

# Webhook Configuration
WEBHOOK_SECRET=your_webhook_secret
```

### Tax Code Mapping Configuration

```json
{
  "tax_code_map": {
    "ITEM001": "TAXABLE_GOODS",
    "ITEM002": "EXEMPT_GOODS", 
    "SERVICE001": "TAXABLE_SERVICES",
    "default_tax_code": "TAXABLE_GOODS"
  },
  "tax_rate_type_map": {
    "requested": "Request Sales Tax Calculation (Complyt)",
    "calculated": "Tax Calculated (Complyt)",
    "exempted": "Tax Exempted (Complyt)"
  }
}
```

## 🚀 Deployment Instructions

### 1. Prerequisites

- Pipedream account with workflow capabilities
- Xero Developer App with OAuth2 configuration
- Complyt API access and credentials
- Data store for token management

### 2. Deployment Steps

1. **Create Xero Developer App**
   - Register at https://developer.xero.com
   - Configure OAuth2 redirect URIs
   - Note Client ID and Secret

2. **Set up Pipedream Workflows**
   - Create each component as a separate workflow
   - Configure environment variables
   - Set up data stores for token management

3. **Configure Webhooks**
   - Set up Xero webhooks for Invoice and Contact events
   - Point to your gateway workflow endpoint
   - Configure webhook signing key

4. **Test Integration**
   - Create test transactions in Xero
   - Verify data flow through all components
   - Test error scenarios and recovery

### 3. Monitoring & Maintenance

- Set up logging for each workflow component
- Monitor API rate limits and usage
- Implement health checks for critical components
- Set up alerts for authentication failures
- Regular token refresh monitoring

## 📊 API Endpoints Reference

### Xero API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/oauth2/token` | POST | Token refresh |
| `/Contacts` | GET | Retrieve customers |
| `/Contacts/{id}` | GET | Get specific customer |
| `/Contacts/{id}/history` | GET/POST | Customer audit trail |
| `/Invoices` | GET | List invoices |
| `/Invoices/{id}` | GET | Get specific invoice |
| `/Invoices/{id}/history` | GET/POST | Invoice audit trail |
| `/Invoices` | POST | Create/update invoice |
| `/CreditNotes` | GET | List credit notes |
| `/CreditNotes/{id}` | GET | Get specific credit note |
| `/TaxRates` | GET/POST | Manage tax rates |
| `/Organisation` | GET | Organization details |
| `/connections` | GET | Tenant connections |

### Complyt API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/token` | POST | Authentication |
| `/v1/customers/source/6/externalId/{id}` | PUT | Upsert customer |
| `/v1/transactions/source/6/externalId/{id}` | PUT | Upsert transaction |

## 🔍 Testing Strategy

### Unit Tests
- Data mapping functions
- Validation utilities
- Error handling logic

### Integration Tests
- End-to-end workflow execution
- API authentication flows
- Error recovery scenarios

### Test Scenarios
1. **Happy Path**: Complete invoice processing
2. **Authentication Failure**: Token refresh handling
3. **Rate Limiting**: API throttling response
4. **Data Validation**: Invalid transaction handling
5. **Partial Failures**: Component failure recovery

## 🚨 Common Issues & Solutions

### Authentication Issues
- **Problem**: Token expiration
- **Solution**: Implement automatic token refresh with retry logic

### Rate Limiting
- **Problem**: Xero API rate limits
- **Solution**: Implement exponential backoff and request queuing

### Data Mapping Errors
- **Problem**: Missing or invalid field mappings
- **Solution**: Comprehensive validation and default value handling

### Webhook Reliability
- **Problem**: Missed webhook events
- **Solution**: Implement idempotency and periodic sync jobs

## 📈 Performance Optimization

### Caching Strategy
- Cache tax rate lookups
- Store frequently accessed customer data
- Implement connection pooling

### Batch Processing
- Group multiple line items for processing
- Batch tax rate creation requests
- Implement bulk data synchronization

### Monitoring
- Track API response times
- Monitor error rates and patterns
- Set up performance alerts

## 🔒 Security Considerations

### Token Management
- Secure storage of refresh tokens
- Regular token rotation
- Encrypted credential storage

### Data Protection
- Validate all input data
- Sanitize webhook payloads
- Implement request signing verification

### Access Control
- Principle of least privilege
- Regular access reviews
- Audit logging for sensitive operations

---

This guide provides a comprehensive foundation for rebuilding the Priority-Xero integration. Each component should be implemented incrementally, with thorough testing at each phase to ensure reliability and maintainability.

