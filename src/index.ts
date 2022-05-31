import EventSource from "eventsource";
import { EventEmitter } from "events";

const MIN_RATE_UPDATE_INTERVAL = 10000;

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

export class MerchantClient extends EventEmitter {
	apiKey: string;
	private _ts: string = "0";
	private lastRatesUpdate: number = 0;
	private es: EventSource;
	private lastPing: Date = new Date();
	private baseURL: string;
	private rates: {
		[chain: number]: {
			[token: string]: string;
		};
	} = {};

	get ts() {
		return this._ts;
	}

	set ts(value: number | string) {
		this._ts = value.toString();
	}

	constructor({ apiKey, baseURL, ts }: MerchantClientSettings) {
		super();
		this.apiKey = apiKey;
		this.ts = ts;
		this.baseURL = baseURL + "/api";

		this.es = new EventSource(this.baseURL + "/sse", {
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
		let data = JSON.parse(event.data) as Transaction;
		this.ts = +event.lastEventId;

		this.emit("transaction", data);
	}

	async updateRates() {
		if (Date.now() - this.lastRatesUpdate < MIN_RATE_UPDATE_INTERVAL) throw new Error("MerchantClient: rateUpdateInterval is too short");
		this.lastRatesUpdate = Date.now();

		let res = await fetch(this.baseURL + "/rates", {
			method: "POST",
			headers: {
				"x-api-key": this.apiKey
			},
		});

		this.rates = await res.json();
		for (let chain in this.rates) {
			for (let token in this.rates[chain]) {
				this.rates[chain][token] = (Number(BigInt(this.rates[chain][token]) / (10n ** 15n)) / 1000).toFixed(2);
			}
		}
		return this.rates;
	}

	async wallet(userId: string) {
		let res = await fetch(this.baseURL + "/wallet", {
			method: "POST",
			headers: {
				"x-api-key": this.apiKey,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				userId
			}),
		});

		return await res.text();
	}
}