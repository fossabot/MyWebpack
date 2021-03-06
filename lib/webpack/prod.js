"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const base_1 = require("./base");
const htmlAssetsWebpackPlugin_1 = require("../utils/htmlAssetsWebpackPlugin");
function getProdConfig(mpkConfig) {
    let prodConfig = base_1.default(mpkConfig);
    const { prePackages } = mpkConfig.mpk;
    const { entry } = mpkConfig.webpack;
    if (Array.isArray(entry)) {
        prodConfig.entry = Array.from(new Set(prePackages.concat(entry)));
    }
    else {
        prodConfig.entry = {};
        Object.keys(entry).forEach(key => {
            const chunkEntry = entry[key];
            if (Array.isArray(chunkEntry)) {
                prodConfig.entry[key] = Array.from(new Set(prePackages.concat(chunkEntry)));
            }
            else {
                prodConfig.entry[key] = Array.from(new Set(prePackages.concat(chunkEntry)));
            }
        });
    }
    prodConfig.entry = mpkConfig.webpack.entry;
    prodConfig.output = {
        path: path.resolve(mpkConfig.root, mpkConfig.mpk.distPath),
        publicPath: mpkConfig.mpk.publicPath.prod,
        filename: "js/[name].[chunkhash:8].js",
        chunkFilename: "js/[name].[chunkhash:8].chunk.js"
    };
    prodConfig.plugins.push(new htmlAssetsWebpackPlugin_1.default());
    Object.keys(mpkConfig.webpack).forEach(key => {
        if (![
            "entry",
            "output",
            "module",
            "plugins",
            "node",
            "resolve"
        ].includes(key)) {
            prodConfig[key] = mpkConfig.webpack[key];
        }
    });
    return prodConfig;
}
exports.default = getProdConfig;
