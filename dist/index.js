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
    ts;
    lastRatesUpdate = 0;
    es;
    lastPing = new Date();
    baseURL;
    rates = {};
    constructor({ apiKey, baseURL, ts }) {
        super();
        this.apiKey = apiKey;
        this.ts = ts;
        this.baseURL = baseURL + "/api";
        this.es = new eventsource_1.default(this.baseURL + "/sse", {
            headers: {
                "x-api-key": this.apiKey,
                "ts": this.ts.toString()
            }
        });
        this.es.onopen = () => this.emit("connected");
        this.es.onmessage = this.onMessage.bind(this);
        this.es.onerror = err => this.emit("error", err);
        this.es.addEventListener("ping", event => this.lastPing = new Date());
    }
    stop() {
        this.es.close();
    }
    onMessage(event) {
        let data = JSON.parse(event.data);
        this.ts = +event.lastEventId;
        this.emit("transaction", data);
    }
    async updateRates() {
        if (Date.now() - this.lastRatesUpdate < MIN_RATE_UPDATE_INTERVAL)
            throw new Error("MerchantClient: rateUpdateInterval is too short");
        this.lastRatesUpdate = Date.now();
        let res = await fetch(this.baseURL + "/rates", {
            method: "POST",
            headers: {
                "x-api-key": this.apiKey
            },
        });
        this.rates = await res.json();
        for (let chain in this.rates) {
            for (let token in this.rates[chain]) {
                this.rates[chain][token] = (Number(BigInt(this.rates[chain][token]) / (10n ** 15n)) / 1000).toFixed(2);
            }
        }
        return this.rates;
    }
    async wallet(userId) {
        let res = await fetch(this.baseURL + "/wallet", {
            method: "POST",
            headers: {
                "x-api-key": this.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId
            }),
        });
        return await res.text();
    }
    async transactions(ids) {
        let result = [];
        while (ids.length > 0) {
            let res = await fetch(this.baseURL + "/transactions", {
                method: "POST",
                headers: {
                    "x-api-key": this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids: ids.splice(0, 100) })
            });
            result.push(...await res.json());
        }
        return result;
    }
}
exports.MerchantClient = MerchantClient;
//# sourceMappingURL=index.js.map