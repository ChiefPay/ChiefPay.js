import { InvoiceNotification, Notification, TransactionNotification } from "./types";
export declare function isInvoiceNotification(notification: Notification): notification is InvoiceNotification;
export declare function isTransactionNotification(notification: Notification): notification is TransactionNotification;
