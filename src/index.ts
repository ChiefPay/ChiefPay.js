import EventSource from "eventsource";
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

export class MerchantClient extends EventEmitter {
  apiKey: string;
  private _ts: string = "0";
  private es: EventSource;
  private lastPing: Date = new Date();

  get ts() {
    return this._ts;
  }

  set ts(value: number | string) {
    this._ts = value.toString();
  }

  constructor({ apiKey, merchantAddress, ts }: MerchantClientSettings) {
    super();
    this.apiKey = apiKey;
    this.ts = ts;

    this.es = new EventSource(merchantAddress, {
      headers: {
        "x-api-key": this.apiKey,
        "ts": this.ts
      }
    });

    this.es.onopen = () => this.emit("connected");
    this.es.onmessage = this.onMessage.bind(this);
    this.es.onerror = err => this.emit("error", err);
    this.es.addEventListener("ping", event => this.lastPing = new Date());
  }

  private onMessage(event: MessageEvent<string>) {
    var data = JSON.parse(event.data) as Transaction;
    this.ts = +event.lastEventId;

    this.emit("transaction", data);
  }
}