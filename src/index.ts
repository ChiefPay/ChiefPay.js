import EventSource from "eventsource";
import { EventEmitter } from "events";
import { Invoice as InvoiceString, Notification as NotificationString, Transaction as TransactionString, StaticWallet } from "./types";
export { InvoiceStatus, StaticWallet } from "./types";

const MIN_RATE_UPDATE_INTERVAL = 10000;

export interface Invoice extends Omit<InvoiceString, "expiredAt" | "createdAt"> {
	expiredAt: Date;
	createdAt: Date;
}

export interface Transaction extends Omit<TransactionString, "blockCreatedAt" | "createdAt"> {
	createdAt: Date;
	blockCreatedAt: Date;
}

export type Notification = { transaction: Transaction, invoice: Invoice | null } | { transaction: null, invoice: Invoice };

export type Rates = {
	[token: string]: string;
}

interface MerchantClientSettings {
	apiKey: string;
	/**
	 * url like http://hostname:port
	 */
	baseURL: `${'http' | 'https'}://${string}:${number}`;
}

interface CreateWallet {
	/**
	 * какие-то данные для идентификации в системе (например, id пользователя)
	 */
	additional: string;
}

interface GetWallet {
	/**
	 * uuid кошелька
	 */
	id: string;
}

interface CreateInvoice {
	/**
	 * какие-то данные для идентификации в системе (например, id оплаты)
	 */
	additional: string;
	/**
	 * сумма платежа в долларах
	 */
	amount?: string;
}

interface GetInvoice {
	/**
	 * uuid инвойса
	 */
	id: string;
}

export declare interface MerchantClient {
	on(event: 'notification', listener: (notification: Notification) => void): this;
	once(event: 'notification', listener: (notification: Notification) => void): this;
	off(event: 'notification', listener: (notification: Notification) => void): this;
	emit(event: 'notification', notification: Notification): boolean;

	on(event: 'connected', listener: () => void): this;
	once(event: 'connected', listener: () => void): this;
	off(event: 'connected', listener: () => void): this;
	emit(event: 'connected'): boolean;

	on(event: 'error', listener: (err: any) => void): this;
	once(event: 'error', listener: (err: any) => void): this;
	off(event: 'error', listener: (err: any) => void): this;
	emit(event: 'error', err: any): boolean;

	on(event: 'rates', listener: (rates: Rates) => void): this;
	once(event: 'rates', listener: (rates: Rates) => void): this;
	off(event: 'rates', listener: (rates: Rates) => void): this;
	emit(event: 'rates', rates: Rates): boolean;
}

export class MerchantClient extends EventEmitter {
	apiKey: string;
	private lastRatesUpdate: number = 0;
	private es: EventSource;
	private baseURL: string;
	rates: Rates = {};

	constructor({ apiKey, baseURL }: MerchantClientSettings) {
		super();
		this.apiKey = apiKey;
		this.baseURL = baseURL;

		this.es = new EventSource(this.baseURL + "/api/sse", {
			headers: {
				"x-api-key": this.apiKey,
			}
		});

		this.es.onopen = () => this.emit("connected");
		this.es.addEventListener("rates", event => this.handleRates(JSON.parse(event.data)));
		this.es.onmessage = this.onMessage.bind(this);
		this.es.onerror = err => this.emit("error", err);
	}

	/**
	 * Закрывает соединение с SSE
	 */
	stop() {
		this.es.close();
	}

	private onMessage(event: MessageEvent<string>) {
		this.emit("notification", this.formatNotification(JSON.parse(event.data)));
	}

	private formatInvoice(invoiceString: InvoiceString | null): Invoice | null {
		if (invoiceString === null) return null;

		return {
			...invoiceString,
			createdAt: new Date(invoiceString.createdAt),
			expiredAt: new Date(invoiceString.expiredAt),
		}
	}

	private formatTransaction(transactionString: TransactionString | null): Transaction | null {
		if (!transactionString) return null;

		return {
			...transactionString,
			createdAt: new Date(transactionString.createdAt),
			blockCreatedAt: new Date(transactionString.blockCreatedAt),
		}
	}

	private formatNotification(notificationString: NotificationString): Notification {
		return {
			invoice: this.formatInvoice(notificationString.invoice),
			transaction: this.formatTransaction(notificationString.transaction)
		} as Notification;
	}

	private async handleRates(rates: typeof this.rates) {
		this.rates = rates;
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
	 * Создает классический кошелек без аренды
	 */
	async createWallet(wallet: CreateWallet): Promise<StaticWallet> {
		let res = await fetch(this.baseURL + "/api/wallet", {
			method: "POST",
			headers: {
				"x-api-key": this.apiKey,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				additional: wallet.additional,
			}),
		});

		if (res.status != 200) throw new Error(await res.text());

		return res.json();
	}

	/**
	 * Выдает классический кошелек без аренды
	 */
	async getWallet(wallet: GetWallet): Promise<StaticWallet> {
		const url = new URL("/api/wallet", this.baseURL);
		url.searchParams.set("id", wallet.id);
		let res = await fetch(url, {
			method: "GET",
			headers: {
				"x-api-key": this.apiKey,
				'Content-Type': 'application/json'
			},
		});

		if (res.status == 404) throw new Error(`Wallet ${wallet.id} not found`);
		else if (res.status != 200) throw new Error(await res.text());

		return res.json();
	}


	/**
	 * Создает инвойс
	 */
	async createInvoice(invoice: CreateInvoice): Promise<Invoice> {
		let res = await fetch(this.baseURL + "/api/invoice", {
			method: "POST",
			headers: {
				"x-api-key": this.apiKey,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(invoice),
		});

		if (res.status != 200) throw new Error(await res.text());

		return this.formatInvoice(await res.json())!;
	}

	/**
	 * Ищет уже созданный инвойс
	 */
	async getInvoice(invoice: GetInvoice): Promise<Invoice> {
		const url = new URL("/api/wallet", this.baseURL);
		url.searchParams.set("id", invoice.id);
		let res = await fetch(url, {
			method: "GET",
			headers: {
				"x-api-key": this.apiKey,
				'Content-Type': 'application/json'
			},
		});

		if (res.status == 404) throw new Error(`Invoice ${invoice.id} not found`);
		else if (res.status != 200) throw new Error(await res.text());

		return this.formatInvoice(await res.json())!;
	}

	/**
	 * Выдает историю уведомлений
	 */
	async history(fromDate: Date, toDate?: Date): Promise<Notification[]> {
		let res = await fetch(this.baseURL + "/api/transactions", {
			method: "POST",
			headers: {
				"x-api-key": this.apiKey,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ fromDate: fromDate.toISOString(), toDate: toDate?.toISOString() })
		});

		if (res.status != 200) throw new Error(await res.text());

		return res.json().then((res: NotificationString[]) => res.map(this.formatNotification));
	}
}