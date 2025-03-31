import { Invoice, Notification, StaticWallet, Response, ServerToClientEvents, Rates, ClientToServerEvents, InvoiceHistory, TransactionsHistory, ErrorCode } from "./types";
import { io, Socket } from "socket.io-client";
import Emittery from "emittery";
import type { ChiefPayClientSettings, CreateInvoice, CreateWallet, Events, GetInvoice, GetWallet } from "./internalTypes";

export type { InvoiceStatus, StaticWallet, Invoice, Notification, InvoiceNotification, TransactionNotification, Transaction, Rates } from "./types";
export { isInvoiceNotification } from "./utils";

export class ChiefPayError extends Error {
	public code: ErrorCode;
	public fields: string[];

	constructor(message: string, code: ErrorCode, fields: string[]) {
		super(message);

		this.code = code;
		this.fields = fields;
	}
}

export class ChiefPayClient extends Emittery<Events> {
	readonly apiKey: string;
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
	 * Better use socket to get token rate. First connect to socket with .connect() then .on("rates") or .rates
	 */
	async updateRates() {
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

	protected async makeRequest<T>(url: URL, body?: any): Promise<T> {
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
			throw new Error(bodyRes);
		}

		if (json.status == "error") {
			throw new ChiefPayError(json.message.message, json.message.code, json.message.fields);
		}
		return json.data;
	}
}
