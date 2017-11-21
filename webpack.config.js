"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const webpack = require("webpack");
const SimpleProgressWebpackPlugin = require("customized-progress-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
    .BundleAnalyzerPlugin;
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const OptimizeCssAssetsPlugin = require("optimize-css-assets-webpack-plugin");
function default_1(morePlugins, moreRules, root) {
    const getPlugins = function(morePlugins) {
        let plugins = [
            new webpack.HashedModuleIdsPlugin(),
            new SimpleProgressWebpackPlugin(),
            new webpack.DllReferencePlugin({
                context: __dirname,
                manifest: require(path.resolve(root, ".mpk/manifest.json"))
            }),
            new webpack.DefinePlugin({
                "process.env": {
                    NODE_ENV: JSON.stringify("production")
                }
            }),
            new webpack.optimize.UglifyJsPlugin({
                compress: { warnings: false },
                sourceMap: true
            }),
            new ExtractTextPlugin({
                filename: `css/styles.[contenthash:8].css`,
                disable: false,
                allChunks: true
            }),
            new OptimizeCssAssetsPlugin({
                assetNameRegExp: /\.css$/g,
                cssProcessor: require("cssnano"),
                cssProcessorOptions: { discardComments: { removeAll: true } },
                canPrint: true
            })
        ];
        if (!!process.env.ANALYZE_ENV) {
            plugins.push(new BundleAnalyzerPlugin());
        }
        if (morePlugins) {
            plugins = plugins.concat(morePlugins);
        }
        return plugins;
    };
    const getRules = function(moreRules) {
        let rules = [
            {
                test: /\.jsx?$/,
                loader: "babel-loader",
                exclude: /node_modules/
            },
            {
                test: /\.tsx?$/,
                loader: "babel-loader!ts-loader",
                exclude: /node_modules/
            },
            {
                test: /\.json$/,
                loader: "json-loader",
                exclude: /node_modules/
            },
            {
                test: /\.(png|jpg|gif)$/,
                exclude: /node_modules/,
                loader: "url-loader",
                query: {
                    limit: 2000,
                    name: "img/[name].[ext]"
                }
            },
            {
                test: /\.(woff|woff2|eot|ttf|svg)/,
                exclude: /node_modules/,
                loader: "url-loader",
                query: {
                    limit: 10000,
                    name: "fonts/[name].[ext]"
                }
            },
            {
                test: /\.css$/,
                include: [/global/, /node_modules/],
                loader: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: "css-loader?sourceMap!postcss-loader"
                })
            },
            {
                test: /\.css$/,
                exclude: [/global/, /node_modules/],
                loader: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use:
                        "css-loader?modules&sourceMap&importLoaders=1&localIdentName=__[hash:base64:5]!postcss-loader"
                })
            },
            {
                test: /\.less$/,
                include: [/global/, /node_modules/],
                loader: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: "css-loader?sourceMap!postcss-loader!less-loader"
                })
            },
            {
                test: /\.less$/,
                exclude: [/global/, /node_modules/],
                loader: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use:
                        "css-loader?modules&sourceMap&importLoaders=1&localIdentName=__[hash:base64:5]!postcss-loader!less-loader"
                })
            }
        ];
        if (moreRules) {
            rules = rules.concat(moreRules);
        }
        return rules;
    };
    let config = {
        node: {
            __filename: false,
            __dirname: false
        },
        entry: {
            businessA:
                "/Users/ezbuy/Desktop/MyWebpack/tests/proj/src/entries/businessA.ts"
        },
        output: {
            path: path.resolve("/Users/ezbuy/Desktop/MyWebpack", "dist"),
            publicPath: "https://assets.example.com/",
            filename: "js/[name].[chunkhash:8].js",
            chunkFilename: "js/[name].[chunkhash:8].chunk.js"
        },
        resolve: {
            extensions: [
                ".json",
                ".js",
                ".jsx",
                ".ts",
                ".tsx",
                ".css",
                ".less",
                ".scss"
            ]
        },
        target: "web",
        module: {
            rules: getRules(moreRules)
        },
        plugins: getPlugins(morePlugins)
    };
    return config;
}
exports.default = default_1([], [], "/Users/ezbuy/Desktop/MyWebpack");
