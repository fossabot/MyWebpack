import build from "./build";
// import * as WebpackDevServer from "webpack-dev-server";
import * as gutil from "gutil";
import * as express from "express";
import * as webpackDevMiddleware from "webpack-dev-middleware";
import * as webpackHotMiddleware from "webpack-hot-middleware";
import { IEntry, addWebpackEntry } from "../utils/entry";
import * as url from "url";
import { getHtmlWebpackPluginInstance } from "../webpack/base";
import log from "../utils/log";
import { EventEmitter } from "events";
import { Compiler } from "webpack";

enum EntryTaskStatus {
    BUILT,
    BUILDING,
    UNBUILD
}

class EntryTaskManager {
    private mpkConfig;
    private compiler: Compiler;
    private devMiddleware;
    private allEntries: IEntry[] = [];
    private allEntryNames: string[] = [];
    private prebuildEntryNames: string[] = [];
    private builtEntryNames: string[] = [];
    private entryTaskQueue: string[] = [];
    private emitter: EventEmitter = new EventEmitter();
    private entryStatus: { [entryName: string]: EntryTaskStatus } = {};

    public constructor(
        mpkConfig,
        compiler: Compiler,
        devMiddleware,
        allEntries: IEntry[],
        prebuildEntryNames: string[]
    ) {
        this.mpkConfig = mpkConfig;
        this.compiler = compiler;
        this.devMiddleware = devMiddleware;
        this.allEntries = allEntries;
        this.allEntryNames = allEntries.map(e => e.name);
        this.prebuildEntryNames = prebuildEntryNames;
        this.builtEntryNames = [];

        this.hookupCompiler();
    }

    public execEntryTask(entryName: string): Promise<void> {
        if (
            !this.allEntryNames.includes(entryName) ||
            this.entryStatus[entryName] === EntryTaskStatus.BUILDING ||
            this.entryStatus[entryName] === EntryTaskStatus.BUILT
        ) {
            return Promise.resolve();
        }

        this.entryStatus[entryName] = EntryTaskStatus.BUILDING;
        gutil.log(`🛠️ Building new entry: ${entryName}`);
        this.addEntryTask(entryName);

        this.devMiddleware.invalidate();

        return new Promise((resolve, reject) => {
            this.emitter.once("done", () => {
                this.builtEntryNames.push(entryName);
                resolve();
            });
            this.emitter.once("error", err => {
                reject(err);
            });
        });
    }

    private addEntryTask(entryName) {
        const { entryTaskQueue } = this;
        entryTaskQueue.push(entryName);
        this.entryTaskQueue = Array.from(new Set(entryTaskQueue));
        this.addHtmlPage(entryName);
    }

    private addHtmlPage(entryName) {
        if (this.builtEntryNames.includes(entryName)) {
            return;
        }
        this.compiler.apply(
            getHtmlWebpackPluginInstance(
                this.mpkConfig,
                "index.html",
                entryName + ".html"
            )
        );
    }

    private hookupCompiler() {
        const { compiler, emitter, allEntries, builtEntryNames } = this;

        compiler.plugin("make", (compilation, done) => {
            let promise: Promise<any>;
            const newEntryNames = this.entryTaskQueue.filter(
                n => !builtEntryNames.includes(n)
            );

            if (newEntryNames.length > 0) {
                promise = Promise.all(
                    newEntryNames.map(n => {
                        const e = allEntries.find(item => item.name === n);
                        return addWebpackEntry(
                            compilation,
                            this["context"],
                            e.name,
                            e.path
                        );
                    })
                ).then(() => {});
            } else {
                promise = Promise.resolve();
            }
            promise.then(done).catch(err => {
                emitter.emit("error", err);
            });
        });

        compiler.plugin("done", stats => {
            this.entryTaskQueue = [];
            emitter.emit("done");
        });
    }

    public checkPrebuildEntries() {
        const { prebuildEntryNames, builtEntryNames } = this;
        const entries = prebuildEntryNames.filter(
            e => !builtEntryNames.includes(e)
        );
        if (entries.length > 0) {
            gutil.log(`🛠️ Pre-Building entries: ${entries.join(" ")}`);
            entries.forEach(e => {
                this.entryStatus[e] = EntryTaskStatus.BUILDING;
                this.addEntryTask(e);
            });

            this.devMiddleware.invalidate();

            return new Promise((resolve, reject) => {
                this.emitter.once("done", () => {
                    this.builtEntryNames = []
                        .concat(this.builtEntryNames)
                        .concat(entries);
                    resolve();
                });
                this.emitter.once("error", err => {
                    reject(err);
                });
            });
        } else {
            return Promise.resolve({});
        }
    }
}

export default function start(config) {
    const entryStatus: { [entryName: string]: EntryTaskStatus } = {};

    build(config, function(
        compiler,
        webpackConfig,
        allEntries: IEntry[],
        prebuildEntries: IEntry[]
    ) {
        allEntries.forEach(e => {
            entryStatus[e.name] = EntryTaskStatus.UNBUILD;
        });

        prebuildEntries.forEach(e => {
            entryStatus[e.name] = EntryTaskStatus.BUILT;
        });

        const devServerOptions = webpackConfig.devServer;

        const server = express();
        const devMiddleware = webpackDevMiddleware(compiler, {
            publicPath: webpackConfig.output.publicPath,
            noInfo: true,
            quiet: true,
            headers: Object.assign({}, devServerOptions.headers || {}, {
                "Access-Control-Allow-Origin": "*"
            })
        });
        const hotMiddleware = webpackHotMiddleware(compiler);

        const taskManager = new EntryTaskManager(
            config,
            compiler,
            devMiddleware,
            allEntries,
            prebuildEntries.map(e => e.name)
        );

        server.use((req, res, next) => {
            const urlObj: url.URL = req._parsedUrl;
            if (urlObj.pathname.endsWith(".html")) {
                const entryName = urlObj.pathname.substring(
                    1,
                    urlObj.pathname.length - 5
                );

                taskManager
                    .execEntryTask(entryName)
                    .then(next)
                    .catch(err => log(err.toString()));
            } else {
                next();
            }
        });

        server.use(devMiddleware);

        server.use(hotMiddleware);

        // server.use("/", express.static(config.mpk.distPath));

        server.locals.env = process.env.NODE_ENV;
        devMiddleware.waitUntilValid(() => {
            taskManager
                .checkPrebuildEntries()
                .then(() => {
                    gutil.log(
                        `Starting dev server on ${devServerOptions.host}:${
                            devServerOptions.port
                        }\r\n`
                    );
                })
                .catch(e => {
                    throw e;
                });
        });

        server.listen(devServerOptions.port, "0.0.0.0");
    });
}
