/// <reference types="node" />
import { EventEmitter } from "events";
interface Transaction {
    userId: string;
    token: string;
    value: string;
    usd: number;
    txid: string;
}
interface MerchantClientSettings {
    apiKey: string;
    /**
     * url like http://hostname:port
     */
    baseURL: string;
    ts: number | string;
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
    private _ts;
    private lastRatesUpdate;
    private es;
    private lastPing;
    private baseURL;
    private rates;
    get ts(): number | string;
    set ts(value: number | string);
    constructor({ apiKey, baseURL, ts }: MerchantClientSettings);
    private onMessage;
    updateRates(): Promise<{
        [chain: number]: {
            [token: string]: string;
        };
    }>;
    wallet(userId: string): Promise<string>;
}
export {};
