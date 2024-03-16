export type InvoiceStatus = "wait" | "complete" | "expired" | "overPaid" | "underPaid";
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
    };
}
export interface Invoice {
    id: string;
    additional?: string;
    status: InvoiceStatus;
    amount?: string;
    payedAmount: string;
    createdAt: string;
    expiredAt: string;
    addresses: {
        [chainTypeName: string]: string;
    };
    rates: {
        [tokenName: string]: string;
    };
}
export interface StaticWallet {
    id: string;
    additional: string;
    addresses: {
        [chainTypeName: string]: string;
    };
}
export type TransactionNotification = {
    type: "transaction";
    transaction: Transaction;
    invoice: Invoice | null;
};
export type ExpireNotification = {
    type: "expired";
    transaction: null;
    invoice: Invoice;
};
export type Notification = TransactionNotification | ExpireNotification;
