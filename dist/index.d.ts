import { EventEmitter } from "events";
import { Invoice, Notification, StaticWallet, Rates, InvoiceHistory, TransactionsHistory } from "./types";
export { InvoiceStatus, StaticWallet, Invoice, Notification, InvoiceNotification, TransactionNotification, Transaction, Rates } from "./types";
interface ChiefPayClientSettings {
    apiKey: string;
    /**
     * url like https://hostname or https://hostname:port
     * @default https://api.chiefpay.org
     */
    baseURL?: string;
}
interface CreateWallet {
    /**
     * Order ID in your system
     */
    orderId: string;
}
interface GetWalletById {
    /**
     * UUID of wallet
     */
    id: string;
}
interface GetWalletByOrderId {
    /**
     * Order ID in your system
     */
    orderId: string;
}
type GetWallet = GetWalletById | GetWalletByOrderId;
interface CreateInvoice {
    /**
     * Order ID in your system
     */
    orderId: string;
    /**
     * Description will be shown on the payment page
     */
    description?: string;
    /**
     * Amount in the specified currency. If not specified, payment for any amount (useful for replenishing the balance) only in crypto!!!
     */
    amount?: string;
    /**
     * 3-letter code in ISO 4217
     * @default USD
     */
    currency?: string;
    /**
     * true to add commission to amount
     * @default false
     */
    feeIncluded?: boolean;
    /**
     * Allowable inaccuracy of the payment amount. From 0.00 to 0.05 where 0.05 is 5% of the amount
     * @default 0
     */
    accuracy?: string;
    /**
     * Discount or markup. From -0.99 to 0.99 where 0.05 is 5% discount and -0.05 is 5% markup.
     * @default 0
     */
    discount?: string;
}
interface GetInvoiceById {
    /**
     * UUID of invoice
     */
    id: string;
}
interface GetInvoiceByOrderId {
    /**
     * Order ID in your system
     */
    orderId: string;
}
type GetInvoice = GetInvoiceById | GetInvoiceByOrderId;
export declare interface ChiefPayClient {
    on(event: 'notification', listener: (notification: Notification) => void): this;
    once(event: 'notification', listener: (notification: Notification) => void): this;
    off(event: 'notification', listener: (notification: Notification) => void): this;
    emit(event: 'notification', notification: Notification): boolean;
    on(event: 'connected', listener: () => void): this;
    once(event: 'connected', listener: () => void): this;
    off(event: 'connected', listener: () => void): this;
    emit(event: 'connected'): boolean;
    on(event: 'error', listener: (err: any) => void): this;
    once(event: 'error', listener: (err: any) => void): this;
    off(event: 'error', listener: (err: any) => void): this;
    emit(event: 'error', err: any): boolean;
    on(event: 'rates', listener: (rates: Rates) => void): this;
    once(event: 'rates', listener: (rates: Rates) => void): this;
    off(event: 'rates', listener: (rates: Rates) => void): this;
    emit(event: 'rates', rates: Rates): boolean;
}
export declare class ChiefPayClient extends EventEmitter {
    apiKey: string;
    private lastRatesUpdate;
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
     * Get rates
     * @deprecated Use .on("rates") or .rates instead
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
    private makeRequest;
}
