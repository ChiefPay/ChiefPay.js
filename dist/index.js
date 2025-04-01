"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChiefPayClient = exports.ChiefPayError = exports.isInvoiceNotification = void 0;
const socket_io_client_1 = require("socket.io-client");
const emittery_1 = __importDefault(require("emittery"));
var utils_1 = require("./utils");
Object.defineProperty(exports, "isInvoiceNotification", { enumerable: true, get: function () { return utils_1.isInvoiceNotification; } });
class ChiefPayError extends Error {
    code;
    fields;
    constructor(message, code, fields) {
        super(message);
        this.code = code;
        this.fields = fields;
    }
}
exports.ChiefPayError = ChiefPayError;
class ChiefPayClient extends emittery_1.default {
    apiKey;
    socket;
    baseURL;
    rates = [];
    constructor({ apiKey, baseURL }) {
        super();
        this.apiKey = apiKey;
        this.baseURL = new URL(baseURL ?? "https://api.chiefpay.org");
        this.socket = (0, socket_io_client_1.io)(this.baseURL.toString(), {
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
    onNotification(notification, cb) {
        this.emit("notification", notification).then(cb);
    }
    async handleRates(rates) {
        this.rates = rates;
        this.emit("rates", this.rates);
    }
    /**
     * Better use socket to get token rate. First connect to socket with .connect() then .on("rates") or .rates
     */
    async updateRates() {
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
     * Invoice history
     */
    async invoiceHistory(req) {
        const url = new URL("v1/history/invoices", this.baseURL);
        url.searchParams.set("fromDate", req.fromDate.toISOString());
        if (req.toDate)
            url.searchParams.set("toDate", req.toDate.toISOString());
        const data = await this.makeRequest(url);
        return data;
    }
    /**
     * Transactions history
     */
    async transactionsHistory(req) {
        const url = new URL("v1/history/transactions", this.baseURL);
        url.searchParams.set("fromDate", req.fromDate.toISOString());
        if (req.toDate)
            url.searchParams.set("toDate", req.toDate.toISOString());
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
        if (res.status == 429) {
            const retry = res.headers.get("retry-after-ms") ?? "3000";
            await new Promise(x => setTimeout(x, +retry));
            return this.makeRequest(url, body);
        }
        const bodyRes = await res.text();
        let json;
        try {
            json = JSON.parse(bodyRes);
        }
        catch (e) {
            throw new Error(bodyRes);
        }
        if (json.status == "error") {
            throw new ChiefPayError(json.message.message, json.message.code, json.message.fields);
        }
        return json.data;
    }
}
exports.ChiefPayClient = ChiefPayClient;
//# sourceMappingURL=index.js.map