import * as colors from "colors";

export function success(msg: string) {
    return console.log(colors.green(msg));
}

export function warning(msg: string) {
    return console.log(colors.yellow(msg));
}

export function error(msg: string) {
    return console.log(colors.red(msg));
}

export default {
    success,
    warning,
    error
};
