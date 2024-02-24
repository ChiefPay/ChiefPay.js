export type InvoiceStatus = "wait" | "complete" | "expired" | "overPaid" | "underPaid";

//То что получает юзер
export interface Transaction {
	txid: string;
	createdAt: string;
	blockCreatedAt: string;
	chainId: number;
	token: string;
	value: string;
	fee: string;
	usd: string;
	wallet?: {
		id: string;
		additional: string;
	}
}

//То что получает юзер
export interface Invoice {
	id: string;
	additional?: string;
	status: InvoiceStatus;
	amount?: string;
	payedAmount: string;
	createdAt: string;
	expiredAt: string;

	addresses: { [chainTypeName: string]: string };
}

export interface StaticWallet {
	id: string;
	additional: string;
	addresses: { [chainTypeName: string]: string };
}

//То что получает юзер
export type Notification = { transaction: Transaction, invoice: Invoice | null } | { transaction: null, invoice: Invoice };