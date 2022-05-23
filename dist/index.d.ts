/// <reference types="node" />
import { EventEmitter } from "events";
interface Transaction {
    userId: string;
    token: string;
    usd: number;
    txid: string;
}
interface MerchantClientSettings {
    apiKey: string;
    merchantAddress: string;
    ts: number;
}
export declare interface MerchantClient {
    on(event: 'transaction', listener: (name: Transaction) => void): this;
    once(event: 'transaction', listener: (name: Transaction) => void): this;
    on(event: 'connected', listener: () => void): this;
    once(event: 'connected', listener: () => void): this;
    on(event: 'error', listener: (err: any) => void): this;
    once(event: 'error', listener: (err: any) => void): this;
}
export declare class MerchantClient extends EventEmitter {
    apiKey: string;
    private _ts;
    private es;
    private lastPing;
    get ts(): number | string;
    set ts(value: number | string);
    constructor({ apiKey, merchantAddress, ts }: MerchantClientSettings);
    private onMessage;
}
export {};
