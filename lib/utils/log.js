"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const colors = require("colors");
function success(msg) {
    return console.log(colors.green(msg));
}
exports.success = success;
function warning(msg) {
    return console.log(colors.yellow(msg));
}
exports.warning = warning;
function error(msg) {
    return console.log(colors.red(msg));
}
exports.error = error;
exports.default = {
    success,
    warning,
    error
};
