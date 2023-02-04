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
    on(event: 'transaction', listener: (name: Transaction) => void): this;
    once(event: 'transaction', listener: (name: Transaction) => void): this;
    off(event: 'transaction', listener: (name: Transaction) => void): this;
    on(event: 'connected', listener: () => void): this;
    once(event: 'connected', listener: () => void): this;
    off(event: 'connected', listener: () => void): this;
    on(event: 'error', listener: (err: any) => void): this;
    once(event: 'error', listener: (err: any) => void): this;
    off(event: 'error', listener: (err: any) => void): this;
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
    updateRates(): Promise<{
        [chain: number]: {
            [token: string]: string;
        };
    }>;
    wallet(walletId: string): Promise<string>;
    transactions(ids: number[]): Promise<Transaction[]>;
}
export {};
