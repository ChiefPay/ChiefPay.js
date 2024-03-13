/// <reference types="node" />
import { EventEmitter } from "events";
import { Invoice as InvoiceString, Transaction as TransactionString, StaticWallet } from "./types";
export { InvoiceStatus, StaticWallet } from "./types";
export interface Invoice extends Omit<InvoiceString, "expiredAt" | "createdAt"> {
    expiredAt: Date;
    createdAt: Date;
}
export interface Transaction extends Omit<TransactionString, "blockCreatedAt" | "createdAt"> {
    createdAt: Date;
    blockCreatedAt: Date;
}
export type TransactionNotification = {
    type: "transaction";
    transaction: Transaction;
    invoice: Invoice | null;
};
export type ExpireNotification = {
    type: "expired";
    transaction: null;
    invoice: Invoice;
};
export type Notification = TransactionNotification | ExpireNotification;
export type Rates = {
    [token: string]: string;
};
interface MerchantClientSettings {
    apiKey: string;
    /**
     * url like http://hostname:port
     */
    baseURL: `${'http' | 'https'}://${string}:${number}`;
}
interface CreateWallet {
    /**
     * какие-то данные для идентификации в системе (например, id пользователя)
     */
    additional: string;
}
interface GetWallet {
    /**
     * uuid кошелька
     */
    id: string;
}
interface CreateInvoice {
    /**
     * какие-то данные для идентификации в системе (например, id оплаты)
     */
    additional: string;
    /**
     * сумма платежа в долларах
     */
    amount?: string;
}
interface GetInvoice {
    /**
     * uuid инвойса
     */
    id: string;
}
export declare interface MerchantClient {
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
export declare class MerchantClient extends EventEmitter {
    apiKey: string;
    private lastRatesUpdate;
    private es;
    private baseURL;
    rates: Rates;
    constructor({ apiKey, baseURL }: MerchantClientSettings);
    /**
     * Закрывает соединение с SSE
     */
    stop(): void;
    private onMessage;
    private formatInvoice;
    private formatTransaction;
    private formatNotification;
    private handleRates;
    /**
     *
     * @deprecated Курсы валют теперь передаются через SSE. Слушать так же через .on("rates")
     */
    updateRates(): Promise<Rates>;
    /**
     * Создает классический кошелек без аренды
     */
    createWallet(wallet: CreateWallet): Promise<StaticWallet>;
    /**
     * Выдает классический кошелек без аренды
     */
    getWallet(wallet: GetWallet): Promise<StaticWallet>;
    /**
     * Создает инвойс
     */
    createInvoice(invoice: CreateInvoice): Promise<Invoice>;
    /**
     * Ищет уже созданный инвойс
     */
    getInvoice(invoice: GetInvoice): Promise<Invoice>;
    /**
     * Выдает историю уведомлений
     */
    history(fromDate: Date, toDate?: Date): Promise<Notification[]>;
}
