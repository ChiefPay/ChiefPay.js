import EventSource from "eventsource";
import { EventEmitter } from "events";
import { Transaction } from "merchant-types";

const MIN_RATE_UPDATE_INTERVAL = 10000;

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

function isWalletById(body: WalletById | WalletByUserId): body is WalletById {
	return typeof (body as WalletById).walletId === 'string';
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

	on(event: 'walletExpire', listener: (wallet: { walletId: string, userId: string }) => void): this;
	once(event: 'walletExpire', listener: (wallet: { walletId: string, userId: string }) => void): this;
	off(event: 'walletExpire', listener: (wallet: { walletId: string, userId: string }) => void): this;
	emit(event: 'walletExpire', wallet: { walletId: string, userId: string }): boolean;
}

export class MerchantClient extends EventEmitter {
	apiKey: string;
	private ts: number;
	private lastRatesUpdate: number = 0;
	private es: EventSource;
	private lastPing: Date = new Date();
	private baseURL: string;
	rates: {
		[chain: number]: {
			[token: string]: string;
		};
	} = {};

	constructor({ apiKey, baseURL, ts }: MerchantClientSettings) {
		super();
		this.apiKey = apiKey;
		this.ts = ts;
		this.baseURL = baseURL + "/api";

		this.es = new EventSource(this.baseURL + "/sse", {
			headers: {
				"x-api-key": this.apiKey,
				"ts": this.ts.toString()
			}
		});

		this.es.onopen = () => this.emit("connected");
		this.es.addEventListener("rates", event => this.handleRates(JSON.parse(event.data)));
		this.es.addEventListener("walletExpire", event => this.emit("walletExpire", JSON.parse(event.data)));
		this.es.onmessage = this.onMessage.bind(this);
		this.es.onerror = err => this.emit("error", err);
		this.es.addEventListener("ping", event => this.lastPing = new Date());
	}

	stop() {
		this.es.close();
	}

	private onMessage(event: MessageEvent<string>) {
		let data = JSON.parse(event.data) as Transaction;
		this.ts = +event.lastEventId;

		this.emit("transaction", data);
	}

	private async handleRates(rates: typeof this.rates) {
		this.rates = rates;
		for (let chain in this.rates) {
			for (let token in this.rates[chain]) {
				this.rates[chain][token] = (Number(BigInt(this.rates[chain][token]) / (10n ** 15n)) / 1000).toFixed(2);
			}
		}
		this.emit("rates", this.rates);
	}

	/**
	 * 
	 * @deprecated Курсы валют теперь передаются через SSE. Слушать так же через .on("rates")
	 */
	async updateRates() {
		if (Date.now() - this.lastRatesUpdate < MIN_RATE_UPDATE_INTERVAL) throw new Error("MerchantClient: rateUpdateInterval is too short");
		this.lastRatesUpdate = Date.now();

		let res = await fetch(this.baseURL + "/rates", {
			method: "POST",
			headers: {
				"x-api-key": this.apiKey
			},
		});

		this.handleRates(await res.json());
		return this.rates;
	}

	async wallet(wallet: WalletById | WalletByUserId) {
		let _wallet;
		if (isWalletById(wallet)) {
			_wallet = wallet;
		} else {
			_wallet = {
				walletId: wallet.userId,
				expire: +wallet.expire,
				actuallyExpire: +wallet.actuallyExpire,
				renewal: wallet.renewal,
			}
		}
		let res = await fetch(this.baseURL + "/wallet", {
			method: "POST",
			headers: {
				"x-api-key": this.apiKey,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(_wallet),
		});

		return await res.text();
	}

	async walletExist(wallet: { userId: string }) {
		let res = await fetch(this.baseURL + "/walletExist", {
			method: "POST",
			headers: {
				"x-api-key": this.apiKey,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(wallet),
		});

		return await res.json() as { address: string, expire: Date | null } | null;
	}

	async transactions(ids: number[]) {
		let result: Transaction[] = [];
		while (ids.length > 0) {
			let res = await fetch(this.baseURL + "/transactions", {
				method: "POST",
				headers: {
					"x-api-key": this.apiKey,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ ids: ids.splice(0, 100) })
			});

			result.push(...await res.json());
		}

		return result;
	}
}