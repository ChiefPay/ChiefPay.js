export type InvoiceStatus = "WAIT" | "COMPLETE" | "EXPIRED" | "OVER_PAID" | "UNDER_PAID";

export interface SuccessResponse<T> {
	status: "success";
	data: T;
}

export interface ErrorResponse {
	status: "error";
	message: string;
}

export type Response<T> = SuccessResponse<T> | ErrorResponse;

interface ChainToken {
	chain: string;
	token: string;
	address: string;
	tokenRate: string;
}

interface FiatDetails {
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

export interface Invoice {
	id: string;
	orderId: string;
	description?: string;
	status: InvoiceStatus;
	amount?: string;
	payedAmount: string;
	accuracy: string;
	discount: string;
	feeIncluded: boolean;
	createdAt: string;
	expiredAt: string;

	addresses: ChainToken[];
	FiatDetails: FiatDetails[];
}

export interface StaticWallet {
	id: string;
	orderId: string;
	addresses: ChainToken[];
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
