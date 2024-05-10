"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const aws_sdk_1 = require("aws-sdk");
const lambda = new aws_sdk_1.Lambda({
    apiVersion: '2015-03-31'
});
function getAliasedVersions(functionName) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield lambda
            .listAliases({ FunctionName: functionName })
            .promise();
        let versions = [];
        if (response.Aliases) {
            for (const a of response.Aliases) {
                if (a.FunctionVersion) {
                    versions.push(a.FunctionVersion);
                }
                if (a.RoutingConfig && a.RoutingConfig.AdditionalVersionWeights) {
                    const additionalVersions = Object.keys(a.RoutingConfig.AdditionalVersionWeights);
                    core.debug(additionalVersions.join(','));
                    versions = [...versions, ...additionalVersions];
                }
            }
        }
        return versions;
    });
}
function listVersions(functionName, marker) {
    return __awaiter(this, void 0, void 0, function* () {
        const params = {
            FunctionName: functionName
        };
        if (marker) {
            params.Marker = marker;
        }
        return lambda.listVersionsByFunction(params).promise();
    });
}
function listAllVersions(functionName) {
    return __awaiter(this, void 0, void 0, function* () {
        let hasMoreVersions = true;
        let versions = [];
        let marker;
        while (hasMoreVersions) {
            const result = yield listVersions(functionName, marker);
            if (!result.NextMarker) {
                hasMoreVersions = false;
            }
            else {
                marker = result.NextMarker;
            }
            if (result.Versions) {
                versions = [...versions, ...result.Versions];
            }
        }
        const sorted = versions.sort((a, b) => {
            const aLastModified = a.LastModified ? new Date(a.LastModified) : new Date();
            const bLastModified = b.LastModified ? new Date(b.LastModified) : new Date();
            return aLastModified.getTime() - bLastModified.getTime();
        });
        const sortedVersionNumbers = sorted.map(v => v.Version);
        return sortedVersionNumbers.filter(v => v !== undefined);
    });
}
function deleteVersion(functionName, versionNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        core.info(`Deleting version ${versionNumber} from ${functionName}`);
        return lambda
            .deleteFunction({ FunctionName: functionName, Qualifier: versionNumber })
            .promise();
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const functionName = core.getInput('function_name');
            const numberToKeep = parseInt(core.getInput('number_to_keep'));
            if (isNaN(numberToKeep)) {
                throw new Error('number_to_keep must be a number');
            }
            const aliasedVersions = yield getAliasedVersions(functionName);
            const allVersions = yield listAllVersions(functionName);
            const removableVersions = allVersions.filter(v => {
                return !aliasedVersions.includes(v) && v !== '$LATEST';
            });
            const versionsToRemove = removableVersions.slice(0, removableVersions.length - numberToKeep);
            core.info(`preparing to remove ${versionsToRemove.length} version(s)`);
            const deleteVersions = versionsToRemove.map((v) => __awaiter(this, void 0, void 0, function* () { return deleteVersion(functionName, v); }));
            yield Promise.all(deleteVersions);
        }
        catch (error) {
            const e = error;
            core.setFailed(e.message);
        }
    });
}
run();
