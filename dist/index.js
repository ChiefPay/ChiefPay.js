"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantClient = void 0;
const eventsource_1 = __importDefault(require("eventsource"));
const events_1 = require("events");
class MerchantClient extends events_1.EventEmitter {
    apiKey;
    _ts = "0";
    es;
    lastPing = new Date();
    get ts() {
        return this._ts;
    }
    set ts(value) {
        this._ts = value.toString();
    }
    constructor({ apiKey, merchantAddress, ts }) {
        super();
        this.apiKey = apiKey;
        this.ts = ts;
        this.es = new eventsource_1.default(merchantAddress, {
            headers: {
                "x-api-key": this.apiKey,
                "ts": this.ts
            }
        });
        this.es.onopen = () => this.emit("connected");
        this.es.onmessage = this.onMessage.bind(this);
        this.es.onerror = err => this.emit("error", err);
        this.es.addEventListener("ping", event => this.lastPing = new Date());
    }
    onMessage(event) {
        var data = JSON.parse(event.data);
        this.ts = +event.lastEventId;
        this.emit("transaction", data);
    }
}
exports.MerchantClient = MerchantClient;
//# sourceMappingURL=index.js.map