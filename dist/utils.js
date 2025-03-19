"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInvoiceNotification = isInvoiceNotification;
exports.isTransactionNotification = isTransactionNotification;
function isInvoiceNotification(notification) {
    return notification.type == "invoice";
}
function isTransactionNotification(notification) {
    return notification.type == "transaction";
}
//# sourceMappingURL=utils.js.map