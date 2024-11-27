import EventSource from "eventsource";
import { EventEmitter } from "events";
import { Invoice, Notification, Transaction, StaticWallet, Response } from "./types";
export { InvoiceStatus, StaticWallet } from "./types";

const MIN_RATE_UPDATE_INTERVAL = 10000;

export type Rates = { name: string, rate: string }[];

interface MerchantClientSettings {
	apiKey: string;
	/**
	 * url like https://hostname or https://hostname:port
	 * @default https://api.chiefpay.org
	 */
	baseURL?: string;
}

interface CreateWallet {
	/**
	 * Order ID in your system
	 */
	orderId: string;
}

interface GetWalletById {
	/**
	 * UUID of wallet
	 */
	id: string;
}

interface GetWalletByOrderId {
	/**
	 * Order ID in your system
	 */
	orderId: string;
}

type GetWallet = GetWalletById | GetWalletByOrderId;

interface CreateInvoice {
	/**
	 * Order ID in your system
	 */
	orderId: string;
	/**
	 * Description will be shown on the payment page
	 */
	description?: string;
	/**
	 * Amount in the specified currency. If not specified, payment for any amount (useful for replenishing the balance) only in crypto!!!
	 */
	amount?: string;
	/**
	 * 3-letter code in ISO 4217
	 * @default USD
	 */
	currency?: string;
	/**
	 * true to add commission to amount
	 * @default false
	 */
	feeIncluded?: boolean;
	/**
	 * Allowable inaccuracy of the payment amount. From 0.00 to 0.05 where 0.05 is 5% of the amount
	 * @default 0
	 */
	accuracy?: string;
	/**
	 * Discount or markup. From -0.99 to 0.99 where 0.05 is 5% discount and -0.05 is 5% markup.
	 * @default 0
	 */
	discount?: string;
}

interface GetInvoiceById {
	/**
	 * UUID of invoice
	 */
	id: string;
}

interface GetInvoiceByOrderId {
	/**
	 * Order ID in your system
	 */
	orderId: string;
}

type GetInvoice = GetInvoiceById | GetInvoiceByOrderId;

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
	rates: Rates = [];

	constructor({ apiKey, baseURL }: MerchantClientSettings) {
		super();
		this.apiKey = apiKey;
		this.baseURL = baseURL ?? "https://api.chiefpay.org";
		this.baseURL += "/v1";

		this.es = new EventSource(this.baseURL + "/sse", {
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
	 * Stop SSE connection (graceful shutdown)
	 */
	stop() {
		this.es.close();
	}

	private onMessage(event: MessageEvent<string>) {
		this.emit("notification", JSON.parse(event.data) as Notification);
	}

	private async handleRates(rates: Rates) {
		this.rates = rates;
		this.emit("rates", this.rates);
	}

	/**
	 * Get rates
	 * @deprecated Use .on("rates") or .rates instead
	 */
	async updateRates() {
		if (Date.now() - this.lastRatesUpdate < MIN_RATE_UPDATE_INTERVAL) throw new Error("MerchantClient: rateUpdateInterval is too short");
		this.lastRatesUpdate = Date.now();

		const data = await this.makeRequest<Rates>(new URL("/rates", this.baseURL));

		this.handleRates(data);
		return this.rates;
	}

	/**
	 * Create new static wallet
	 */
	async createWallet(wallet: CreateWallet): Promise<StaticWallet> {
		const data = await this.makeRequest<StaticWallet>(new URL("/wallet", this.baseURL), wallet);

		return data;
	}

	/**
	 * Get static wallet info by id
	 */
	async getWallet(wallet: GetWallet): Promise<StaticWallet> {
		const url = new URL("/wallet", this.baseURL);
		for (let key in wallet) url.searchParams.set(key, (wallet as any)[key]);
		const data = await this.makeRequest<StaticWallet>(url);

		return data;
	}


	/**
	 * Create new invoice
	 */
	async createInvoice(invoice: CreateInvoice): Promise<Invoice> {
		const data = await this.makeRequest<Invoice>(new URL("/invoice", this.baseURL), invoice);

		return data;
	}

	/**
	 * Get invoice info by id
	 */
	async getInvoice(invoice: GetInvoice): Promise<Invoice> {
		const url = new URL("/invoice", this.baseURL);
		for (let key in invoice) url.searchParams.set(key, (invoice as any)[key]);
		const data = await this.makeRequest<Invoice>(url);

		return data;
	}

	/**
	 * Notifications history
	 */
	async history(fromDate: Date, toDate?: Date): Promise<Notification[]> {
		const url = new URL("/history", this.baseURL);
		url.searchParams.set("fromDate", fromDate.toISOString());
		if (toDate) url.searchParams.set("toDate", toDate.toISOString());
		const data = await this.makeRequest<Notification[]>(url);

		return data;
	}

	private async makeRequest<T>(url: URL, body?: any): Promise<T> {
		const init: RequestInit = {
			method: "GET",
			headers: {
				"x-api-key": this.apiKey,
				'Content-Type': 'application/json'
			}
		}

		if (body) {
			init.method = "POST";
			init.body = JSON.stringify(body);
		}

		const res = await fetch(url, init);
		const json = await res.json() as Response<T>;

		if (json.status == "error") throw new Error(json.message);
		return json.data;
	}
}