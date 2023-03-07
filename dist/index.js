"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantClient = void 0;
const eventsource_1 = __importDefault(require("eventsource"));
const events_1 = require("events");
const MIN_RATE_UPDATE_INTERVAL = 10000;
function isWalletById(body) {
    return typeof body.walletId === 'string';
}
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
        this.es.addEventListener("rates", event => this.handleRates(JSON.parse(event.data)));
        this.es.addEventListener("walletExpire", event => this.emit("walletExpire", JSON.parse(event.data)));
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
    async handleRates(rates) {
        this.rates = rates;
        for (let chain in this.rates) {
            for (let token in this.rates[chain]) {
                this.rates[chain][token] = (Number(BigInt(this.rates[chain][token]) / (10n ** 15n)) / 1000).toFixed(2);
            }
        }
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
        let res = await fetch(this.baseURL + "/rates", {
            method: "POST",
            headers: {
                "x-api-key": this.apiKey
            },
        });
        this.handleRates(await res.json());
        return this.rates;
    }
    async wallet(wallet) {
        let _wallet;
        if (isWalletById(wallet)) {
            _wallet = wallet;
        }
        else {
            _wallet = {
                walletId: wallet.userId,
                expire: +wallet.expire,
                actuallyExpire: +wallet.actuallyExpire,
                renewal: wallet.renewal,
            };
        }
        let res = await fetch(this.baseURL + "/wallet", {
            method: "POST",
            headers: {
                "x-api-key": this.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(_wallet),
        });
        return await res.text();
    }
    async walletExist(wallet) {
        let res = await fetch(this.baseURL + "/walletExist", {
            method: "POST",
            headers: {
                "x-api-key": this.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(wallet),
        });
        if (res.status == 404)
            return null;
        return await res.json();
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