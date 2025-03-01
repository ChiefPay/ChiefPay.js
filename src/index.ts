import { EventEmitter } from "events";
import { Invoice, Notification, StaticWallet, Response, ServerToClientEvents, Rates, ClientToServerEvents, InvoiceHistory, TransactionsHistory } from "./types";
export { InvoiceStatus, StaticWallet, Invoice, Notification, InvoiceNotification, TransactionNotification, Transaction, Rates } from "./types";
import { io, Socket } from "socket.io-client";

const MIN_RATE_UPDATE_INTERVAL = 10000;

interface ChiefPayClientSettings {
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

export declare interface ChiefPayClient {
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

export class ChiefPayClient extends EventEmitter {
	apiKey: string;
	private lastRatesUpdate: number = 0;
	private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
	private baseURL: URL;
	rates: Rates = [];

	constructor({ apiKey, baseURL }: ChiefPayClientSettings) {
		super();
		this.apiKey = apiKey;
		this.baseURL = new URL(baseURL ?? "https://api.chiefpay.org");

		this.socket = io(this.baseURL.toString(), {
			path: "/socket.io",
			extraHeaders: {
				"x-api-key": this.apiKey,
			},
			autoConnect: false,
		});

		this.socket.on("connect", () => this.emit("connected"));
		this.socket.on("rates", this.handleRates.bind(this));
		this.socket.on("notification", this.onNotification.bind(this));
		this.socket.on("connect_error", err => this.emit("error", err));
	}

	/**
	 * Connect to socket.io
	 */
	connect() {
		this.socket.connect();
	}

	/**
	 * Stop socket.io connection (graceful shutdown)
	 */
	disconnect() {
		this.socket.disconnect();
	}

	private onNotification(notification: Notification) {
		this.emit("notification", notification);
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
		if (Date.now() - this.lastRatesUpdate < MIN_RATE_UPDATE_INTERVAL) throw new Error("ChiefPayClient: rateUpdateInterval is too short");
		this.lastRatesUpdate = Date.now();

		const data = await this.makeRequest<Rates>(new URL("v1/rates/", this.baseURL));

		this.handleRates(data);
		return this.rates;
	}

	/**
	 * Create new static wallet
	 */
	async createWallet(wallet: CreateWallet): Promise<StaticWallet> {
		const data = await this.makeRequest<StaticWallet>(new URL("v1/wallet/", this.baseURL), wallet);

		return data;
	}

	/**
	 * Get static wallet info by id
	 */
	async getWallet(wallet: GetWallet): Promise<StaticWallet> {
		const url = new URL("v1/wallet/", this.baseURL);
		for (let key in wallet) url.searchParams.set(key, (wallet as any)[key]);
		const data = await this.makeRequest<StaticWallet>(url);

		return data;
	}


	/**
	 * Create new invoice
	 */
	async createInvoice(invoice: CreateInvoice): Promise<Invoice> {
		const data = await this.makeRequest<Invoice>(new URL("v1/invoice/", this.baseURL), invoice);

		return data;
	}

	/**
	 * Get invoice info by id
	 */
	async getInvoice(invoice: GetInvoice): Promise<Invoice> {
		const url = new URL("v1/invoice/", this.baseURL);
		for (let key in invoice) url.searchParams.set(key, (invoice as any)[key]);
		const data = await this.makeRequest<Invoice>(url);

		return data;
	}

	/**
	 * Invoice history
	 */
	async invoiceHistory(req: { fromDate: Date, toDate?: Date, limit?: number }): Promise<InvoiceHistory> {
		const url = new URL("v1/history/invoices", this.baseURL);
		url.searchParams.set("fromDate", req.fromDate.toISOString());
		if (req.toDate) url.searchParams.set("toDate", req.toDate.toISOString());
		const data = await this.makeRequest<InvoiceHistory>(url);

		return data;
	}

	/**
	 * Transactions history
	 */
	async transactionsHistory(req: { fromDate: Date, toDate?: Date, limit?: number }): Promise<TransactionsHistory> {
		const url = new URL("v1/history/transactions", this.baseURL);
		url.searchParams.set("fromDate", req.fromDate.toISOString());
		if (req.toDate) url.searchParams.set("toDate", req.toDate.toISOString());
		const data = await this.makeRequest<TransactionsHistory>(url);

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

		if (res.status == 429) {
			const retry = res.headers.get("retry-after-ms") ?? "3000";

			await new Promise(x => setTimeout(x, +retry));

			return this.makeRequest(url, body);
		}

		const bodyRes = await res.text();
		let json: Response<T>;
		try {
			json = JSON.parse(bodyRes);
		} catch (e) {
			throw bodyRes;
		}

		if (json.status == "error") throw new Error(json.message);
		return json.data;
	}
}