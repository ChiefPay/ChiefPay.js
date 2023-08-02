//То что получает юзер
export interface Transaction {
	id: number;
	walletId: string;
	walletSubId: number;
	userId?: string;
	token: string;
	value: string;
	usd: number;
	txid: string;
	chain: number;
	timestamp: number;
}