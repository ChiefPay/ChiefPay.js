"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChiefPayClient = exports.ChiefPayError = void 0;
exports.isInvoiceNotification = isInvoiceNotification;
exports.isTransactionNotification = isTransactionNotification;
const socket_io_client_1 = require("socket.io-client");
const emittery_1 = __importDefault(require("emittery"));
function isErrorResponse(data) {
    return typeof data === 'object' && 'errors' in data && 'code' in data;
}
function isInvoiceNotification(notification) {
    return notification.type == "invoice";
}
function isTransactionNotification(notification) {
    return notification.type == "transaction";
}
class ChiefPayError extends Error {
    code;
    constructor(errors, code) {
        super(errors.join());
        this.code = code;
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
        let urlStr = baseURL ?? "https://api.chiefpay.org";
        if (!urlStr.endsWith('/'))
            urlStr += '/';
        this.baseURL = new URL(urlStr);
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
    onNotification(notification, ack) {
        this.emit("notification", notification).then(() => ack({ status: "success" }), () => ack({ status: "error" }));
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
        const data = await this.makeRequest(new URL("v1/wallet/", this.baseURL), "POST", wallet);
        return data;
    }
    /**
     * Get static wallet info by id
     */
    async getWallet(walletId) {
        const data = await this.makeRequest(new URL(`v1/wallet/${walletId}`, this.baseURL));
        return data;
    }
    /**
     * Create new invoice
     */
    async createInvoice(invoice) {
        const data = await this.makeRequest(new URL("v1/invoice/", this.baseURL), "POST", invoice);
        return data;
    }
    /**
     * Get invoice info by id
     */
    async getInvoice(invoiceId) {
        const data = await this.makeRequest(new URL(`v1/invoice/${invoiceId}`, this.baseURL));
        return data;
    }
    /**
     * Cancel invoice by id
     */
    async cancelInvoice(invoiceId) {
        const data = await this.makeRequest(new URL(`v1/invoice/${invoiceId}/cancel`, this.baseURL), "POST");
        return data;
    }
    /**
     * Prolong invoice by id
     */
    async prolongInvoice(invoiceId) {
        const data = await this.makeRequest(new URL(`v1/invoice/${invoiceId}/prolong`, this.baseURL), "POST");
        return data;
    }
    /**
     * Patch invoice by id
     */
    async patchInvoice(invoiceId, invoice) {
        const data = await this.makeRequest(new URL(`v1/invoice/${invoiceId}`, this.baseURL), "PATCH", invoice);
        return data;
    }
    /**
     * Invoice history
     */
    async invoiceHistory(req) {
        const url = new URL("v1/history/invoices", this.baseURL);
        this.appendSearchParams(url, req);
        const data = await this.makeRequest(url);
        return data;
    }
    /**
     * Transactions history
     */
    async transactionsHistory(req) {
        const url = new URL("v1/history/transactions", this.baseURL);
        this.appendSearchParams(url, req);
        const data = await this.makeRequest(url);
        return data;
    }
    // Helper method
    appendSearchParams(url, params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, value.toString());
            }
        });
    }
    async makeRequest(url, method, body, retries = 3) {
        method ??= body ? "POST" : "GET";
        const init = {
            method: method,
            headers: {
                "x-api-key": this.apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        };
        if (body) {
            init.body = JSON.stringify(body);
        }
        const res = await fetch(url, init);
        if (res.status == 429) {
            if (retries <= 0)
                throw new Error("Rate limit exceeded and max retries reached");
            const retry = res.headers.get("retry-after-ms") ?? "3000";
            await new Promise(x => setTimeout(x, +retry));
            return this.makeRequest(url, method, body, retries - 1);
        }
        const bodyRes = await res.text();
        let err;
        try {
            let json = JSON.parse(bodyRes);
            if (res.ok)
                return json;
            if (isErrorResponse(json)) {
                err = new ChiefPayError(json.errors, json.code);
            }
            else
                err = new Error(`API Error ${res.status}: ${JSON.stringify(json)}`);
        }
        catch (e) {
            err = new Error(`Failed to parse response: ${res.status} ${res.statusText}`);
        }
        throw err;
    }
}
exports.ChiefPayClient = ChiefPayClient;
//# sourceMappingURL=index.js.map