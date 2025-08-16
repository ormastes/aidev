"use strict";
/**
 * Log Capture Module
 * Captures logs from various sources (files, processes, streams)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogCapture = void 0;
const events_1 = require("events");
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
const child_process_1 = require("child_process");
const stream_1 = require("stream");
class LogCapture extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.activeCaptures = new Map();
        this.buffer = [];
        this.maxBufferSize = config.options?.bufferSize || 10000;
        this.isCapturing = false;
    }
    async start() {
        if (this.isCapturing) {
            throw new Error('Capture already in progress');
        }
        this.isCapturing = true;
        for (const source of this.config.sources) {
            await this.startSource(source);
        }
        this.emit('started');
    }
    async stop() {
        if (!this.isCapturing) {
            return;
        }
        this.isCapturing = false;
        for (const [id, capture] of this.activeCaptures) {
            await this.stopCapture(id, capture);
        }
        this.activeCaptures.clear();
        this.emit('stopped');
    }
    async startSource(source) {
        const sourceId = this.generateSourceId(source);
        switch (source.type) {
            case 'file':
                await this.captureFile(sourceId, source.path);
                break;
            case 'process':
                await this.captureProcess(sourceId, source.command, source.args);
                break;
            case 'stream':
                await this.captureStream(sourceId, source.stream);
                break;
            case 'tail':
                await this.captureTail(sourceId, source.path, source.follow);
                break;
            case 'socket':
                await this.captureSocket(sourceId, source.port, source.host);
                break;
        }
    }
    async captureFile(sourceId, path) {
        const stream = fs.createReadStream(path, {
            encoding: this.config.options?.encoding || 'utf8',
        });
        const rl = readline.createInterface({
            input: stream,
            crlfDelay: Infinity,
        });
        rl.on('line', (line) => {
            this.handleLogLine(sourceId, line);
        });
        rl.on('error', (error) => {
            this.emit('error', { source: sourceId, error });
            if (this.config.options?.retryOnError) {
                this.retryCapture(sourceId, () => this.captureFile(sourceId, path));
            }
        });
        this.activeCaptures.set(sourceId, rl);
    }
    async captureProcess(sourceId, command, args) {
        const proc = (0, child_process_1.spawn)(command, args || [], {
            shell: true,
        });
        const handleStream = (stream, type) => {
            const rl = readline.createInterface({
                input: stream,
                crlfDelay: Infinity,
            });
            rl.on('line', (line) => {
                this.handleLogLine(sourceId, line, { stream: type });
            });
        };
        if (proc.stdout)
            handleStream(proc.stdout, 'stdout');
        if (proc.stderr)
            handleStream(proc.stderr, 'stderr');
        proc.on('error', (error) => {
            this.emit('error', { source: sourceId, error });
        });
        proc.on('exit', (code) => {
            this.emit('processExit', { source: sourceId, code });
        });
        this.activeCaptures.set(sourceId, proc);
    }
    async captureStream(sourceId, stream) {
        const rl = readline.createInterface({
            input: stream,
            crlfDelay: Infinity,
        });
        rl.on('line', (line) => {
            this.handleLogLine(sourceId, line);
        });
        rl.on('error', (error) => {
            this.emit('error', { source: sourceId, error });
        });
        this.activeCaptures.set(sourceId, rl);
    }
    async captureTail(sourceId, path, follow = true) {
        const args = ['-n', String(this.config.options?.tailLines || 100)];
        if (follow)
            args.push('-f');
        args.push(path);
        const tail = (0, child_process_1.spawn)('tail', args);
        const rl = readline.createInterface({
            input: tail.stdout,
            crlfDelay: Infinity,
        });
        rl.on('line', (line) => {
            this.handleLogLine(sourceId, line);
        });
        tail.on('error', (error) => {
            this.emit('error', { source: sourceId, error });
        });
        this.activeCaptures.set(sourceId, tail);
    }
    async captureSocket(sourceId, port, host = 'localhost') {
        const net = require('net');
        const server = net.createServer((socket) => {
            const rl = readline.createInterface({
                input: socket,
                crlfDelay: Infinity,
            });
            rl.on('line', (line) => {
                this.handleLogLine(sourceId, line, {
                    remoteAddress: socket.remoteAddress
                });
            });
            socket.on('error', (error) => {
                this.emit('error', { source: sourceId, error });
            });
        });
        server.listen(port, host, () => {
            this.emit('socketListening', { source: sourceId, port, host });
        });
        server.on('error', (error) => {
            this.emit('error', { source: sourceId, error });
        });
        this.activeCaptures.set(sourceId, server);
    }
    handleLogLine(sourceId, line, metadata) {
        if (this.shouldFilter(line)) {
            return;
        }
        const entry = {
            source: sourceId,
            timestamp: new Date(),
            content: line,
            metadata,
        };
        this.buffer.push(entry);
        if (this.buffer.length > this.maxBufferSize) {
            this.buffer.shift();
        }
        this.emit('log', entry);
    }
    shouldFilter(line) {
        if (!this.config.filters || this.config.filters.length === 0) {
            return false;
        }
        return this.config.filters.some(filter => {
            try {
                const regex = new RegExp(filter);
                return !regex.test(line);
            }
            catch {
                return !line.includes(filter);
            }
        });
    }
    async stopCapture(id, capture) {
        if ('close' in capture && typeof capture.close === 'function') {
            capture.close();
        }
        else if ('kill' in capture && typeof capture.kill === 'function') {
            capture.kill();
        }
        else if ('destroy' in capture && typeof capture.destroy === 'function') {
            capture.destroy();
        }
    }
    generateSourceId(source) {
        const timestamp = Date.now();
        switch (source.type) {
            case 'file':
                return `file_${source.path}_${timestamp}`;
            case 'process':
                return `process_${source.command}_${timestamp}`;
            case 'stream':
                return `stream_${timestamp}`;
            case 'tail':
                return `tail_${source.path}_${timestamp}`;
            case 'socket':
                return `socket_${source.port}_${timestamp}`;
            default:
                return `unknown_${timestamp}`;
        }
    }
    async retryCapture(sourceId, captureFunc, retryCount = 0) {
        const maxRetries = this.config.options?.maxRetries || 3;
        const retryDelay = this.config.options?.retryDelay || 1000;
        if (retryCount >= maxRetries) {
            this.emit('maxRetriesReached', { source: sourceId });
            return;
        }
        setTimeout(async () => {
            try {
                await captureFunc();
            }
            catch (error) {
                this.emit('retryError', { source: sourceId, error, retryCount });
                await this.retryCapture(sourceId, captureFunc, retryCount + 1);
            }
        }, retryDelay * Math.pow(2, retryCount));
    }
    getBuffer() {
        return [...this.buffer];
    }
    clearBuffer() {
        this.buffer = [];
    }
    getActiveCaptures() {
        return Array.from(this.activeCaptures.keys());
    }
    isActive() {
        return this.isCapturing;
    }
    createTransformStream() {
        return new stream_1.Transform({
            objectMode: true,
            transform(chunk, encoding, callback) {
                this.push(JSON.stringify(chunk) + '\n');
                callback();
            },
        });
    }
}
exports.LogCapture = LogCapture;
exports.default = LogCapture;
//# sourceMappingURL=index.js.map