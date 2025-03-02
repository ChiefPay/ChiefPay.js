import { InvoiceNotification, Notification, TransactionNotification } from "./types";

export function isInvoiceNotification(notification: Notification): notification is InvoiceNotification {
	return notification.type == "invoice";
}

export function isTransactionNotification(notification: Notification): notification is TransactionNotification {
	return notification.type == "transaction";
}
