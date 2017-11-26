"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const build_1 = require("./build");
const gutil = require("gutil");
const colors = require("colors");
const git_1 = require("../utils/git");
const inquirer = require("inquirer");
const path = require("path");
const path_1 = require("../utils/path");
const vfs = require("vinyl-fs");
const fse = require("fs-extra");
function publish(config) {
    return __awaiter(this, void 0, void 0, function* () {
        const { publishPath, distPath } = config.mpk;
        const currentPath = config.root;
        const distFullPath = path.resolve(currentPath, distPath);
        const currentRepo = new git_1.default(currentPath);
        const currentBranch = yield currentRepo.getCurrentBranch();
        const isProd = currentBranch === "master";
        let publishRepoPath;
        if (isProd) {
            const answers = yield inquirer.prompt([
                {
                    type: "confirm",
                    name: "isProd",
                    default: false,
                    message: "Are you sure to publish changes to production repo?"
                }
            ]);
            if (!answers.isProd) {
                return;
            }
            publishRepoPath = publishPath.prod;
        }
        else {
            publishRepoPath = publishPath.dev;
        }
        publishRepoPath = path.resolve(config.root, publishRepoPath);
        if (!(yield path_1.isDirectory(publishRepoPath))) {
            gutil.log(colors.red(`Failure: ${publishRepoPath} does not exist`));
            return;
        }
        const publishRepo = new git_1.default(publishRepoPath);
        try {
            const stats = yield publishRepo.checkStatus();
            if (stats.files.length > 0) {
                gutil.log(colors.red(`Failure: ${publishRepoPath} is not clean`));
                return;
            }
        }
        catch (e) {
            gutil.log(colors.red(`Failure: ${publishRepoPath} is not a git repository`));
            return;
        }
        try {
            yield publishRepo.pull("master");
        }
        catch (err) {
            gutil.log(colors.red(`Failure: ${err.message || err.toString()}`));
            return;
        }
        yield fse.emptyDir(distFullPath);
        yield build_1.default(config);
        gutil.log("\r\n🎉   " + colors.green(`Build successfully.`));
        vfs.src(path.join(distFullPath, "**/*")).pipe(vfs.dest(publishRepoPath));
        const answers = yield inquirer.prompt([
            {
                type: "confirm",
                name: "isPublish",
                default: false,
                message: "Publish online:"
            }
        ]);
        if (answers.isPublish) {
            try {
                yield publishRepo.add("./*");
                yield publishRepo.commit(`Auto publish ${config.name} on branch ${currentBranch}`);
                yield publishRepo.pull("master", {
                    "--rebase": "true"
                });
                yield publishRepo.push("master");
                gutil.log(colors.green(`\r\n🎉   Publish ${isProd ? "production" : "test"} build successfully`));
            }
            catch (err) {
                gutil.log(colors.red(`\r\n Publish assets failed`));
            }
        }
    });
}
exports.default = publish;
