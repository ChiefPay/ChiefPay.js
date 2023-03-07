/// <reference types="node" />
import { EventEmitter } from "events";
import { Transaction } from "merchant-types";
interface MerchantClientSettings {
    apiKey: string;
    /**
     * url like http://hostname:port
     */
    baseURL: string;
    ts: number;
}
interface WalletById {
    walletId: string;
}
interface WalletByUserId {
    userId: string;
    expire: Date;
    actuallyExpire: Date;
    renewal?: boolean;
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
        userId: string;
    }) => void): this;
    once(event: 'walletExpire', listener: (wallet: {
        walletId: string;
        userId: string;
    }) => void): this;
    off(event: 'walletExpire', listener: (wallet: {
        walletId: string;
        userId: string;
    }) => void): this;
    emit(event: 'walletExpire', wallet: {
        walletId: string;
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
    wallet(wallet: WalletById | WalletByUserId): Promise<{
        address: string;
        expire: Date | null;
        actuallyExpire: Date | null;
    }>;
    walletExist(wallet: {
        userId: string;
    }): Promise<{
        address: string;
        expire: Date | null;
    } | null>;
    transactions(ids: number[]): Promise<Transaction[]>;
}
export {};
