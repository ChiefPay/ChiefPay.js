import EventSource from "eventsource";
import { EventEmitter } from "events";
import { Transaction } from "merchant-types";

const MIN_RATE_UPDATE_INTERVAL = 10000;

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

export class MerchantError extends Error {
	constructor(err: object) {
		super("")
	}
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

	on(event: 'walletExpire', listener: (wallet: { walletId: string, walletSubId: number, userId: string }) => void): this;
	once(event: 'walletExpire', listener: (wallet: { walletId: string, walletSubId: number, userId: string }) => void): this;
	off(event: 'walletExpire', listener: (wallet: { walletId: string, walletSubId: number, userId: string }) => void): this;
	emit(event: 'walletExpire', wallet: { walletId: string, walletSubId: number, userId: string }): boolean;
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
		this.baseURL = baseURL;

		this.es = new EventSource(this.baseURL + "/api/sse", {
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

	/**
	 * Закрывает соединение с SSE
	 */
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

		let res = await fetch(this.baseURL + "/api/rates", {
			method: "GET",
			headers: {
				"x-api-key": this.apiKey
			},
		});

		if (res.status != 200) throw new Error(await res.text());

		this.handleRates(await res.json());
		return this.rates;
	}

	/**
	 * Выдает классический кошелек без аренды
	 */
	async getWallet(wallet: WalletById) {
		const url = new URL("/api/wallet/unique", this.baseURL);
		url.searchParams.set("walletId", wallet.walletId);
		if (wallet.walletSubId) url.searchParams.set("walletSubId", wallet.walletSubId.toString());

		let res = await fetch(url, {
			method: "GET",
			headers: {
				"x-api-key": this.apiKey,
				'Content-Type': 'application/json'
			},
		});

		if (res.status != 200) throw new Error(await res.text());

		const body = await res.json() as {
			address: string;
			id: string;
			subId: number;
		};

		return body;
	}


	/**
	 * Арендует кошелек для пользователя
	 */
	async rentWallet(wallet: WalletByUserId) {
		let res = await fetch(this.baseURL + "/api/wallet/rent", {
			method: "POST",
			headers: {
				"x-api-key": this.apiKey,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				userId: wallet.userId,
				expire: wallet.expire.getTime(),
				actuallyExpire: wallet.actuallyExpire?.getTime(),
				renewal: wallet.renewal
			}),
		});

		if (res.status != 200) throw new Error(await res.text());

		const body = await res.json() as {
			address: string;
			id: string;
			subId: number;
			expire: number;
			actuallyExpire: number;
		};

		return {
			...body,
			expire: new Date(body.expire),
			actuallyExpire: new Date(body.actuallyExpire),
		};
	}

	/**
	 * Ищет уже арендованный кошелек у пользователя
	 */
	async searchWallet(wallet: { userId: string }) {
		const url = new URL("/api/wallet/search", this.baseURL);
		url.searchParams.set("userId", wallet.userId);
		let res = await fetch(url, {
			method: "GET",
			headers: {
				"x-api-key": this.apiKey,
				'Content-Type': 'application/json'
			},
		});

		if (res.status == 404) return null;
		else if (res.status != 200) throw new Error(await res.text());

		const body = await res.json() as { id: string, subId: number, address: string, expire: number, actuallyExpire: number };

		return {
			...body,
			expire: new Date(body.expire),
			actuallyExpire: new Date(body.actuallyExpire),
		}
	}

	/**
	 * Выдает транзакции по id
	 */
	async transactions(ids: number[]) {
		let result: Transaction[] = [];
		while (ids.length > 0) {
			let res = await fetch(this.baseURL + "/api/transactions", {
				method: "POST",
				headers: {
					"x-api-key": this.apiKey,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ ids: ids.splice(0, 100) })
			});

			if (res.status != 200) throw new Error(await res.text());

			result.push(...await res.json());
		}

		return result;
	}
}