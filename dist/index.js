"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChiefPayClient = void 0;
const eventsource_1 = __importDefault(require("eventsource"));
const events_1 = require("events");
const MIN_RATE_UPDATE_INTERVAL = 10000;
class ChiefPayClient extends events_1.EventEmitter {
    apiKey;
    lastRatesUpdate = 0;
    es;
    baseURL;
    rates = [];
    constructor({ apiKey, baseURL }) {
        super();
        this.apiKey = apiKey;
        this.baseURL = baseURL ?? "https://api.chiefpay.org";
        this.baseURL += "/v1";
        this.es = new eventsource_1.default(this.baseURL + "/sse", {
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
     * Stop SSE connection (graceful shutdown)
     */
    stop() {
        this.es.close();
    }
    onMessage(event) {
        this.emit("notification", JSON.parse(event.data));
    }
    async handleRates(rates) {
        this.rates = rates;
        this.emit("rates", this.rates);
    }
    /**
     * Get rates
     * @deprecated Use .on("rates") or .rates instead
     */
    async updateRates() {
        if (Date.now() - this.lastRatesUpdate < MIN_RATE_UPDATE_INTERVAL)
            throw new Error("ChiefPayClient: rateUpdateInterval is too short");
        this.lastRatesUpdate = Date.now();
        const data = await this.makeRequest(new URL("/rates", this.baseURL));
        this.handleRates(data);
        return this.rates;
    }
    /**
     * Create new static wallet
     */
    async createWallet(wallet) {
        const data = await this.makeRequest(new URL("/wallet", this.baseURL), wallet);
        return data;
    }
    /**
     * Get static wallet info by id
     */
    async getWallet(wallet) {
        const url = new URL("/wallet", this.baseURL);
        for (let key in wallet)
            url.searchParams.set(key, wallet[key]);
        const data = await this.makeRequest(url);
        return data;
    }
    /**
     * Create new invoice
     */
    async createInvoice(invoice) {
        const data = await this.makeRequest(new URL("/invoice", this.baseURL), invoice);
        return data;
    }
    /**
     * Get invoice info by id
     */
    async getInvoice(invoice) {
        const url = new URL("/invoice", this.baseURL);
        for (let key in invoice)
            url.searchParams.set(key, invoice[key]);
        const data = await this.makeRequest(url);
        return data;
    }
    /**
     * Notifications history
     */
    async history(fromDate, toDate) {
        const url = new URL("/history", this.baseURL);
        url.searchParams.set("fromDate", fromDate.toISOString());
        if (toDate)
            url.searchParams.set("toDate", toDate.toISOString());
        const data = await this.makeRequest(url);
        return data;
    }
    async makeRequest(url, body) {
        const init = {
            method: "GET",
            headers: {
                "x-api-key": this.apiKey,
                'Content-Type': 'application/json'
            }
        };
        if (body) {
            init.method = "POST";
            init.body = JSON.stringify(body);
        }
        const res = await fetch(url, init);
        const json = await res.json();
        if (json.status == "error")
            throw new Error(json.message);
        return json.data;
    }
}
exports.ChiefPayClient = ChiefPayClient;
//# sourceMappingURL=index.js.map