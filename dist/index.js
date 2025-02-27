"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChiefPayClient = void 0;
const events_1 = require("events");
const socket_io_client_1 = require("socket.io-client");
const MIN_RATE_UPDATE_INTERVAL = 10000;
class ChiefPayClient extends events_1.EventEmitter {
    apiKey;
    lastRatesUpdate = 0;
    socket;
    baseURL;
    rates = [];
    constructor({ apiKey, baseURL }) {
        super();
        this.apiKey = apiKey;
        this.baseURL = new URL(baseURL ?? "https://api.chiefpay.org");
        this.socket = (0, socket_io_client_1.io)(this.baseURL.toString(), {
            path: "/v1/socket.io",
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
    onNotification(notification) {
        this.emit("notification", notification);
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
        const data = await this.makeRequest(new URL("v1/rates/", this.baseURL));
        this.handleRates(data);
        return this.rates;
    }
    /**
     * Create new static wallet
     */
    async createWallet(wallet) {
        const data = await this.makeRequest(new URL("v1/wallet/", this.baseURL), wallet);
        return data;
    }
    /**
     * Get static wallet info by id
     */
    async getWallet(wallet) {
        const url = new URL("v1/wallet/", this.baseURL);
        for (let key in wallet)
            url.searchParams.set(key, wallet[key]);
        const data = await this.makeRequest(url);
        return data;
    }
    /**
     * Create new invoice
     */
    async createInvoice(invoice) {
        const data = await this.makeRequest(new URL("v1/invoice/", this.baseURL), invoice);
        return data;
    }
    /**
     * Get invoice info by id
     */
    async getInvoice(invoice) {
        const url = new URL("v1/invoice/", this.baseURL);
        for (let key in invoice)
            url.searchParams.set(key, invoice[key]);
        const data = await this.makeRequest(url);
        return data;
    }
    /**
     * Notifications history
     */
    async history(fromDate, toDate) {
        const url = new URL("v1/history/", this.baseURL);
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