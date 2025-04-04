# ChiefPay SDK

This is the official TypeScript SDK for interacting with the ChiefPay payment system.

## Installation

```bash
npm install chiefpay
```

## Usage

```typescript
import { ChiefPayClient, isInvoiceNotification, ChiefPayError, Invoice } from "chiefpay";

const client = new ChiefPayClient({
  apiKey: "5456ae39-a9b3-4607-8ed9-8cc4fc67e918",
});

client.on("error", err => console.error(err));

client.connect(); //connect to socket.io

client.on("connected", () => console.log("connected"));

//rates like [{"name": "BNB", "rate": "624.48"}]
client.on("rates", rates => console.log("rates event", rates));

async function handleInvoice(invoice: Invoice) {
  throw new Error("Some error");
}

//There are 2 types of notification: invoice and transaction. You can use isInvoiceNotification or isTransactionNotification or just check notification.type
client.on("notification", async notification => {
  if (isInvoiceNotification(notification)) {
    console.log("new invoice notification", notification.invoice);
    await handleInvoice(notification.invoice); //If an error occurs, the notification will not be marked as processed, and the server will send it again the next time it connects to the socket.
  } else {
    console.log("new transaction notification", notification.transaction);
  }
});

(async () => {
  let invoice;
  try {
    invoice = await client.createInvoice({
      orderId: "564cca2e-30d5-4c69-90d5-fa3f368aea90", //Order ID in your system
      amount: "15.4", //If the amount is not specified, the payer can choose the amount himself, which is convenient for replenishing the balance.
      currency: "RUB", //Currently supported only USD and RUB (default USD).
      discount: "0.02", //2% discount, the amount becomes 15.10$.
      accuracy: "0.01", //The payment is considered COMPLETE if between 99% and 101% of the amount has been paid, in this case 14.95$ - 15.26$.
      description: "Description that the payer will see on the payment page",
      feeIncluded: false, //true to pass the commission on to the payer.
      urlReturn: "https://example.com/fail", //Redirect link in case of successful payment.
      urlSuccess: "https://example.com/success", //Redirect link in case of payment cancellation.
    });
  } catch (e) {
    if (e instanceof ChiefPayError) {
      switch (e.code) {
        case "INVALID_ARGUMENT":
          for (const field of e.fields) {
            console.error("invalid", field);
          }
          break;
        case "OUT_OF_RANGE":
          for (const field of e.fields) {
            console.error("Not in the range", field); //e.g. discount or accuracy
          }
          break;
        case "UNAUTHENTICATED": console.error("You forgot to specify the apiKey"); break;
        case "PERMISSION_DENIED": console.error("Wrong apiKey"); break;
        case "ALREADY_EXISTS": console.error("existing orderId"); break;
        case "NOT_FOUND": console.error(e.message); break;
        case "INTERNAL": console.error("internal error"); break;
      }
    } else {
      console.error(e); //Not ChiefPay error, e.g. network error
    }
    return;
  }

  const invoice1 = await client.getInvoice({
    id: invoice.id,
    //or orderId: invoice.orderId
  });

  //prolongateInvoice can be called once, further calls will return the ALREADY_EXISTS error.
  const invoice2 = await client.prolongateInvoice({
    id: invoice.id,
    //or orderId: invoice.orderId
  });

  const invoice3 = await client.cancelInvoice({
    id: invoice.id,
    //or orderId: invoice.orderId
  });

  const wallet = await client.createWallet({
    orderId: "a7cbbd57-27c6-46dc-883a-e1d7168d2276", //Order ID in your system
  });

  const wallet1 = await client.getWallet({
    id: wallet.id,
    //or orderId: wallet.orderId,
  });

  const rates = await client.updateRates(); //Get rates without socket

  const rates2 = client.rates; //Get last rates from socket

  const invoiceHistory = await client.invoiceHistory({
    fromDate: new Date("2025-03-01 15:18+0"), //Exclusive
    toDate: new Date("2025-03-02 11:41+0"), //Inclusive
    limit: 100, //Default 100, max 1000
  });

  //Checking whether you have received everything or whether you need to make more requests.
  if (invoiceHistory.totalCount > invoiceHistory.invoices.length) {
    const invoiceHistory2 = await client.invoiceHistory({
      fromDate: new Date(invoiceHistory.invoices[0].createdAt), //Invoices in descending order
      toDate: new Date("2025-03-02 11:41+0"),
      limit: 100, //Default 100, max 1000
    });
  }

  const transactionsHistory = await client.transactionsHistory({
    fromDate: new Date("2025-03-01 15:18+0"), //Exclusive
    toDate: new Date("2025-03-02 11:41+0"), //Inclusive
    limit: 100, //Default 100, max 1000
  });

  //Checking whether you have received everything or whether you need to make more requests.
  if (transactionsHistory.totalCount > transactionsHistory.transactions.length) {
    const transactionsHistory2 = await client.transactionsHistory({
      fromDate: new Date(transactionsHistory.transactions[0].createdAt), //Transactions in descending order
      toDate: new Date("2025-03-02 11:41+0"),
      limit: 100, //Default 100, max 1000
    });
  }
})();
```