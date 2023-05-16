"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantClient = exports.MerchantError = void 0;
const eventsource_1 = __importDefault(require("eventsource"));
const events_1 = require("events");
const MIN_RATE_UPDATE_INTERVAL = 10000;
class MerchantError extends Error {
    constructor(err) {
        super("");
    }
}
exports.MerchantError = MerchantError;
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
        this.baseURL = baseURL;
        this.es = new eventsource_1.default(this.baseURL + "/api/sse", {
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
    /**
     * Закрывает соединение с SSE
     */
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
     * Выдает классический кошелек без аренды
     */
    async getWallet(wallet) {
        const url = new URL("/api/wallet/unique", this.baseURL);
        url.searchParams.set("walletId", wallet.walletId);
        if (typeof wallet.walletSubId === 'number')
            url.searchParams.set("walletSubId", wallet.walletSubId.toString());
        let res = await fetch(url, {
            method: "GET",
            headers: {
                "x-api-key": this.apiKey,
                'Content-Type': 'application/json'
            },
        });
        if (res.status != 200)
            throw new Error(await res.text());
        const body = await res.json();
        return body;
    }
    /**
     * Арендует кошелек для пользователя
     */
    async rentWallet(wallet) {
        let res = await fetch(this.baseURL + "/api/wallet/rent", {
            method: "POST",
            headers: {
                "x-api-key": this.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: wallet.userId,
                expire: wallet.expire.getTime(),
                actuallyExpire: wallet.actuallyExpire?.getTime(),
                renewal: wallet.renewal
            }),
        });
        if (res.status != 200)
            throw new Error(await res.text());
        const body = await res.json();
        return {
            ...body,
            expire: new Date(body.expire),
            actuallyExpire: new Date(body.actuallyExpire),
        };
    }
    /**
     * Ищет уже арендованный кошелек у пользователя
     */
    async searchWallet(wallet) {
        const url = new URL("/api/wallet/search", this.baseURL);
        url.searchParams.set("userId", wallet.userId);
        let res = await fetch(url, {
            method: "GET",
            headers: {
                "x-api-key": this.apiKey,
                'Content-Type': 'application/json'
            },
        });
        if (res.status == 404)
            return null;
        else if (res.status != 200)
            throw new Error(await res.text());
        const body = await res.json();
        return {
            ...body,
            expire: new Date(body.expire),
            actuallyExpire: new Date(body.actuallyExpire),
        };
    }
    /**
     * Выдает транзакции по id
     */
    async transactions(ids) {
        let result = [];
        while (ids.length > 0) {
            let res = await fetch(this.baseURL + "/api/transactions", {
                method: "POST",
                headers: {
                    "x-api-key": this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids: ids.splice(0, 100) })
            });
            if (res.status != 200)
                throw new Error(await res.text());
            result.push(...await res.json());
        }
        return result;
    }
}
exports.MerchantClient = MerchantClient;
//# sourceMappingURL=index.js.map