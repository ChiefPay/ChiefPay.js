"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantClient = void 0;
const eventsource_1 = __importDefault(require("eventsource"));
const events_1 = require("events");
const MIN_RATE_UPDATE_INTERVAL = 10000;
class MerchantClient extends events_1.EventEmitter {
    apiKey;
    lastRatesUpdate = 0;
    es;
    baseURL;
    rates = {};
    constructor({ apiKey, baseURL }) {
        super();
        this.apiKey = apiKey;
        this.baseURL = baseURL;
        this.es = new eventsource_1.default(this.baseURL + "/api/sse", {
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
     * Закрывает соединение с SSE
     */
    stop() {
        this.es.close();
    }
    onMessage(event) {
        this.emit("notification", this.formatNotification(JSON.parse(event.data)));
    }
    formatInvoice(invoiceString) {
        if (invoiceString === null)
            return null;
        return {
            ...invoiceString,
            createdAt: new Date(invoiceString.createdAt),
            expiredAt: new Date(invoiceString.expiredAt),
        };
    }
    formatTransaction(transactionString) {
        if (!transactionString)
            return null;
        return {
            ...transactionString,
            createdAt: new Date(transactionString.createdAt),
            blockCreatedAt: new Date(transactionString.blockCreatedAt),
        };
    }
    formatNotification(notificationString) {
        return {
            invoice: this.formatInvoice(notificationString.invoice),
            transaction: this.formatTransaction(notificationString.transaction)
        };
    }
    async handleRates(rates) {
        this.rates = rates;
        this.emit("rates", this.rates);
    }
    /**
     *
     * @deprecated Курсы валют теперь передаются через SSE. Слушать так же через .on("rates")
     */
    async updateRates() {
        if (Date.now() - this.lastRatesUpdate < MIN_RATE_UPDATE_INTERVAL)
            throw new Error("MerchantClient: rateUpdateInterval is too short");
        this.lastRatesUpdate = Date.now();
        let res = await fetch(this.baseURL + "/api/rates", {
            method: "GET",
            headers: {
                "x-api-key": this.apiKey
            },
        });
        if (res.status != 200)
            throw new Error(await res.text());
        this.handleRates(await res.json());
        return this.rates;
    }
    /**
     * Создает классический кошелек без аренды
     */
    async createWallet(wallet) {
        let res = await fetch(this.baseURL + "/api/wallet", {
            method: "POST",
            headers: {
                "x-api-key": this.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                additional: wallet.additional,
            }),
        });
        if (res.status != 200)
            throw new Error(await res.text());
        return res.json();
    }
    /**
     * Выдает классический кошелек без аренды
     */
    async getWallet(wallet) {
        const url = new URL("/api/wallet", this.baseURL);
        url.searchParams.set("id", wallet.id);
        let res = await fetch(url, {
            method: "GET",
            headers: {
                "x-api-key": this.apiKey,
                'Content-Type': 'application/json'
            },
        });
        if (res.status == 404)
            throw new Error(`Wallet ${wallet.id} not found`);
        else if (res.status != 200)
            throw new Error(await res.text());
        return res.json();
    }
    /**
     * Создает инвойс
     */
    async createInvoice(invoice) {
        let res = await fetch(this.baseURL + "/api/invoice", {
            method: "POST",
            headers: {
                "x-api-key": this.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(invoice),
        });
        if (res.status != 200)
            throw new Error(await res.text());
        return this.formatInvoice(await res.json());
    }
    /**
     * Ищет уже созданный инвойс
     */
    async getInvoice(invoice) {
        const url = new URL("/api/wallet", this.baseURL);
        url.searchParams.set("id", invoice.id);
        let res = await fetch(url, {
            method: "GET",
            headers: {
                "x-api-key": this.apiKey,
                'Content-Type': 'application/json'
            },
        });
        if (res.status == 404)
            throw new Error(`Invoice ${invoice.id} not found`);
        else if (res.status != 200)
            throw new Error(await res.text());
        return this.formatInvoice(await res.json());
    }
    /**
     * Выдает историю уведомлений
     */
    async history(fromDate, toDate) {
        let res = await fetch(this.baseURL + "/api/transactions", {
            method: "POST",
            headers: {
                "x-api-key": this.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fromDate: fromDate.toISOString(), toDate: toDate?.toISOString() })
        });
        if (res.status != 200)
            throw new Error(await res.text());
        return res.json().then((res) => res.map(this.formatNotification));
    }
}
exports.MerchantClient = MerchantClient;
//# sourceMappingURL=index.js.map