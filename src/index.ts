import { io, Socket } from "socket.io-client";
import Emittery from "emittery";
import { components, operations } from "./types/openapi";

export type ErrorResponse = components["schemas"]["ErrorResponse"];
export type Response<T> = T | ErrorResponse;
export type Rates = components["schemas"]["Rate"][];
export type StaticWallet = components["schemas"]["StaticWallet"];
export type Transaction = components["schemas"]["Transaction"];
export type Invoice = components["schemas"]["Invoice"];
export type InvoiceHistory = components["schemas"]["Invoices"];
export type TransactionsHistory = components["schemas"]["Transactions"];
export type PaymentMethods = components["schemas"]["PaymentMethods"];

function isErrorResponse(data: any): data is ErrorResponse {
	return typeof data === 'object' && 'errors' in data && 'code' in data;
}

export interface ChiefPayClientSettings {
	apiKey: string;
	/**
	 * url like https://hostname or https://hostname:port
	 * @default https://api.chiefpay.org
	 */
	baseURL?: string;
}

export interface NotificationInvoice {
	type: "invoice";
	invoice: Invoice;
}

export interface NotificationTransaction {
	type: "transaction";
	transaction: Transaction;
}

export type Notification = NotificationInvoice | NotificationTransaction;

interface Events {
	notification: Notification;
	connected: undefined;
	error: any;
	rates: Rates;
}

interface NotificationACK {
	status: "success" | "error"
}

interface ServerToClientEvents {
	notification: (notification: Notification, callback: (result: NotificationACK) => void) => void;
	rates: (rates: Rates) => void;
}

interface ClientToServerEvents {

}

export function isInvoiceNotification(notification: Notification): notification is NotificationInvoice {
	return notification.type == "invoice";
}

export function isTransactionNotification(notification: Notification): notification is NotificationTransaction {
	return notification.type == "transaction";
}

export class ChiefPayError extends Error {
	public code: ErrorResponse["code"];

	constructor(errors: string[], code: ErrorResponse["code"]) {
		super(errors.join());

		this.code = code;
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
		let urlStr = baseURL ?? "https://api.chiefpay.org";
		if (!urlStr.endsWith('/')) urlStr += '/';
		this.baseURL = new URL(urlStr);

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

	private onNotification(notification: Notification, ack: (data: NotificationACK) => void) {
		this.emit("notification", notification).then(
			() => ack({ status: "success" }),
			() => ack({ status: "error" })
		);
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
	async createWallet(wallet: components["schemas"]["CreateStaticWalletRequest"]): Promise<StaticWallet> {
		const data = await this.makeRequest<StaticWallet>(new URL("v1/wallet/", this.baseURL), "POST", wallet);

		return data;
	}

	/**
	 * Get static wallet info by id
	 */
	async getWallet(walletId: string): Promise<StaticWallet> {
		const data = await this.makeRequest<StaticWallet>(new URL(`v1/wallet/${walletId}`, this.baseURL));

		return data;
	}


	/**
	 * Create new invoice
	 */
	async createInvoice(invoice: components["schemas"]["CreateInvoiceRequest"]): Promise<Invoice> {
		const data = await this.makeRequest<Invoice>(new URL("v1/invoice/", this.baseURL), "POST", invoice);

		return data;
	}

	/**
	 * Get invoice info by id
	 */
	async getInvoice(invoiceId: string): Promise<Invoice> {
		const data = await this.makeRequest<Invoice>(new URL(`v1/invoice/${invoiceId}`, this.baseURL));

		return data;
	}

	/**
	 * Cancel invoice by id
	 */
	async cancelInvoice(invoiceId: string): Promise<Invoice> {
		const data = await this.makeRequest<Invoice>(new URL(`v1/invoice/${invoiceId}/cancel`, this.baseURL), "POST");

		return data;
	}

	/**
	 * Prolong invoice by id
	 */
	async prolongInvoice(invoiceId: string): Promise<Invoice> {
		const data = await this.makeRequest<Invoice>(new URL(`v1/invoice/${invoiceId}/prolong`, this.baseURL), "POST");

		return data;
	}

	/**
	 * Patch invoice by id
	 */
	async patchInvoice(invoiceId: string, invoice: components["schemas"]["PatchInvoiceRequest"]): Promise<Invoice> {
		const data = await this.makeRequest<Invoice>(new URL(`v1/invoice/${invoiceId}`, this.baseURL), "PATCH", invoice);

		return data;
	}

	/**
	 * Invoice history
	 */
	async invoiceHistory(req: operations["GetInvoices"]["parameters"]["query"]): Promise<InvoiceHistory> {
		const url = new URL("v1/history/invoices", this.baseURL);
		this.appendSearchParams(url, req);
		const data = await this.makeRequest<InvoiceHistory>(url);

		return data;
	}

	/**
	 * Transactions history
	 */
	async transactionsHistory(req: operations["GetTransactions"]["parameters"]["query"]): Promise<TransactionsHistory> {
		const url = new URL("v1/history/transactions", this.baseURL);
		this.appendSearchParams(url, req);
		const data = await this.makeRequest<TransactionsHistory>(url);

		return data;
	}

	/**
	 * Payment methods
	 */
	async getPaymentMethods(): Promise<PaymentMethods> {
		const url = new URL("v1/paymentMethods", this.baseURL);
		const data = await this.makeRequest<PaymentMethods>(url);

		return data;
	}

	// Helper method
	private appendSearchParams(url: URL, params: Record<string, any>) {
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				url.searchParams.set(key, value.toString());
			}
		});
	}

	protected async makeRequest<T>(url: URL, method?: string, body?: any, retries = 3): Promise<T> {
		method ??= body ? "POST" : "GET";
		const init: RequestInit = {
			method: method,
			headers: {
				"x-api-key": this.apiKey,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			}
		}

		if (body) {
			init.body = JSON.stringify(body);
		}

		const res = await fetch(url, init);

		if (res.status == 429) {
			if (retries <= 0) throw new Error("Rate limit exceeded and max retries reached");
			const retry = res.headers.get("retry-after-ms") ?? "3000";

			await new Promise(x => setTimeout(x, +retry));

			return this.makeRequest(url, method, body, retries - 1);
		}

		const bodyRes = await res.text();

		let err: Error;

		try {
			let json = JSON.parse(bodyRes);
			if (res.ok) return json;

			if (isErrorResponse(json)) {
				err = new ChiefPayError(json.errors, json.code);
			} else err = new Error(`API Error ${res.status}: ${JSON.stringify(json)}`);
		} catch (e) {
			err = new Error(`Failed to parse response: ${res.status} ${res.statusText}`);
		}

		throw err;
	}
}
