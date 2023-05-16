/// <reference types="node" />
import { EventEmitter } from "events";
import { Transaction } from "merchant-types";
interface MerchantClientSettings {
    apiKey: string;
    /**
     * url like http://hostname:port
     */
    baseURL: `${'http' | 'https'}://${string}:${number}`;
    ts: number;
}
interface WalletById {
    /**
     * id пользователя или абстрактный id привязанный к конкретному кошельку
     */
    walletId: string;
    /**
     * SubId нужен для мультикошельков
     */
    walletSubId?: number;
}
interface WalletByUserId {
    userId: string;
    /**
     * Дата когда придет уведомление об окончании аренды
     */
    expire: Date;
    /**
     * Когда кошелек перестает быть привязаным и может быть назначен кому угодно
     * @default {expire}
     */
    actuallyExpire?: Date;
    /**
     * Переписать expire и actuallyExpire если еще не истек
     * @default false
     */
    renewal?: boolean;
}
export declare class MerchantError extends Error {
    constructor(err: object);
}
export declare interface MerchantClient {
    on(event: 'transaction', listener: (tx: Transaction) => void): this;
    once(event: 'transaction', listener: (tx: Transaction) => void): this;
    off(event: 'transaction', listener: (tx: Transaction) => void): this;
    emit(event: 'transaction', tx: Transaction): boolean;
    on(event: 'connected', listener: () => void): this;
    once(event: 'connected', listener: () => void): this;
    off(event: 'connected', listener: () => void): this;
    emit(event: 'connected'): boolean;
    on(event: 'error', listener: (err: any) => void): this;
    once(event: 'error', listener: (err: any) => void): this;
    off(event: 'error', listener: (err: any) => void): this;
    emit(event: 'error', err: any): boolean;
    on(event: 'rates', listener: (rates: typeof MerchantClient.prototype.rates) => void): this;
    once(event: 'rates', listener: (rates: typeof MerchantClient.prototype.rates) => void): this;
    off(event: 'rates', listener: (rates: typeof MerchantClient.prototype.rates) => void): this;
    emit(event: 'rates', rates: typeof MerchantClient.prototype.rates): boolean;
    on(event: 'walletExpire', listener: (wallet: {
        walletId: string;
        walletSubId: number;
        userId: string;
    }) => void): this;
    once(event: 'walletExpire', listener: (wallet: {
        walletId: string;
        walletSubId: number;
        userId: string;
    }) => void): this;
    off(event: 'walletExpire', listener: (wallet: {
        walletId: string;
        walletSubId: number;
        userId: string;
    }) => void): this;
    emit(event: 'walletExpire', wallet: {
        walletId: string;
        walletSubId: number;
        userId: string;
    }): boolean;
}
export declare class MerchantClient extends EventEmitter {
    apiKey: string;
    private ts;
    private lastRatesUpdate;
    private es;
    private lastPing;
    private baseURL;
    rates: {
        [chain: number]: {
            [token: string]: string;
        };
    };
    constructor({ apiKey, baseURL, ts }: MerchantClientSettings);
    /**
     * Закрывает соединение с SSE
     */
    stop(): void;
    private onMessage;
    private handleRates;
    /**
     *
     * @deprecated Курсы валют теперь передаются через SSE. Слушать так же через .on("rates")
     */
    updateRates(): Promise<{
        [chain: number]: {
            [token: string]: string;
        };
    }>;
    /**
     * Выдает классический кошелек без аренды
     */
    getWallet(wallet: WalletById): Promise<{
        address: string;
        id: string;
        subId: number;
    }>;
    /**
     * Арендует кошелек для пользователя
     */
    rentWallet(wallet: WalletByUserId): Promise<{
        expire: Date;
        actuallyExpire: Date;
        address: string;
        id: string;
        subId: number;
    }>;
    /**
     * Ищет уже арендованный кошелек у пользователя
     */
    searchWallet(wallet: {
        userId: string;
    }): Promise<{
        expire: Date;
        actuallyExpire: Date;
        id: string;
        subId: number;
        address: string;
    } | null>;
    /**
     * Выдает транзакции по id
     */
    transactions(ids: number[]): Promise<Transaction[]>;
}
export {};
