# ChiefPay SDK

The official TypeScript SDK for interacting with the ChiefPay payment system. It supports both REST API requests and real-time updates via WebSockets.

## Installation

```bash
npm install chiefpay

```

## Usage

### Initialization & Connection

```typescript
import { ChiefPayClient, isInvoiceNotification, ChiefPayError } from "chiefpay";

const client = new ChiefPayClient({
  apiKey: "5456ae39-a9b3-4607-8ed9-8cc4fc67e918",
  // baseURL: "https://api.chiefpay.org" // Optional
});

client.on("error", err => console.error("SDK Error:", err));
client.on("connected", () => console.log("Socket connected"));

// Connect to socket.io for real-time updates
client.connect();

```

### Real-time Rates & Notifications

```typescript
// Listen for exchange rate updates
client.on("rates", rates => {
  console.log("Current rates:", rates); // e.g., [{"name": "BNB", "rate": "624.48"}]
});

// Handle incoming notifications (Invoices and Transactions)
client.on("notification", async (notification) => {
  // If your code throws an error here, the notification is NOT acknowledged.
  // The server will retry sending it ONLY upon your next socket reconnection.
  if (isInvoiceNotification(notification)) {
    console.log("Invoice status update:", notification.invoice.status);
  } else {
    console.log("New transaction received:", notification.transaction.txid);
  }
});

```

---

## API Methods

### Invoices

* **`createInvoice(request)`**: Generates a new payment request. If `amount` or `chainToken` are omitted, the payer can select them on the hosted payment page.
* **`getInvoice(invoiceId)`**: Retrieves the current status and details of a specific invoice.
* **`patchInvoice(invoiceId, request)`**: Used for **specifying or refining** invoice details. It only allows setting fields that were **not** provided during creation (e.g., if you created an invoice without an amount, you can set it here). Attempting to overwrite existing fields will result in an error.
* **`prolongInvoice(invoiceId)`**: Extends the expiration time of the invoice. This can be called only once; subsequent calls return an `ALREADY_EXISTS` error.
* **`cancelInvoice(invoiceId)`**: Manually cancels the invoice.
* **`invoiceHistory(query)`**: Returns a paginated list of invoices. Use `fromDate` and `toDate` for filtering.

### Static Wallets

* **`createWallet(request)`**: Creates a permanent wallet (static address) linked to your `orderId`. Useful for user balance top-ups.
* **`getWallet(walletId)`**: Returns the wallet details and the list of generated blockchain addresses.
* **`transactionsHistory(query)`**: Returns a paginated list of all incoming blockchain transactions.

### Rates & Payment methods

* **`updateRates()`**: Force-refreshes the token rates via HTTP.
* **`getPaymentMethods()`**: Get a list of payment methods.

---

## Invoice Statuses

| Status | Description |
| --- | --- |
| `WAITING_SELECTION` | Payer needs to select a currency/network on the payment page. |
| `WAITING_PAYMENT` | Invoice is active, waiting for a transaction in the blockchain. |
| `COMPLETE` | Payment received and confirmed within the specified `accuracy`. |
| `EXPIRED` | Payment window has closed. |
| `CANCELED` | Invoice was manually or programmatically canceled. |
| `OVER_PAID` | Received more funds than the requested amount. |
| `UNDER_PAID` | Received some funds, but less than the required amount. |

---

## Error Handling

The SDK provides a robust error handling mechanism. API-specific errors use the `ChiefPayError` class, while network or parsing issues use standard `Error`.

```typescript
try {
  const invoice = await client.createInvoice({
    orderId: "unique_order_id",
    amount: "10.5",
    currency: "USD"
  });
} catch (e) {
  if (e instanceof ChiefPayError) {
    // API-side errors
    switch (e.code) {
      case "INVALID_ARGUMENT": console.error("Validation failed:", e.message); break;
      case "UNAUTHENTICATED": console.error("Invalid API Key"); break;
      case "PERMISSION_DENIED": console.error("Insufficient permissions"); break;
      case "ALREADY_EXISTS": console.error("This orderId is already taken"); break;
      case "NOT_FOUND": console.error("Resource not found"); break;
      case "INTERNAL": console.error("ChiefPay server error"); break;
      default: console.error("API Error:", e.code, e.message);
    }
  } else {
    // Network errors, timeouts, or JSON parsing issues
    console.error("Non-API error:", e);
  }
}

```

> **Note on Rate Limiting**: If you receive a `429 Too Many Requests` response, the SDK will automatically retry the request up to 3 times, respecting the `retry-after-ms` header provided by the server.
