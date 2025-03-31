export type InvoiceStatus = "WAIT" | "COMPLETE" | "EXPIRED" | "OVER_PAID" | "UNDER_PAID";

export interface SuccessResponse<T> {
	status: "success";
	data: T;
}

export type ErrorCode = "INVALID_ARGUMENT" | "ALREADY_EXISTS" | "NOT_FOUND" | "INTERNAL" | "OUT_OF_RANGE" | "UNAUTHENTICATED" | "PERMISSION_DENIED";

export interface ErrorResponse {
	status: "error";
	message: {
		code: ErrorCode;
		message: string;
		fields: string[];
	};
}

export type Response<T> = SuccessResponse<T> | ErrorResponse;

export interface ChainToken {
	chain: string;
	token: string;
	methodName: string;
	address: string;
}

export interface ChainTokenWithRate {
	chain: string;
	token: string;
	methodName: string;
	address: string;
	tokenRate: string;
}

export interface FiatDetails {
	name: string;
	amount: string;
	payedAmount: string;
	feeRate: string;
	bank: string;
	requisites: string;
	cardOwner: string;
}

export interface Transaction {
	txid: string;
	chain: string;
	token: string;
	value: string;
	usd: string;
	fee: string;
	createdAt: string;
	blockCreatedAt: string;
	wallet: StaticWallet;
}

export interface LastTransaction {
	chain: string;
	txid: string;
}

export interface Invoice {
	id: string;
	orderId: string;
	description?: string;
	amount?: string;
	payedAmount: string;
	feeIncluded: boolean;
	accuracy: string;
	discount: string;
	feeRate: string;
	createdAt: string;
	expiredAt: string;
	status: InvoiceStatus;
	url: string;
	lastTransaction?: LastTransaction;
	urlSuccess?: string;
	urlReturn?: string;
	originalExpiredAt?: string;
	canceledAt?: string;
	supportLink?: string;

	addresses: ChainTokenWithRate[];
	FiatDetails?: FiatDetails[];
}

export interface StaticWallet {
	id: string;
	orderId: string;
	addresses: ChainToken[];
}

export interface InvoiceHistory {
	invoices: Invoice[];
	totalCount: number;
}

export interface TransactionsHistory {
	transactions: Transaction[];
	totalCount: number;
}

export type TransactionNotification = { type: "transaction", transaction: Transaction };
export type InvoiceNotification = { type: "invoice", invoice: Invoice };

export type Notification = TransactionNotification | InvoiceNotification;
export type Rates = { name: string, rate: string }[];

export interface ServerToClientEvents {
	notification: (notification: Notification) => void;
	rates: (rates: Rates) => void;
}

export interface ClientToServerEvents {

}
