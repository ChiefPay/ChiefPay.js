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
    updateRates(): Promise<{
        [chain: number]: {
            [token: string]: string;
        };
    }>;
    wallet(wallet: {
        walletId: string;
        expire?: Date;
        actuallyExpire?: Date;
    }): Promise<string>;
    transactions(ids: number[]): Promise<Transaction[]>;
}
export {};
