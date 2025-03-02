import type { Notification, Rates } from "./types";

export interface ChiefPayClientSettings {
	apiKey: string;
	/**
	 * url like https://hostname or https://hostname:port
	 * @default https://api.chiefpay.org
	 */
	baseURL?: string;
}

export interface CreateWallet {
	/**
	 * Order ID in your system
	 */
	orderId: string;
}

export interface GetWalletById {
	/**
	 * UUID of wallet
	 */
	id: string;
}

export interface GetWalletByOrderId {
	/**
	 * Order ID in your system
	 */
	orderId: string;
}

export type GetWallet = GetWalletById | GetWalletByOrderId;

export interface CreateInvoice {
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

export interface GetInvoiceById {
	/**
	 * UUID of invoice
	 */
	id: string;
}

export interface GetInvoiceByOrderId {
	/**
	 * Order ID in your system
	 */
	orderId: string;
}

export type GetInvoice = GetInvoiceById | GetInvoiceByOrderId;

export interface Events {
	notification: Notification;
	connected: undefined;
	error: any;
	rates: Rates;
}