import type { Notification, Rates } from "./types";
export interface ChiefPayClientSettings {
    apiKey: string;
    /**
     * url like https://hostname or https://hostname:port
     * @default https://api.chiefpay.org
     */
    baseURL?: string;
}
export interface Events {
    notification: Notification;
    connected: undefined;
    error: any;
    rates: Rates;
}
export interface NotificationACK {
    status: "success" | "error";
}
