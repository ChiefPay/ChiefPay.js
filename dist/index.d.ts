import Emittery from "emittery";
import { components, operations } from "./types/openapi";
export type ErrorResponse = components["schemas"]["ErrorResponse"];
export type Response<T> = T | ErrorResponse;
export type Rates = components["schemas"]["Rate"][];
export type StaticWallet = components["schemas"]["StaticWallet"];
export type Transaction = components["schemas"]["Transaction"];
export type Invoice = components["schemas"]["Invoice"];
export type InvoiceHistory = components["schemas"]["Invoices"];
export type TransactionsHistory = components["schemas"]["Transactions"];
export type PaymentMethods = components["schemas"]["PaymentMethods"];
export interface ChiefPayClientSettings {
    apiKey: string;
    /**
     * url like https://hostname or https://hostname:port
     * @default https://api.chiefpay.org
     */
    baseURL?: string;
}
export interface NotificationInvoice {
    type: "invoice";
    invoice: Invoice;
}
export interface NotificationTransaction {
    type: "transaction";
    transaction: Transaction;
}
export type Notification = NotificationInvoice | NotificationTransaction;
interface Events {
    notification: Notification;
    connected: undefined;
    error: any;
    rates: Rates;
}
export declare function isInvoiceNotification(notification: Notification): notification is NotificationInvoice;
export declare function isTransactionNotification(notification: Notification): notification is NotificationTransaction;
export declare class ChiefPayError extends Error {
    code: ErrorResponse["code"];
    constructor(errors: string[], code: ErrorResponse["code"]);
}
export declare class ChiefPayClient extends Emittery<Events> {
    readonly apiKey: string;
    private socket;
    private baseURL;
    rates: Rates;
    constructor({ apiKey, baseURL }: ChiefPayClientSettings);
    /**
     * Connect to socket.io
     */
    connect(): void;
    /**
     * Stop socket.io connection (graceful shutdown)
     */
    disconnect(): void;
    private onNotification;
    private handleRates;
    /**
     * Better use socket to get token rate. First connect to socket with .connect() then .on("rates") or .rates
     */
    updateRates(): Promise<Rates>;
    /**
     * Create new static wallet
     */
    createWallet(wallet: components["schemas"]["CreateStaticWalletRequest"]): Promise<StaticWallet>;
    /**
     * Get static wallet info by id
     */
    getWallet(walletId: string): Promise<StaticWallet>;
    /**
     * Create new invoice
     */
    createInvoice(invoice: components["schemas"]["CreateInvoiceRequest"]): Promise<Invoice>;
    /**
     * Get invoice info by id
     */
    getInvoice(invoiceId: string): Promise<Invoice>;
    /**
     * Cancel invoice by id
     */
    cancelInvoice(invoiceId: string): Promise<Invoice>;
    /**
     * Prolong invoice by id
     */
    prolongInvoice(invoiceId: string): Promise<Invoice>;
    /**
     * Patch invoice by id
     */
    patchInvoice(invoiceId: string, invoice: components["schemas"]["PatchInvoiceRequest"]): Promise<Invoice>;
    /**
     * Invoice history
     */
    invoiceHistory(req: operations["GetInvoices"]["parameters"]["query"]): Promise<InvoiceHistory>;
    /**
     * Transactions history
     */
    transactionsHistory(req: operations["GetTransactions"]["parameters"]["query"]): Promise<TransactionsHistory>;
    /**
     * Payment methods
     */
    getPaymentMethods(): Promise<PaymentMethods>;
    private appendSearchParams;
    protected makeRequest<T>(url: URL, method?: string, body?: any, retries?: number): Promise<T>;
}
export {};
