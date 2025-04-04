import { Invoice, StaticWallet, Rates, InvoiceHistory, TransactionsHistory, ErrorCode } from "./types";
import Emittery from "emittery";
import type { ChiefPayClientSettings, CreateInvoice, CreateWallet, Events, GetInvoice, GetWallet } from "./internalTypes";
export type { InvoiceStatus, StaticWallet, Invoice, Notification, InvoiceNotification, TransactionNotification, Transaction, Rates } from "./types";
export { isInvoiceNotification } from "./utils";
export declare class ChiefPayError extends Error {
    code: ErrorCode;
    fields: string[];
    constructor(message: string, code: ErrorCode, fields: string[]);
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
    createWallet(wallet: CreateWallet): Promise<StaticWallet>;
    /**
     * Get static wallet info by id
     */
    getWallet(wallet: GetWallet): Promise<StaticWallet>;
    /**
     * Create new invoice
     */
    createInvoice(invoice: CreateInvoice): Promise<Invoice>;
    /**
     * Get invoice info by id
     */
    getInvoice(invoice: GetInvoice): Promise<Invoice>;
    /**
     * Cancel invoice by id
     */
    cancelInvoice(invoice: GetInvoice): Promise<Invoice>;
    /**
     * Cancel invoice by id
     */
    prolongateInvoice(invoice: GetInvoice): Promise<Invoice>;
    /**
     * Invoice history
     */
    invoiceHistory(req: {
        fromDate: Date;
        toDate?: Date;
        limit?: number;
    }): Promise<InvoiceHistory>;
    /**
     * Transactions history
     */
    transactionsHistory(req: {
        fromDate: Date;
        toDate?: Date;
        limit?: number;
    }): Promise<TransactionsHistory>;
    protected makeRequest<T>(url: URL, method?: string, body?: any): Promise<T>;
}
