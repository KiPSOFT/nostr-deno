// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

class EventEmitter {
    events = new Map();
    maxListeners;
    #defaultMaxListeners = 10;
    get defaultMaxListeners() {
        return this.#defaultMaxListeners;
    }
    set defaultMaxListeners(n) {
        if (Number.isInteger(n) || n < 0) {
            const error = new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative integer. Received ' + n + '.');
            throw error;
        }
        this.#defaultMaxListeners = n;
    }
    addListener(eventName, listener) {
        return this.on(eventName, listener);
    }
    emit(eventName, ...args) {
        const listeners = this.events.get(eventName);
        if (listeners === undefined) {
            if (eventName === 'error') {
                const error = args[0];
                if (error instanceof Error) throw error;
                throw new Error('Unhandled error.');
            }
            return false;
        }
        const copyListeners = [
            ...listeners
        ];
        for (const listener of copyListeners){
            listener.apply(this, args);
        }
        return true;
    }
    setMaxListeners(n) {
        if (!Number.isInteger(n) || n < 0) {
            throw new RangeError('The value of "n" is out of range. It must be a non-negative integer. Received ' + n + '.');
        }
        this.maxListeners = n;
        return this;
    }
    getMaxListeners() {
        if (this.maxListeners === undefined) {
            return this.defaultMaxListeners;
        }
        return this.maxListeners;
    }
    listenerCount(eventName) {
        const events = this.events.get(eventName);
        return events === undefined ? 0 : events.length;
    }
    eventNames() {
        return Reflect.ownKeys(this.events);
    }
    listeners(eventName) {
        const listeners = this.events.get(eventName);
        return listeners === undefined ? [] : listeners;
    }
    off(eventName, listener) {
        return this.removeListener(eventName, listener);
    }
    on(eventName, listener, prepend) {
        if (this.events.has(eventName) === false) {
            this.events.set(eventName, []);
        }
        const events = this.events.get(eventName);
        if (prepend) {
            events.unshift(listener);
        } else {
            events.push(listener);
        }
        if (eventName !== "newListener" && this.events.has("newListener")) {
            this.emit('newListener', eventName, listener);
        }
        const maxListener = this.getMaxListeners();
        const eventLength = events.length;
        if (maxListener > 0 && eventLength > maxListener && !events.warned) {
            events.warned = true;
            const warning = new Error(`Possible EventEmitter memory leak detected.
         ${this.listenerCount(eventName)} ${eventName.toString()} listeners.
         Use emitter.setMaxListeners() to increase limit`);
            warning.name = "MaxListenersExceededWarning";
            console.warn(warning);
        }
        return this;
    }
    removeAllListeners(eventName) {
        const events = this.events;
        if (!events.has('removeListener')) {
            if (arguments.length === 0) {
                this.events = new Map();
            } else if (events.has(eventName)) {
                events.delete(eventName);
            }
            return this;
        }
        if (arguments.length === 0) {
            for (const key of events.keys()){
                if (key === 'removeListener') continue;
                this.removeAllListeners(key);
            }
            this.removeAllListeners('removeListener');
            this.events = new Map();
            return this;
        }
        const listeners = events.get(eventName);
        if (listeners !== undefined) {
            listeners.map((listener)=>{
                this.removeListener(eventName, listener);
            });
        }
        return this;
    }
    removeListener(eventName, listener) {
        const events = this.events;
        if (events.size === 0) return this;
        const list = events.get(eventName);
        if (list === undefined) return this;
        const index = list.findIndex((item)=>item === listener || item.listener === listener);
        if (index === -1) return this;
        list.splice(index, 1);
        if (list.length === 0) this.events.delete(eventName);
        if (events.has('removeListener')) {
            this.emit('removeListener', eventName, listener);
        }
        return this;
    }
    once(eventName, listener) {
        this.on(eventName, this.onceWrap(eventName, listener));
        return this;
    }
    onceWrap(eventName, listener) {
        const wrapper = function(...args) {
            this.context.removeListener(this.eventName, this.wrapedListener);
            this.listener.apply(this.context, args);
        };
        const wrapperContext = {
            eventName: eventName,
            listener: listener,
            wrapedListener: wrapper,
            context: this
        };
        const wrapped = wrapper.bind(wrapperContext);
        wrapperContext.wrapedListener = wrapped;
        wrapped.listener = listener;
        return wrapped;
    }
    prependListener(eventName, listener) {
        return this.on(eventName, listener, true);
    }
    prependOnceListener(eventName, listener) {
        this.prependListener(eventName, this.onceWrap(eventName, listener));
        return this;
    }
    rawListeners(eventName) {
        const events = this.events;
        if (events === undefined) return [];
        const listeners = events.get(eventName);
        if (listeners === undefined) return [];
        return [
            ...listeners
        ];
    }
}
function deferred() {
    let methods;
    const promise = new Promise((resolve, reject)=>{
        methods = {
            resolve,
            reject
        };
    });
    return Object.assign(promise, methods);
}
class MuxAsyncIterator {
    iteratorCount = 0;
    yields = [];
    throws = [];
    signal = deferred();
    add(iterator) {
        ++this.iteratorCount;
        this.callIteratorNext(iterator);
    }
    async callIteratorNext(iterator) {
        try {
            const { value , done  } = await iterator.next();
            if (done) {
                --this.iteratorCount;
            } else {
                this.yields.push({
                    iterator,
                    value
                });
            }
        } catch (e) {
            this.throws.push(e);
        }
        this.signal.resolve();
    }
    async *iterate() {
        while(this.iteratorCount > 0){
            await this.signal;
            for(let i = 0; i < this.yields.length; i++){
                const { iterator , value  } = this.yields[i];
                yield value;
                this.callIteratorNext(iterator);
            }
            if (this.throws.length) {
                for (const e of this.throws){
                    throw e;
                }
                this.throws.length = 0;
            }
            this.yields.length = 0;
            this.signal = deferred();
        }
    }
    [Symbol.asyncIterator]() {
        return this.iterate();
    }
}
globalThis.Deno?.noColor ?? true;
new RegExp([
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"
].join("|"), "g");
var DiffType;
(function(DiffType) {
    DiffType["removed"] = "removed";
    DiffType["common"] = "common";
    DiffType["added"] = "added";
})(DiffType || (DiffType = {}));
class DenoStdInternalError extends Error {
    constructor(message){
        super(message);
        this.name = "DenoStdInternalError";
    }
}
function assert(expr, msg = "") {
    if (!expr) {
        throw new DenoStdInternalError(msg);
    }
}
async function writeAll(w, arr) {
    let nwritten = 0;
    while(nwritten < arr.length){
        nwritten += await w.write(arr.subarray(nwritten));
    }
}
TextDecoder;
TextEncoder;
function validateIntegerRange(value, name, min = -2147483648, max = 2147483647) {
    if (!Number.isInteger(value)) {
        throw new Error(`${name} must be 'an integer' but was ${value}`);
    }
    if (value < min || value > max) {
        throw new Error(`${name} must be >= ${min} && <= ${max}. Value was ${value}`);
    }
}
function createIterResult(value, done) {
    return {
        value,
        done
    };
}
let defaultMaxListeners = 10;
class EventEmitter1 {
    static captureRejectionSymbol = Symbol.for("nodejs.rejection");
    static errorMonitor = Symbol("events.errorMonitor");
    static get defaultMaxListeners() {
        return defaultMaxListeners;
    }
    static set defaultMaxListeners(value) {
        defaultMaxListeners = value;
    }
    maxListeners;
    _events;
    constructor(){
        this._events = new Map();
    }
    _addListener(eventName, listener, prepend) {
        this.emit("newListener", eventName, listener);
        if (this._events.has(eventName)) {
            const listeners = this._events.get(eventName);
            if (prepend) {
                listeners.unshift(listener);
            } else {
                listeners.push(listener);
            }
        } else {
            this._events.set(eventName, [
                listener
            ]);
        }
        const max = this.getMaxListeners();
        if (max > 0 && this.listenerCount(eventName) > max) {
            const warning = new Error(`Possible EventEmitter memory leak detected.
         ${this.listenerCount(eventName)} ${eventName.toString()} listeners.
         Use emitter.setMaxListeners() to increase limit`);
            warning.name = "MaxListenersExceededWarning";
            console.warn(warning);
        }
        return this;
    }
    addListener(eventName, listener) {
        return this._addListener(eventName, listener, false);
    }
    emit(eventName, ...args) {
        if (this._events.has(eventName)) {
            if (eventName === "error" && this._events.get(EventEmitter1.errorMonitor)) {
                this.emit(EventEmitter1.errorMonitor, ...args);
            }
            const listeners = this._events.get(eventName).slice();
            for (const listener of listeners){
                try {
                    listener.apply(this, args);
                } catch (err) {
                    this.emit("error", err);
                }
            }
            return true;
        } else if (eventName === "error") {
            if (this._events.get(EventEmitter1.errorMonitor)) {
                this.emit(EventEmitter1.errorMonitor, ...args);
            }
            const errMsg = args.length > 0 ? args[0] : Error("Unhandled error.");
            throw errMsg;
        }
        return false;
    }
    eventNames() {
        return Array.from(this._events.keys());
    }
    getMaxListeners() {
        return this.maxListeners || EventEmitter1.defaultMaxListeners;
    }
    listenerCount(eventName) {
        if (this._events.has(eventName)) {
            return this._events.get(eventName).length;
        } else {
            return 0;
        }
    }
    static listenerCount(emitter, eventName) {
        return emitter.listenerCount(eventName);
    }
    _listeners(target, eventName, unwrap) {
        if (!target._events.has(eventName)) {
            return [];
        }
        const eventListeners = target._events.get(eventName);
        return unwrap ? this.unwrapListeners(eventListeners) : eventListeners.slice(0);
    }
    unwrapListeners(arr) {
        const unwrappedListeners = new Array(arr.length);
        for(let i = 0; i < arr.length; i++){
            unwrappedListeners[i] = arr[i]["listener"] || arr[i];
        }
        return unwrappedListeners;
    }
    listeners(eventName) {
        return this._listeners(this, eventName, true);
    }
    rawListeners(eventName) {
        return this._listeners(this, eventName, false);
    }
    off(eventName, listener) {
        return this.removeListener(eventName, listener);
    }
    on(eventName, listener) {
        return this._addListener(eventName, listener, false);
    }
    once(eventName, listener) {
        const wrapped = this.onceWrap(eventName, listener);
        this.on(eventName, wrapped);
        return this;
    }
    onceWrap(eventName, listener) {
        const wrapper = function(...args) {
            this.context.removeListener(this.eventName, this.rawListener);
            this.listener.apply(this.context, args);
        };
        const wrapperContext = {
            eventName: eventName,
            listener: listener,
            rawListener: wrapper,
            context: this
        };
        const wrapped = wrapper.bind(wrapperContext);
        wrapperContext.rawListener = wrapped;
        wrapped.listener = listener;
        return wrapped;
    }
    prependListener(eventName, listener) {
        return this._addListener(eventName, listener, true);
    }
    prependOnceListener(eventName, listener) {
        const wrapped = this.onceWrap(eventName, listener);
        this.prependListener(eventName, wrapped);
        return this;
    }
    removeAllListeners(eventName) {
        if (this._events === undefined) {
            return this;
        }
        if (eventName) {
            if (this._events.has(eventName)) {
                const listeners = this._events.get(eventName).slice();
                this._events.delete(eventName);
                for (const listener of listeners){
                    this.emit("removeListener", eventName, listener);
                }
            }
        } else {
            const eventList = this.eventNames();
            eventList.map((value)=>{
                this.removeAllListeners(value);
            });
        }
        return this;
    }
    removeListener(eventName, listener) {
        if (this._events.has(eventName)) {
            const arr = this._events.get(eventName);
            assert(arr);
            let listenerIndex = -1;
            for(let i = arr.length - 1; i >= 0; i--){
                if (arr[i] == listener || arr[i] && arr[i]["listener"] == listener) {
                    listenerIndex = i;
                    break;
                }
            }
            if (listenerIndex >= 0) {
                arr.splice(listenerIndex, 1);
                this.emit("removeListener", eventName, listener);
                if (arr.length === 0) {
                    this._events.delete(eventName);
                }
            }
        }
        return this;
    }
    setMaxListeners(n) {
        if (n !== Infinity) {
            if (n === 0) {
                n = Infinity;
            } else {
                validateIntegerRange(n, "maxListeners", 0);
            }
        }
        this.maxListeners = n;
        return this;
    }
    static once(emitter, name) {
        return new Promise((resolve, reject)=>{
            if (emitter instanceof EventTarget) {
                emitter.addEventListener(name, (...args)=>{
                    resolve(args);
                }, {
                    once: true,
                    passive: false,
                    capture: false
                });
                return;
            } else if (emitter instanceof EventEmitter1) {
                const eventListener = (...args)=>{
                    if (errorListener !== undefined) {
                        emitter.removeListener("error", errorListener);
                    }
                    resolve(args);
                };
                let errorListener;
                if (name !== "error") {
                    errorListener = (err)=>{
                        emitter.removeListener(name, eventListener);
                        reject(err);
                    };
                    emitter.once("error", errorListener);
                }
                emitter.once(name, eventListener);
                return;
            }
        });
    }
    static on(emitter, event) {
        const unconsumedEventValues = [];
        const unconsumedPromises = [];
        let error = null;
        let finished = false;
        const iterator = {
            next () {
                const value = unconsumedEventValues.shift();
                if (value) {
                    return Promise.resolve(createIterResult(value, false));
                }
                if (error) {
                    const p = Promise.reject(error);
                    error = null;
                    return p;
                }
                if (finished) {
                    return Promise.resolve(createIterResult(undefined, true));
                }
                return new Promise(function(resolve, reject) {
                    unconsumedPromises.push({
                        resolve,
                        reject
                    });
                });
            },
            return () {
                emitter.removeListener(event, eventHandler);
                emitter.removeListener("error", errorHandler);
                finished = true;
                for (const promise of unconsumedPromises){
                    promise.resolve(createIterResult(undefined, true));
                }
                return Promise.resolve(createIterResult(undefined, true));
            },
            throw (err) {
                error = err;
                emitter.removeListener(event, eventHandler);
                emitter.removeListener("error", errorHandler);
            },
            [Symbol.asyncIterator] () {
                return this;
            }
        };
        emitter.on(event, eventHandler);
        emitter.on("error", errorHandler);
        return iterator;
        function eventHandler(...args) {
            const promise = unconsumedPromises.shift();
            if (promise) {
                promise.resolve(createIterResult(args, false));
            } else {
                unconsumedEventValues.push(args);
            }
        }
        function errorHandler(err) {
            finished = true;
            const toError = unconsumedPromises.shift();
            if (toError) {
                toError.reject(err);
            } else {
                error = err;
            }
            iterator.return();
        }
    }
}
EventEmitter1.captureRejectionSymbol;
EventEmitter1.errorMonitor;
EventEmitter1.listenerCount;
EventEmitter1.on;
EventEmitter1.once;
Object.assign(EventEmitter1, {
    EventEmitter: EventEmitter1
});
function concat(...buf) {
    let length = 0;
    for (const b of buf){
        length += b.length;
    }
    const output = new Uint8Array(length);
    let index = 0;
    for (const b1 of buf){
        output.set(b1, index);
        index += b1.length;
    }
    return output;
}
function copy(src, dst, off = 0) {
    off = Math.max(0, Math.min(off, dst.byteLength));
    const dstBytesAvailable = dst.byteLength - off;
    if (src.byteLength > dstBytesAvailable) {
        src = src.subarray(0, dstBytesAvailable);
    }
    dst.set(src, off);
    return src.byteLength;
}
const DEFAULT_BUF_SIZE = 4096;
const MIN_BUF_SIZE = 16;
const CR = "\r".charCodeAt(0);
const LF = "\n".charCodeAt(0);
class BufferFullError extends Error {
    name;
    constructor(partial){
        super("Buffer full");
        this.partial = partial;
        this.name = "BufferFullError";
    }
    partial;
}
class PartialReadError extends Error {
    name = "PartialReadError";
    partial;
    constructor(){
        super("Encountered UnexpectedEof, data only partially read");
    }
}
class BufReader {
    buf;
    rd;
    r = 0;
    w = 0;
    eof = false;
    static create(r, size = 4096) {
        return r instanceof BufReader ? r : new BufReader(r, size);
    }
    constructor(rd, size = 4096){
        if (size < 16) {
            size = MIN_BUF_SIZE;
        }
        this._reset(new Uint8Array(size), rd);
    }
    size() {
        return this.buf.byteLength;
    }
    buffered() {
        return this.w - this.r;
    }
    async _fill() {
        if (this.r > 0) {
            this.buf.copyWithin(0, this.r, this.w);
            this.w -= this.r;
            this.r = 0;
        }
        if (this.w >= this.buf.byteLength) {
            throw Error("bufio: tried to fill full buffer");
        }
        for(let i = 100; i > 0; i--){
            const rr = await this.rd.read(this.buf.subarray(this.w));
            if (rr === null) {
                this.eof = true;
                return;
            }
            assert(rr >= 0, "negative read");
            this.w += rr;
            if (rr > 0) {
                return;
            }
        }
        throw new Error(`No progress after ${100} read() calls`);
    }
    reset(r) {
        this._reset(this.buf, r);
    }
    _reset(buf, rd) {
        this.buf = buf;
        this.rd = rd;
        this.eof = false;
    }
    async read(p) {
        let rr = p.byteLength;
        if (p.byteLength === 0) return rr;
        if (this.r === this.w) {
            if (p.byteLength >= this.buf.byteLength) {
                const rr1 = await this.rd.read(p);
                const nread = rr1 ?? 0;
                assert(nread >= 0, "negative read");
                return rr1;
            }
            this.r = 0;
            this.w = 0;
            rr = await this.rd.read(this.buf);
            if (rr === 0 || rr === null) return rr;
            assert(rr >= 0, "negative read");
            this.w += rr;
        }
        const copied = copy(this.buf.subarray(this.r, this.w), p, 0);
        this.r += copied;
        return copied;
    }
    async readFull(p) {
        let bytesRead = 0;
        while(bytesRead < p.length){
            try {
                const rr = await this.read(p.subarray(bytesRead));
                if (rr === null) {
                    if (bytesRead === 0) {
                        return null;
                    } else {
                        throw new PartialReadError();
                    }
                }
                bytesRead += rr;
            } catch (err) {
                err.partial = p.subarray(0, bytesRead);
                throw err;
            }
        }
        return p;
    }
    async readByte() {
        while(this.r === this.w){
            if (this.eof) return null;
            await this._fill();
        }
        const c = this.buf[this.r];
        this.r++;
        return c;
    }
    async readString(delim) {
        if (delim.length !== 1) {
            throw new Error("Delimiter should be a single character");
        }
        const buffer = await this.readSlice(delim.charCodeAt(0));
        if (buffer === null) return null;
        return new TextDecoder().decode(buffer);
    }
    async readLine() {
        let line;
        try {
            line = await this.readSlice(LF);
        } catch (err) {
            let { partial  } = err;
            assert(partial instanceof Uint8Array, "bufio: caught error from `readSlice()` without `partial` property");
            if (!(err instanceof BufferFullError)) {
                throw err;
            }
            if (!this.eof && partial.byteLength > 0 && partial[partial.byteLength - 1] === CR) {
                assert(this.r > 0, "bufio: tried to rewind past start of buffer");
                this.r--;
                partial = partial.subarray(0, partial.byteLength - 1);
            }
            return {
                line: partial,
                more: !this.eof
            };
        }
        if (line === null) {
            return null;
        }
        if (line.byteLength === 0) {
            return {
                line,
                more: false
            };
        }
        if (line[line.byteLength - 1] == LF) {
            let drop = 1;
            if (line.byteLength > 1 && line[line.byteLength - 2] === CR) {
                drop = 2;
            }
            line = line.subarray(0, line.byteLength - drop);
        }
        return {
            line,
            more: false
        };
    }
    async readSlice(delim) {
        let s = 0;
        let slice;
        while(true){
            let i = this.buf.subarray(this.r + s, this.w).indexOf(delim);
            if (i >= 0) {
                i += s;
                slice = this.buf.subarray(this.r, this.r + i + 1);
                this.r += i + 1;
                break;
            }
            if (this.eof) {
                if (this.r === this.w) {
                    return null;
                }
                slice = this.buf.subarray(this.r, this.w);
                this.r = this.w;
                break;
            }
            if (this.buffered() >= this.buf.byteLength) {
                this.r = this.w;
                const oldbuf = this.buf;
                const newbuf = this.buf.slice(0);
                this.buf = newbuf;
                throw new BufferFullError(oldbuf);
            }
            s = this.w - this.r;
            try {
                await this._fill();
            } catch (err) {
                err.partial = slice;
                throw err;
            }
        }
        return slice;
    }
    async peek(n) {
        if (n < 0) {
            throw Error("negative count");
        }
        let avail = this.w - this.r;
        while(avail < n && avail < this.buf.byteLength && !this.eof){
            try {
                await this._fill();
            } catch (err) {
                err.partial = this.buf.subarray(this.r, this.w);
                throw err;
            }
            avail = this.w - this.r;
        }
        if (avail === 0 && this.eof) {
            return null;
        } else if (avail < n && this.eof) {
            return this.buf.subarray(this.r, this.r + avail);
        } else if (avail < n) {
            throw new BufferFullError(this.buf.subarray(this.r, this.w));
        }
        return this.buf.subarray(this.r, this.r + n);
    }
}
class AbstractBufBase {
    buf;
    usedBufferBytes = 0;
    err = null;
    size() {
        return this.buf.byteLength;
    }
    available() {
        return this.buf.byteLength - this.usedBufferBytes;
    }
    buffered() {
        return this.usedBufferBytes;
    }
}
class BufWriter extends AbstractBufBase {
    static create(writer, size = 4096) {
        return writer instanceof BufWriter ? writer : new BufWriter(writer, size);
    }
    constructor(writer, size = 4096){
        super();
        this.writer = writer;
        if (size <= 0) {
            size = DEFAULT_BUF_SIZE;
        }
        this.buf = new Uint8Array(size);
    }
    reset(w) {
        this.err = null;
        this.usedBufferBytes = 0;
        this.writer = w;
    }
    async flush() {
        if (this.err !== null) throw this.err;
        if (this.usedBufferBytes === 0) return;
        try {
            await writeAll(this.writer, this.buf.subarray(0, this.usedBufferBytes));
        } catch (e) {
            this.err = e;
            throw e;
        }
        this.buf = new Uint8Array(this.buf.length);
        this.usedBufferBytes = 0;
    }
    async write(data) {
        if (this.err !== null) throw this.err;
        if (data.length === 0) return 0;
        let totalBytesWritten = 0;
        let numBytesWritten = 0;
        while(data.byteLength > this.available()){
            if (this.buffered() === 0) {
                try {
                    numBytesWritten = await this.writer.write(data);
                } catch (e) {
                    this.err = e;
                    throw e;
                }
            } else {
                numBytesWritten = copy(data, this.buf, this.usedBufferBytes);
                this.usedBufferBytes += numBytesWritten;
                await this.flush();
            }
            totalBytesWritten += numBytesWritten;
            data = data.subarray(numBytesWritten);
        }
        numBytesWritten = copy(data, this.buf, this.usedBufferBytes);
        this.usedBufferBytes += numBytesWritten;
        totalBytesWritten += numBytesWritten;
        return totalBytesWritten;
    }
    writer;
}
const decoder = new TextDecoder();
const invalidHeaderCharRegex = /[^\t\x20-\x7e\x80-\xff]/g;
function str(buf) {
    if (buf == null) {
        return "";
    } else {
        return decoder.decode(buf);
    }
}
function charCode(s) {
    return s.charCodeAt(0);
}
class TextProtoReader {
    constructor(r){
        this.r = r;
    }
    async readLine() {
        const s = await this.readLineSlice();
        if (s === null) return null;
        return str(s);
    }
    async readMIMEHeader() {
        const m = new Headers();
        let line;
        let buf = await this.r.peek(1);
        if (buf === null) {
            return null;
        } else if (buf[0] == charCode(" ") || buf[0] == charCode("\t")) {
            line = await this.readLineSlice();
        }
        buf = await this.r.peek(1);
        if (buf === null) {
            throw new Deno.errors.UnexpectedEof();
        } else if (buf[0] == charCode(" ") || buf[0] == charCode("\t")) {
            throw new Deno.errors.InvalidData(`malformed MIME header initial line: ${str(line)}`);
        }
        while(true){
            const kv = await this.readLineSlice();
            if (kv === null) throw new Deno.errors.UnexpectedEof();
            if (kv.byteLength === 0) return m;
            let i = kv.indexOf(charCode(":"));
            if (i < 0) {
                throw new Deno.errors.InvalidData(`malformed MIME header line: ${str(kv)}`);
            }
            const key = str(kv.subarray(0, i));
            if (key == "") {
                continue;
            }
            i++;
            while(i < kv.byteLength && (kv[i] == charCode(" ") || kv[i] == charCode("\t"))){
                i++;
            }
            const value = str(kv.subarray(i)).replace(invalidHeaderCharRegex, encodeURI);
            try {
                m.append(key, value);
            } catch  {}
        }
    }
    async readLineSlice() {
        let line;
        while(true){
            const r = await this.r.readLine();
            if (r === null) return null;
            const { line: l , more  } = r;
            if (!line && !more) {
                if (this.skipSpace(l) === 0) {
                    return new Uint8Array(0);
                }
                return l;
            }
            line = line ? concat(line, l) : l;
            if (!more) {
                break;
            }
        }
        return line;
    }
    skipSpace(l) {
        let n = 0;
        for(let i = 0; i < l.length; i++){
            if (l[i] === charCode(" ") || l[i] === charCode("\t")) {
                continue;
            }
            n++;
        }
        return n;
    }
    r;
}
var Status;
(function(Status) {
    Status[Status["Continue"] = 100] = "Continue";
    Status[Status["SwitchingProtocols"] = 101] = "SwitchingProtocols";
    Status[Status["Processing"] = 102] = "Processing";
    Status[Status["EarlyHints"] = 103] = "EarlyHints";
    Status[Status["OK"] = 200] = "OK";
    Status[Status["Created"] = 201] = "Created";
    Status[Status["Accepted"] = 202] = "Accepted";
    Status[Status["NonAuthoritativeInfo"] = 203] = "NonAuthoritativeInfo";
    Status[Status["NoContent"] = 204] = "NoContent";
    Status[Status["ResetContent"] = 205] = "ResetContent";
    Status[Status["PartialContent"] = 206] = "PartialContent";
    Status[Status["MultiStatus"] = 207] = "MultiStatus";
    Status[Status["AlreadyReported"] = 208] = "AlreadyReported";
    Status[Status["IMUsed"] = 226] = "IMUsed";
    Status[Status["MultipleChoices"] = 300] = "MultipleChoices";
    Status[Status["MovedPermanently"] = 301] = "MovedPermanently";
    Status[Status["Found"] = 302] = "Found";
    Status[Status["SeeOther"] = 303] = "SeeOther";
    Status[Status["NotModified"] = 304] = "NotModified";
    Status[Status["UseProxy"] = 305] = "UseProxy";
    Status[Status["TemporaryRedirect"] = 307] = "TemporaryRedirect";
    Status[Status["PermanentRedirect"] = 308] = "PermanentRedirect";
    Status[Status["BadRequest"] = 400] = "BadRequest";
    Status[Status["Unauthorized"] = 401] = "Unauthorized";
    Status[Status["PaymentRequired"] = 402] = "PaymentRequired";
    Status[Status["Forbidden"] = 403] = "Forbidden";
    Status[Status["NotFound"] = 404] = "NotFound";
    Status[Status["MethodNotAllowed"] = 405] = "MethodNotAllowed";
    Status[Status["NotAcceptable"] = 406] = "NotAcceptable";
    Status[Status["ProxyAuthRequired"] = 407] = "ProxyAuthRequired";
    Status[Status["RequestTimeout"] = 408] = "RequestTimeout";
    Status[Status["Conflict"] = 409] = "Conflict";
    Status[Status["Gone"] = 410] = "Gone";
    Status[Status["LengthRequired"] = 411] = "LengthRequired";
    Status[Status["PreconditionFailed"] = 412] = "PreconditionFailed";
    Status[Status["RequestEntityTooLarge"] = 413] = "RequestEntityTooLarge";
    Status[Status["RequestURITooLong"] = 414] = "RequestURITooLong";
    Status[Status["UnsupportedMediaType"] = 415] = "UnsupportedMediaType";
    Status[Status["RequestedRangeNotSatisfiable"] = 416] = "RequestedRangeNotSatisfiable";
    Status[Status["ExpectationFailed"] = 417] = "ExpectationFailed";
    Status[Status["Teapot"] = 418] = "Teapot";
    Status[Status["MisdirectedRequest"] = 421] = "MisdirectedRequest";
    Status[Status["UnprocessableEntity"] = 422] = "UnprocessableEntity";
    Status[Status["Locked"] = 423] = "Locked";
    Status[Status["FailedDependency"] = 424] = "FailedDependency";
    Status[Status["TooEarly"] = 425] = "TooEarly";
    Status[Status["UpgradeRequired"] = 426] = "UpgradeRequired";
    Status[Status["PreconditionRequired"] = 428] = "PreconditionRequired";
    Status[Status["TooManyRequests"] = 429] = "TooManyRequests";
    Status[Status["RequestHeaderFieldsTooLarge"] = 431] = "RequestHeaderFieldsTooLarge";
    Status[Status["UnavailableForLegalReasons"] = 451] = "UnavailableForLegalReasons";
    Status[Status["InternalServerError"] = 500] = "InternalServerError";
    Status[Status["NotImplemented"] = 501] = "NotImplemented";
    Status[Status["BadGateway"] = 502] = "BadGateway";
    Status[Status["ServiceUnavailable"] = 503] = "ServiceUnavailable";
    Status[Status["GatewayTimeout"] = 504] = "GatewayTimeout";
    Status[Status["HTTPVersionNotSupported"] = 505] = "HTTPVersionNotSupported";
    Status[Status["VariantAlsoNegotiates"] = 506] = "VariantAlsoNegotiates";
    Status[Status["InsufficientStorage"] = 507] = "InsufficientStorage";
    Status[Status["LoopDetected"] = 508] = "LoopDetected";
    Status[Status["NotExtended"] = 510] = "NotExtended";
    Status[Status["NetworkAuthenticationRequired"] = 511] = "NetworkAuthenticationRequired";
})(Status || (Status = {}));
const STATUS_TEXT = new Map([
    [
        Status.Continue,
        "Continue"
    ],
    [
        Status.SwitchingProtocols,
        "Switching Protocols"
    ],
    [
        Status.Processing,
        "Processing"
    ],
    [
        Status.EarlyHints,
        "Early Hints"
    ],
    [
        Status.OK,
        "OK"
    ],
    [
        Status.Created,
        "Created"
    ],
    [
        Status.Accepted,
        "Accepted"
    ],
    [
        Status.NonAuthoritativeInfo,
        "Non-Authoritative Information"
    ],
    [
        Status.NoContent,
        "No Content"
    ],
    [
        Status.ResetContent,
        "Reset Content"
    ],
    [
        Status.PartialContent,
        "Partial Content"
    ],
    [
        Status.MultiStatus,
        "Multi-Status"
    ],
    [
        Status.AlreadyReported,
        "Already Reported"
    ],
    [
        Status.IMUsed,
        "IM Used"
    ],
    [
        Status.MultipleChoices,
        "Multiple Choices"
    ],
    [
        Status.MovedPermanently,
        "Moved Permanently"
    ],
    [
        Status.Found,
        "Found"
    ],
    [
        Status.SeeOther,
        "See Other"
    ],
    [
        Status.NotModified,
        "Not Modified"
    ],
    [
        Status.UseProxy,
        "Use Proxy"
    ],
    [
        Status.TemporaryRedirect,
        "Temporary Redirect"
    ],
    [
        Status.PermanentRedirect,
        "Permanent Redirect"
    ],
    [
        Status.BadRequest,
        "Bad Request"
    ],
    [
        Status.Unauthorized,
        "Unauthorized"
    ],
    [
        Status.PaymentRequired,
        "Payment Required"
    ],
    [
        Status.Forbidden,
        "Forbidden"
    ],
    [
        Status.NotFound,
        "Not Found"
    ],
    [
        Status.MethodNotAllowed,
        "Method Not Allowed"
    ],
    [
        Status.NotAcceptable,
        "Not Acceptable"
    ],
    [
        Status.ProxyAuthRequired,
        "Proxy Authentication Required"
    ],
    [
        Status.RequestTimeout,
        "Request Timeout"
    ],
    [
        Status.Conflict,
        "Conflict"
    ],
    [
        Status.Gone,
        "Gone"
    ],
    [
        Status.LengthRequired,
        "Length Required"
    ],
    [
        Status.PreconditionFailed,
        "Precondition Failed"
    ],
    [
        Status.RequestEntityTooLarge,
        "Request Entity Too Large"
    ],
    [
        Status.RequestURITooLong,
        "Request URI Too Long"
    ],
    [
        Status.UnsupportedMediaType,
        "Unsupported Media Type"
    ],
    [
        Status.RequestedRangeNotSatisfiable,
        "Requested Range Not Satisfiable"
    ],
    [
        Status.ExpectationFailed,
        "Expectation Failed"
    ],
    [
        Status.Teapot,
        "I'm a teapot"
    ],
    [
        Status.MisdirectedRequest,
        "Misdirected Request"
    ],
    [
        Status.UnprocessableEntity,
        "Unprocessable Entity"
    ],
    [
        Status.Locked,
        "Locked"
    ],
    [
        Status.FailedDependency,
        "Failed Dependency"
    ],
    [
        Status.TooEarly,
        "Too Early"
    ],
    [
        Status.UpgradeRequired,
        "Upgrade Required"
    ],
    [
        Status.PreconditionRequired,
        "Precondition Required"
    ],
    [
        Status.TooManyRequests,
        "Too Many Requests"
    ],
    [
        Status.RequestHeaderFieldsTooLarge,
        "Request Header Fields Too Large"
    ],
    [
        Status.UnavailableForLegalReasons,
        "Unavailable For Legal Reasons"
    ],
    [
        Status.InternalServerError,
        "Internal Server Error"
    ],
    [
        Status.NotImplemented,
        "Not Implemented"
    ],
    [
        Status.BadGateway,
        "Bad Gateway"
    ],
    [
        Status.ServiceUnavailable,
        "Service Unavailable"
    ],
    [
        Status.GatewayTimeout,
        "Gateway Timeout"
    ],
    [
        Status.HTTPVersionNotSupported,
        "HTTP Version Not Supported"
    ],
    [
        Status.VariantAlsoNegotiates,
        "Variant Also Negotiates"
    ],
    [
        Status.InsufficientStorage,
        "Insufficient Storage"
    ],
    [
        Status.LoopDetected,
        "Loop Detected"
    ],
    [
        Status.NotExtended,
        "Not Extended"
    ],
    [
        Status.NetworkAuthenticationRequired,
        "Network Authentication Required"
    ]
]);
const encoder = new TextEncoder();
function emptyReader() {
    return {
        read (_) {
            return Promise.resolve(null);
        }
    };
}
function bodyReader(contentLength, r) {
    let totalRead = 0;
    let finished = false;
    async function read(buf) {
        if (finished) return null;
        let result;
        const remaining = contentLength - totalRead;
        if (remaining >= buf.byteLength) {
            result = await r.read(buf);
        } else {
            const readBuf = buf.subarray(0, remaining);
            result = await r.read(readBuf);
        }
        if (result !== null) {
            totalRead += result;
        }
        finished = totalRead === contentLength;
        return result;
    }
    return {
        read
    };
}
function chunkedBodyReader(h, r) {
    const tp = new TextProtoReader(r);
    let finished = false;
    const chunks = [];
    async function read(buf) {
        if (finished) return null;
        const [chunk] = chunks;
        if (chunk) {
            const chunkRemaining = chunk.data.byteLength - chunk.offset;
            const readLength = Math.min(chunkRemaining, buf.byteLength);
            for(let i = 0; i < readLength; i++){
                buf[i] = chunk.data[chunk.offset + i];
            }
            chunk.offset += readLength;
            if (chunk.offset === chunk.data.byteLength) {
                chunks.shift();
                if (await tp.readLine() === null) {
                    throw new Deno.errors.UnexpectedEof();
                }
            }
            return readLength;
        }
        const line = await tp.readLine();
        if (line === null) throw new Deno.errors.UnexpectedEof();
        const [chunkSizeString] = line.split(";");
        const chunkSize = parseInt(chunkSizeString, 16);
        if (Number.isNaN(chunkSize) || chunkSize < 0) {
            throw new Deno.errors.InvalidData("Invalid chunk size");
        }
        if (chunkSize > 0) {
            if (chunkSize > buf.byteLength) {
                let eof = await r.readFull(buf);
                if (eof === null) {
                    throw new Deno.errors.UnexpectedEof();
                }
                const restChunk = new Uint8Array(chunkSize - buf.byteLength);
                eof = await r.readFull(restChunk);
                if (eof === null) {
                    throw new Deno.errors.UnexpectedEof();
                } else {
                    chunks.push({
                        offset: 0,
                        data: restChunk
                    });
                }
                return buf.byteLength;
            } else {
                const bufToFill = buf.subarray(0, chunkSize);
                const eof1 = await r.readFull(bufToFill);
                if (eof1 === null) {
                    throw new Deno.errors.UnexpectedEof();
                }
                if (await tp.readLine() === null) {
                    throw new Deno.errors.UnexpectedEof();
                }
                return chunkSize;
            }
        } else {
            assert(chunkSize === 0);
            if (await r.readLine() === null) {
                throw new Deno.errors.UnexpectedEof();
            }
            await readTrailers(h, r);
            finished = true;
            return null;
        }
    }
    return {
        read
    };
}
function isProhibidedForTrailer(key) {
    const s = new Set([
        "transfer-encoding",
        "content-length",
        "trailer"
    ]);
    return s.has(key.toLowerCase());
}
async function readTrailers(headers, r) {
    const trailers = parseTrailer(headers.get("trailer"));
    if (trailers == null) return;
    const trailerNames = [
        ...trailers.keys()
    ];
    const tp = new TextProtoReader(r);
    const result = await tp.readMIMEHeader();
    if (result == null) {
        throw new Deno.errors.InvalidData("Missing trailer header.");
    }
    const undeclared = [
        ...result.keys()
    ].filter((k)=>!trailerNames.includes(k));
    if (undeclared.length > 0) {
        throw new Deno.errors.InvalidData(`Undeclared trailers: ${Deno.inspect(undeclared)}.`);
    }
    for (const [k, v] of result){
        headers.append(k, v);
    }
    const missingTrailers = trailerNames.filter((k)=>!result.has(k));
    if (missingTrailers.length > 0) {
        throw new Deno.errors.InvalidData(`Missing trailers: ${Deno.inspect(missingTrailers)}.`);
    }
    headers.delete("trailer");
}
function parseTrailer(field) {
    if (field == null) {
        return undefined;
    }
    const trailerNames = field.split(",").map((v)=>v.trim().toLowerCase());
    if (trailerNames.length === 0) {
        throw new Deno.errors.InvalidData("Empty trailer header.");
    }
    const prohibited = trailerNames.filter((k)=>isProhibidedForTrailer(k));
    if (prohibited.length > 0) {
        throw new Deno.errors.InvalidData(`Prohibited trailer names: ${Deno.inspect(prohibited)}.`);
    }
    return new Headers(trailerNames.map((key)=>[
            key,
            ""
        ]));
}
async function writeChunkedBody(w, r) {
    for await (const chunk of Deno.iter(r)){
        if (chunk.byteLength <= 0) continue;
        const start = encoder.encode(`${chunk.byteLength.toString(16)}\r\n`);
        const end = encoder.encode("\r\n");
        await w.write(start);
        await w.write(chunk);
        await w.write(end);
        await w.flush();
    }
    const endChunk = encoder.encode("0\r\n\r\n");
    await w.write(endChunk);
}
async function writeTrailers(w, headers, trailers) {
    const trailer = headers.get("trailer");
    if (trailer === null) {
        throw new TypeError("Missing trailer header.");
    }
    const transferEncoding = headers.get("transfer-encoding");
    if (transferEncoding === null || !transferEncoding.match(/^chunked/)) {
        throw new TypeError(`Trailers are only allowed for "transfer-encoding: chunked", got "transfer-encoding: ${transferEncoding}".`);
    }
    const writer = BufWriter.create(w);
    const trailerNames = trailer.split(",").map((s)=>s.trim().toLowerCase());
    const prohibitedTrailers = trailerNames.filter((k)=>isProhibidedForTrailer(k));
    if (prohibitedTrailers.length > 0) {
        throw new TypeError(`Prohibited trailer names: ${Deno.inspect(prohibitedTrailers)}.`);
    }
    const undeclared = [
        ...trailers.keys()
    ].filter((k)=>!trailerNames.includes(k));
    if (undeclared.length > 0) {
        throw new TypeError(`Undeclared trailers: ${Deno.inspect(undeclared)}.`);
    }
    for (const [key, value] of trailers){
        await writer.write(encoder.encode(`${key}: ${value}\r\n`));
    }
    await writer.write(encoder.encode("\r\n"));
    await writer.flush();
}
async function writeResponse(w, r) {
    const statusCode = r.status || 200;
    const statusText = STATUS_TEXT.get(statusCode);
    const writer = BufWriter.create(w);
    if (!statusText) {
        throw new Deno.errors.InvalidData("Bad status code");
    }
    if (!r.body) {
        r.body = new Uint8Array();
    }
    if (typeof r.body === "string") {
        r.body = encoder.encode(r.body);
    }
    let out = `HTTP/${1}.${1} ${statusCode} ${statusText}\r\n`;
    const headers = r.headers ?? new Headers();
    if (r.body && !headers.get("content-length")) {
        if (r.body instanceof Uint8Array) {
            out += `content-length: ${r.body.byteLength}\r\n`;
        } else if (!headers.get("transfer-encoding")) {
            out += "transfer-encoding: chunked\r\n";
        }
    }
    for (const [key, value] of headers){
        out += `${key}: ${value}\r\n`;
    }
    out += `\r\n`;
    const header = encoder.encode(out);
    const n = await writer.write(header);
    assert(n === header.byteLength);
    if (r.body instanceof Uint8Array) {
        const n1 = await writer.write(r.body);
        assert(n1 === r.body.byteLength);
    } else if (headers.has("content-length")) {
        const contentLength = headers.get("content-length");
        assert(contentLength != null);
        const bodyLength = parseInt(contentLength);
        const n2 = await Deno.copy(r.body, writer);
        assert(n2 === bodyLength);
    } else {
        await writeChunkedBody(writer, r.body);
    }
    if (r.trailers) {
        const t = await r.trailers();
        await writeTrailers(writer, headers, t);
    }
    await writer.flush();
}
class ServerRequest {
    url;
    method;
    proto;
    protoMinor;
    protoMajor;
    headers;
    conn;
    r;
    w;
    #done = deferred();
    #contentLength = undefined;
    #body = undefined;
    #finalized = false;
    get done() {
        return this.#done.then((e)=>e);
    }
    get contentLength() {
        if (this.#contentLength === undefined) {
            const cl = this.headers.get("content-length");
            if (cl) {
                this.#contentLength = parseInt(cl);
                if (Number.isNaN(this.#contentLength)) {
                    this.#contentLength = null;
                }
            } else {
                this.#contentLength = null;
            }
        }
        return this.#contentLength;
    }
    get body() {
        if (!this.#body) {
            if (this.contentLength != null) {
                this.#body = bodyReader(this.contentLength, this.r);
            } else {
                const transferEncoding = this.headers.get("transfer-encoding");
                if (transferEncoding != null) {
                    const parts = transferEncoding.split(",").map((e)=>e.trim().toLowerCase());
                    assert(parts.includes("chunked"), 'transfer-encoding must include "chunked" if content-length is not set');
                    this.#body = chunkedBodyReader(this.headers, this.r);
                } else {
                    this.#body = emptyReader();
                }
            }
        }
        return this.#body;
    }
    async respond(r) {
        let err;
        try {
            await writeResponse(this.w, r);
        } catch (e) {
            try {
                this.conn.close();
            } catch  {}
            err = e;
        }
        this.#done.resolve(err);
        if (err) {
            throw err;
        }
    }
    async finalize() {
        if (this.#finalized) return;
        const body = this.body;
        const buf = new Uint8Array(1024);
        while(await body.read(buf) !== null){}
        this.#finalized = true;
    }
}
function parseHTTPVersion(vers) {
    switch(vers){
        case "HTTP/1.1":
            return [
                1,
                1
            ];
        case "HTTP/1.0":
            return [
                1,
                0
            ];
        default:
            {
                if (!vers.startsWith("HTTP/")) {
                    break;
                }
                const dot = vers.indexOf(".");
                if (dot < 0) {
                    break;
                }
                const majorStr = vers.substring(vers.indexOf("/") + 1, dot);
                const major = Number(majorStr);
                if (!Number.isInteger(major) || major < 0 || major > 1000000) {
                    break;
                }
                const minorStr = vers.substring(dot + 1);
                const minor = Number(minorStr);
                if (!Number.isInteger(minor) || minor < 0 || minor > 1000000) {
                    break;
                }
                return [
                    major,
                    minor
                ];
            }
    }
    throw new Error(`malformed HTTP version ${vers}`);
}
async function readRequest(conn, bufr) {
    const tp = new TextProtoReader(bufr);
    const firstLine = await tp.readLine();
    if (firstLine === null) return null;
    const headers = await tp.readMIMEHeader();
    if (headers === null) throw new Deno.errors.UnexpectedEof();
    const req = new ServerRequest();
    req.conn = conn;
    req.r = bufr;
    [req.method, req.url, req.proto] = firstLine.split(" ", 3);
    [req.protoMajor, req.protoMinor] = parseHTTPVersion(req.proto);
    req.headers = headers;
    fixLength(req);
    return req;
}
class Server {
    #closing;
    #connections;
    constructor(listener){
        this.listener = listener;
        this.#closing = false;
        this.#connections = [];
    }
    close() {
        this.#closing = true;
        this.listener.close();
        for (const conn of this.#connections){
            try {
                conn.close();
            } catch (e) {
                if (!(e instanceof Deno.errors.BadResource)) {
                    throw e;
                }
            }
        }
    }
    async *iterateHttpRequests(conn) {
        const reader = new BufReader(conn);
        const writer = new BufWriter(conn);
        while(!this.#closing){
            let request;
            try {
                request = await readRequest(conn, reader);
            } catch (error) {
                if (error instanceof Deno.errors.InvalidData || error instanceof Deno.errors.UnexpectedEof) {
                    try {
                        await writeResponse(writer, {
                            status: 400,
                            body: new TextEncoder().encode(`${error.message}\r\n\r\n`)
                        });
                    } catch  {}
                }
                break;
            }
            if (request === null) {
                break;
            }
            request.w = writer;
            yield request;
            const responseError = await request.done;
            if (responseError) {
                this.untrackConnection(request.conn);
                return;
            }
            try {
                await request.finalize();
            } catch  {
                break;
            }
        }
        this.untrackConnection(conn);
        try {
            conn.close();
        } catch  {}
    }
    trackConnection(conn) {
        this.#connections.push(conn);
    }
    untrackConnection(conn) {
        const index = this.#connections.indexOf(conn);
        if (index !== -1) {
            this.#connections.splice(index, 1);
        }
    }
    async *acceptConnAndIterateHttpRequests(mux) {
        if (this.#closing) return;
        let conn;
        try {
            conn = await this.listener.accept();
        } catch (error) {
            if (error instanceof Deno.errors.BadResource || error instanceof Deno.errors.InvalidData || error instanceof Deno.errors.UnexpectedEof || error instanceof Deno.errors.ConnectionReset) {
                return mux.add(this.acceptConnAndIterateHttpRequests(mux));
            }
            throw error;
        }
        this.trackConnection(conn);
        mux.add(this.acceptConnAndIterateHttpRequests(mux));
        yield* this.iterateHttpRequests(conn);
    }
    [Symbol.asyncIterator]() {
        const mux = new MuxAsyncIterator();
        mux.add(this.acceptConnAndIterateHttpRequests(mux));
        return mux.iterate();
    }
    listener;
}
function fixLength(req) {
    const contentLength = req.headers.get("Content-Length");
    if (contentLength) {
        const arrClen = contentLength.split(",");
        if (arrClen.length > 1) {
            const distinct = [
                ...new Set(arrClen.map((e)=>e.trim()))
            ];
            if (distinct.length > 1) {
                throw Error("cannot contain multiple Content-Length headers");
            } else {
                req.headers.set("Content-Length", distinct[0]);
            }
        }
        const c = req.headers.get("Content-Length");
        if (req.method === "HEAD" && c && c !== "0") {
            throw Error("http: method cannot contain a Content-Length");
        }
        if (c && req.headers.has("transfer-encoding")) {
            throw new Error("http: Transfer-Encoding and Content-Length cannot be send together");
        }
    }
}
function hasOwnProperty(obj, v) {
    if (obj == null) {
        return false;
    }
    return Object.prototype.hasOwnProperty.call(obj, v);
}
async function readShort(buf) {
    const high = await buf.readByte();
    if (high === null) return null;
    const low = await buf.readByte();
    if (low === null) throw new Deno.errors.UnexpectedEof();
    return high << 8 | low;
}
async function readInt(buf) {
    const high = await readShort(buf);
    if (high === null) return null;
    const low = await readShort(buf);
    if (low === null) throw new Deno.errors.UnexpectedEof();
    return high << 16 | low;
}
const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);
async function readLong(buf) {
    const high = await readInt(buf);
    if (high === null) return null;
    const low = await readInt(buf);
    if (low === null) throw new Deno.errors.UnexpectedEof();
    const big = BigInt(high) << 32n | BigInt(low);
    if (big > MAX_SAFE_INTEGER) {
        throw new RangeError("Long value too big to be represented as a JavaScript number.");
    }
    return Number(big);
}
function sliceLongToBytes(d, dest = new Array(8)) {
    let big = BigInt(d);
    for(let i = 0; i < 8; i++){
        dest[7 - i] = Number(big & 0xffn);
        big >>= 8n;
    }
    return dest;
}
var OpCode;
(function(OpCode) {
    OpCode[OpCode["Continue"] = 0x0] = "Continue";
    OpCode[OpCode["TextFrame"] = 0x1] = "TextFrame";
    OpCode[OpCode["BinaryFrame"] = 0x2] = "BinaryFrame";
    OpCode[OpCode["Close"] = 0x8] = "Close";
    OpCode[OpCode["Ping"] = 0x9] = "Ping";
    OpCode[OpCode["Pong"] = 0xa] = "Pong";
})(OpCode || (OpCode = {}));
function isWebSocketCloseEvent(a) {
    return hasOwnProperty(a, "code");
}
function isWebSocketPingEvent(a) {
    return Array.isArray(a) && a[0] === "ping" && a[1] instanceof Uint8Array;
}
function isWebSocketPongEvent(a) {
    return Array.isArray(a) && a[0] === "pong" && a[1] instanceof Uint8Array;
}
function unmask(payload, mask) {
    if (mask) {
        for(let i = 0, len = payload.length; i < len; i++){
            payload[i] ^= mask[i & 3];
        }
    }
}
async function writeFrame(frame, writer) {
    const payloadLength = frame.payload.byteLength;
    let header;
    const hasMask = frame.mask ? 0x80 : 0;
    if (frame.mask && frame.mask.byteLength !== 4) {
        throw new Error("invalid mask. mask must be 4 bytes: length=" + frame.mask.byteLength);
    }
    if (payloadLength < 126) {
        header = new Uint8Array([
            0x80 | frame.opcode,
            hasMask | payloadLength
        ]);
    } else if (payloadLength < 0xffff) {
        header = new Uint8Array([
            0x80 | frame.opcode,
            hasMask | 0b01111110,
            payloadLength >>> 8,
            payloadLength & 0x00ff
        ]);
    } else {
        header = new Uint8Array([
            0x80 | frame.opcode,
            hasMask | 0b01111111,
            ...sliceLongToBytes(payloadLength)
        ]);
    }
    if (frame.mask) {
        header = concat(header, frame.mask);
    }
    unmask(frame.payload, frame.mask);
    header = concat(header, frame.payload);
    const w = BufWriter.create(writer);
    await w.write(header);
    await w.flush();
}
async function readFrame(buf) {
    let b = await buf.readByte();
    assert(b !== null);
    let isLastFrame = false;
    switch(b >>> 4){
        case 0b1000:
            isLastFrame = true;
            break;
        case 0b0000:
            isLastFrame = false;
            break;
        default:
            throw new Error("invalid signature");
    }
    const opcode = b & 0x0f;
    b = await buf.readByte();
    assert(b !== null);
    const hasMask = b >>> 7;
    let payloadLength = b & 0b01111111;
    if (payloadLength === 126) {
        const l = await readShort(buf);
        assert(l !== null);
        payloadLength = l;
    } else if (payloadLength === 127) {
        const l1 = await readLong(buf);
        assert(l1 !== null);
        payloadLength = Number(l1);
    }
    let mask;
    if (hasMask) {
        mask = new Uint8Array(4);
        assert(await buf.readFull(mask) !== null);
    }
    const payload = new Uint8Array(payloadLength);
    assert(await buf.readFull(payload) !== null);
    return {
        isLastFrame,
        opcode,
        mask,
        payload
    };
}
class WebSocketImpl {
    conn;
    mask;
    bufReader;
    bufWriter;
    sendQueue = [];
    constructor({ conn , bufReader , bufWriter , mask  }){
        this.conn = conn;
        this.mask = mask;
        this.bufReader = bufReader || new BufReader(conn);
        this.bufWriter = bufWriter || new BufWriter(conn);
    }
    async *[Symbol.asyncIterator]() {
        const decoder = new TextDecoder();
        let frames = [];
        let payloadsLength = 0;
        while(!this._isClosed){
            let frame;
            try {
                frame = await readFrame(this.bufReader);
            } catch  {
                this.ensureSocketClosed();
                break;
            }
            unmask(frame.payload, frame.mask);
            switch(frame.opcode){
                case OpCode.TextFrame:
                case OpCode.BinaryFrame:
                case OpCode.Continue:
                    frames.push(frame);
                    payloadsLength += frame.payload.length;
                    if (frame.isLastFrame) {
                        const concat = new Uint8Array(payloadsLength);
                        let offs = 0;
                        for (const frame1 of frames){
                            concat.set(frame1.payload, offs);
                            offs += frame1.payload.length;
                        }
                        if (frames[0].opcode === OpCode.TextFrame) {
                            yield decoder.decode(concat);
                        } else {
                            yield concat;
                        }
                        frames = [];
                        payloadsLength = 0;
                    }
                    break;
                case OpCode.Close:
                    {
                        const code = frame.payload[0] << 8 | frame.payload[1];
                        const reason = decoder.decode(frame.payload.subarray(2, frame.payload.length));
                        await this.close(code, reason);
                        yield {
                            code,
                            reason
                        };
                        return;
                    }
                case OpCode.Ping:
                    await this.enqueue({
                        opcode: OpCode.Pong,
                        payload: frame.payload,
                        isLastFrame: true
                    });
                    yield [
                        "ping",
                        frame.payload
                    ];
                    break;
                case OpCode.Pong:
                    yield [
                        "pong",
                        frame.payload
                    ];
                    break;
                default:
            }
        }
    }
    dequeue() {
        const [entry] = this.sendQueue;
        if (!entry) return;
        if (this._isClosed) return;
        const { d , frame  } = entry;
        writeFrame(frame, this.bufWriter).then(()=>d.resolve()).catch((e)=>d.reject(e)).finally(()=>{
            this.sendQueue.shift();
            this.dequeue();
        });
    }
    enqueue(frame) {
        if (this._isClosed) {
            throw new Deno.errors.ConnectionReset("Socket has already been closed");
        }
        const d = deferred();
        this.sendQueue.push({
            d,
            frame
        });
        if (this.sendQueue.length === 1) {
            this.dequeue();
        }
        return d;
    }
    send(data) {
        const opcode = typeof data === "string" ? OpCode.TextFrame : OpCode.BinaryFrame;
        const payload = typeof data === "string" ? new TextEncoder().encode(data) : data;
        const frame = {
            isLastFrame: true,
            opcode,
            payload,
            mask: this.mask
        };
        return this.enqueue(frame);
    }
    ping(data = "") {
        const payload = typeof data === "string" ? new TextEncoder().encode(data) : data;
        const frame = {
            isLastFrame: true,
            opcode: OpCode.Ping,
            mask: this.mask,
            payload
        };
        return this.enqueue(frame);
    }
    _isClosed = false;
    get isClosed() {
        return this._isClosed;
    }
    async close(code = 1000, reason) {
        try {
            const header = [
                code >>> 8,
                code & 0x00ff
            ];
            let payload;
            if (reason) {
                const reasonBytes = new TextEncoder().encode(reason);
                payload = new Uint8Array(2 + reasonBytes.byteLength);
                payload.set(header);
                payload.set(reasonBytes, 2);
            } else {
                payload = new Uint8Array(header);
            }
            await this.enqueue({
                isLastFrame: true,
                opcode: OpCode.Close,
                mask: this.mask,
                payload
            });
        } catch (e) {
            throw e;
        } finally{
            this.ensureSocketClosed();
        }
    }
    closeForce() {
        this.ensureSocketClosed();
    }
    ensureSocketClosed() {
        if (this.isClosed) return;
        try {
            this.conn.close();
        } catch (e) {
            console.error(e);
        } finally{
            this._isClosed = true;
            const rest = this.sendQueue;
            this.sendQueue = [];
            rest.forEach((e)=>e.d.reject(new Deno.errors.ConnectionReset("Socket has already been closed")));
        }
    }
}
class WebSocketError extends Error {
    constructor(e){
        super(e);
        Object.setPrototypeOf(this, WebSocketError.prototype);
    }
}
var WebSocketState;
(function(WebSocketState) {
    WebSocketState[WebSocketState["CONNECTING"] = 0] = "CONNECTING";
    WebSocketState[WebSocketState["OPEN"] = 1] = "OPEN";
    WebSocketState[WebSocketState["CLOSING"] = 2] = "CLOSING";
    WebSocketState[WebSocketState["CLOSED"] = 3] = "CLOSED";
})(WebSocketState || (WebSocketState = {}));
class GenericEventEmitter extends EventEmitter1 {
    on(...params) {
        return super.on(...params);
    }
    emit(...params) {
        return super.emit(...params);
    }
}
class WebSocketAcceptedClient extends GenericEventEmitter {
    state = WebSocketState.CONNECTING;
    webSocket;
    constructor(sock){
        super();
        this.webSocket = sock;
        this.open();
    }
    async open() {
        this.state = WebSocketState.OPEN;
        this.emit("open");
        try {
            for await (const ev of this.webSocket){
                if (typeof ev === "string") {
                    this.emit("message", ev);
                } else if (ev instanceof Uint8Array) {
                    this.emit("message", ev);
                } else if (isWebSocketPingEvent(ev)) {
                    const [, body] = ev;
                    this.emit("ping", body);
                } else if (isWebSocketPongEvent(ev)) {
                    const [, body1] = ev;
                    this.emit("pong", body1);
                } else if (isWebSocketCloseEvent(ev)) {
                    const { code , reason  } = ev;
                    this.state = WebSocketState.CLOSED;
                    this.emit("close", code);
                }
            }
        } catch (err) {
            this.emit("close", err);
            if (!this.webSocket.isClosed) {
                await this.webSocket.close(1000).catch((e)=>{
                    if (this.state === WebSocketState.CLOSING && this.webSocket.isClosed) {
                        this.state = WebSocketState.CLOSED;
                        return;
                    }
                    throw new WebSocketError(e);
                });
            }
        }
    }
    async ping(message) {
        if (this.state === WebSocketState.CONNECTING) {
            throw new WebSocketError("WebSocket is not open: state 0 (CONNECTING)");
        }
        return this.webSocket.ping(message);
    }
    async send(message) {
        try {
            if (this.state === WebSocketState.CONNECTING) {
                throw new WebSocketError("WebSocket is not open: state 0 (CONNECTING)");
            }
            return this.webSocket.send(message);
        } catch (error) {
            this.state = WebSocketState.CLOSED;
            this.emit("close", error.message);
        }
    }
    async close(code = 1000, reason) {
        if (this.state === WebSocketState.CLOSING || this.state === WebSocketState.CLOSED) {
            return;
        }
        this.state = WebSocketState.CLOSING;
        return this.webSocket.close(code, reason);
    }
    async closeForce() {
        if (this.state === WebSocketState.CLOSING || this.state === WebSocketState.CLOSED) {
            return;
        }
        this.state = WebSocketState.CLOSING;
        return this.webSocket.closeForce();
    }
    get isClosed() {
        return this.webSocket.isClosed;
    }
}
class StandardWebSocketClient extends GenericEventEmitter {
    webSocket;
    constructor(endpoint){
        super();
        this.endpoint = endpoint;
        if (this.endpoint !== undefined) {
            this.webSocket = new WebSocket(endpoint);
            this.webSocket.onopen = ()=>this.emit("open");
            this.webSocket.onmessage = (message)=>this.emit("message", message);
            this.webSocket.onclose = ()=>this.emit("close");
            this.webSocket.onerror = ()=>this.emit("error");
        }
    }
    async ping(message) {
        if (this.webSocket?.readyState === WebSocketState.CONNECTING) {
            throw new WebSocketError("WebSocket is not open: state 0 (CONNECTING)");
        }
        return this.webSocket.send("ping");
    }
    async send(message) {
        if (this.webSocket?.readyState === WebSocketState.CONNECTING) {
            throw new WebSocketError("WebSocket is not open: state 0 (CONNECTING)");
        }
        return this.webSocket.send(message);
    }
    async close(code = 1000, reason) {
        if (this.webSocket.readyState === WebSocketState.CLOSING || this.webSocket.readyState === WebSocketState.CLOSED) {
            return;
        }
        return this.webSocket.close(code, reason);
    }
    closeForce() {
        throw new Error("Method not implemented.");
    }
    get isClosed() {
        return this.webSocket.readyState === WebSocketState.CLOSING || this.webSocket.readyState === WebSocketState.CLOSED;
    }
    endpoint;
}
class Relay {
    url;
    name;
    ws;
    nostr;
    relayConnectionTimeout = 15000;
    connected = false;
    reconnect = false;
    manualClose = false;
    listeners = [];
    constructor(_nostr){
        this.nostr = _nostr;
    }
    connect() {
        return new Promise((resolve, reject)=>{
            const timer = setTimeout(()=>reject(new Error('Relay connection timeout.')), this.relayConnectionTimeout);
            this.ws = new StandardWebSocketClient(this.url);
            this.ws.on('open', ()=>{
                this.nostr.emit('relayConnected', this);
                clearTimeout(timer);
                this.connected = true;
                resolve(true);
            });
            this.ws.on('error', (err)=>{
                if (!this.connected) {
                    reject(new Error('Relay connection error.'));
                    return;
                }
                this.sendErrorEvent(err);
                if (this.reconnect && !this.manualClose) {
                    this.connect();
                }
            });
            this.ws.on('close', ()=>{
                if (this.reconnect && !this.manualClose) {
                    this.connect();
                }
            });
            this.ws.on('message', (message)=>this.handleMessage(message));
        });
    }
    async disconnect() {
        this.manualClose = true;
        await this.ws?.close(1000);
    }
    sendErrorEvent(err) {
        this.nostr.emit('relayError', err, this);
    }
    subscribe(filters, listenerFunc) {
        const subscribeId = crypto.randomUUID();
        let data;
        if (Array.isArray(filters)) {
            data = JSON.stringify([
                'REQ',
                subscribeId,
                ...filters
            ]);
        } else {
            data = JSON.stringify([
                'REQ',
                subscribeId,
                filters
            ]);
        }
        this.listeners.push({
            subscribeId,
            func: listenerFunc
        });
        this.ws?.send(data);
    }
    async *events(filters) {
        const buffer = [];
        let waiter = null;
        this.subscribe(filters, (e, _end)=>{
            buffer.push(e);
            if (waiter) {
                waiter(true);
            }
        });
        while(true){
            if (buffer.length === 0) {
                await new Promise((resolve)=>{
                    waiter = resolve;
                });
            }
            const firstValue = buffer.shift();
            if (firstValue === null) {
                return;
            } else {
                yield firstValue;
            }
        }
    }
    subscribePromise(filters) {
        return new Promise((resolve, reject)=>{
            const subscribeId = crypto.randomUUID();
            let data;
            if (Array.isArray(filters)) {
                data = JSON.stringify([
                    'REQ',
                    subscribeId,
                    ...filters
                ]);
            } else {
                data = JSON.stringify([
                    'REQ',
                    subscribeId,
                    filters
                ]);
            }
            const events = [];
            const listener = {
                subscribeId,
                func: (event, eose)=>{
                    if (event) {
                        events.push(event);
                    } else if (eose) {
                        resolve(events);
                    }
                }
            };
            this.listeners.push(listener);
            this.ws?.send(data);
        });
    }
    getListener(subscribeId) {
        return this.listeners.find((listener)=>listener.subscribeId === subscribeId);
    }
    triggerListenerFunc(subscribeId, data) {
        const event = data;
        const listener = this.getListener(subscribeId);
        if (listener) {
            listener.func(event, false);
        }
    }
    deleteListener(subscribeId) {
        const listener = this.getListener(subscribeId);
        if (listener) {
            listener.func(null, true);
        }
        this.listeners = this.listeners.filter((listener)=>listener.subscribeId !== subscribeId);
    }
    handleMessage(message) {
        let data;
        try {
            data = JSON.parse(message.data);
            this.nostr.log(data);
        } catch (err) {
            this.sendErrorEvent(err);
            return;
        }
        if (data.length >= 2) {
            switch(data[0]){
                case "NOTICE":
                    return this.nostr.emit('relayNotice', data.slice(1));
                case "EVENT":
                    if (data.length < 3) {
                        return;
                    }
                    return this.triggerListenerFunc(data[1], data[2]);
                case "EOSE":
                    return this.deleteListener(data[1]);
                case "OK":
                    return this.nostr.emit('relayPost', data[1], Boolean(data[2]), data[3], this);
            }
        }
    }
    sendEvent(event) {
        return new Promise((resolve, reject)=>{
            const message = JSON.stringify([
                'EVENT',
                event
            ]);
            this.nostr.once('relayPost', (id, status, errorMessage, relay)=>{
                if (this === relay && id === event.id) {
                    if (!status) {
                        reject(new Error(errorMessage));
                        return;
                    }
                    resolve(true);
                }
            });
            this.ws?.send(message);
        });
    }
}
const codes = {};
function hideStackFrames(fn) {
    const hidden = "__node_internal_" + fn.name;
    Object.defineProperty(fn, "name", {
        value: hidden
    });
    return fn;
}
const _toString = Object.prototype.toString;
const _isObjectLike = (value)=>value !== null && typeof value === "object";
const _isFunctionLike = (value)=>value !== null && typeof value === "function";
function isAnyArrayBuffer(value) {
    return _isObjectLike(value) && (_toString.call(value) === "[object ArrayBuffer]" || _toString.call(value) === "[object SharedArrayBuffer]");
}
function isArgumentsObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Arguments]";
}
function isArrayBuffer(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object ArrayBuffer]";
}
function isAsyncFunction(value) {
    return _isFunctionLike(value) && _toString.call(value) === "[object AsyncFunction]";
}
function isBooleanObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Boolean]";
}
function isBoxedPrimitive(value) {
    return isBooleanObject(value) || isStringObject(value) || isNumberObject(value) || isSymbolObject(value) || isBigIntObject(value);
}
function isDataView(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object DataView]";
}
function isDate(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Date]";
}
function isGeneratorFunction(value) {
    return _isFunctionLike(value) && _toString.call(value) === "[object GeneratorFunction]";
}
function isGeneratorObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Generator]";
}
function isMap(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Map]";
}
function isMapIterator(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Map Iterator]";
}
function isModuleNamespaceObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Module]";
}
function isNativeError(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Error]";
}
function isNumberObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Number]";
}
function isBigIntObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object BigInt]";
}
function isPromise(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Promise]";
}
function isRegExp(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object RegExp]";
}
function isSet(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Set]";
}
function isSetIterator(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Set Iterator]";
}
function isSharedArrayBuffer(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object SharedArrayBuffer]";
}
function isStringObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object String]";
}
function isSymbolObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Symbol]";
}
function isWeakMap(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object WeakMap]";
}
function isWeakSet(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object WeakSet]";
}
const __default = {
    isAsyncFunction,
    isGeneratorFunction,
    isAnyArrayBuffer,
    isArrayBuffer,
    isArgumentsObject,
    isBoxedPrimitive,
    isDataView,
    isMap,
    isMapIterator,
    isModuleNamespaceObject,
    isNativeError,
    isPromise,
    isSet,
    isSetIterator,
    isWeakMap,
    isWeakSet,
    isRegExp,
    isDate,
    isStringObject,
    isNumberObject,
    isBooleanObject,
    isBigIntObject
};
const mod = {
    isAnyArrayBuffer: isAnyArrayBuffer,
    isArgumentsObject: isArgumentsObject,
    isArrayBuffer: isArrayBuffer,
    isAsyncFunction: isAsyncFunction,
    isBooleanObject: isBooleanObject,
    isBoxedPrimitive: isBoxedPrimitive,
    isDataView: isDataView,
    isDate: isDate,
    isGeneratorFunction: isGeneratorFunction,
    isGeneratorObject: isGeneratorObject,
    isMap: isMap,
    isMapIterator: isMapIterator,
    isModuleNamespaceObject: isModuleNamespaceObject,
    isNativeError: isNativeError,
    isNumberObject: isNumberObject,
    isBigIntObject: isBigIntObject,
    isPromise: isPromise,
    isRegExp: isRegExp,
    isSet: isSet,
    isSetIterator: isSetIterator,
    isSharedArrayBuffer: isSharedArrayBuffer,
    isStringObject: isStringObject,
    isSymbolObject: isSymbolObject,
    isWeakMap: isWeakMap,
    isWeakSet: isWeakSet,
    default: __default
};
const kHandle = Symbol("kHandle");
const kKeyObject = Symbol("kKeyObject");
const kKeyType = Symbol("kKeyType");
function isKeyObject(obj) {
    return obj != null && obj[kKeyType] !== undefined;
}
function isCryptoKey(obj) {
    return obj != null && obj[kKeyObject] !== undefined;
}
const _getTypedArrayToStringTag = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array).prototype, Symbol.toStringTag).get;
function isArrayBufferView(value) {
    return ArrayBuffer.isView(value);
}
function isBigInt64Array(value) {
    return _getTypedArrayToStringTag.call(value) === "BigInt64Array";
}
function isBigUint64Array(value) {
    return _getTypedArrayToStringTag.call(value) === "BigUint64Array";
}
function isFloat32Array(value) {
    return _getTypedArrayToStringTag.call(value) === "Float32Array";
}
function isFloat64Array(value) {
    return _getTypedArrayToStringTag.call(value) === "Float64Array";
}
function isInt8Array(value) {
    return _getTypedArrayToStringTag.call(value) === "Int8Array";
}
function isInt16Array(value) {
    return _getTypedArrayToStringTag.call(value) === "Int16Array";
}
function isInt32Array(value) {
    return _getTypedArrayToStringTag.call(value) === "Int32Array";
}
function isTypedArray(value) {
    return _getTypedArrayToStringTag.call(value) !== undefined;
}
function isUint8Array(value) {
    return _getTypedArrayToStringTag.call(value) === "Uint8Array";
}
function isUint8ClampedArray(value) {
    return _getTypedArrayToStringTag.call(value) === "Uint8ClampedArray";
}
function isUint16Array(value) {
    return _getTypedArrayToStringTag.call(value) === "Uint16Array";
}
function isUint32Array(value) {
    return _getTypedArrayToStringTag.call(value) === "Uint32Array";
}
const { isDate: isDate1 , isArgumentsObject: isArgumentsObject1 , isBigIntObject: isBigIntObject1 , isBooleanObject: isBooleanObject1 , isNumberObject: isNumberObject1 , isStringObject: isStringObject1 , isSymbolObject: isSymbolObject1 , isNativeError: isNativeError1 , isRegExp: isRegExp1 , isAsyncFunction: isAsyncFunction1 , isGeneratorFunction: isGeneratorFunction1 , isGeneratorObject: isGeneratorObject1 , isPromise: isPromise1 , isMap: isMap1 , isSet: isSet1 , isMapIterator: isMapIterator1 , isSetIterator: isSetIterator1 , isWeakMap: isWeakMap1 , isWeakSet: isWeakSet1 , isArrayBuffer: isArrayBuffer1 , isDataView: isDataView1 , isSharedArrayBuffer: isSharedArrayBuffer1 , isModuleNamespaceObject: isModuleNamespaceObject1 , isAnyArrayBuffer: isAnyArrayBuffer1 , isBoxedPrimitive: isBoxedPrimitive1  } = mod;
const mod1 = {
    isCryptoKey: isCryptoKey,
    isKeyObject: isKeyObject,
    isArrayBufferView: isArrayBufferView,
    isBigInt64Array: isBigInt64Array,
    isBigUint64Array: isBigUint64Array,
    isFloat32Array: isFloat32Array,
    isFloat64Array: isFloat64Array,
    isInt8Array: isInt8Array,
    isInt16Array: isInt16Array,
    isInt32Array: isInt32Array,
    isTypedArray: isTypedArray,
    isUint8Array: isUint8Array,
    isUint8ClampedArray: isUint8ClampedArray,
    isUint16Array: isUint16Array,
    isUint32Array: isUint32Array,
    isDate: isDate1,
    isArgumentsObject: isArgumentsObject1,
    isBigIntObject: isBigIntObject1,
    isBooleanObject: isBooleanObject1,
    isNumberObject: isNumberObject1,
    isStringObject: isStringObject1,
    isSymbolObject: isSymbolObject1,
    isNativeError: isNativeError1,
    isRegExp: isRegExp1,
    isAsyncFunction: isAsyncFunction1,
    isGeneratorFunction: isGeneratorFunction1,
    isGeneratorObject: isGeneratorObject1,
    isPromise: isPromise1,
    isMap: isMap1,
    isSet: isSet1,
    isMapIterator: isMapIterator1,
    isSetIterator: isSetIterator1,
    isWeakMap: isWeakMap1,
    isWeakSet: isWeakSet1,
    isArrayBuffer: isArrayBuffer1,
    isDataView: isDataView1,
    isSharedArrayBuffer: isSharedArrayBuffer1,
    isModuleNamespaceObject: isModuleNamespaceObject1,
    isAnyArrayBuffer: isAnyArrayBuffer1,
    isBoxedPrimitive: isBoxedPrimitive1
};
function normalizeEncoding(enc) {
    if (enc == null || enc === "utf8" || enc === "utf-8") return "utf8";
    return slowCases(enc);
}
function slowCases(enc) {
    switch(enc.length){
        case 4:
            if (enc === "UTF8") return "utf8";
            if (enc === "ucs2" || enc === "UCS2") return "utf16le";
            enc = `${enc}`.toLowerCase();
            if (enc === "utf8") return "utf8";
            if (enc === "ucs2") return "utf16le";
            break;
        case 3:
            if (enc === "hex" || enc === "HEX" || `${enc}`.toLowerCase() === "hex") {
                return "hex";
            }
            break;
        case 5:
            if (enc === "ascii") return "ascii";
            if (enc === "ucs-2") return "utf16le";
            if (enc === "UTF-8") return "utf8";
            if (enc === "ASCII") return "ascii";
            if (enc === "UCS-2") return "utf16le";
            enc = `${enc}`.toLowerCase();
            if (enc === "utf-8") return "utf8";
            if (enc === "ascii") return "ascii";
            if (enc === "ucs-2") return "utf16le";
            break;
        case 6:
            if (enc === "base64") return "base64";
            if (enc === "latin1" || enc === "binary") return "latin1";
            if (enc === "BASE64") return "base64";
            if (enc === "LATIN1" || enc === "BINARY") return "latin1";
            enc = `${enc}`.toLowerCase();
            if (enc === "base64") return "base64";
            if (enc === "latin1" || enc === "binary") return "latin1";
            break;
        case 7:
            if (enc === "utf16le" || enc === "UTF16LE" || `${enc}`.toLowerCase() === "utf16le") {
                return "utf16le";
            }
            break;
        case 8:
            if (enc === "utf-16le" || enc === "UTF-16LE" || `${enc}`.toLowerCase() === "utf-16le") {
                return "utf16le";
            }
            break;
        case 9:
            if (enc === "base64url" || enc === "BASE64URL" || `${enc}`.toLowerCase() === "base64url") {
                return "base64url";
            }
            break;
        default:
            if (enc === "") return "utf8";
    }
}
function isInt32(value) {
    return value === (value | 0);
}
function isUint32(value) {
    return value === value >>> 0;
}
const validateBuffer = hideStackFrames((buffer, name = "buffer")=>{
    if (!isArrayBufferView(buffer)) {
        throw new codes.ERR_INVALID_ARG_TYPE(name, [
            "Buffer",
            "TypedArray",
            "DataView"
        ], buffer);
    }
});
const validateInteger = hideStackFrames((value, name, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER)=>{
    if (typeof value !== "number") {
        throw new codes.ERR_INVALID_ARG_TYPE(name, "number", value);
    }
    if (!Number.isInteger(value)) {
        throw new codes.ERR_OUT_OF_RANGE(name, "an integer", value);
    }
    if (value < min || value > max) {
        throw new codes.ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value);
    }
});
const validateObject = hideStackFrames((value, name, options)=>{
    const useDefaultOptions = options == null;
    const allowArray = useDefaultOptions ? false : options.allowArray;
    const allowFunction = useDefaultOptions ? false : options.allowFunction;
    const nullable = useDefaultOptions ? false : options.nullable;
    if (!nullable && value === null || !allowArray && Array.isArray(value) || typeof value !== "object" && (!allowFunction || typeof value !== "function")) {
        throw new codes.ERR_INVALID_ARG_TYPE(name, "Object", value);
    }
});
const validateInt32 = hideStackFrames((value, name, min = -2147483648, max = 2147483647)=>{
    if (!isInt32(value)) {
        if (typeof value !== "number") {
            throw new codes.ERR_INVALID_ARG_TYPE(name, "number", value);
        }
        if (!Number.isInteger(value)) {
            throw new codes.ERR_OUT_OF_RANGE(name, "an integer", value);
        }
        throw new codes.ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value);
    }
    if (value < min || value > max) {
        throw new codes.ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value);
    }
});
hideStackFrames((value, name, positive)=>{
    if (!isUint32(value)) {
        if (typeof value !== "number") {
            throw new codes.ERR_INVALID_ARG_TYPE(name, "number", value);
        }
        if (!Number.isInteger(value)) {
            throw new codes.ERR_OUT_OF_RANGE(name, "an integer", value);
        }
        const min = positive ? 1 : 0;
        throw new codes.ERR_OUT_OF_RANGE(name, `>= ${min} && < 4294967296`, value);
    }
    if (positive && value === 0) {
        throw new codes.ERR_OUT_OF_RANGE(name, ">= 1 && < 4294967296", value);
    }
});
function validateString(value, name) {
    if (typeof value !== "string") {
        throw new codes.ERR_INVALID_ARG_TYPE(name, "string", value);
    }
}
function validateBoolean(value, name) {
    if (typeof value !== "boolean") {
        throw new codes.ERR_INVALID_ARG_TYPE(name, "boolean", value);
    }
}
hideStackFrames((value, name, oneOf)=>{
    if (!Array.prototype.includes.call(oneOf, value)) {
        const allowed = Array.prototype.join.call(Array.prototype.map.call(oneOf, (v)=>typeof v === "string" ? `'${v}'` : String(v)), ", ");
        const reason = "must be one of: " + allowed;
        throw new codes.ERR_INVALID_ARG_VALUE(name, value, reason);
    }
});
const validateCallback = hideStackFrames((callback)=>{
    if (typeof callback !== "function") {
        throw new codes.ERR_INVALID_CALLBACK(callback);
    }
});
const validateAbortSignal = hideStackFrames((signal, name)=>{
    if (signal !== undefined && (signal === null || typeof signal !== "object" || !("aborted" in signal))) {
        throw new codes.ERR_INVALID_ARG_TYPE(name, "AbortSignal", signal);
    }
});
const validateFunction = hideStackFrames((value, name)=>{
    if (typeof value !== "function") {
        throw new codes.ERR_INVALID_ARG_TYPE(name, "Function", value);
    }
});
hideStackFrames((value, name, minLength = 0)=>{
    if (!Array.isArray(value)) {
        throw new codes.ERR_INVALID_ARG_TYPE(name, "Array", value);
    }
    if (value.length < minLength) {
        const reason = `must be longer than ${minLength}`;
        throw new codes.ERR_INVALID_ARG_VALUE(name, value, reason);
    }
});
Symbol.for("nodejs.util.inspect.custom");
const kEnumerableProperty = Object.create(null);
kEnumerableProperty.enumerable = true;
function once(callback) {
    let called = false;
    return function(...args) {
        if (called) return;
        called = true;
        Reflect.apply(callback, this, args);
    };
}
function createDeferredPromise() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej)=>{
        resolve = res;
        reject = rej;
    });
    return {
        promise,
        resolve,
        reject
    };
}
new Set();
const kCustomPromisifiedSymbol = Symbol.for("nodejs.util.promisify.custom");
const kCustomPromisifyArgsSymbol = Symbol.for("nodejs.util.promisify.customArgs");
function promisify(original) {
    validateFunction(original, "original");
    if (original[kCustomPromisifiedSymbol]) {
        const fn = original[kCustomPromisifiedSymbol];
        validateFunction(fn, "util.promisify.custom");
        return Object.defineProperty(fn, kCustomPromisifiedSymbol, {
            value: fn,
            enumerable: false,
            writable: false,
            configurable: true
        });
    }
    const argumentNames = original[kCustomPromisifyArgsSymbol];
    function fn1(...args) {
        return new Promise((resolve, reject)=>{
            args.push((err, ...values)=>{
                if (err) {
                    return reject(err);
                }
                if (argumentNames !== undefined && values.length > 1) {
                    const obj = {};
                    for(let i = 0; i < argumentNames.length; i++){
                        obj[argumentNames[i]] = values[i];
                    }
                    resolve(obj);
                } else {
                    resolve(values[0]);
                }
            });
            Reflect.apply(original, this, args);
        });
    }
    Object.setPrototypeOf(fn1, Object.getPrototypeOf(original));
    Object.defineProperty(fn1, kCustomPromisifiedSymbol, {
        value: fn1,
        enumerable: false,
        writable: false,
        configurable: true
    });
    return Object.defineProperties(fn1, Object.getOwnPropertyDescriptors(original));
}
promisify.custom = kCustomPromisifiedSymbol;
let core;
if (Deno?.core) {
    core = Deno.core;
} else {
    core = {
        setNextTickCallback: undefined,
        evalContext (_code, _filename) {
            throw new Error("Deno.core.evalContext is not supported in this environment");
        },
        encode (chunk) {
            return new TextEncoder().encode(chunk);
        },
        eventLoopHasMoreWork () {
            return false;
        }
    };
}
let _exiting = false;
const kSize = 2048;
const kMask = 2048 - 1;
class FixedCircularBuffer {
    bottom;
    top;
    list;
    next;
    constructor(){
        this.bottom = 0;
        this.top = 0;
        this.list = new Array(kSize);
        this.next = null;
    }
    isEmpty() {
        return this.top === this.bottom;
    }
    isFull() {
        return (this.top + 1 & kMask) === this.bottom;
    }
    push(data) {
        this.list[this.top] = data;
        this.top = this.top + 1 & kMask;
    }
    shift() {
        const nextItem = this.list[this.bottom];
        if (nextItem === undefined) {
            return null;
        }
        this.list[this.bottom] = undefined;
        this.bottom = this.bottom + 1 & kMask;
        return nextItem;
    }
}
class FixedQueue {
    head;
    tail;
    constructor(){
        this.head = this.tail = new FixedCircularBuffer();
    }
    isEmpty() {
        return this.head.isEmpty();
    }
    push(data) {
        if (this.head.isFull()) {
            this.head = this.head.next = new FixedCircularBuffer();
        }
        this.head.push(data);
    }
    shift() {
        const tail = this.tail;
        const next = tail.shift();
        if (tail.isEmpty() && tail.next !== null) {
            this.tail = tail.next;
        }
        return next;
    }
}
const queue = new FixedQueue();
let _nextTick;
function processTicksAndRejections() {
    let tock;
    do {
        while(tock = queue.shift()){
            try {
                const callback = tock.callback;
                if (tock.args === undefined) {
                    callback();
                } else {
                    const args = tock.args;
                    switch(args.length){
                        case 1:
                            callback(args[0]);
                            break;
                        case 2:
                            callback(args[0], args[1]);
                            break;
                        case 3:
                            callback(args[0], args[1], args[2]);
                            break;
                        case 4:
                            callback(args[0], args[1], args[2], args[3]);
                            break;
                        default:
                            callback(...args);
                    }
                }
            } finally{}
        }
        core.runMicrotasks();
    }while (!queue.isEmpty())
    core.setHasTickScheduled(false);
}
if (typeof core.setNextTickCallback !== "undefined") {
    function runNextTicks() {
        if (!core.hasTickScheduled()) {
            core.runMicrotasks();
        }
        if (!core.hasTickScheduled()) {
            return true;
        }
        processTicksAndRejections();
        return true;
    }
    core.setNextTickCallback(processTicksAndRejections);
    core.setMacrotaskCallback(runNextTicks);
    function __nextTickNative(callback, ...args) {
        validateCallback(callback);
        if (_exiting) {
            return;
        }
        let args_;
        switch(args.length){
            case 0:
                break;
            case 1:
                args_ = [
                    args[0]
                ];
                break;
            case 2:
                args_ = [
                    args[0],
                    args[1]
                ];
                break;
            case 3:
                args_ = [
                    args[0],
                    args[1],
                    args[2]
                ];
                break;
            default:
                args_ = new Array(args.length);
                for(let i = 0; i < args.length; i++){
                    args_[i] = args[i];
                }
        }
        if (queue.isEmpty()) {
            core.setHasTickScheduled(true);
        }
        const tickObject = {
            callback,
            args: args_
        };
        queue.push(tickObject);
    }
    _nextTick = __nextTickNative;
} else {
    function __nextTickQueueMicrotask(callback, ...args) {
        if (args) {
            queueMicrotask(()=>callback.call(this, ...args));
        } else {
            queueMicrotask(callback);
        }
    }
    _nextTick = __nextTickQueueMicrotask;
}
function nextTick(callback, ...args) {
    _nextTick(callback, ...args);
}
var State;
(function(State) {
    State[State["PASSTHROUGH"] = 0] = "PASSTHROUGH";
    State[State["PERCENT"] = 1] = "PERCENT";
    State[State["POSITIONAL"] = 2] = "POSITIONAL";
    State[State["PRECISION"] = 3] = "PRECISION";
    State[State["WIDTH"] = 4] = "WIDTH";
})(State || (State = {}));
var WorP;
(function(WorP) {
    WorP[WorP["WIDTH"] = 0] = "WIDTH";
    WorP[WorP["PRECISION"] = 1] = "PRECISION";
})(WorP || (WorP = {}));
class Flags {
    plus;
    dash;
    sharp;
    space;
    zero;
    lessthan;
    width = -1;
    precision = -1;
}
const min = Math.min;
const UNICODE_REPLACEMENT_CHARACTER = "\ufffd";
const FLOAT_REGEXP = /(-?)(\d)\.?(\d*)e([+-])(\d+)/;
var F;
(function(F) {
    F[F["sign"] = 1] = "sign";
    F[F["mantissa"] = 2] = "mantissa";
    F[F["fractional"] = 3] = "fractional";
    F[F["esign"] = 4] = "esign";
    F[F["exponent"] = 5] = "exponent";
})(F || (F = {}));
class Printf {
    format;
    args;
    i;
    state = State.PASSTHROUGH;
    verb = "";
    buf = "";
    argNum = 0;
    flags = new Flags();
    haveSeen;
    tmpError;
    constructor(format, ...args){
        this.format = format;
        this.args = args;
        this.haveSeen = Array.from({
            length: args.length
        });
        this.i = 0;
    }
    doPrintf() {
        for(; this.i < this.format.length; ++this.i){
            const c = this.format[this.i];
            switch(this.state){
                case State.PASSTHROUGH:
                    if (c === "%") {
                        this.state = State.PERCENT;
                    } else {
                        this.buf += c;
                    }
                    break;
                case State.PERCENT:
                    if (c === "%") {
                        this.buf += c;
                        this.state = State.PASSTHROUGH;
                    } else {
                        this.handleFormat();
                    }
                    break;
                default:
                    throw Error("Should be unreachable, certainly a bug in the lib.");
            }
        }
        let extras = false;
        let err = "%!(EXTRA";
        for(let i = 0; i !== this.haveSeen.length; ++i){
            if (!this.haveSeen[i]) {
                extras = true;
                err += ` '${Deno.inspect(this.args[i])}'`;
            }
        }
        err += ")";
        if (extras) {
            this.buf += err;
        }
        return this.buf;
    }
    handleFormat() {
        this.flags = new Flags();
        const flags = this.flags;
        for(; this.i < this.format.length; ++this.i){
            const c = this.format[this.i];
            switch(this.state){
                case State.PERCENT:
                    switch(c){
                        case "[":
                            this.handlePositional();
                            this.state = State.POSITIONAL;
                            break;
                        case "+":
                            flags.plus = true;
                            break;
                        case "<":
                            flags.lessthan = true;
                            break;
                        case "-":
                            flags.dash = true;
                            flags.zero = false;
                            break;
                        case "#":
                            flags.sharp = true;
                            break;
                        case " ":
                            flags.space = true;
                            break;
                        case "0":
                            flags.zero = !flags.dash;
                            break;
                        default:
                            if ("1" <= c && c <= "9" || c === "." || c === "*") {
                                if (c === ".") {
                                    this.flags.precision = 0;
                                    this.state = State.PRECISION;
                                    this.i++;
                                } else {
                                    this.state = State.WIDTH;
                                }
                                this.handleWidthAndPrecision(flags);
                            } else {
                                this.handleVerb();
                                return;
                            }
                    }
                    break;
                case State.POSITIONAL:
                    if (c === "*") {
                        const worp = this.flags.precision === -1 ? WorP.WIDTH : WorP.PRECISION;
                        this.handleWidthOrPrecisionRef(worp);
                        this.state = State.PERCENT;
                        break;
                    } else {
                        this.handleVerb();
                        return;
                    }
                default:
                    throw new Error(`Should not be here ${this.state}, library bug!`);
            }
        }
    }
    handleWidthOrPrecisionRef(wOrP) {
        if (this.argNum >= this.args.length) {
            return;
        }
        const arg = this.args[this.argNum];
        this.haveSeen[this.argNum] = true;
        if (typeof arg === "number") {
            switch(wOrP){
                case WorP.WIDTH:
                    this.flags.width = arg;
                    break;
                default:
                    this.flags.precision = arg;
            }
        } else {
            const tmp = wOrP === WorP.WIDTH ? "WIDTH" : "PREC";
            this.tmpError = `%!(BAD ${tmp} '${this.args[this.argNum]}')`;
        }
        this.argNum++;
    }
    handleWidthAndPrecision(flags) {
        const fmt = this.format;
        for(; this.i !== this.format.length; ++this.i){
            const c = fmt[this.i];
            switch(this.state){
                case State.WIDTH:
                    switch(c){
                        case ".":
                            this.flags.precision = 0;
                            this.state = State.PRECISION;
                            break;
                        case "*":
                            this.handleWidthOrPrecisionRef(WorP.WIDTH);
                            break;
                        default:
                            {
                                const val = parseInt(c);
                                if (isNaN(val)) {
                                    this.i--;
                                    this.state = State.PERCENT;
                                    return;
                                }
                                flags.width = flags.width == -1 ? 0 : flags.width;
                                flags.width *= 10;
                                flags.width += val;
                            }
                    }
                    break;
                case State.PRECISION:
                    {
                        if (c === "*") {
                            this.handleWidthOrPrecisionRef(WorP.PRECISION);
                            break;
                        }
                        const val1 = parseInt(c);
                        if (isNaN(val1)) {
                            this.i--;
                            this.state = State.PERCENT;
                            return;
                        }
                        flags.precision *= 10;
                        flags.precision += val1;
                        break;
                    }
                default:
                    throw new Error("can't be here. bug.");
            }
        }
    }
    handlePositional() {
        if (this.format[this.i] !== "[") {
            throw new Error("Can't happen? Bug.");
        }
        let positional = 0;
        const format = this.format;
        this.i++;
        let err = false;
        for(; this.i !== this.format.length; ++this.i){
            if (format[this.i] === "]") {
                break;
            }
            positional *= 10;
            const val = parseInt(format[this.i]);
            if (isNaN(val)) {
                this.tmpError = "%!(BAD INDEX)";
                err = true;
            }
            positional += val;
        }
        if (positional - 1 >= this.args.length) {
            this.tmpError = "%!(BAD INDEX)";
            err = true;
        }
        this.argNum = err ? this.argNum : positional - 1;
        return;
    }
    handleLessThan() {
        const arg = this.args[this.argNum];
        if ((arg || {}).constructor.name !== "Array") {
            throw new Error(`arg ${arg} is not an array. Todo better error handling`);
        }
        let str = "[ ";
        for(let i = 0; i !== arg.length; ++i){
            if (i !== 0) str += ", ";
            str += this._handleVerb(arg[i]);
        }
        return str + " ]";
    }
    handleVerb() {
        const verb = this.format[this.i];
        this.verb = verb;
        if (this.tmpError) {
            this.buf += this.tmpError;
            this.tmpError = undefined;
            if (this.argNum < this.haveSeen.length) {
                this.haveSeen[this.argNum] = true;
            }
        } else if (this.args.length <= this.argNum) {
            this.buf += `%!(MISSING '${verb}')`;
        } else {
            const arg = this.args[this.argNum];
            this.haveSeen[this.argNum] = true;
            if (this.flags.lessthan) {
                this.buf += this.handleLessThan();
            } else {
                this.buf += this._handleVerb(arg);
            }
        }
        this.argNum++;
        this.state = State.PASSTHROUGH;
    }
    _handleVerb(arg) {
        switch(this.verb){
            case "t":
                return this.pad(arg.toString());
            case "b":
                return this.fmtNumber(arg, 2);
            case "c":
                return this.fmtNumberCodePoint(arg);
            case "d":
                return this.fmtNumber(arg, 10);
            case "o":
                return this.fmtNumber(arg, 8);
            case "x":
                return this.fmtHex(arg);
            case "X":
                return this.fmtHex(arg, true);
            case "e":
                return this.fmtFloatE(arg);
            case "E":
                return this.fmtFloatE(arg, true);
            case "f":
            case "F":
                return this.fmtFloatF(arg);
            case "g":
                return this.fmtFloatG(arg);
            case "G":
                return this.fmtFloatG(arg, true);
            case "s":
                return this.fmtString(arg);
            case "T":
                return this.fmtString(typeof arg);
            case "v":
                return this.fmtV(arg);
            case "j":
                return this.fmtJ(arg);
            default:
                return `%!(BAD VERB '${this.verb}')`;
        }
    }
    pad(s) {
        const padding = this.flags.zero ? "0" : " ";
        if (this.flags.dash) {
            return s.padEnd(this.flags.width, padding);
        }
        return s.padStart(this.flags.width, padding);
    }
    padNum(nStr, neg) {
        let sign;
        if (neg) {
            sign = "-";
        } else if (this.flags.plus || this.flags.space) {
            sign = this.flags.plus ? "+" : " ";
        } else {
            sign = "";
        }
        const zero = this.flags.zero;
        if (!zero) {
            nStr = sign + nStr;
        }
        const pad = zero ? "0" : " ";
        const len = zero ? this.flags.width - sign.length : this.flags.width;
        if (this.flags.dash) {
            nStr = nStr.padEnd(len, pad);
        } else {
            nStr = nStr.padStart(len, pad);
        }
        if (zero) {
            nStr = sign + nStr;
        }
        return nStr;
    }
    fmtNumber(n, radix, upcase = false) {
        let num = Math.abs(n).toString(radix);
        const prec = this.flags.precision;
        if (prec !== -1) {
            this.flags.zero = false;
            num = n === 0 && prec === 0 ? "" : num;
            while(num.length < prec){
                num = "0" + num;
            }
        }
        let prefix = "";
        if (this.flags.sharp) {
            switch(radix){
                case 2:
                    prefix += "0b";
                    break;
                case 8:
                    prefix += num.startsWith("0") ? "" : "0";
                    break;
                case 16:
                    prefix += "0x";
                    break;
                default:
                    throw new Error("cannot handle base: " + radix);
            }
        }
        num = num.length === 0 ? num : prefix + num;
        if (upcase) {
            num = num.toUpperCase();
        }
        return this.padNum(num, n < 0);
    }
    fmtNumberCodePoint(n) {
        let s = "";
        try {
            s = String.fromCodePoint(n);
        } catch  {
            s = UNICODE_REPLACEMENT_CHARACTER;
        }
        return this.pad(s);
    }
    fmtFloatSpecial(n) {
        if (isNaN(n)) {
            this.flags.zero = false;
            return this.padNum("NaN", false);
        }
        if (n === Number.POSITIVE_INFINITY) {
            this.flags.zero = false;
            this.flags.plus = true;
            return this.padNum("Inf", false);
        }
        if (n === Number.NEGATIVE_INFINITY) {
            this.flags.zero = false;
            return this.padNum("Inf", true);
        }
        return "";
    }
    roundFractionToPrecision(fractional, precision) {
        let round = false;
        if (fractional.length > precision) {
            fractional = "1" + fractional;
            let tmp = parseInt(fractional.substr(0, precision + 2)) / 10;
            tmp = Math.round(tmp);
            fractional = Math.floor(tmp).toString();
            round = fractional[0] === "2";
            fractional = fractional.substr(1);
        } else {
            while(fractional.length < precision){
                fractional += "0";
            }
        }
        return [
            fractional,
            round
        ];
    }
    fmtFloatE(n, upcase = false) {
        const special = this.fmtFloatSpecial(n);
        if (special !== "") {
            return special;
        }
        const m = n.toExponential().match(FLOAT_REGEXP);
        if (!m) {
            throw Error("can't happen, bug");
        }
        let fractional = m[F.fractional];
        const precision = this.flags.precision !== -1 ? this.flags.precision : 6;
        let rounding = false;
        [fractional, rounding] = this.roundFractionToPrecision(fractional, precision);
        let e = m[F.exponent];
        let esign = m[F.esign];
        let mantissa = parseInt(m[F.mantissa]);
        if (rounding) {
            mantissa += 1;
            if (10 <= mantissa) {
                mantissa = 1;
                const r = parseInt(esign + e) + 1;
                e = r.toString();
                esign = r < 0 ? "-" : "+";
            }
        }
        e = e.length == 1 ? "0" + e : e;
        const val = `${mantissa}.${fractional}${upcase ? "E" : "e"}${esign}${e}`;
        return this.padNum(val, n < 0);
    }
    fmtFloatF(n) {
        const special = this.fmtFloatSpecial(n);
        if (special !== "") {
            return special;
        }
        function expandNumber(n) {
            if (Number.isSafeInteger(n)) {
                return n.toString() + ".";
            }
            const t = n.toExponential().split("e");
            let m = t[0].replace(".", "");
            const e = parseInt(t[1]);
            if (e < 0) {
                let nStr = "0.";
                for(let i = 0; i !== Math.abs(e) - 1; ++i){
                    nStr += "0";
                }
                return nStr += m;
            } else {
                const splIdx = e + 1;
                while(m.length < splIdx){
                    m += "0";
                }
                return m.substr(0, splIdx) + "." + m.substr(splIdx);
            }
        }
        const val = expandNumber(Math.abs(n));
        const arr = val.split(".");
        let dig = arr[0];
        let fractional = arr[1];
        const precision = this.flags.precision !== -1 ? this.flags.precision : 6;
        let round = false;
        [fractional, round] = this.roundFractionToPrecision(fractional, precision);
        if (round) {
            dig = (parseInt(dig) + 1).toString();
        }
        return this.padNum(`${dig}.${fractional}`, n < 0);
    }
    fmtFloatG(n, upcase = false) {
        const special = this.fmtFloatSpecial(n);
        if (special !== "") {
            return special;
        }
        let P = this.flags.precision !== -1 ? this.flags.precision : 6;
        P = P === 0 ? 1 : P;
        const m = n.toExponential().match(FLOAT_REGEXP);
        if (!m) {
            throw Error("can't happen");
        }
        const X = parseInt(m[F.exponent]) * (m[F.esign] === "-" ? -1 : 1);
        let nStr = "";
        if (P > X && X >= -4) {
            this.flags.precision = P - (X + 1);
            nStr = this.fmtFloatF(n);
            if (!this.flags.sharp) {
                nStr = nStr.replace(/\.?0*$/, "");
            }
        } else {
            this.flags.precision = P - 1;
            nStr = this.fmtFloatE(n);
            if (!this.flags.sharp) {
                nStr = nStr.replace(/\.?0*e/, upcase ? "E" : "e");
            }
        }
        return nStr;
    }
    fmtString(s) {
        if (this.flags.precision !== -1) {
            s = s.substr(0, this.flags.precision);
        }
        return this.pad(s);
    }
    fmtHex(val, upper = false) {
        switch(typeof val){
            case "number":
                return this.fmtNumber(val, 16, upper);
            case "string":
                {
                    const sharp = this.flags.sharp && val.length !== 0;
                    let hex = sharp ? "0x" : "";
                    const prec = this.flags.precision;
                    const end = prec !== -1 ? min(prec, val.length) : val.length;
                    for(let i = 0; i !== end; ++i){
                        if (i !== 0 && this.flags.space) {
                            hex += sharp ? " 0x" : " ";
                        }
                        const c = (val.charCodeAt(i) & 0xff).toString(16);
                        hex += c.length === 1 ? `0${c}` : c;
                    }
                    if (upper) {
                        hex = hex.toUpperCase();
                    }
                    return this.pad(hex);
                }
            default:
                throw new Error("currently only number and string are implemented for hex");
        }
    }
    fmtV(val) {
        if (this.flags.sharp) {
            const options = this.flags.precision !== -1 ? {
                depth: this.flags.precision
            } : {};
            return this.pad(Deno.inspect(val, options));
        } else {
            const p = this.flags.precision;
            return p === -1 ? val.toString() : val.toString().substr(0, p);
        }
    }
    fmtJ(val) {
        return JSON.stringify(val);
    }
}
function sprintf(format, ...args) {
    const printf = new Printf(format, ...args);
    return printf.doPrintf();
}
function deferred1() {
    let methods;
    let state = "pending";
    const promise = new Promise((resolve, reject)=>{
        methods = {
            async resolve (value) {
                await value;
                state = "fulfilled";
                resolve(value);
            },
            reject (reason) {
                state = "rejected";
                reject(reason);
            }
        };
    });
    Object.defineProperty(promise, "state", {
        get: ()=>state
    });
    return Object.assign(promise, methods);
}
class MuxAsyncIterator1 {
    #iteratorCount = 0;
    #yields = [];
    #throws = [];
    #signal = deferred1();
    add(iterable) {
        ++this.#iteratorCount;
        this.#callIteratorNext(iterable[Symbol.asyncIterator]());
    }
    async #callIteratorNext(iterator) {
        try {
            const { value , done  } = await iterator.next();
            if (done) {
                --this.#iteratorCount;
            } else {
                this.#yields.push({
                    iterator,
                    value
                });
            }
        } catch (e) {
            this.#throws.push(e);
        }
        this.#signal.resolve();
    }
    async *iterate() {
        while(this.#iteratorCount > 0){
            await this.#signal;
            for(let i = 0; i < this.#yields.length; i++){
                const { iterator , value  } = this.#yields[i];
                yield value;
                this.#callIteratorNext(iterator);
            }
            if (this.#throws.length) {
                for (const e of this.#throws){
                    throw e;
                }
                this.#throws.length = 0;
            }
            this.#yields.length = 0;
            this.#signal = deferred1();
        }
    }
    [Symbol.asyncIterator]() {
        return this.iterate();
    }
}
const { Deno: Deno1  } = globalThis;
const noColor = typeof Deno1?.noColor === "boolean" ? Deno1.noColor : true;
let enabled = !noColor;
function code(open, close) {
    return {
        open: `\x1b[${open.join(";")}m`,
        close: `\x1b[${close}m`,
        regexp: new RegExp(`\\x1b\\[${close}m`, "g")
    };
}
function run(str, code) {
    return enabled ? `${code.open}${str.replace(code.regexp, code.open)}${code.close}` : str;
}
function bold(str) {
    return run(str, code([
        1
    ], 22));
}
function red(str) {
    return run(str, code([
        31
    ], 39));
}
function green(str) {
    return run(str, code([
        32
    ], 39));
}
function white(str) {
    return run(str, code([
        37
    ], 39));
}
function gray(str) {
    return brightBlack(str);
}
function brightBlack(str) {
    return run(str, code([
        90
    ], 39));
}
function bgRed(str) {
    return run(str, code([
        41
    ], 49));
}
function bgGreen(str) {
    return run(str, code([
        42
    ], 49));
}
new RegExp([
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"
].join("|"), "g");
var DiffType1;
(function(DiffType) {
    DiffType["removed"] = "removed";
    DiffType["common"] = "common";
    DiffType["added"] = "added";
})(DiffType1 || (DiffType1 = {}));
const REMOVED = 1;
const COMMON = 2;
const ADDED = 3;
function createCommon(A, B, reverse) {
    const common = [];
    if (A.length === 0 || B.length === 0) return [];
    for(let i = 0; i < Math.min(A.length, B.length); i += 1){
        if (A[reverse ? A.length - i - 1 : i] === B[reverse ? B.length - i - 1 : i]) {
            common.push(A[reverse ? A.length - i - 1 : i]);
        } else {
            return common;
        }
    }
    return common;
}
function diff(A, B) {
    const prefixCommon = createCommon(A, B);
    const suffixCommon = createCommon(A.slice(prefixCommon.length), B.slice(prefixCommon.length), true).reverse();
    A = suffixCommon.length ? A.slice(prefixCommon.length, -suffixCommon.length) : A.slice(prefixCommon.length);
    B = suffixCommon.length ? B.slice(prefixCommon.length, -suffixCommon.length) : B.slice(prefixCommon.length);
    const swapped = B.length > A.length;
    [A, B] = swapped ? [
        B,
        A
    ] : [
        A,
        B
    ];
    const M = A.length;
    const N = B.length;
    if (!M && !N && !suffixCommon.length && !prefixCommon.length) return [];
    if (!N) {
        return [
            ...prefixCommon.map((c)=>({
                    type: DiffType1.common,
                    value: c
                })),
            ...A.map((a)=>({
                    type: swapped ? DiffType1.added : DiffType1.removed,
                    value: a
                })),
            ...suffixCommon.map((c)=>({
                    type: DiffType1.common,
                    value: c
                }))
        ];
    }
    const offset = N;
    const delta = M - N;
    const size = M + N + 1;
    const fp = Array.from({
        length: size
    }, ()=>({
            y: -1,
            id: -1
        }));
    const routes = new Uint32Array((M * N + size + 1) * 2);
    const diffTypesPtrOffset = routes.length / 2;
    let ptr = 0;
    let p = -1;
    function backTrace(A, B, current, swapped) {
        const M = A.length;
        const N = B.length;
        const result = [];
        let a = M - 1;
        let b = N - 1;
        let j = routes[current.id];
        let type = routes[current.id + diffTypesPtrOffset];
        while(true){
            if (!j && !type) break;
            const prev = j;
            if (type === 1) {
                result.unshift({
                    type: swapped ? DiffType1.removed : DiffType1.added,
                    value: B[b]
                });
                b -= 1;
            } else if (type === 3) {
                result.unshift({
                    type: swapped ? DiffType1.added : DiffType1.removed,
                    value: A[a]
                });
                a -= 1;
            } else {
                result.unshift({
                    type: DiffType1.common,
                    value: A[a]
                });
                a -= 1;
                b -= 1;
            }
            j = routes[prev];
            type = routes[prev + diffTypesPtrOffset];
        }
        return result;
    }
    function createFP(slide, down, k, M) {
        if (slide && slide.y === -1 && down && down.y === -1) {
            return {
                y: 0,
                id: 0
            };
        }
        if (down && down.y === -1 || k === M || (slide && slide.y) > (down && down.y) + 1) {
            const prev = slide.id;
            ptr++;
            routes[ptr] = prev;
            routes[ptr + diffTypesPtrOffset] = ADDED;
            return {
                y: slide.y,
                id: ptr
            };
        } else {
            const prev1 = down.id;
            ptr++;
            routes[ptr] = prev1;
            routes[ptr + diffTypesPtrOffset] = REMOVED;
            return {
                y: down.y + 1,
                id: ptr
            };
        }
    }
    function snake(k, slide, down, _offset, A, B) {
        const M = A.length;
        const N = B.length;
        if (k < -N || M < k) return {
            y: -1,
            id: -1
        };
        const fp = createFP(slide, down, k, M);
        while(fp.y + k < M && fp.y < N && A[fp.y + k] === B[fp.y]){
            const prev = fp.id;
            ptr++;
            fp.id = ptr;
            fp.y += 1;
            routes[ptr] = prev;
            routes[ptr + diffTypesPtrOffset] = COMMON;
        }
        return fp;
    }
    while(fp[delta + offset].y < N){
        p = p + 1;
        for(let k = -p; k < delta; ++k){
            fp[k + offset] = snake(k, fp[k - 1 + offset], fp[k + 1 + offset], offset, A, B);
        }
        for(let k1 = delta + p; k1 > delta; --k1){
            fp[k1 + offset] = snake(k1, fp[k1 - 1 + offset], fp[k1 + 1 + offset], offset, A, B);
        }
        fp[delta + offset] = snake(delta, fp[delta - 1 + offset], fp[delta + 1 + offset], offset, A, B);
    }
    return [
        ...prefixCommon.map((c)=>({
                type: DiffType1.common,
                value: c
            })),
        ...backTrace(A, B, fp[delta + offset], swapped),
        ...suffixCommon.map((c)=>({
                type: DiffType1.common,
                value: c
            }))
    ];
}
function diffstr(A, B) {
    function unescape(string) {
        return string.replaceAll("\b", "\\b").replaceAll("\f", "\\f").replaceAll("\t", "\\t").replaceAll("\v", "\\v").replaceAll(/\r\n|\r|\n/g, (str)=>str === "\r" ? "\\r" : str === "\n" ? "\\n\n" : "\\r\\n\r\n");
    }
    function tokenize(string, { wordDiff =false  } = {}) {
        if (wordDiff) {
            const tokens = string.split(/([^\S\r\n]+|[()[\]{}'"\r\n]|\b)/);
            const words = /^[a-zA-Z\u{C0}-\u{FF}\u{D8}-\u{F6}\u{F8}-\u{2C6}\u{2C8}-\u{2D7}\u{2DE}-\u{2FF}\u{1E00}-\u{1EFF}]+$/u;
            for(let i = 0; i < tokens.length - 1; i++){
                if (!tokens[i + 1] && tokens[i + 2] && words.test(tokens[i]) && words.test(tokens[i + 2])) {
                    tokens[i] += tokens[i + 2];
                    tokens.splice(i + 1, 2);
                    i--;
                }
            }
            return tokens.filter((token)=>token);
        } else {
            const tokens1 = [], lines = string.split(/(\n|\r\n)/);
            if (!lines[lines.length - 1]) {
                lines.pop();
            }
            for(let i1 = 0; i1 < lines.length; i1++){
                if (i1 % 2) {
                    tokens1[tokens1.length - 1] += lines[i1];
                } else {
                    tokens1.push(lines[i1]);
                }
            }
            return tokens1;
        }
    }
    function createDetails(line, tokens) {
        return tokens.filter(({ type  })=>type === line.type || type === DiffType1.common).map((result, i, t)=>{
            if (result.type === DiffType1.common && t[i - 1] && t[i - 1]?.type === t[i + 1]?.type && /\s+/.test(result.value)) {
                result.type = t[i - 1].type;
            }
            return result;
        });
    }
    const diffResult = diff(tokenize(`${unescape(A)}\n`), tokenize(`${unescape(B)}\n`));
    const added = [], removed = [];
    for (const result of diffResult){
        if (result.type === DiffType1.added) {
            added.push(result);
        }
        if (result.type === DiffType1.removed) {
            removed.push(result);
        }
    }
    const aLines = added.length < removed.length ? added : removed;
    const bLines = aLines === removed ? added : removed;
    for (const a of aLines){
        let tokens = [], b;
        while(bLines.length){
            b = bLines.shift();
            tokens = diff(tokenize(a.value, {
                wordDiff: true
            }), tokenize(b?.value ?? "", {
                wordDiff: true
            }));
            if (tokens.some(({ type , value  })=>type === DiffType1.common && value.trim().length)) {
                break;
            }
        }
        a.details = createDetails(a, tokens);
        if (b) {
            b.details = createDetails(b, tokens);
        }
    }
    return diffResult;
}
function createColor(diffType, { background =false  } = {}) {
    switch(diffType){
        case DiffType1.added:
            return (s)=>background ? bgGreen(white(s)) : green(bold(s));
        case DiffType1.removed:
            return (s)=>background ? bgRed(white(s)) : red(bold(s));
        default:
            return white;
    }
}
function createSign(diffType) {
    switch(diffType){
        case DiffType1.added:
            return "+   ";
        case DiffType1.removed:
            return "-   ";
        default:
            return "    ";
    }
}
function buildMessage(diffResult, { stringDiff =false  } = {}) {
    const messages = [], diffMessages = [];
    messages.push("");
    messages.push("");
    messages.push(`    ${gray(bold("[Diff]"))} ${red(bold("Actual"))} / ${green(bold("Expected"))}`);
    messages.push("");
    messages.push("");
    diffResult.forEach((result)=>{
        const c = createColor(result.type);
        const line = result.details?.map((detail)=>detail.type !== DiffType1.common ? createColor(detail.type, {
                background: true
            })(detail.value) : detail.value).join("") ?? result.value;
        diffMessages.push(c(`${createSign(result.type)}${line}`));
    });
    messages.push(...stringDiff ? [
        diffMessages.join("")
    ] : diffMessages);
    messages.push("");
    return messages;
}
function format(v) {
    const { Deno: Deno1  } = globalThis;
    return typeof Deno1?.inspect === "function" ? Deno1.inspect(v, {
        depth: Infinity,
        sorted: true,
        trailingComma: true,
        compact: false,
        iterableLimit: Infinity,
        getters: true
    }) : `"${String(v).replace(/(?=["\\])/g, "\\")}"`;
}
const CAN_NOT_DISPLAY = "[Cannot display]";
class AssertionError extends Error {
    name = "AssertionError";
    constructor(message){
        super(message);
    }
}
function isKeyedCollection(x) {
    return [
        Symbol.iterator,
        "size"
    ].every((k)=>k in x);
}
function equal(c, d) {
    const seen = new Map();
    return function compare(a, b) {
        if (a && b && (a instanceof RegExp && b instanceof RegExp || a instanceof URL && b instanceof URL)) {
            return String(a) === String(b);
        }
        if (a instanceof Date && b instanceof Date) {
            const aTime = a.getTime();
            const bTime = b.getTime();
            if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
                return true;
            }
            return aTime === bTime;
        }
        if (typeof a === "number" && typeof b === "number") {
            return Number.isNaN(a) && Number.isNaN(b) || a === b;
        }
        if (Object.is(a, b)) {
            return true;
        }
        if (a && typeof a === "object" && b && typeof b === "object") {
            if (a && b && !constructorsEqual(a, b)) {
                return false;
            }
            if (a instanceof WeakMap || b instanceof WeakMap) {
                if (!(a instanceof WeakMap && b instanceof WeakMap)) return false;
                throw new TypeError("cannot compare WeakMap instances");
            }
            if (a instanceof WeakSet || b instanceof WeakSet) {
                if (!(a instanceof WeakSet && b instanceof WeakSet)) return false;
                throw new TypeError("cannot compare WeakSet instances");
            }
            if (seen.get(a) === b) {
                return true;
            }
            if (Object.keys(a || {}).length !== Object.keys(b || {}).length) {
                return false;
            }
            seen.set(a, b);
            if (isKeyedCollection(a) && isKeyedCollection(b)) {
                if (a.size !== b.size) {
                    return false;
                }
                let unmatchedEntries = a.size;
                for (const [aKey, aValue] of a.entries()){
                    for (const [bKey, bValue] of b.entries()){
                        if (aKey === aValue && bKey === bValue && compare(aKey, bKey) || compare(aKey, bKey) && compare(aValue, bValue)) {
                            unmatchedEntries--;
                            break;
                        }
                    }
                }
                return unmatchedEntries === 0;
            }
            const merged = {
                ...a,
                ...b
            };
            for (const key of [
                ...Object.getOwnPropertyNames(merged),
                ...Object.getOwnPropertySymbols(merged)
            ]){
                if (!compare(a && a[key], b && b[key])) {
                    return false;
                }
                if (key in a && !(key in b) || key in b && !(key in a)) {
                    return false;
                }
            }
            if (a instanceof WeakRef || b instanceof WeakRef) {
                if (!(a instanceof WeakRef && b instanceof WeakRef)) return false;
                return compare(a.deref(), b.deref());
            }
            return true;
        }
        return false;
    }(c, d);
}
function constructorsEqual(a, b) {
    return a.constructor === b.constructor || a.constructor === Object && !b.constructor || !a.constructor && b.constructor === Object;
}
function assert1(expr, msg = "") {
    if (!expr) {
        throw new AssertionError(msg);
    }
}
function assertEquals(actual, expected, msg) {
    if (equal(actual, expected)) {
        return;
    }
    let message = "";
    const actualString = format(actual);
    const expectedString = format(expected);
    try {
        const stringDiff = typeof actual === "string" && typeof expected === "string";
        const diffResult = stringDiff ? diffstr(actual, expected) : diff(actualString.split("\n"), expectedString.split("\n"));
        const diffMsg = buildMessage(diffResult, {
            stringDiff
        }).join("\n");
        message = `Values are not equal:\n${diffMsg}`;
    } catch  {
        message = `\n${red(CAN_NOT_DISPLAY)} + \n\n`;
    }
    if (msg) {
        message = msg;
    }
    throw new AssertionError(message);
}
function unreachable() {
    throw new AssertionError("unreachable");
}
class DenoStdInternalError1 extends Error {
    constructor(message){
        super(message);
        this.name = "DenoStdInternalError";
    }
}
function assert2(expr, msg = "") {
    if (!expr) {
        throw new DenoStdInternalError1(msg);
    }
}
function indexOfNeedle(source, needle, start = 0) {
    if (start >= source.length) {
        return -1;
    }
    if (start < 0) {
        start = Math.max(0, source.length + start);
    }
    const s = needle[0];
    for(let i = start; i < source.length; i++){
        if (source[i] !== s) continue;
        const pin = i;
        let matched = 1;
        let j = i;
        while(matched < needle.length){
            j++;
            if (source[j] !== needle[j - pin]) {
                break;
            }
            matched++;
        }
        if (matched === needle.length) {
            return pin;
        }
    }
    return -1;
}
function notImplemented(msg) {
    const message = msg ? `Not implemented: ${msg}` : "Not implemented";
    throw new Error(message);
}
TextDecoder;
TextEncoder;
function spliceOne(list, index) {
    for(; index + 1 < list.length; index++)list[index] = list[index + 1];
    list.pop();
}
function normalizeEncoding1(enc) {
    if (enc == null || enc === "utf8" || enc === "utf-8") return "utf8";
    return slowCases1(enc);
}
function slowCases1(enc) {
    switch(enc.length){
        case 4:
            if (enc === "UTF8") return "utf8";
            if (enc === "ucs2" || enc === "UCS2") return "utf16le";
            enc = `${enc}`.toLowerCase();
            if (enc === "utf8") return "utf8";
            if (enc === "ucs2") return "utf16le";
            break;
        case 3:
            if (enc === "hex" || enc === "HEX" || `${enc}`.toLowerCase() === "hex") {
                return "hex";
            }
            break;
        case 5:
            if (enc === "ascii") return "ascii";
            if (enc === "ucs-2") return "utf16le";
            if (enc === "UTF-8") return "utf8";
            if (enc === "ASCII") return "ascii";
            if (enc === "UCS-2") return "utf16le";
            enc = `${enc}`.toLowerCase();
            if (enc === "utf-8") return "utf8";
            if (enc === "ascii") return "ascii";
            if (enc === "ucs-2") return "utf16le";
            break;
        case 6:
            if (enc === "base64") return "base64";
            if (enc === "latin1" || enc === "binary") return "latin1";
            if (enc === "BASE64") return "base64";
            if (enc === "LATIN1" || enc === "BINARY") return "latin1";
            enc = `${enc}`.toLowerCase();
            if (enc === "base64") return "base64";
            if (enc === "latin1" || enc === "binary") return "latin1";
            break;
        case 7:
            if (enc === "utf16le" || enc === "UTF16LE" || `${enc}`.toLowerCase() === "utf16le") {
                return "utf16le";
            }
            break;
        case 8:
            if (enc === "utf-16le" || enc === "UTF-16LE" || `${enc}`.toLowerCase() === "utf-16le") {
                return "utf16le";
            }
            break;
        default:
            if (enc === "") return "utf8";
    }
}
const isNumericLookup = {};
function isArrayIndex(value) {
    switch(typeof value){
        case "number":
            return value >= 0 && (value | 0) === value;
        case "string":
            {
                const result = isNumericLookup[value];
                if (result !== void 0) {
                    return result;
                }
                const length = value.length;
                if (length === 0) {
                    return isNumericLookup[value] = false;
                }
                let ch = 0;
                let i = 0;
                for(; i < length; ++i){
                    ch = value.charCodeAt(i);
                    if (i === 0 && ch === 0x30 && length > 1 || ch < 0x30 || ch > 0x39) {
                        return isNumericLookup[value] = false;
                    }
                }
                return isNumericLookup[value] = true;
            }
        default:
            return false;
    }
}
function getOwnNonIndexProperties(obj, filter) {
    let allProperties = [
        ...Object.getOwnPropertyNames(obj),
        ...Object.getOwnPropertySymbols(obj)
    ];
    if (Array.isArray(obj)) {
        allProperties = allProperties.filter((k)=>!isArrayIndex(k));
    }
    if (filter === 0) {
        return allProperties;
    }
    const result = [];
    for (const key of allProperties){
        const desc = Object.getOwnPropertyDescriptor(obj, key);
        if (desc === undefined) {
            continue;
        }
        if (filter & 1 && !desc.writable) {
            continue;
        }
        if (filter & 2 && !desc.enumerable) {
            continue;
        }
        if (filter & 4 && !desc.configurable) {
            continue;
        }
        if (filter & 8 && typeof key === "string") {
            continue;
        }
        if (filter & 16 && typeof key === "symbol") {
            continue;
        }
        result.push(key);
    }
    return result;
}
const kObjectType = 0;
const kArrayExtrasType = 2;
const kRejected = 2;
const meta = [
    '\\x00',
    '\\x01',
    '\\x02',
    '\\x03',
    '\\x04',
    '\\x05',
    '\\x06',
    '\\x07',
    '\\b',
    '\\t',
    '\\n',
    '\\x0B',
    '\\f',
    '\\r',
    '\\x0E',
    '\\x0F',
    '\\x10',
    '\\x11',
    '\\x12',
    '\\x13',
    '\\x14',
    '\\x15',
    '\\x16',
    '\\x17',
    '\\x18',
    '\\x19',
    '\\x1A',
    '\\x1B',
    '\\x1C',
    '\\x1D',
    '\\x1E',
    '\\x1F',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    "\\'",
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '\\\\',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '\\x7F',
    '\\x80',
    '\\x81',
    '\\x82',
    '\\x83',
    '\\x84',
    '\\x85',
    '\\x86',
    '\\x87',
    '\\x88',
    '\\x89',
    '\\x8A',
    '\\x8B',
    '\\x8C',
    '\\x8D',
    '\\x8E',
    '\\x8F',
    '\\x90',
    '\\x91',
    '\\x92',
    '\\x93',
    '\\x94',
    '\\x95',
    '\\x96',
    '\\x97',
    '\\x98',
    '\\x99',
    '\\x9A',
    '\\x9B',
    '\\x9C',
    '\\x9D',
    '\\x9E',
    '\\x9F'
];
const isUndetectableObject = (v)=>typeof v === "undefined" && v !== undefined;
const strEscapeSequencesRegExp = /[\x00-\x1f\x27\x5c\x7f-\x9f]/;
const strEscapeSequencesReplacer = /[\x00-\x1f\x27\x5c\x7f-\x9f]/g;
const strEscapeSequencesRegExpSingle = /[\x00-\x1f\x5c\x7f-\x9f]/;
const strEscapeSequencesReplacerSingle = /[\x00-\x1f\x5c\x7f-\x9f]/g;
const keyStrRegExp = /^[a-zA-Z_][a-zA-Z_0-9]*$/;
const numberRegExp = /^(0|[1-9][0-9]*)$/;
const nodeModulesRegExp = /[/\\]node_modules[/\\](.+?)(?=[/\\])/g;
const classRegExp = /^(\s+[^(]*?)\s*{/;
const stripCommentsRegExp = /(\/\/.*?\n)|(\/\*(.|\n)*?\*\/)/g;
const inspectDefaultOptions = {
    showHidden: false,
    depth: 2,
    colors: false,
    customInspect: true,
    showProxy: false,
    maxArrayLength: 100,
    maxStringLength: 10000,
    breakLength: 80,
    compact: 3,
    sorted: false,
    getters: false
};
function getUserOptions(ctx, isCrossContext) {
    const ret = {
        stylize: ctx.stylize,
        showHidden: ctx.showHidden,
        depth: ctx.depth,
        colors: ctx.colors,
        customInspect: ctx.customInspect,
        showProxy: ctx.showProxy,
        maxArrayLength: ctx.maxArrayLength,
        maxStringLength: ctx.maxStringLength,
        breakLength: ctx.breakLength,
        compact: ctx.compact,
        sorted: ctx.sorted,
        getters: ctx.getters,
        ...ctx.userOptions
    };
    if (isCrossContext) {
        Object.setPrototypeOf(ret, null);
        for (const key of Object.keys(ret)){
            if ((typeof ret[key] === "object" || typeof ret[key] === "function") && ret[key] !== null) {
                delete ret[key];
            }
        }
        ret.stylize = Object.setPrototypeOf((value, flavour)=>{
            let stylized;
            try {
                stylized = `${ctx.stylize(value, flavour)}`;
            } catch  {}
            if (typeof stylized !== "string") return value;
            return stylized;
        }, null);
    }
    return ret;
}
function inspect(value, opts) {
    const ctx = {
        budget: {},
        indentationLvl: 0,
        seen: [],
        currentDepth: 0,
        stylize: stylizeNoColor,
        showHidden: inspectDefaultOptions.showHidden,
        depth: inspectDefaultOptions.depth,
        colors: inspectDefaultOptions.colors,
        customInspect: inspectDefaultOptions.customInspect,
        showProxy: inspectDefaultOptions.showProxy,
        maxArrayLength: inspectDefaultOptions.maxArrayLength,
        maxStringLength: inspectDefaultOptions.maxStringLength,
        breakLength: inspectDefaultOptions.breakLength,
        compact: inspectDefaultOptions.compact,
        sorted: inspectDefaultOptions.sorted,
        getters: inspectDefaultOptions.getters
    };
    if (arguments.length > 1) {
        if (arguments.length > 2) {
            if (arguments[2] !== undefined) {
                ctx.depth = arguments[2];
            }
            if (arguments.length > 3 && arguments[3] !== undefined) {
                ctx.colors = arguments[3];
            }
        }
        if (typeof opts === "boolean") {
            ctx.showHidden = opts;
        } else if (opts) {
            const optKeys = Object.keys(opts);
            for(let i = 0; i < optKeys.length; ++i){
                const key = optKeys[i];
                if (inspectDefaultOptions.hasOwnProperty(key) || key === "stylize") {
                    ctx[key] = opts[key];
                } else if (ctx.userOptions === undefined) {
                    ctx.userOptions = opts;
                }
            }
        }
    }
    if (ctx.colors) ctx.stylize = stylizeWithColor;
    if (ctx.maxArrayLength === null) ctx.maxArrayLength = Infinity;
    if (ctx.maxStringLength === null) ctx.maxStringLength = Infinity;
    return formatValue(ctx, value, 0);
}
const customInspectSymbol = Symbol.for("nodejs.util.inspect.custom");
inspect.custom = customInspectSymbol;
Object.defineProperty(inspect, "defaultOptions", {
    get () {
        return inspectDefaultOptions;
    },
    set (options) {
        validateObject(options, "options");
        return Object.assign(inspectDefaultOptions, options);
    }
});
const defaultFG = 39;
const defaultBG = 49;
inspect.colors = Object.assign(Object.create(null), {
    reset: [
        0,
        0
    ],
    bold: [
        1,
        22
    ],
    dim: [
        2,
        22
    ],
    italic: [
        3,
        23
    ],
    underline: [
        4,
        24
    ],
    blink: [
        5,
        25
    ],
    inverse: [
        7,
        27
    ],
    hidden: [
        8,
        28
    ],
    strikethrough: [
        9,
        29
    ],
    doubleunderline: [
        21,
        24
    ],
    black: [
        30,
        defaultFG
    ],
    red: [
        31,
        defaultFG
    ],
    green: [
        32,
        defaultFG
    ],
    yellow: [
        33,
        defaultFG
    ],
    blue: [
        34,
        defaultFG
    ],
    magenta: [
        35,
        defaultFG
    ],
    cyan: [
        36,
        defaultFG
    ],
    white: [
        37,
        defaultFG
    ],
    bgBlack: [
        40,
        defaultBG
    ],
    bgRed: [
        41,
        defaultBG
    ],
    bgGreen: [
        42,
        defaultBG
    ],
    bgYellow: [
        43,
        defaultBG
    ],
    bgBlue: [
        44,
        defaultBG
    ],
    bgMagenta: [
        45,
        defaultBG
    ],
    bgCyan: [
        46,
        defaultBG
    ],
    bgWhite: [
        47,
        defaultBG
    ],
    framed: [
        51,
        54
    ],
    overlined: [
        53,
        55
    ],
    gray: [
        90,
        defaultFG
    ],
    redBright: [
        91,
        defaultFG
    ],
    greenBright: [
        92,
        defaultFG
    ],
    yellowBright: [
        93,
        defaultFG
    ],
    blueBright: [
        94,
        defaultFG
    ],
    magentaBright: [
        95,
        defaultFG
    ],
    cyanBright: [
        96,
        defaultFG
    ],
    whiteBright: [
        97,
        defaultFG
    ],
    bgGray: [
        100,
        defaultBG
    ],
    bgRedBright: [
        101,
        defaultBG
    ],
    bgGreenBright: [
        102,
        defaultBG
    ],
    bgYellowBright: [
        103,
        defaultBG
    ],
    bgBlueBright: [
        104,
        defaultBG
    ],
    bgMagentaBright: [
        105,
        defaultBG
    ],
    bgCyanBright: [
        106,
        defaultBG
    ],
    bgWhiteBright: [
        107,
        defaultBG
    ]
});
function defineColorAlias(target, alias) {
    Object.defineProperty(inspect.colors, alias, {
        get () {
            return this[target];
        },
        set (value) {
            this[target] = value;
        },
        configurable: true,
        enumerable: false
    });
}
defineColorAlias("gray", "grey");
defineColorAlias("gray", "blackBright");
defineColorAlias("bgGray", "bgGrey");
defineColorAlias("bgGray", "bgBlackBright");
defineColorAlias("dim", "faint");
defineColorAlias("strikethrough", "crossedout");
defineColorAlias("strikethrough", "strikeThrough");
defineColorAlias("strikethrough", "crossedOut");
defineColorAlias("hidden", "conceal");
defineColorAlias("inverse", "swapColors");
defineColorAlias("inverse", "swapcolors");
defineColorAlias("doubleunderline", "doubleUnderline");
inspect.styles = Object.assign(Object.create(null), {
    special: "cyan",
    number: "yellow",
    bigint: "yellow",
    boolean: "yellow",
    undefined: "grey",
    null: "bold",
    string: "green",
    symbol: "green",
    date: "magenta",
    regexp: "red",
    module: "underline"
});
function addQuotes(str, quotes) {
    if (quotes === -1) {
        return `"${str}"`;
    }
    if (quotes === -2) {
        return `\`${str}\``;
    }
    return `'${str}'`;
}
const escapeFn = (str)=>meta[str.charCodeAt(0)];
function strEscape(str) {
    let escapeTest = strEscapeSequencesRegExp;
    let escapeReplace = strEscapeSequencesReplacer;
    let singleQuote = 39;
    if (str.includes("'")) {
        if (!str.includes('"')) {
            singleQuote = -1;
        } else if (!str.includes("`") && !str.includes("${")) {
            singleQuote = -2;
        }
        if (singleQuote !== 39) {
            escapeTest = strEscapeSequencesRegExpSingle;
            escapeReplace = strEscapeSequencesReplacerSingle;
        }
    }
    if (str.length < 5000 && !escapeTest.test(str)) {
        return addQuotes(str, singleQuote);
    }
    if (str.length > 100) {
        str = str.replace(escapeReplace, escapeFn);
        return addQuotes(str, singleQuote);
    }
    let result = "";
    let last = 0;
    const lastIndex = str.length;
    for(let i = 0; i < lastIndex; i++){
        const point = str.charCodeAt(i);
        if (point === singleQuote || point === 92 || point < 32 || point > 126 && point < 160) {
            if (last === i) {
                result += meta[point];
            } else {
                result += `${str.slice(last, i)}${meta[point]}`;
            }
            last = i + 1;
        }
    }
    if (last !== lastIndex) {
        result += str.slice(last);
    }
    return addQuotes(result, singleQuote);
}
function stylizeWithColor(str, styleType) {
    const style = inspect.styles[styleType];
    if (style !== undefined) {
        const color = inspect.colors[style];
        if (color !== undefined) {
            return `\u001b[${color[0]}m${str}\u001b[${color[1]}m`;
        }
    }
    return str;
}
function stylizeNoColor(str) {
    return str;
}
function formatValue(ctx, value, recurseTimes, typedArray) {
    if (typeof value !== "object" && typeof value !== "function" && !isUndetectableObject(value)) {
        return formatPrimitive(ctx.stylize, value, ctx);
    }
    if (value === null) {
        return ctx.stylize("null", "null");
    }
    const context = value;
    const proxy = undefined;
    if (ctx.customInspect) {
        const maybeCustom = value[customInspectSymbol];
        if (typeof maybeCustom === "function" && maybeCustom !== inspect && !(value.constructor && value.constructor.prototype === value)) {
            const depth = ctx.depth === null ? null : ctx.depth - recurseTimes;
            const isCrossContext = proxy !== undefined || !(context instanceof Object);
            const ret = maybeCustom.call(context, depth, getUserOptions(ctx, isCrossContext));
            if (ret !== context) {
                if (typeof ret !== "string") {
                    return formatValue(ctx, ret, recurseTimes);
                }
                return ret.replace(/\n/g, `\n${" ".repeat(ctx.indentationLvl)}`);
            }
        }
    }
    if (ctx.seen.includes(value)) {
        let index = 1;
        if (ctx.circular === undefined) {
            ctx.circular = new Map();
            ctx.circular.set(value, index);
        } else {
            index = ctx.circular.get(value);
            if (index === undefined) {
                index = ctx.circular.size + 1;
                ctx.circular.set(value, index);
            }
        }
        return ctx.stylize(`[Circular *${index}]`, "special");
    }
    return formatRaw(ctx, value, recurseTimes, typedArray);
}
function formatRaw(ctx, value, recurseTimes, typedArray) {
    let keys;
    let protoProps;
    if (ctx.showHidden && (recurseTimes <= ctx.depth || ctx.depth === null)) {
        protoProps = [];
    }
    const constructor = getConstructorName(value, ctx, recurseTimes, protoProps);
    if (protoProps !== undefined && protoProps.length === 0) {
        protoProps = undefined;
    }
    let tag = value[Symbol.toStringTag];
    if (typeof tag !== "string") {
        tag = "";
    }
    let base = "";
    let formatter = getEmptyFormatArray;
    let braces;
    let noIterator = true;
    let i = 0;
    const filter = ctx.showHidden ? 0 : 2;
    let extrasType = 0;
    if (value[Symbol.iterator] || constructor === null) {
        noIterator = false;
        if (Array.isArray(value)) {
            const prefix = constructor !== "Array" || tag !== "" ? getPrefix(constructor, tag, "Array", `(${value.length})`) : "";
            keys = getOwnNonIndexProperties(value, filter);
            braces = [
                `${prefix}[`,
                "]"
            ];
            if (value.length === 0 && keys.length === 0 && protoProps === undefined) {
                return `${braces[0]}]`;
            }
            extrasType = kArrayExtrasType;
            formatter = formatArray;
        } else if (isSet1(value)) {
            const size = value.size;
            const prefix1 = getPrefix(constructor, tag, "Set", `(${size})`);
            keys = getKeys(value, ctx.showHidden);
            formatter = constructor !== null ? formatSet.bind(null, value) : formatSet.bind(null, value.values());
            if (size === 0 && keys.length === 0 && protoProps === undefined) {
                return `${prefix1}{}`;
            }
            braces = [
                `${prefix1}{`,
                "}"
            ];
        } else if (isMap1(value)) {
            const size1 = value.size;
            const prefix2 = getPrefix(constructor, tag, "Map", `(${size1})`);
            keys = getKeys(value, ctx.showHidden);
            formatter = constructor !== null ? formatMap.bind(null, value) : formatMap.bind(null, value.entries());
            if (size1 === 0 && keys.length === 0 && protoProps === undefined) {
                return `${prefix2}{}`;
            }
            braces = [
                `${prefix2}{`,
                "}"
            ];
        } else if (isTypedArray(value)) {
            keys = getOwnNonIndexProperties(value, filter);
            const bound = value;
            const fallback = "";
            if (constructor === null) {}
            const size2 = value.length;
            const prefix3 = getPrefix(constructor, tag, fallback, `(${size2})`);
            braces = [
                `${prefix3}[`,
                "]"
            ];
            if (value.length === 0 && keys.length === 0 && !ctx.showHidden) {
                return `${braces[0]}]`;
            }
            formatter = formatTypedArray.bind(null, bound, size2);
            extrasType = kArrayExtrasType;
        } else if (isMapIterator1(value)) {
            keys = getKeys(value, ctx.showHidden);
            braces = getIteratorBraces("Map", tag);
            formatter = formatIterator.bind(null, braces);
        } else if (isSetIterator1(value)) {
            keys = getKeys(value, ctx.showHidden);
            braces = getIteratorBraces("Set", tag);
            formatter = formatIterator.bind(null, braces);
        } else {
            noIterator = true;
        }
    }
    if (noIterator) {
        keys = getKeys(value, ctx.showHidden);
        braces = [
            "{",
            "}"
        ];
        if (constructor === "Object") {
            if (isArgumentsObject1(value)) {
                braces[0] = "[Arguments] {";
            } else if (tag !== "") {
                braces[0] = `${getPrefix(constructor, tag, "Object")}{`;
            }
            if (keys.length === 0 && protoProps === undefined) {
                return `${braces[0]}}`;
            }
        } else if (typeof value === "function") {
            base = getFunctionBase(value, constructor, tag);
            if (keys.length === 0 && protoProps === undefined) {
                return ctx.stylize(base, "special");
            }
        } else if (isRegExp1(value)) {
            base = RegExp(constructor !== null ? value : new RegExp(value)).toString();
            const prefix4 = getPrefix(constructor, tag, "RegExp");
            if (prefix4 !== "RegExp ") {
                base = `${prefix4}${base}`;
            }
            if (keys.length === 0 && protoProps === undefined || recurseTimes > ctx.depth && ctx.depth !== null) {
                return ctx.stylize(base, "regexp");
            }
        } else if (isDate1(value)) {
            base = Number.isNaN(value.getTime()) ? value.toString() : value.toISOString();
            const prefix5 = getPrefix(constructor, tag, "Date");
            if (prefix5 !== "Date ") {
                base = `${prefix5}${base}`;
            }
            if (keys.length === 0 && protoProps === undefined) {
                return ctx.stylize(base, "date");
            }
        } else if (value instanceof Error) {
            base = formatError(value, constructor, tag, ctx, keys);
            if (keys.length === 0 && protoProps === undefined) {
                return base;
            }
        } else if (isAnyArrayBuffer1(value)) {
            const arrayType = isArrayBuffer1(value) ? "ArrayBuffer" : "SharedArrayBuffer";
            const prefix6 = getPrefix(constructor, tag, arrayType);
            if (typedArray === undefined) {
                formatter = formatArrayBuffer;
            } else if (keys.length === 0 && protoProps === undefined) {
                return prefix6 + `{ byteLength: ${formatNumber(ctx.stylize, value.byteLength)} }`;
            }
            braces[0] = `${prefix6}{`;
            Array.prototype.unshift.call(keys, "byteLength");
        } else if (isDataView1(value)) {
            braces[0] = `${getPrefix(constructor, tag, "DataView")}{`;
            Array.prototype.unshift.call(keys, "byteLength", "byteOffset", "buffer");
        } else if (isPromise1(value)) {
            braces[0] = `${getPrefix(constructor, tag, "Promise")}{`;
            formatter = formatPromise;
        } else if (isWeakSet1(value)) {
            braces[0] = `${getPrefix(constructor, tag, "WeakSet")}{`;
            formatter = ctx.showHidden ? formatWeakSet : formatWeakCollection;
        } else if (isWeakMap1(value)) {
            braces[0] = `${getPrefix(constructor, tag, "WeakMap")}{`;
            formatter = ctx.showHidden ? formatWeakMap : formatWeakCollection;
        } else if (isModuleNamespaceObject1(value)) {
            braces[0] = `${getPrefix(constructor, tag, "Module")}{`;
            formatter = formatNamespaceObject.bind(null, keys);
        } else if (isBoxedPrimitive1(value)) {
            base = getBoxedBase(value, ctx, keys, constructor, tag);
            if (keys.length === 0 && protoProps === undefined) {
                return base;
            }
        } else {
            if (keys.length === 0 && protoProps === undefined) {
                return `${getCtxStyle(value, constructor, tag)}{}`;
            }
            braces[0] = `${getCtxStyle(value, constructor, tag)}{`;
        }
    }
    if (recurseTimes > ctx.depth && ctx.depth !== null) {
        let constructorName = getCtxStyle(value, constructor, tag).slice(0, -1);
        if (constructor !== null) {
            constructorName = `[${constructorName}]`;
        }
        return ctx.stylize(constructorName, "special");
    }
    recurseTimes += 1;
    ctx.seen.push(value);
    ctx.currentDepth = recurseTimes;
    let output;
    const indentationLvl = ctx.indentationLvl;
    try {
        output = formatter(ctx, value, recurseTimes);
        for(i = 0; i < keys.length; i++){
            output.push(formatProperty(ctx, value, recurseTimes, keys[i], extrasType));
        }
        if (protoProps !== undefined) {
            output.push(...protoProps);
        }
    } catch (err) {
        const constructorName1 = getCtxStyle(value, constructor, tag).slice(0, -1);
        return handleMaxCallStackSize(ctx, err, constructorName1, indentationLvl);
    }
    if (ctx.circular !== undefined) {
        const index = ctx.circular.get(value);
        if (index !== undefined) {
            const reference = ctx.stylize(`<ref *${index}>`, "special");
            if (ctx.compact !== true) {
                base = base === "" ? reference : `${reference} ${base}`;
            } else {
                braces[0] = `${reference} ${braces[0]}`;
            }
        }
    }
    ctx.seen.pop();
    if (ctx.sorted) {
        const comparator = ctx.sorted === true ? undefined : ctx.sorted;
        if (extrasType === 0) {
            output = output.sort(comparator);
        } else if (keys.length > 1) {
            const sorted = output.slice(output.length - keys.length).sort(comparator);
            output.splice(output.length - keys.length, keys.length, ...sorted);
        }
    }
    const res = reduceToSingleString(ctx, output, base, braces, extrasType, recurseTimes, value);
    const budget = ctx.budget[ctx.indentationLvl] || 0;
    const newLength = budget + res.length;
    ctx.budget[ctx.indentationLvl] = newLength;
    if (newLength > 2 ** 27) {
        ctx.depth = -1;
    }
    return res;
}
const builtInObjects = new Set(Object.getOwnPropertyNames(globalThis).filter((e)=>/^[A-Z][a-zA-Z0-9]+$/.test(e)));
function addPrototypeProperties(ctx, main, obj, recurseTimes, output) {
    let depth = 0;
    let keys;
    let keySet;
    do {
        if (depth !== 0 || main === obj) {
            obj = Object.getPrototypeOf(obj);
            if (obj === null) {
                return;
            }
            const descriptor = Object.getOwnPropertyDescriptor(obj, "constructor");
            if (descriptor !== undefined && typeof descriptor.value === "function" && builtInObjects.has(descriptor.value.name)) {
                return;
            }
        }
        if (depth === 0) {
            keySet = new Set();
        } else {
            Array.prototype.forEach.call(keys, (key)=>keySet.add(key));
        }
        keys = Reflect.ownKeys(obj);
        Array.prototype.push.call(ctx.seen, main);
        for (const key of keys){
            if (key === "constructor" || main.hasOwnProperty(key) || depth !== 0 && keySet.has(key)) {
                continue;
            }
            const desc = Object.getOwnPropertyDescriptor(obj, key);
            if (typeof desc.value === "function") {
                continue;
            }
            const value = formatProperty(ctx, obj, recurseTimes, key, 0, desc, main);
            if (ctx.colors) {
                Array.prototype.push.call(output, `\u001b[2m${value}\u001b[22m`);
            } else {
                Array.prototype.push.call(output, value);
            }
        }
        Array.prototype.pop.call(ctx.seen);
    }while (++depth !== 3)
}
function getConstructorName(obj, ctx, recurseTimes, protoProps) {
    let firstProto;
    const tmp = obj;
    while(obj || isUndetectableObject(obj)){
        const descriptor = Object.getOwnPropertyDescriptor(obj, "constructor");
        if (descriptor !== undefined && typeof descriptor.value === "function" && descriptor.value.name !== "" && isInstanceof(tmp, descriptor.value)) {
            if (protoProps !== undefined && (firstProto !== obj || !builtInObjects.has(descriptor.value.name))) {
                addPrototypeProperties(ctx, tmp, firstProto || tmp, recurseTimes, protoProps);
            }
            return descriptor.value.name;
        }
        obj = Object.getPrototypeOf(obj);
        if (firstProto === undefined) {
            firstProto = obj;
        }
    }
    if (firstProto === null) {
        return null;
    }
    const res = undefined;
    if (recurseTimes > ctx.depth && ctx.depth !== null) {
        return `${res} <Complex prototype>`;
    }
    const protoConstr = getConstructorName(firstProto, ctx, recurseTimes + 1, protoProps);
    if (protoConstr === null) {
        return `${res} <${inspect(firstProto, {
            ...ctx,
            customInspect: false,
            depth: -1
        })}>`;
    }
    return `${res} <${protoConstr}>`;
}
function formatPrimitive(fn, value, ctx) {
    if (typeof value === "string") {
        let trailer = "";
        if (value.length > ctx.maxStringLength) {
            const remaining = value.length - ctx.maxStringLength;
            value = value.slice(0, ctx.maxStringLength);
            trailer = `... ${remaining} more character${remaining > 1 ? "s" : ""}`;
        }
        if (ctx.compact !== true && value.length > 16 && value.length > ctx.breakLength - ctx.indentationLvl - 4) {
            return value.split(/(?<=\n)/).map((line)=>fn(strEscape(line), "string")).join(` +\n${" ".repeat(ctx.indentationLvl + 2)}`) + trailer;
        }
        return fn(strEscape(value), "string") + trailer;
    }
    if (typeof value === "number") {
        return formatNumber(fn, value);
    }
    if (typeof value === "bigint") {
        return formatBigInt(fn, value);
    }
    if (typeof value === "boolean") {
        return fn(`${value}`, "boolean");
    }
    if (typeof value === "undefined") {
        return fn("undefined", "undefined");
    }
    return fn(value.toString(), "symbol");
}
function getEmptyFormatArray() {
    return [];
}
function isInstanceof(object, proto) {
    try {
        return object instanceof proto;
    } catch  {
        return false;
    }
}
function getPrefix(constructor, tag, fallback, size = "") {
    if (constructor === null) {
        if (tag !== "" && fallback !== tag) {
            return `[${fallback}${size}: null prototype] [${tag}] `;
        }
        return `[${fallback}${size}: null prototype] `;
    }
    if (tag !== "" && constructor !== tag) {
        return `${constructor}${size} [${tag}] `;
    }
    return `${constructor}${size} `;
}
function formatArray(ctx, value, recurseTimes) {
    const valLen = value.length;
    const len = Math.min(Math.max(0, ctx.maxArrayLength), valLen);
    const remaining = valLen - len;
    const output = [];
    for(let i = 0; i < len; i++){
        if (!value.hasOwnProperty(i)) {
            return formatSpecialArray(ctx, value, recurseTimes, len, output, i);
        }
        output.push(formatProperty(ctx, value, recurseTimes, i, 1));
    }
    if (remaining > 0) {
        output.push(`... ${remaining} more item${remaining > 1 ? "s" : ""}`);
    }
    return output;
}
function getCtxStyle(_value, constructor, tag) {
    let fallback = "";
    if (constructor === null) {
        if (fallback === tag) {
            fallback = "Object";
        }
    }
    return getPrefix(constructor, tag, fallback);
}
function getKeys(value, showHidden) {
    let keys;
    const symbols = Object.getOwnPropertySymbols(value);
    if (showHidden) {
        keys = Object.getOwnPropertyNames(value);
        if (symbols.length !== 0) {
            Array.prototype.push.apply(keys, symbols);
        }
    } else {
        try {
            keys = Object.keys(value);
        } catch (_err) {
            keys = Object.getOwnPropertyNames(value);
        }
        if (symbols.length !== 0) {}
    }
    return keys;
}
function formatSet(value, ctx, _ignored, recurseTimes) {
    const output = [];
    ctx.indentationLvl += 2;
    for (const v of value){
        Array.prototype.push.call(output, formatValue(ctx, v, recurseTimes));
    }
    ctx.indentationLvl -= 2;
    return output;
}
function formatMap(value, ctx, _gnored, recurseTimes) {
    const output = [];
    ctx.indentationLvl += 2;
    for (const { 0: k , 1: v  } of value){
        output.push(`${formatValue(ctx, k, recurseTimes)} => ${formatValue(ctx, v, recurseTimes)}`);
    }
    ctx.indentationLvl -= 2;
    return output;
}
function formatTypedArray(value, length, ctx, _ignored, recurseTimes) {
    const maxLength = Math.min(Math.max(0, ctx.maxArrayLength), length);
    const remaining = value.length - maxLength;
    const output = new Array(maxLength);
    const elementFormatter = value.length > 0 && typeof value[0] === "number" ? formatNumber : formatBigInt;
    for(let i = 0; i < maxLength; ++i){
        output[i] = elementFormatter(ctx.stylize, value[i]);
    }
    if (remaining > 0) {
        output[maxLength] = `... ${remaining} more item${remaining > 1 ? "s" : ""}`;
    }
    if (ctx.showHidden) {
        ctx.indentationLvl += 2;
        for (const key of [
            "BYTES_PER_ELEMENT",
            "length",
            "byteLength",
            "byteOffset",
            "buffer"
        ]){
            const str = formatValue(ctx, value[key], recurseTimes, true);
            Array.prototype.push.call(output, `[${key}]: ${str}`);
        }
        ctx.indentationLvl -= 2;
    }
    return output;
}
function getIteratorBraces(type, tag) {
    if (tag !== `${type} Iterator`) {
        if (tag !== "") {
            tag += "] [";
        }
        tag += `${type} Iterator`;
    }
    return [
        `[${tag}] {`,
        "}"
    ];
}
function formatIterator(braces, ctx, value, recurseTimes) {
    const { 0: entries , 1: isKeyValue  } = value;
    if (isKeyValue) {
        braces[0] = braces[0].replace(/ Iterator] {$/, " Entries] {");
        return formatMapIterInner(ctx, recurseTimes, entries, 2);
    }
    return formatSetIterInner(ctx, recurseTimes, entries, 1);
}
function getFunctionBase(value, constructor, tag) {
    const stringified = Function.prototype.toString.call(value);
    if (stringified.slice(0, 5) === "class" && stringified.endsWith("}")) {
        const slice = stringified.slice(5, -1);
        const bracketIndex = slice.indexOf("{");
        if (bracketIndex !== -1 && (!slice.slice(0, bracketIndex).includes("(") || classRegExp.test(slice.replace(stripCommentsRegExp)))) {
            return getClassBase(value, constructor, tag);
        }
    }
    let type = "Function";
    if (isGeneratorFunction1(value)) {
        type = `Generator${type}`;
    }
    if (isAsyncFunction1(value)) {
        type = `Async${type}`;
    }
    let base = `[${type}`;
    if (constructor === null) {
        base += " (null prototype)";
    }
    if (value.name === "") {
        base += " (anonymous)";
    } else {
        base += `: ${value.name}`;
    }
    base += "]";
    if (constructor !== type && constructor !== null) {
        base += ` ${constructor}`;
    }
    if (tag !== "" && constructor !== tag) {
        base += ` [${tag}]`;
    }
    return base;
}
function formatError(err, constructor, tag, ctx, keys) {
    const name = err.name != null ? String(err.name) : "Error";
    let len = name.length;
    let stack = err.stack ? String(err.stack) : err.toString();
    if (!ctx.showHidden && keys.length !== 0) {
        for (const name1 of [
            "name",
            "message",
            "stack"
        ]){
            const index = keys.indexOf(name1);
            if (index !== -1 && stack.includes(err[name1])) {
                keys.splice(index, 1);
            }
        }
    }
    if (constructor === null || name.endsWith("Error") && stack.startsWith(name) && (stack.length === len || stack[len] === ":" || stack[len] === "\n")) {
        let fallback = "Error";
        if (constructor === null) {
            const start = stack.match(/^([A-Z][a-z_ A-Z0-9[\]()-]+)(?::|\n {4}at)/) || stack.match(/^([a-z_A-Z0-9-]*Error)$/);
            fallback = start && start[1] || "";
            len = fallback.length;
            fallback = fallback || "Error";
        }
        const prefix = getPrefix(constructor, tag, fallback).slice(0, -1);
        if (name !== prefix) {
            if (prefix.includes(name)) {
                if (len === 0) {
                    stack = `${prefix}: ${stack}`;
                } else {
                    stack = `${prefix}${stack.slice(len)}`;
                }
            } else {
                stack = `${prefix} [${name}]${stack.slice(len)}`;
            }
        }
    }
    let pos = err.message && stack.indexOf(err.message) || -1;
    if (pos !== -1) {
        pos += err.message.length;
    }
    const stackStart = stack.indexOf("\n    at", pos);
    if (stackStart === -1) {
        stack = `[${stack}]`;
    } else if (ctx.colors) {
        let newStack = stack.slice(0, stackStart);
        const lines = stack.slice(stackStart + 1).split("\n");
        for (const line of lines){
            let nodeModule;
            newStack += "\n";
            let pos1 = 0;
            while(nodeModule = nodeModulesRegExp.exec(line)){
                newStack += line.slice(pos1, nodeModule.index + 14);
                newStack += ctx.stylize(nodeModule[1], "module");
                pos1 = nodeModule.index + nodeModule[0].length;
            }
            newStack += pos1 === 0 ? line : line.slice(pos1);
        }
        stack = newStack;
    }
    if (ctx.indentationLvl !== 0) {
        const indentation = " ".repeat(ctx.indentationLvl);
        stack = stack.replace(/\n/g, `\n${indentation}`);
    }
    return stack;
}
let hexSlice;
function formatArrayBuffer(ctx, value) {
    let buffer;
    try {
        buffer = new Uint8Array(value);
    } catch  {
        return [
            ctx.stylize("(detached)", "special")
        ];
    }
    let str = hexSlice(buffer, 0, Math.min(ctx.maxArrayLength, buffer.length)).replace(/(.{2})/g, "$1 ").trim();
    const remaining = buffer.length - ctx.maxArrayLength;
    if (remaining > 0) {
        str += ` ... ${remaining} more byte${remaining > 1 ? "s" : ""}`;
    }
    return [
        `${ctx.stylize("[Uint8Contents]", "special")}: <${str}>`
    ];
}
function formatNumber(fn, value) {
    return fn(Object.is(value, -0) ? "-0" : `${value}`, "number");
}
function formatPromise(ctx, value, recurseTimes) {
    let output;
    const { 0: state , 1: result  } = value;
    if (state === 0) {
        output = [
            ctx.stylize("<pending>", "special")
        ];
    } else {
        ctx.indentationLvl += 2;
        const str = formatValue(ctx, result, recurseTimes);
        ctx.indentationLvl -= 2;
        output = [
            state === kRejected ? `${ctx.stylize("<rejected>", "special")} ${str}` : str
        ];
    }
    return output;
}
function formatWeakCollection(ctx) {
    return [
        ctx.stylize("<items unknown>", "special")
    ];
}
function formatWeakSet(ctx, value, recurseTimes) {
    const entries = value;
    return formatSetIterInner(ctx, recurseTimes, entries, 0);
}
function formatWeakMap(ctx, value, recurseTimes) {
    const entries = value;
    return formatMapIterInner(ctx, recurseTimes, entries, 0);
}
function formatProperty(ctx, value, recurseTimes, key, type, desc, original = value) {
    let name, str;
    let extra = " ";
    desc = desc || Object.getOwnPropertyDescriptor(value, key) || {
        value: value[key],
        enumerable: true
    };
    if (desc.value !== undefined) {
        const diff = ctx.compact !== true || type !== 0 ? 2 : 3;
        ctx.indentationLvl += diff;
        str = formatValue(ctx, desc.value, recurseTimes);
        if (diff === 3 && ctx.breakLength < getStringWidth(str, ctx.colors)) {
            extra = `\n${" ".repeat(ctx.indentationLvl)}`;
        }
        ctx.indentationLvl -= diff;
    } else if (desc.get !== undefined) {
        const label = desc.set !== undefined ? "Getter/Setter" : "Getter";
        const s = ctx.stylize;
        const sp = "special";
        if (ctx.getters && (ctx.getters === true || ctx.getters === "get" && desc.set === undefined || ctx.getters === "set" && desc.set !== undefined)) {
            try {
                const tmp = desc.get.call(original);
                ctx.indentationLvl += 2;
                if (tmp === null) {
                    str = `${s(`[${label}:`, sp)} ${s("null", "null")}${s("]", sp)}`;
                } else if (typeof tmp === "object") {
                    str = `${s(`[${label}]`, sp)} ${formatValue(ctx, tmp, recurseTimes)}`;
                } else {
                    const primitive = formatPrimitive(s, tmp, ctx);
                    str = `${s(`[${label}:`, sp)} ${primitive}${s("]", sp)}`;
                }
                ctx.indentationLvl -= 2;
            } catch (err) {
                const message = `<Inspection threw (${err.message})>`;
                str = `${s(`[${label}:`, sp)} ${message}${s("]", sp)}`;
            }
        } else {
            str = ctx.stylize(`[${label}]`, sp);
        }
    } else if (desc.set !== undefined) {
        str = ctx.stylize("[Setter]", "special");
    } else {
        str = ctx.stylize("undefined", "undefined");
    }
    if (type === 1) {
        return str;
    }
    if (typeof key === "symbol") {
        const tmp1 = key.toString().replace(strEscapeSequencesReplacer, escapeFn);
        name = `[${ctx.stylize(tmp1, "symbol")}]`;
    } else if (key === "__proto__") {
        name = "['__proto__']";
    } else if (desc.enumerable === false) {
        const tmp2 = key.replace(strEscapeSequencesReplacer, escapeFn);
        name = `[${tmp2}]`;
    } else if (keyStrRegExp.test(key)) {
        name = ctx.stylize(key, "name");
    } else {
        name = ctx.stylize(strEscape(key), "string");
    }
    return `${name}:${extra}${str}`;
}
function handleMaxCallStackSize(_ctx, _err, _constructorName, _indentationLvl) {}
const colorRegExp = /\u001b\[\d\d?m/g;
function removeColors(str) {
    return str.replace(colorRegExp, "");
}
function isBelowBreakLength(ctx, output, start, base) {
    let totalLength = output.length + start;
    if (totalLength + output.length > ctx.breakLength) {
        return false;
    }
    for(let i = 0; i < output.length; i++){
        if (ctx.colors) {
            totalLength += removeColors(output[i]).length;
        } else {
            totalLength += output[i].length;
        }
        if (totalLength > ctx.breakLength) {
            return false;
        }
    }
    return base === "" || !base.includes("\n");
}
function formatBigInt(fn, value) {
    return fn(`${value}n`, "bigint");
}
function formatNamespaceObject(keys, ctx, value, recurseTimes) {
    const output = new Array(keys.length);
    for(let i = 0; i < keys.length; i++){
        try {
            output[i] = formatProperty(ctx, value, recurseTimes, keys[i], kObjectType);
        } catch (_err) {
            const tmp = {
                [keys[i]]: ""
            };
            output[i] = formatProperty(ctx, tmp, recurseTimes, keys[i], kObjectType);
            const pos = output[i].lastIndexOf(" ");
            output[i] = output[i].slice(0, pos + 1) + ctx.stylize("<uninitialized>", "special");
        }
    }
    keys.length = 0;
    return output;
}
function formatSpecialArray(ctx, value, recurseTimes, maxLength, output, i) {
    const keys = Object.keys(value);
    let index = i;
    for(; i < keys.length && output.length < maxLength; i++){
        const key = keys[i];
        const tmp = +key;
        if (tmp > 2 ** 32 - 2) {
            break;
        }
        if (`${index}` !== key) {
            if (!numberRegExp.test(key)) {
                break;
            }
            const emptyItems = tmp - index;
            const ending = emptyItems > 1 ? "s" : "";
            const message = `<${emptyItems} empty item${ending}>`;
            output.push(ctx.stylize(message, "undefined"));
            index = tmp;
            if (output.length === maxLength) {
                break;
            }
        }
        output.push(formatProperty(ctx, value, recurseTimes, key, 1));
        index++;
    }
    const remaining = value.length - index;
    if (output.length !== maxLength) {
        if (remaining > 0) {
            const ending1 = remaining > 1 ? "s" : "";
            const message1 = `<${remaining} empty item${ending1}>`;
            output.push(ctx.stylize(message1, "undefined"));
        }
    } else if (remaining > 0) {
        output.push(`... ${remaining} more item${remaining > 1 ? "s" : ""}`);
    }
    return output;
}
function getBoxedBase(value, ctx, keys, constructor, tag) {
    let type;
    if (isNumberObject1(value)) {
        type = "Number";
    } else if (isStringObject1(value)) {
        type = "String";
        keys.splice(0, value.length);
    } else if (isBooleanObject1(value)) {
        type = "Boolean";
    } else if (isBigIntObject1(value)) {
        type = "BigInt";
    } else {
        type = "Symbol";
    }
    let base = `[${type}`;
    if (type !== constructor) {
        if (constructor === null) {
            base += " (null prototype)";
        } else {
            base += ` (${constructor})`;
        }
    }
    base += `: ${formatPrimitive(stylizeNoColor, value.valueOf(), ctx)}]`;
    if (tag !== "" && tag !== constructor) {
        base += ` [${tag}]`;
    }
    if (keys.length !== 0 || ctx.stylize === stylizeNoColor) {
        return base;
    }
    return ctx.stylize(base, type.toLowerCase());
}
function getClassBase(value, constructor, tag) {
    const hasName = value.hasOwnProperty("name");
    const name = hasName && value.name || "(anonymous)";
    let base = `class ${name}`;
    if (constructor !== "Function" && constructor !== null) {
        base += ` [${constructor}]`;
    }
    if (tag !== "" && constructor !== tag) {
        base += ` [${tag}]`;
    }
    if (constructor !== null) {
        const superName = Object.getPrototypeOf(value).name;
        if (superName) {
            base += ` extends ${superName}`;
        }
    } else {
        base += " extends [null prototype]";
    }
    return `[${base}]`;
}
function reduceToSingleString(ctx, output, base, braces, extrasType, recurseTimes, value) {
    if (ctx.compact !== true) {
        if (typeof ctx.compact === "number" && ctx.compact >= 1) {
            const entries = output.length;
            if (extrasType === 2 && entries > 6) {
                output = groupArrayElements(ctx, output, value);
            }
            if (ctx.currentDepth - recurseTimes < ctx.compact && entries === output.length) {
                const start = output.length + ctx.indentationLvl + braces[0].length + base.length + 10;
                if (isBelowBreakLength(ctx, output, start, base)) {
                    return `${base ? `${base} ` : ""}${braces[0]} ${join(output, ", ")}` + ` ${braces[1]}`;
                }
            }
        }
        const indentation = `\n${" ".repeat(ctx.indentationLvl)}`;
        return `${base ? `${base} ` : ""}${braces[0]}${indentation}  ` + `${join(output, `,${indentation}  `)}${indentation}${braces[1]}`;
    }
    if (isBelowBreakLength(ctx, output, 0, base)) {
        return `${braces[0]}${base ? ` ${base}` : ""} ${join(output, ", ")} ` + braces[1];
    }
    const indentation1 = " ".repeat(ctx.indentationLvl);
    const ln = base === "" && braces[0].length === 1 ? " " : `${base ? ` ${base}` : ""}\n${indentation1}  `;
    return `${braces[0]}${ln}${join(output, `,\n${indentation1}  `)} ${braces[1]}`;
}
function join(output, separator) {
    let str = "";
    if (output.length !== 0) {
        const lastIndex = output.length - 1;
        for(let i = 0; i < lastIndex; i++){
            str += output[i];
            str += separator;
        }
        str += output[lastIndex];
    }
    return str;
}
function groupArrayElements(ctx, output, value) {
    let totalLength = 0;
    let maxLength = 0;
    let i = 0;
    let outputLength = output.length;
    if (ctx.maxArrayLength < output.length) {
        outputLength--;
    }
    const separatorSpace = 2;
    const dataLen = new Array(outputLength);
    for(; i < outputLength; i++){
        const len = getStringWidth(output[i], ctx.colors);
        dataLen[i] = len;
        totalLength += len + separatorSpace;
        if (maxLength < len) {
            maxLength = len;
        }
    }
    const actualMax = maxLength + 2;
    if (actualMax * 3 + ctx.indentationLvl < ctx.breakLength && (totalLength / actualMax > 5 || maxLength <= 6)) {
        const averageBias = Math.sqrt(actualMax - totalLength / output.length);
        const biasedMax = Math.max(actualMax - 3 - averageBias, 1);
        const columns = Math.min(Math.round(Math.sqrt(2.5 * biasedMax * outputLength) / biasedMax), Math.floor((ctx.breakLength - ctx.indentationLvl) / actualMax), ctx.compact * 4, 15);
        if (columns <= 1) {
            return output;
        }
        const tmp = [];
        const maxLineLength = [];
        for(let i1 = 0; i1 < columns; i1++){
            let lineMaxLength = 0;
            for(let j = i1; j < output.length; j += columns){
                if (dataLen[j] > lineMaxLength) {
                    lineMaxLength = dataLen[j];
                }
            }
            lineMaxLength += separatorSpace;
            maxLineLength[i1] = lineMaxLength;
        }
        let order = String.prototype.padStart;
        if (value !== undefined) {
            for(let i2 = 0; i2 < output.length; i2++){
                if (typeof value[i2] !== "number" && typeof value[i2] !== "bigint") {
                    order = String.prototype.padEnd;
                    break;
                }
            }
        }
        for(let i3 = 0; i3 < outputLength; i3 += columns){
            const max = Math.min(i3 + columns, outputLength);
            let str = "";
            let j1 = i3;
            for(; j1 < max - 1; j1++){
                const padding = maxLineLength[j1 - i3] + output[j1].length - dataLen[j1];
                str += `${output[j1]}, `.padStart(padding, " ");
            }
            if (order === String.prototype.padStart) {
                const padding1 = maxLineLength[j1 - i3] + output[j1].length - dataLen[j1] - 2;
                str += output[j1].padStart(padding1, " ");
            } else {
                str += output[j1];
            }
            Array.prototype.push.call(tmp, str);
        }
        if (ctx.maxArrayLength < output.length) {
            Array.prototype.push.call(tmp, output[outputLength]);
        }
        output = tmp;
    }
    return output;
}
function formatMapIterInner(ctx, recurseTimes, entries, state) {
    const maxArrayLength = Math.max(ctx.maxArrayLength, 0);
    const len = entries.length / 2;
    const remaining = len - maxArrayLength;
    const maxLength = Math.min(maxArrayLength, len);
    let output = new Array(maxLength);
    let i = 0;
    ctx.indentationLvl += 2;
    if (state === 0) {
        for(; i < maxLength; i++){
            const pos = i * 2;
            output[i] = `${formatValue(ctx, entries[pos], recurseTimes)} => ${formatValue(ctx, entries[pos + 1], recurseTimes)}`;
        }
        if (!ctx.sorted) {
            output = output.sort();
        }
    } else {
        for(; i < maxLength; i++){
            const pos1 = i * 2;
            const res = [
                formatValue(ctx, entries[pos1], recurseTimes),
                formatValue(ctx, entries[pos1 + 1], recurseTimes)
            ];
            output[i] = reduceToSingleString(ctx, res, "", [
                "[",
                "]"
            ], kArrayExtrasType, recurseTimes);
        }
    }
    ctx.indentationLvl -= 2;
    if (remaining > 0) {
        output.push(`... ${remaining} more item${remaining > 1 ? "s" : ""}`);
    }
    return output;
}
function formatSetIterInner(ctx, recurseTimes, entries, state) {
    const maxArrayLength = Math.max(ctx.maxArrayLength, 0);
    const maxLength = Math.min(maxArrayLength, entries.length);
    const output = new Array(maxLength);
    ctx.indentationLvl += 2;
    for(let i = 0; i < maxLength; i++){
        output[i] = formatValue(ctx, entries[i], recurseTimes);
    }
    ctx.indentationLvl -= 2;
    if (state === 0 && !ctx.sorted) {
        output.sort();
    }
    const remaining = entries.length - maxLength;
    if (remaining > 0) {
        Array.prototype.push.call(output, `... ${remaining} more item${remaining > 1 ? "s" : ""}`);
    }
    return output;
}
const ansiPattern = "[\\u001B\\u009B][[\\]()#;?]*" + "(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*" + "|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)" + "|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))";
const ansi = new RegExp(ansiPattern, "g");
function getStringWidth(str, removeControlChars = true) {
    let width = 0;
    if (removeControlChars) {
        str = stripVTControlCharacters(str);
    }
    str = str.normalize("NFC");
    for (const __char of str[Symbol.iterator]()){
        const code = __char.codePointAt(0);
        if (isFullWidthCodePoint(code)) {
            width += 2;
        } else if (!isZeroWidthCodePoint(code)) {
            width++;
        }
    }
    return width;
}
const isFullWidthCodePoint = (code)=>{
    return code >= 0x1100 && (code <= 0x115f || code === 0x2329 || code === 0x232a || code >= 0x2e80 && code <= 0x3247 && code !== 0x303f || code >= 0x3250 && code <= 0x4dbf || code >= 0x4e00 && code <= 0xa4c6 || code >= 0xa960 && code <= 0xa97c || code >= 0xac00 && code <= 0xd7a3 || code >= 0xf900 && code <= 0xfaff || code >= 0xfe10 && code <= 0xfe19 || code >= 0xfe30 && code <= 0xfe6b || code >= 0xff01 && code <= 0xff60 || code >= 0xffe0 && code <= 0xffe6 || code >= 0x1b000 && code <= 0x1b001 || code >= 0x1f200 && code <= 0x1f251 || code >= 0x1f300 && code <= 0x1f64f || code >= 0x20000 && code <= 0x3fffd);
};
const isZeroWidthCodePoint = (code)=>{
    return code <= 0x1F || code >= 0x7F && code <= 0x9F || code >= 0x300 && code <= 0x36F || code >= 0x200B && code <= 0x200F || code >= 0x20D0 && code <= 0x20FF || code >= 0xFE00 && code <= 0xFE0F || code >= 0xFE20 && code <= 0xFE2F || code >= 0xE0100 && code <= 0xE01EF;
};
function stripVTControlCharacters(str) {
    validateString(str, "str");
    return str.replace(ansi, "");
}
let debugImpls;
let testEnabled;
function initializeDebugEnv(debugEnv) {
    debugImpls = Object.create(null);
    if (debugEnv) {
        debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replaceAll("*", ".*").replaceAll(",", "$|^");
        const debugEnvRegex = new RegExp(`^${debugEnv}$`, "i");
        testEnabled = (str)=>debugEnvRegex.exec(str) !== null;
    } else {
        testEnabled = ()=>false;
    }
}
function emitWarningIfNeeded(set) {
    if ("HTTP" === set || "HTTP2" === set) {
        console.warn("Setting the NODE_DEBUG environment variable " + "to '" + set.toLowerCase() + "' can expose sensitive " + "data (such as passwords, tokens and authentication headers) " + "in the resulting log.");
    }
}
const noop = ()=>{};
function debuglogImpl(enabled, set) {
    if (debugImpls[set] === undefined) {
        if (enabled) {
            emitWarningIfNeeded(set);
            debugImpls[set] = function debug(...args) {
                const msg = args.map((arg)=>inspect(arg)).join(" ");
                console.error(sprintf("%s %s: %s", set, String(Deno.pid), msg));
            };
        } else {
            debugImpls[set] = noop;
        }
    }
    return debugImpls[set];
}
function debuglog(set, cb) {
    function init() {
        set = set.toUpperCase();
        enabled = testEnabled(set);
    }
    let debug = (...args)=>{
        init();
        debug = debuglogImpl(enabled, set);
        if (typeof cb === "function") {
            cb(debug);
        }
        return debug(...args);
    };
    let enabled;
    let test = ()=>{
        init();
        test = ()=>enabled;
        return enabled;
    };
    const logger = (...args)=>debug(...args);
    Object.defineProperty(logger, "enabled", {
        get () {
            return test();
        },
        configurable: true,
        enumerable: true
    });
    return logger;
}
let debugEnv;
try {
    debugEnv = Deno.env.get("NODE_DEBUG") ?? "";
} catch (error) {
    if (error instanceof Deno.errors.PermissionDenied) {
        debugEnv = "";
    } else {
        throw error;
    }
}
initializeDebugEnv(debugEnv);
const osType = (()=>{
    const { Deno: Deno1  } = globalThis;
    if (typeof Deno1?.build?.os === "string") {
        return Deno1.build.os;
    }
    const { navigator  } = globalThis;
    if (navigator?.appVersion?.includes?.("Win")) {
        return "windows";
    }
    return "linux";
})();
const isWindows = osType === "windows";
const os = {
    UV_UDP_IPV6ONLY: 1,
    UV_UDP_PARTIAL: 2,
    UV_UDP_REUSEADDR: 4,
    UV_UDP_MMSG_CHUNK: 8,
    UV_UDP_MMSG_FREE: 16,
    UV_UDP_LINUX_RECVERR: 32,
    UV_UDP_RECVMMSG: 256,
    dlopen: {
        RTLD_LAZY: 1,
        RTLD_NOW: 2,
        RTLD_GLOBAL: 8,
        RTLD_LOCAL: 4
    },
    errno: {
        E2BIG: 7,
        EACCES: 13,
        EADDRINUSE: 48,
        EADDRNOTAVAIL: 49,
        EAFNOSUPPORT: 47,
        EAGAIN: 35,
        EALREADY: 37,
        EBADF: 9,
        EBADMSG: 94,
        EBUSY: 16,
        ECANCELED: 89,
        ECHILD: 10,
        ECONNABORTED: 53,
        ECONNREFUSED: 61,
        ECONNRESET: 54,
        EDEADLK: 11,
        EDESTADDRREQ: 39,
        EDOM: 33,
        EDQUOT: 69,
        EEXIST: 17,
        EFAULT: 14,
        EFBIG: 27,
        EHOSTUNREACH: 65,
        EIDRM: 90,
        EILSEQ: 92,
        EINPROGRESS: 36,
        EINTR: 4,
        EINVAL: 22,
        EIO: 5,
        EISCONN: 56,
        EISDIR: 21,
        ELOOP: 62,
        EMFILE: 24,
        EMLINK: 31,
        EMSGSIZE: 40,
        EMULTIHOP: 95,
        ENAMETOOLONG: 63,
        ENETDOWN: 50,
        ENETRESET: 52,
        ENETUNREACH: 51,
        ENFILE: 23,
        ENOBUFS: 55,
        ENODATA: 96,
        ENODEV: 19,
        ENOENT: 2,
        ENOEXEC: 8,
        ENOLCK: 77,
        ENOLINK: 97,
        ENOMEM: 12,
        ENOMSG: 91,
        ENOPROTOOPT: 42,
        ENOSPC: 28,
        ENOSR: 98,
        ENOSTR: 99,
        ENOSYS: 78,
        ENOTCONN: 57,
        ENOTDIR: 20,
        ENOTEMPTY: 66,
        ENOTSOCK: 38,
        ENOTSUP: 45,
        ENOTTY: 25,
        ENXIO: 6,
        EOPNOTSUPP: 102,
        EOVERFLOW: 84,
        EPERM: 1,
        EPIPE: 32,
        EPROTO: 100,
        EPROTONOSUPPORT: 43,
        EPROTOTYPE: 41,
        ERANGE: 34,
        EROFS: 30,
        ESPIPE: 29,
        ESRCH: 3,
        ESTALE: 70,
        ETIME: 101,
        ETIMEDOUT: 60,
        ETXTBSY: 26,
        EWOULDBLOCK: 35,
        EXDEV: 18
    },
    signals: {
        SIGHUP: 1,
        SIGINT: 2,
        SIGQUIT: 3,
        SIGILL: 4,
        SIGTRAP: 5,
        SIGABRT: 6,
        SIGIOT: 6,
        SIGBUS: 10,
        SIGFPE: 8,
        SIGKILL: 9,
        SIGUSR1: 30,
        SIGSEGV: 11,
        SIGUSR2: 31,
        SIGPIPE: 13,
        SIGALRM: 14,
        SIGTERM: 15,
        SIGCHLD: 20,
        SIGCONT: 19,
        SIGSTOP: 17,
        SIGTSTP: 18,
        SIGTTIN: 21,
        SIGBREAK: 21,
        SIGTTOU: 22,
        SIGURG: 16,
        SIGXCPU: 24,
        SIGXFSZ: 25,
        SIGVTALRM: 26,
        SIGPROF: 27,
        SIGWINCH: 28,
        SIGIO: 23,
        SIGINFO: 29,
        SIGSYS: 12,
        SIGEMT: 7,
        SIGPWR: 30,
        SIGSTKFLT: 16
    },
    priority: {
        PRIORITY_LOW: 19,
        PRIORITY_BELOW_NORMAL: 10,
        PRIORITY_NORMAL: 0,
        PRIORITY_ABOVE_NORMAL: -7,
        PRIORITY_HIGH: -14,
        PRIORITY_HIGHEST: -20
    }
};
const crypto1 = {
    OPENSSL_VERSION_NUMBER: 269488319,
    SSL_OP_ALL: 2147485780,
    SSL_OP_ALLOW_NO_DHE_KEX: 1024,
    SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION: 262144,
    SSL_OP_CIPHER_SERVER_PREFERENCE: 4194304,
    SSL_OP_CISCO_ANYCONNECT: 32768,
    SSL_OP_COOKIE_EXCHANGE: 8192,
    SSL_OP_CRYPTOPRO_TLSEXT_BUG: 2147483648,
    SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS: 2048,
    SSL_OP_EPHEMERAL_RSA: 0,
    SSL_OP_LEGACY_SERVER_CONNECT: 4,
    SSL_OP_MICROSOFT_BIG_SSLV3_BUFFER: 0,
    SSL_OP_MICROSOFT_SESS_ID_BUG: 0,
    SSL_OP_MSIE_SSLV2_RSA_PADDING: 0,
    SSL_OP_NETSCAPE_CA_DN_BUG: 0,
    SSL_OP_NETSCAPE_CHALLENGE_BUG: 0,
    SSL_OP_NETSCAPE_DEMO_CIPHER_CHANGE_BUG: 0,
    SSL_OP_NETSCAPE_REUSE_CIPHER_CHANGE_BUG: 0,
    SSL_OP_NO_COMPRESSION: 131072,
    SSL_OP_NO_ENCRYPT_THEN_MAC: 524288,
    SSL_OP_NO_QUERY_MTU: 4096,
    SSL_OP_NO_RENEGOTIATION: 1073741824,
    SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION: 65536,
    SSL_OP_NO_SSLv2: 0,
    SSL_OP_NO_SSLv3: 33554432,
    SSL_OP_NO_TICKET: 16384,
    SSL_OP_NO_TLSv1: 67108864,
    SSL_OP_NO_TLSv1_1: 268435456,
    SSL_OP_NO_TLSv1_2: 134217728,
    SSL_OP_NO_TLSv1_3: 536870912,
    SSL_OP_PKCS1_CHECK_1: 0,
    SSL_OP_PKCS1_CHECK_2: 0,
    SSL_OP_PRIORITIZE_CHACHA: 2097152,
    SSL_OP_SINGLE_DH_USE: 0,
    SSL_OP_SINGLE_ECDH_USE: 0,
    SSL_OP_SSLEAY_080_CLIENT_DH_BUG: 0,
    SSL_OP_SSLREF2_REUSE_CERT_TYPE_BUG: 0,
    SSL_OP_TLS_BLOCK_PADDING_BUG: 0,
    SSL_OP_TLS_D5_BUG: 0,
    SSL_OP_TLS_ROLLBACK_BUG: 8388608,
    ENGINE_METHOD_RSA: 1,
    ENGINE_METHOD_DSA: 2,
    ENGINE_METHOD_DH: 4,
    ENGINE_METHOD_RAND: 8,
    ENGINE_METHOD_EC: 2048,
    ENGINE_METHOD_CIPHERS: 64,
    ENGINE_METHOD_DIGESTS: 128,
    ENGINE_METHOD_PKEY_METHS: 512,
    ENGINE_METHOD_PKEY_ASN1_METHS: 1024,
    ENGINE_METHOD_ALL: 65535,
    ENGINE_METHOD_NONE: 0,
    DH_CHECK_P_NOT_SAFE_PRIME: 2,
    DH_CHECK_P_NOT_PRIME: 1,
    DH_UNABLE_TO_CHECK_GENERATOR: 4,
    DH_NOT_SUITABLE_GENERATOR: 8,
    ALPN_ENABLED: 1,
    RSA_PKCS1_PADDING: 1,
    RSA_SSLV23_PADDING: 2,
    RSA_NO_PADDING: 3,
    RSA_PKCS1_OAEP_PADDING: 4,
    RSA_X931_PADDING: 5,
    RSA_PKCS1_PSS_PADDING: 6,
    RSA_PSS_SALTLEN_DIGEST: -1,
    RSA_PSS_SALTLEN_MAX_SIGN: -2,
    RSA_PSS_SALTLEN_AUTO: -2,
    defaultCoreCipherList: "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA",
    TLS1_VERSION: 769,
    TLS1_1_VERSION: 770,
    TLS1_2_VERSION: 771,
    TLS1_3_VERSION: 772,
    POINT_CONVERSION_COMPRESSED: 2,
    POINT_CONVERSION_UNCOMPRESSED: 4,
    POINT_CONVERSION_HYBRID: 6
};
os.errno.EEXIST;
os.errno.ENOENT;
const codeToErrorWindows = [
    [
        -4093,
        [
            "E2BIG",
            "argument list too long"
        ]
    ],
    [
        -4092,
        [
            "EACCES",
            "permission denied"
        ]
    ],
    [
        -4091,
        [
            "EADDRINUSE",
            "address already in use"
        ]
    ],
    [
        -4090,
        [
            "EADDRNOTAVAIL",
            "address not available"
        ]
    ],
    [
        -4089,
        [
            "EAFNOSUPPORT",
            "address family not supported"
        ]
    ],
    [
        -4088,
        [
            "EAGAIN",
            "resource temporarily unavailable"
        ]
    ],
    [
        -3000,
        [
            "EAI_ADDRFAMILY",
            "address family not supported"
        ]
    ],
    [
        -3001,
        [
            "EAI_AGAIN",
            "temporary failure"
        ]
    ],
    [
        -3002,
        [
            "EAI_BADFLAGS",
            "bad ai_flags value"
        ]
    ],
    [
        -3013,
        [
            "EAI_BADHINTS",
            "invalid value for hints"
        ]
    ],
    [
        -3003,
        [
            "EAI_CANCELED",
            "request canceled"
        ]
    ],
    [
        -3004,
        [
            "EAI_FAIL",
            "permanent failure"
        ]
    ],
    [
        -3005,
        [
            "EAI_FAMILY",
            "ai_family not supported"
        ]
    ],
    [
        -3006,
        [
            "EAI_MEMORY",
            "out of memory"
        ]
    ],
    [
        -3007,
        [
            "EAI_NODATA",
            "no address"
        ]
    ],
    [
        -3008,
        [
            "EAI_NONAME",
            "unknown node or service"
        ]
    ],
    [
        -3009,
        [
            "EAI_OVERFLOW",
            "argument buffer overflow"
        ]
    ],
    [
        -3014,
        [
            "EAI_PROTOCOL",
            "resolved protocol is unknown"
        ]
    ],
    [
        -3010,
        [
            "EAI_SERVICE",
            "service not available for socket type"
        ]
    ],
    [
        -3011,
        [
            "EAI_SOCKTYPE",
            "socket type not supported"
        ]
    ],
    [
        -4084,
        [
            "EALREADY",
            "connection already in progress"
        ]
    ],
    [
        -4083,
        [
            "EBADF",
            "bad file descriptor"
        ]
    ],
    [
        -4082,
        [
            "EBUSY",
            "resource busy or locked"
        ]
    ],
    [
        -4081,
        [
            "ECANCELED",
            "operation canceled"
        ]
    ],
    [
        -4080,
        [
            "ECHARSET",
            "invalid Unicode character"
        ]
    ],
    [
        -4079,
        [
            "ECONNABORTED",
            "software caused connection abort"
        ]
    ],
    [
        -4078,
        [
            "ECONNREFUSED",
            "connection refused"
        ]
    ],
    [
        -4077,
        [
            "ECONNRESET",
            "connection reset by peer"
        ]
    ],
    [
        -4076,
        [
            "EDESTADDRREQ",
            "destination address required"
        ]
    ],
    [
        -4075,
        [
            "EEXIST",
            "file already exists"
        ]
    ],
    [
        -4074,
        [
            "EFAULT",
            "bad address in system call argument"
        ]
    ],
    [
        -4036,
        [
            "EFBIG",
            "file too large"
        ]
    ],
    [
        -4073,
        [
            "EHOSTUNREACH",
            "host is unreachable"
        ]
    ],
    [
        -4072,
        [
            "EINTR",
            "interrupted system call"
        ]
    ],
    [
        -4071,
        [
            "EINVAL",
            "invalid argument"
        ]
    ],
    [
        -4070,
        [
            "EIO",
            "i/o error"
        ]
    ],
    [
        -4069,
        [
            "EISCONN",
            "socket is already connected"
        ]
    ],
    [
        -4068,
        [
            "EISDIR",
            "illegal operation on a directory"
        ]
    ],
    [
        -4067,
        [
            "ELOOP",
            "too many symbolic links encountered"
        ]
    ],
    [
        -4066,
        [
            "EMFILE",
            "too many open files"
        ]
    ],
    [
        -4065,
        [
            "EMSGSIZE",
            "message too long"
        ]
    ],
    [
        -4064,
        [
            "ENAMETOOLONG",
            "name too long"
        ]
    ],
    [
        -4063,
        [
            "ENETDOWN",
            "network is down"
        ]
    ],
    [
        -4062,
        [
            "ENETUNREACH",
            "network is unreachable"
        ]
    ],
    [
        -4061,
        [
            "ENFILE",
            "file table overflow"
        ]
    ],
    [
        -4060,
        [
            "ENOBUFS",
            "no buffer space available"
        ]
    ],
    [
        -4059,
        [
            "ENODEV",
            "no such device"
        ]
    ],
    [
        -4058,
        [
            "ENOENT",
            "no such file or directory"
        ]
    ],
    [
        -4057,
        [
            "ENOMEM",
            "not enough memory"
        ]
    ],
    [
        -4056,
        [
            "ENONET",
            "machine is not on the network"
        ]
    ],
    [
        -4035,
        [
            "ENOPROTOOPT",
            "protocol not available"
        ]
    ],
    [
        -4055,
        [
            "ENOSPC",
            "no space left on device"
        ]
    ],
    [
        -4054,
        [
            "ENOSYS",
            "function not implemented"
        ]
    ],
    [
        -4053,
        [
            "ENOTCONN",
            "socket is not connected"
        ]
    ],
    [
        -4052,
        [
            "ENOTDIR",
            "not a directory"
        ]
    ],
    [
        -4051,
        [
            "ENOTEMPTY",
            "directory not empty"
        ]
    ],
    [
        -4050,
        [
            "ENOTSOCK",
            "socket operation on non-socket"
        ]
    ],
    [
        -4049,
        [
            "ENOTSUP",
            "operation not supported on socket"
        ]
    ],
    [
        -4048,
        [
            "EPERM",
            "operation not permitted"
        ]
    ],
    [
        -4047,
        [
            "EPIPE",
            "broken pipe"
        ]
    ],
    [
        -4046,
        [
            "EPROTO",
            "protocol error"
        ]
    ],
    [
        -4045,
        [
            "EPROTONOSUPPORT",
            "protocol not supported"
        ]
    ],
    [
        -4044,
        [
            "EPROTOTYPE",
            "protocol wrong type for socket"
        ]
    ],
    [
        -4034,
        [
            "ERANGE",
            "result too large"
        ]
    ],
    [
        -4043,
        [
            "EROFS",
            "read-only file system"
        ]
    ],
    [
        -4042,
        [
            "ESHUTDOWN",
            "cannot send after transport endpoint shutdown"
        ]
    ],
    [
        -4041,
        [
            "ESPIPE",
            "invalid seek"
        ]
    ],
    [
        -4040,
        [
            "ESRCH",
            "no such process"
        ]
    ],
    [
        -4039,
        [
            "ETIMEDOUT",
            "connection timed out"
        ]
    ],
    [
        -4038,
        [
            "ETXTBSY",
            "text file is busy"
        ]
    ],
    [
        -4037,
        [
            "EXDEV",
            "cross-device link not permitted"
        ]
    ],
    [
        -4094,
        [
            "UNKNOWN",
            "unknown error"
        ]
    ],
    [
        -4095,
        [
            "EOF",
            "end of file"
        ]
    ],
    [
        -4033,
        [
            "ENXIO",
            "no such device or address"
        ]
    ],
    [
        -4032,
        [
            "EMLINK",
            "too many links"
        ]
    ],
    [
        -4031,
        [
            "EHOSTDOWN",
            "host is down"
        ]
    ],
    [
        -4030,
        [
            "EREMOTEIO",
            "remote I/O error"
        ]
    ],
    [
        -4029,
        [
            "ENOTTY",
            "inappropriate ioctl for device"
        ]
    ],
    [
        -4028,
        [
            "EFTYPE",
            "inappropriate file type or format"
        ]
    ],
    [
        -4027,
        [
            "EILSEQ",
            "illegal byte sequence"
        ]
    ]
];
const errorToCodeWindows = codeToErrorWindows.map(([status, [error]])=>[
        error,
        status
    ]);
const codeToErrorDarwin = [
    [
        -7,
        [
            "E2BIG",
            "argument list too long"
        ]
    ],
    [
        -13,
        [
            "EACCES",
            "permission denied"
        ]
    ],
    [
        -48,
        [
            "EADDRINUSE",
            "address already in use"
        ]
    ],
    [
        -49,
        [
            "EADDRNOTAVAIL",
            "address not available"
        ]
    ],
    [
        -47,
        [
            "EAFNOSUPPORT",
            "address family not supported"
        ]
    ],
    [
        -35,
        [
            "EAGAIN",
            "resource temporarily unavailable"
        ]
    ],
    [
        -3000,
        [
            "EAI_ADDRFAMILY",
            "address family not supported"
        ]
    ],
    [
        -3001,
        [
            "EAI_AGAIN",
            "temporary failure"
        ]
    ],
    [
        -3002,
        [
            "EAI_BADFLAGS",
            "bad ai_flags value"
        ]
    ],
    [
        -3013,
        [
            "EAI_BADHINTS",
            "invalid value for hints"
        ]
    ],
    [
        -3003,
        [
            "EAI_CANCELED",
            "request canceled"
        ]
    ],
    [
        -3004,
        [
            "EAI_FAIL",
            "permanent failure"
        ]
    ],
    [
        -3005,
        [
            "EAI_FAMILY",
            "ai_family not supported"
        ]
    ],
    [
        -3006,
        [
            "EAI_MEMORY",
            "out of memory"
        ]
    ],
    [
        -3007,
        [
            "EAI_NODATA",
            "no address"
        ]
    ],
    [
        -3008,
        [
            "EAI_NONAME",
            "unknown node or service"
        ]
    ],
    [
        -3009,
        [
            "EAI_OVERFLOW",
            "argument buffer overflow"
        ]
    ],
    [
        -3014,
        [
            "EAI_PROTOCOL",
            "resolved protocol is unknown"
        ]
    ],
    [
        -3010,
        [
            "EAI_SERVICE",
            "service not available for socket type"
        ]
    ],
    [
        -3011,
        [
            "EAI_SOCKTYPE",
            "socket type not supported"
        ]
    ],
    [
        -37,
        [
            "EALREADY",
            "connection already in progress"
        ]
    ],
    [
        -9,
        [
            "EBADF",
            "bad file descriptor"
        ]
    ],
    [
        -16,
        [
            "EBUSY",
            "resource busy or locked"
        ]
    ],
    [
        -89,
        [
            "ECANCELED",
            "operation canceled"
        ]
    ],
    [
        -4080,
        [
            "ECHARSET",
            "invalid Unicode character"
        ]
    ],
    [
        -53,
        [
            "ECONNABORTED",
            "software caused connection abort"
        ]
    ],
    [
        -61,
        [
            "ECONNREFUSED",
            "connection refused"
        ]
    ],
    [
        -54,
        [
            "ECONNRESET",
            "connection reset by peer"
        ]
    ],
    [
        -39,
        [
            "EDESTADDRREQ",
            "destination address required"
        ]
    ],
    [
        -17,
        [
            "EEXIST",
            "file already exists"
        ]
    ],
    [
        -14,
        [
            "EFAULT",
            "bad address in system call argument"
        ]
    ],
    [
        -27,
        [
            "EFBIG",
            "file too large"
        ]
    ],
    [
        -65,
        [
            "EHOSTUNREACH",
            "host is unreachable"
        ]
    ],
    [
        -4,
        [
            "EINTR",
            "interrupted system call"
        ]
    ],
    [
        -22,
        [
            "EINVAL",
            "invalid argument"
        ]
    ],
    [
        -5,
        [
            "EIO",
            "i/o error"
        ]
    ],
    [
        -56,
        [
            "EISCONN",
            "socket is already connected"
        ]
    ],
    [
        -21,
        [
            "EISDIR",
            "illegal operation on a directory"
        ]
    ],
    [
        -62,
        [
            "ELOOP",
            "too many symbolic links encountered"
        ]
    ],
    [
        -24,
        [
            "EMFILE",
            "too many open files"
        ]
    ],
    [
        -40,
        [
            "EMSGSIZE",
            "message too long"
        ]
    ],
    [
        -63,
        [
            "ENAMETOOLONG",
            "name too long"
        ]
    ],
    [
        -50,
        [
            "ENETDOWN",
            "network is down"
        ]
    ],
    [
        -51,
        [
            "ENETUNREACH",
            "network is unreachable"
        ]
    ],
    [
        -23,
        [
            "ENFILE",
            "file table overflow"
        ]
    ],
    [
        -55,
        [
            "ENOBUFS",
            "no buffer space available"
        ]
    ],
    [
        -19,
        [
            "ENODEV",
            "no such device"
        ]
    ],
    [
        -2,
        [
            "ENOENT",
            "no such file or directory"
        ]
    ],
    [
        -12,
        [
            "ENOMEM",
            "not enough memory"
        ]
    ],
    [
        -4056,
        [
            "ENONET",
            "machine is not on the network"
        ]
    ],
    [
        -42,
        [
            "ENOPROTOOPT",
            "protocol not available"
        ]
    ],
    [
        -28,
        [
            "ENOSPC",
            "no space left on device"
        ]
    ],
    [
        -78,
        [
            "ENOSYS",
            "function not implemented"
        ]
    ],
    [
        -57,
        [
            "ENOTCONN",
            "socket is not connected"
        ]
    ],
    [
        -20,
        [
            "ENOTDIR",
            "not a directory"
        ]
    ],
    [
        -66,
        [
            "ENOTEMPTY",
            "directory not empty"
        ]
    ],
    [
        -38,
        [
            "ENOTSOCK",
            "socket operation on non-socket"
        ]
    ],
    [
        -45,
        [
            "ENOTSUP",
            "operation not supported on socket"
        ]
    ],
    [
        -1,
        [
            "EPERM",
            "operation not permitted"
        ]
    ],
    [
        -32,
        [
            "EPIPE",
            "broken pipe"
        ]
    ],
    [
        -100,
        [
            "EPROTO",
            "protocol error"
        ]
    ],
    [
        -43,
        [
            "EPROTONOSUPPORT",
            "protocol not supported"
        ]
    ],
    [
        -41,
        [
            "EPROTOTYPE",
            "protocol wrong type for socket"
        ]
    ],
    [
        -34,
        [
            "ERANGE",
            "result too large"
        ]
    ],
    [
        -30,
        [
            "EROFS",
            "read-only file system"
        ]
    ],
    [
        -58,
        [
            "ESHUTDOWN",
            "cannot send after transport endpoint shutdown"
        ]
    ],
    [
        -29,
        [
            "ESPIPE",
            "invalid seek"
        ]
    ],
    [
        -3,
        [
            "ESRCH",
            "no such process"
        ]
    ],
    [
        -60,
        [
            "ETIMEDOUT",
            "connection timed out"
        ]
    ],
    [
        -26,
        [
            "ETXTBSY",
            "text file is busy"
        ]
    ],
    [
        -18,
        [
            "EXDEV",
            "cross-device link not permitted"
        ]
    ],
    [
        -4094,
        [
            "UNKNOWN",
            "unknown error"
        ]
    ],
    [
        -4095,
        [
            "EOF",
            "end of file"
        ]
    ],
    [
        -6,
        [
            "ENXIO",
            "no such device or address"
        ]
    ],
    [
        -31,
        [
            "EMLINK",
            "too many links"
        ]
    ],
    [
        -64,
        [
            "EHOSTDOWN",
            "host is down"
        ]
    ],
    [
        -4030,
        [
            "EREMOTEIO",
            "remote I/O error"
        ]
    ],
    [
        -25,
        [
            "ENOTTY",
            "inappropriate ioctl for device"
        ]
    ],
    [
        -79,
        [
            "EFTYPE",
            "inappropriate file type or format"
        ]
    ],
    [
        -92,
        [
            "EILSEQ",
            "illegal byte sequence"
        ]
    ]
];
const errorToCodeDarwin = codeToErrorDarwin.map(([status, [code]])=>[
        code,
        status
    ]);
const codeToErrorLinux = [
    [
        -7,
        [
            "E2BIG",
            "argument list too long"
        ]
    ],
    [
        -13,
        [
            "EACCES",
            "permission denied"
        ]
    ],
    [
        -98,
        [
            "EADDRINUSE",
            "address already in use"
        ]
    ],
    [
        -99,
        [
            "EADDRNOTAVAIL",
            "address not available"
        ]
    ],
    [
        -97,
        [
            "EAFNOSUPPORT",
            "address family not supported"
        ]
    ],
    [
        -11,
        [
            "EAGAIN",
            "resource temporarily unavailable"
        ]
    ],
    [
        -3000,
        [
            "EAI_ADDRFAMILY",
            "address family not supported"
        ]
    ],
    [
        -3001,
        [
            "EAI_AGAIN",
            "temporary failure"
        ]
    ],
    [
        -3002,
        [
            "EAI_BADFLAGS",
            "bad ai_flags value"
        ]
    ],
    [
        -3013,
        [
            "EAI_BADHINTS",
            "invalid value for hints"
        ]
    ],
    [
        -3003,
        [
            "EAI_CANCELED",
            "request canceled"
        ]
    ],
    [
        -3004,
        [
            "EAI_FAIL",
            "permanent failure"
        ]
    ],
    [
        -3005,
        [
            "EAI_FAMILY",
            "ai_family not supported"
        ]
    ],
    [
        -3006,
        [
            "EAI_MEMORY",
            "out of memory"
        ]
    ],
    [
        -3007,
        [
            "EAI_NODATA",
            "no address"
        ]
    ],
    [
        -3008,
        [
            "EAI_NONAME",
            "unknown node or service"
        ]
    ],
    [
        -3009,
        [
            "EAI_OVERFLOW",
            "argument buffer overflow"
        ]
    ],
    [
        -3014,
        [
            "EAI_PROTOCOL",
            "resolved protocol is unknown"
        ]
    ],
    [
        -3010,
        [
            "EAI_SERVICE",
            "service not available for socket type"
        ]
    ],
    [
        -3011,
        [
            "EAI_SOCKTYPE",
            "socket type not supported"
        ]
    ],
    [
        -114,
        [
            "EALREADY",
            "connection already in progress"
        ]
    ],
    [
        -9,
        [
            "EBADF",
            "bad file descriptor"
        ]
    ],
    [
        -16,
        [
            "EBUSY",
            "resource busy or locked"
        ]
    ],
    [
        -125,
        [
            "ECANCELED",
            "operation canceled"
        ]
    ],
    [
        -4080,
        [
            "ECHARSET",
            "invalid Unicode character"
        ]
    ],
    [
        -103,
        [
            "ECONNABORTED",
            "software caused connection abort"
        ]
    ],
    [
        -111,
        [
            "ECONNREFUSED",
            "connection refused"
        ]
    ],
    [
        -104,
        [
            "ECONNRESET",
            "connection reset by peer"
        ]
    ],
    [
        -89,
        [
            "EDESTADDRREQ",
            "destination address required"
        ]
    ],
    [
        -17,
        [
            "EEXIST",
            "file already exists"
        ]
    ],
    [
        -14,
        [
            "EFAULT",
            "bad address in system call argument"
        ]
    ],
    [
        -27,
        [
            "EFBIG",
            "file too large"
        ]
    ],
    [
        -113,
        [
            "EHOSTUNREACH",
            "host is unreachable"
        ]
    ],
    [
        -4,
        [
            "EINTR",
            "interrupted system call"
        ]
    ],
    [
        -22,
        [
            "EINVAL",
            "invalid argument"
        ]
    ],
    [
        -5,
        [
            "EIO",
            "i/o error"
        ]
    ],
    [
        -106,
        [
            "EISCONN",
            "socket is already connected"
        ]
    ],
    [
        -21,
        [
            "EISDIR",
            "illegal operation on a directory"
        ]
    ],
    [
        -40,
        [
            "ELOOP",
            "too many symbolic links encountered"
        ]
    ],
    [
        -24,
        [
            "EMFILE",
            "too many open files"
        ]
    ],
    [
        -90,
        [
            "EMSGSIZE",
            "message too long"
        ]
    ],
    [
        -36,
        [
            "ENAMETOOLONG",
            "name too long"
        ]
    ],
    [
        -100,
        [
            "ENETDOWN",
            "network is down"
        ]
    ],
    [
        -101,
        [
            "ENETUNREACH",
            "network is unreachable"
        ]
    ],
    [
        -23,
        [
            "ENFILE",
            "file table overflow"
        ]
    ],
    [
        -105,
        [
            "ENOBUFS",
            "no buffer space available"
        ]
    ],
    [
        -19,
        [
            "ENODEV",
            "no such device"
        ]
    ],
    [
        -2,
        [
            "ENOENT",
            "no such file or directory"
        ]
    ],
    [
        -12,
        [
            "ENOMEM",
            "not enough memory"
        ]
    ],
    [
        -64,
        [
            "ENONET",
            "machine is not on the network"
        ]
    ],
    [
        -92,
        [
            "ENOPROTOOPT",
            "protocol not available"
        ]
    ],
    [
        -28,
        [
            "ENOSPC",
            "no space left on device"
        ]
    ],
    [
        -38,
        [
            "ENOSYS",
            "function not implemented"
        ]
    ],
    [
        -107,
        [
            "ENOTCONN",
            "socket is not connected"
        ]
    ],
    [
        -20,
        [
            "ENOTDIR",
            "not a directory"
        ]
    ],
    [
        -39,
        [
            "ENOTEMPTY",
            "directory not empty"
        ]
    ],
    [
        -88,
        [
            "ENOTSOCK",
            "socket operation on non-socket"
        ]
    ],
    [
        -95,
        [
            "ENOTSUP",
            "operation not supported on socket"
        ]
    ],
    [
        -1,
        [
            "EPERM",
            "operation not permitted"
        ]
    ],
    [
        -32,
        [
            "EPIPE",
            "broken pipe"
        ]
    ],
    [
        -71,
        [
            "EPROTO",
            "protocol error"
        ]
    ],
    [
        -93,
        [
            "EPROTONOSUPPORT",
            "protocol not supported"
        ]
    ],
    [
        -91,
        [
            "EPROTOTYPE",
            "protocol wrong type for socket"
        ]
    ],
    [
        -34,
        [
            "ERANGE",
            "result too large"
        ]
    ],
    [
        -30,
        [
            "EROFS",
            "read-only file system"
        ]
    ],
    [
        -108,
        [
            "ESHUTDOWN",
            "cannot send after transport endpoint shutdown"
        ]
    ],
    [
        -29,
        [
            "ESPIPE",
            "invalid seek"
        ]
    ],
    [
        -3,
        [
            "ESRCH",
            "no such process"
        ]
    ],
    [
        -110,
        [
            "ETIMEDOUT",
            "connection timed out"
        ]
    ],
    [
        -26,
        [
            "ETXTBSY",
            "text file is busy"
        ]
    ],
    [
        -18,
        [
            "EXDEV",
            "cross-device link not permitted"
        ]
    ],
    [
        -4094,
        [
            "UNKNOWN",
            "unknown error"
        ]
    ],
    [
        -4095,
        [
            "EOF",
            "end of file"
        ]
    ],
    [
        -6,
        [
            "ENXIO",
            "no such device or address"
        ]
    ],
    [
        -31,
        [
            "EMLINK",
            "too many links"
        ]
    ],
    [
        -112,
        [
            "EHOSTDOWN",
            "host is down"
        ]
    ],
    [
        -121,
        [
            "EREMOTEIO",
            "remote I/O error"
        ]
    ],
    [
        -25,
        [
            "ENOTTY",
            "inappropriate ioctl for device"
        ]
    ],
    [
        -4028,
        [
            "EFTYPE",
            "inappropriate file type or format"
        ]
    ],
    [
        -84,
        [
            "EILSEQ",
            "illegal byte sequence"
        ]
    ]
];
const errorToCodeLinux = codeToErrorLinux.map(([status, [code]])=>[
        code,
        status
    ]);
const errorMap = new Map(osType === "windows" ? codeToErrorWindows : osType === "darwin" ? codeToErrorDarwin : osType === "linux" ? codeToErrorLinux : unreachable());
const codeMap = new Map(osType === "windows" ? errorToCodeWindows : osType === "darwin" ? errorToCodeDarwin : osType === "linux" ? errorToCodeLinux : unreachable());
codeMap.get("EAI_MEMORY");
codeMap.get("UNKNOWN");
codeMap.get("EBADF");
codeMap.get("EINVAL");
codeMap.get("ENOTSOCK");
({
    ...mod1
});
var Encodings;
(function(Encodings) {
    Encodings[Encodings["ASCII"] = 0] = "ASCII";
    Encodings[Encodings["UTF8"] = 1] = "UTF8";
    Encodings[Encodings["BASE64"] = 2] = "BASE64";
    Encodings[Encodings["UCS2"] = 3] = "UCS2";
    Encodings[Encodings["BINARY"] = 4] = "BINARY";
    Encodings[Encodings["HEX"] = 5] = "HEX";
    Encodings[Encodings["BUFFER"] = 6] = "BUFFER";
    Encodings[Encodings["BASE64URL"] = 7] = "BASE64URL";
    Encodings[Encodings["LATIN1"] = 4] = "LATIN1";
})(Encodings || (Encodings = {}));
const encodings = [];
encodings[Encodings.ASCII] = "ascii";
encodings[Encodings.BASE64] = "base64";
encodings[Encodings.BASE64URL] = "base64url";
encodings[Encodings.BUFFER] = "buffer";
encodings[Encodings.HEX] = "hex";
encodings[Encodings.LATIN1] = "latin1";
encodings[Encodings.UCS2] = "utf16le";
encodings[Encodings.UTF8] = "utf8";
function numberToBytes(n) {
    if (n === 0) return new Uint8Array([
        0
    ]);
    const bytes = [];
    bytes.unshift(n & 255);
    while(n >= 256){
        n = n >>> 8;
        bytes.unshift(n & 255);
    }
    return new Uint8Array(bytes);
}
function findLastIndex(targetBuffer, buffer, offset) {
    offset = offset > targetBuffer.length ? targetBuffer.length : offset;
    const searchableBuffer = targetBuffer.slice(0, offset + buffer.length);
    const searchableBufferLastIndex = searchableBuffer.length - 1;
    const bufferLastIndex = buffer.length - 1;
    let lastMatchIndex = -1;
    let matches = 0;
    let index = -1;
    for(let x = 0; x <= searchableBufferLastIndex; x++){
        if (searchableBuffer[searchableBufferLastIndex - x] === buffer[bufferLastIndex - matches]) {
            if (lastMatchIndex === -1) {
                lastMatchIndex = x;
            }
            matches++;
        } else {
            matches = 0;
            if (lastMatchIndex !== -1) {
                x = lastMatchIndex + 1;
                lastMatchIndex = -1;
            }
            continue;
        }
        if (matches === buffer.length) {
            index = x;
            break;
        }
    }
    if (index === -1) return index;
    return searchableBufferLastIndex - index;
}
function indexOfBuffer(targetBuffer, buffer, byteOffset, encoding, forwardDirection) {
    if (!Encodings[encoding] === undefined) {
        throw new Error(`Unknown encoding code ${encoding}`);
    }
    if (!forwardDirection) {
        if (byteOffset < 0) {
            byteOffset = targetBuffer.length + byteOffset;
        }
        if (buffer.length === 0) {
            return byteOffset <= targetBuffer.length ? byteOffset : targetBuffer.length;
        }
        return findLastIndex(targetBuffer, buffer, byteOffset);
    }
    if (buffer.length === 0) {
        return byteOffset <= targetBuffer.length ? byteOffset : targetBuffer.length;
    }
    return indexOfNeedle(targetBuffer, buffer, byteOffset);
}
function indexOfNumber(targetBuffer, number, byteOffset, forwardDirection) {
    const bytes = numberToBytes(number);
    if (bytes.length > 1) {
        throw new Error("Multi byte number search is not supported");
    }
    return indexOfBuffer(targetBuffer, numberToBytes(number), byteOffset, Encodings.UTF8, forwardDirection);
}
const base64abc = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "+",
    "/"
];
function encode(data) {
    const uint8 = typeof data === "string" ? new TextEncoder().encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
    let result = "", i;
    const l = uint8.length;
    for(i = 2; i < l; i += 3){
        result += base64abc[uint8[i - 2] >> 2];
        result += base64abc[(uint8[i - 2] & 0x03) << 4 | uint8[i - 1] >> 4];
        result += base64abc[(uint8[i - 1] & 0x0f) << 2 | uint8[i] >> 6];
        result += base64abc[uint8[i] & 0x3f];
    }
    if (i === l + 1) {
        result += base64abc[uint8[i - 2] >> 2];
        result += base64abc[(uint8[i - 2] & 0x03) << 4];
        result += "==";
    }
    if (i === l) {
        result += base64abc[uint8[i - 2] >> 2];
        result += base64abc[(uint8[i - 2] & 0x03) << 4 | uint8[i - 1] >> 4];
        result += base64abc[(uint8[i - 1] & 0x0f) << 2];
        result += "=";
    }
    return result;
}
function decode(b64) {
    const binString = atob(b64);
    const size = binString.length;
    const bytes = new Uint8Array(size);
    for(let i = 0; i < size; i++){
        bytes[i] = binString.charCodeAt(i);
    }
    return bytes;
}
function addPaddingToBase64url(base64url) {
    if (base64url.length % 4 === 2) return base64url + "==";
    if (base64url.length % 4 === 3) return base64url + "=";
    if (base64url.length % 4 === 1) {
        throw new TypeError("Illegal base64url string!");
    }
    return base64url;
}
function convertBase64urlToBase64(b64url) {
    if (!/^[-_A-Z0-9]*?={0,2}$/i.test(b64url)) {
        throw new TypeError("Failed to decode base64url: invalid character");
    }
    return addPaddingToBase64url(b64url).replace(/\-/g, "+").replace(/_/g, "/");
}
function convertBase64ToBase64url(b64) {
    return b64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function encode1(data) {
    return convertBase64ToBase64url(encode(data));
}
function decode1(b64url) {
    return decode(convertBase64urlToBase64(b64url));
}
function asciiToBytes(str) {
    const byteArray = [];
    for(let i = 0; i < str.length; ++i){
        byteArray.push(str.charCodeAt(i) & 255);
    }
    return new Uint8Array(byteArray);
}
function base64ToBytes(str) {
    str = base64clean(str);
    str = str.replaceAll("-", "+").replaceAll("_", "/");
    return decode(str);
}
const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
function base64clean(str) {
    str = str.split("=")[0];
    str = str.trim().replace(INVALID_BASE64_RE, "");
    if (str.length < 2) return "";
    while(str.length % 4 !== 0){
        str = str + "=";
    }
    return str;
}
function base64UrlToBytes(str) {
    str = base64clean(str);
    str = str.replaceAll("+", "-").replaceAll("/", "_");
    return decode1(str);
}
function hexToBytes(str) {
    const byteArray = new Uint8Array(Math.floor((str || "").length / 2));
    let i;
    for(i = 0; i < byteArray.length; i++){
        const a = Number.parseInt(str[i * 2], 16);
        const b = Number.parseInt(str[i * 2 + 1], 16);
        if (Number.isNaN(a) && Number.isNaN(b)) {
            break;
        }
        byteArray[i] = a << 4 | b;
    }
    return new Uint8Array(i === byteArray.length ? byteArray : byteArray.slice(0, i));
}
function utf16leToBytes(str, units) {
    let c, hi, lo;
    const byteArray = [];
    for(let i = 0; i < str.length; ++i){
        if ((units -= 2) < 0) {
            break;
        }
        c = str.charCodeAt(i);
        hi = c >> 8;
        lo = c % 256;
        byteArray.push(lo);
        byteArray.push(hi);
    }
    return new Uint8Array(byteArray);
}
function bytesToAscii(bytes) {
    let ret = "";
    for(let i = 0; i < bytes.length; ++i){
        ret += String.fromCharCode(bytes[i] & 127);
    }
    return ret;
}
function bytesToUtf16le(bytes) {
    let res = "";
    for(let i = 0; i < bytes.length - 1; i += 2){
        res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
    }
    return res;
}
const utf8Encoder = new TextEncoder();
const float32Array = new Float32Array(1);
const uInt8Float32Array = new Uint8Array(float32Array.buffer);
const float64Array = new Float64Array(1);
const uInt8Float64Array = new Uint8Array(float64Array.buffer);
float32Array[0] = -1;
const bigEndian = uInt8Float32Array[3] === 0;
function readUInt48LE(buf, offset = 0) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 5];
    if (first === undefined || last === undefined) {
        boundsError(offset, buf.length - 6);
    }
    return first + buf[++offset] * 2 ** 8 + buf[++offset] * 2 ** 16 + buf[++offset] * 2 ** 24 + (buf[++offset] + last * 2 ** 8) * 2 ** 32;
}
function readUInt40LE(buf, offset = 0) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 4];
    if (first === undefined || last === undefined) {
        boundsError(offset, buf.length - 5);
    }
    return first + buf[++offset] * 2 ** 8 + buf[++offset] * 2 ** 16 + buf[++offset] * 2 ** 24 + last * 2 ** 32;
}
function readUInt24LE(buf, offset = 0) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 2];
    if (first === undefined || last === undefined) {
        boundsError(offset, buf.length - 3);
    }
    return first + buf[++offset] * 2 ** 8 + last * 2 ** 16;
}
function readUInt48BE(buf, offset = 0) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 5];
    if (first === undefined || last === undefined) {
        boundsError(offset, buf.length - 6);
    }
    return (first * 2 ** 8 + buf[++offset]) * 2 ** 32 + buf[++offset] * 2 ** 24 + buf[++offset] * 2 ** 16 + buf[++offset] * 2 ** 8 + last;
}
function readUInt40BE(buf, offset = 0) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 4];
    if (first === undefined || last === undefined) {
        boundsError(offset, buf.length - 5);
    }
    return first * 2 ** 32 + buf[++offset] * 2 ** 24 + buf[++offset] * 2 ** 16 + buf[++offset] * 2 ** 8 + last;
}
function readUInt24BE(buf, offset = 0) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 2];
    if (first === undefined || last === undefined) {
        boundsError(offset, buf.length - 3);
    }
    return first * 2 ** 16 + buf[++offset] * 2 ** 8 + last;
}
function readUInt16BE(offset = 0) {
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 1];
    if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 2);
    }
    return first * 2 ** 8 + last;
}
function readUInt32BE(offset = 0) {
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 3];
    if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 4);
    }
    return first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
}
function readDoubleBackwards(buffer, offset = 0) {
    validateNumber(offset, "offset");
    const first = buffer[offset];
    const last = buffer[offset + 7];
    if (first === undefined || last === undefined) {
        boundsError(offset, buffer.length - 8);
    }
    uInt8Float64Array[7] = first;
    uInt8Float64Array[6] = buffer[++offset];
    uInt8Float64Array[5] = buffer[++offset];
    uInt8Float64Array[4] = buffer[++offset];
    uInt8Float64Array[3] = buffer[++offset];
    uInt8Float64Array[2] = buffer[++offset];
    uInt8Float64Array[1] = buffer[++offset];
    uInt8Float64Array[0] = last;
    return float64Array[0];
}
function readDoubleForwards(buffer, offset = 0) {
    validateNumber(offset, "offset");
    const first = buffer[offset];
    const last = buffer[offset + 7];
    if (first === undefined || last === undefined) {
        boundsError(offset, buffer.length - 8);
    }
    uInt8Float64Array[0] = first;
    uInt8Float64Array[1] = buffer[++offset];
    uInt8Float64Array[2] = buffer[++offset];
    uInt8Float64Array[3] = buffer[++offset];
    uInt8Float64Array[4] = buffer[++offset];
    uInt8Float64Array[5] = buffer[++offset];
    uInt8Float64Array[6] = buffer[++offset];
    uInt8Float64Array[7] = last;
    return float64Array[0];
}
function writeDoubleForwards(buffer, val, offset = 0) {
    val = +val;
    checkBounds(buffer, offset, 7);
    float64Array[0] = val;
    buffer[offset++] = uInt8Float64Array[0];
    buffer[offset++] = uInt8Float64Array[1];
    buffer[offset++] = uInt8Float64Array[2];
    buffer[offset++] = uInt8Float64Array[3];
    buffer[offset++] = uInt8Float64Array[4];
    buffer[offset++] = uInt8Float64Array[5];
    buffer[offset++] = uInt8Float64Array[6];
    buffer[offset++] = uInt8Float64Array[7];
    return offset;
}
function writeDoubleBackwards(buffer, val, offset = 0) {
    val = +val;
    checkBounds(buffer, offset, 7);
    float64Array[0] = val;
    buffer[offset++] = uInt8Float64Array[7];
    buffer[offset++] = uInt8Float64Array[6];
    buffer[offset++] = uInt8Float64Array[5];
    buffer[offset++] = uInt8Float64Array[4];
    buffer[offset++] = uInt8Float64Array[3];
    buffer[offset++] = uInt8Float64Array[2];
    buffer[offset++] = uInt8Float64Array[1];
    buffer[offset++] = uInt8Float64Array[0];
    return offset;
}
function readFloatBackwards(buffer, offset = 0) {
    validateNumber(offset, "offset");
    const first = buffer[offset];
    const last = buffer[offset + 3];
    if (first === undefined || last === undefined) {
        boundsError(offset, buffer.length - 4);
    }
    uInt8Float32Array[3] = first;
    uInt8Float32Array[2] = buffer[++offset];
    uInt8Float32Array[1] = buffer[++offset];
    uInt8Float32Array[0] = last;
    return float32Array[0];
}
function readFloatForwards(buffer, offset = 0) {
    validateNumber(offset, "offset");
    const first = buffer[offset];
    const last = buffer[offset + 3];
    if (first === undefined || last === undefined) {
        boundsError(offset, buffer.length - 4);
    }
    uInt8Float32Array[0] = first;
    uInt8Float32Array[1] = buffer[++offset];
    uInt8Float32Array[2] = buffer[++offset];
    uInt8Float32Array[3] = last;
    return float32Array[0];
}
function writeFloatForwards(buffer, val, offset = 0) {
    val = +val;
    checkBounds(buffer, offset, 3);
    float32Array[0] = val;
    buffer[offset++] = uInt8Float32Array[0];
    buffer[offset++] = uInt8Float32Array[1];
    buffer[offset++] = uInt8Float32Array[2];
    buffer[offset++] = uInt8Float32Array[3];
    return offset;
}
function writeFloatBackwards(buffer, val, offset = 0) {
    val = +val;
    checkBounds(buffer, offset, 3);
    float32Array[0] = val;
    buffer[offset++] = uInt8Float32Array[3];
    buffer[offset++] = uInt8Float32Array[2];
    buffer[offset++] = uInt8Float32Array[1];
    buffer[offset++] = uInt8Float32Array[0];
    return offset;
}
function readInt24LE(buf, offset = 0) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 2];
    if (first === undefined || last === undefined) {
        boundsError(offset, buf.length - 3);
    }
    const val = first + buf[++offset] * 2 ** 8 + last * 2 ** 16;
    return val | (val & 2 ** 23) * 0x1fe;
}
function readInt40LE(buf, offset = 0) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 4];
    if (first === undefined || last === undefined) {
        boundsError(offset, buf.length - 5);
    }
    return (last | (last & 2 ** 7) * 0x1fffffe) * 2 ** 32 + first + buf[++offset] * 2 ** 8 + buf[++offset] * 2 ** 16 + buf[++offset] * 2 ** 24;
}
function readInt48LE(buf, offset = 0) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 5];
    if (first === undefined || last === undefined) {
        boundsError(offset, buf.length - 6);
    }
    const val = buf[offset + 4] + last * 2 ** 8;
    return (val | (val & 2 ** 15) * 0x1fffe) * 2 ** 32 + first + buf[++offset] * 2 ** 8 + buf[++offset] * 2 ** 16 + buf[++offset] * 2 ** 24;
}
function readInt24BE(buf, offset = 0) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 2];
    if (first === undefined || last === undefined) {
        boundsError(offset, buf.length - 3);
    }
    const val = first * 2 ** 16 + buf[++offset] * 2 ** 8 + last;
    return val | (val & 2 ** 23) * 0x1fe;
}
function readInt48BE(buf, offset = 0) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 5];
    if (first === undefined || last === undefined) {
        boundsError(offset, buf.length - 6);
    }
    const val = buf[++offset] + first * 2 ** 8;
    return (val | (val & 2 ** 15) * 0x1fffe) * 2 ** 32 + buf[++offset] * 2 ** 24 + buf[++offset] * 2 ** 16 + buf[++offset] * 2 ** 8 + last;
}
function readInt40BE(buf, offset = 0) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 4];
    if (first === undefined || last === undefined) {
        boundsError(offset, buf.length - 5);
    }
    return (first | (first & 2 ** 7) * 0x1fffffe) * 2 ** 32 + buf[++offset] * 2 ** 24 + buf[++offset] * 2 ** 16 + buf[++offset] * 2 ** 8 + last;
}
function byteLengthUtf8(str) {
    return utf8Encoder.encode(str).length;
}
function base64ByteLength(str, bytes) {
    if (str.charCodeAt(bytes - 1) === 0x3D) {
        bytes--;
    }
    if (bytes > 1 && str.charCodeAt(bytes - 1) === 0x3D) {
        bytes--;
    }
    return bytes * 3 >>> 2;
}
const encodingsMap = Object.create(null);
for(let i = 0; i < encodings.length; ++i){
    encodingsMap[encodings[i]] = i;
}
const encodingOps = {
    ascii: {
        byteLength: (string)=>string.length,
        encoding: "ascii",
        encodingVal: encodingsMap.ascii,
        indexOf: (buf, val, byteOffset, dir)=>indexOfBuffer(buf, asciiToBytes(val), byteOffset, encodingsMap.ascii, dir),
        slice: (buf, start, end)=>buf.asciiSlice(start, end),
        write: (buf, string, offset, len)=>buf.asciiWrite(string, offset, len)
    },
    base64: {
        byteLength: (string)=>base64ByteLength(string, string.length),
        encoding: "base64",
        encodingVal: encodingsMap.base64,
        indexOf: (buf, val, byteOffset, dir)=>indexOfBuffer(buf, base64ToBytes(val), byteOffset, encodingsMap.base64, dir),
        slice: (buf, start, end)=>buf.base64Slice(start, end),
        write: (buf, string, offset, len)=>buf.base64Write(string, offset, len)
    },
    base64url: {
        byteLength: (string)=>base64ByteLength(string, string.length),
        encoding: "base64url",
        encodingVal: encodingsMap.base64url,
        indexOf: (buf, val, byteOffset, dir)=>indexOfBuffer(buf, base64UrlToBytes(val), byteOffset, encodingsMap.base64url, dir),
        slice: (buf, start, end)=>buf.base64urlSlice(start, end),
        write: (buf, string, offset, len)=>buf.base64urlWrite(string, offset, len)
    },
    hex: {
        byteLength: (string)=>string.length >>> 1,
        encoding: "hex",
        encodingVal: encodingsMap.hex,
        indexOf: (buf, val, byteOffset, dir)=>indexOfBuffer(buf, hexToBytes(val), byteOffset, encodingsMap.hex, dir),
        slice: (buf, start, end)=>buf.hexSlice(start, end),
        write: (buf, string, offset, len)=>buf.hexWrite(string, offset, len)
    },
    latin1: {
        byteLength: (string)=>string.length,
        encoding: "latin1",
        encodingVal: encodingsMap.latin1,
        indexOf: (buf, val, byteOffset, dir)=>indexOfBuffer(buf, asciiToBytes(val), byteOffset, encodingsMap.latin1, dir),
        slice: (buf, start, end)=>buf.latin1Slice(start, end),
        write: (buf, string, offset, len)=>buf.latin1Write(string, offset, len)
    },
    ucs2: {
        byteLength: (string)=>string.length * 2,
        encoding: "ucs2",
        encodingVal: encodingsMap.utf16le,
        indexOf: (buf, val, byteOffset, dir)=>indexOfBuffer(buf, utf16leToBytes(val), byteOffset, encodingsMap.utf16le, dir),
        slice: (buf, start, end)=>buf.ucs2Slice(start, end),
        write: (buf, string, offset, len)=>buf.ucs2Write(string, offset, len)
    },
    utf8: {
        byteLength: byteLengthUtf8,
        encoding: "utf8",
        encodingVal: encodingsMap.utf8,
        indexOf: (buf, val, byteOffset, dir)=>indexOfBuffer(buf, utf8Encoder.encode(val), byteOffset, encodingsMap.utf8, dir),
        slice: (buf, start, end)=>buf.utf8Slice(start, end),
        write: (buf, string, offset, len)=>buf.utf8Write(string, offset, len)
    },
    utf16le: {
        byteLength: (string)=>string.length * 2,
        encoding: "utf16le",
        encodingVal: encodingsMap.utf16le,
        indexOf: (buf, val, byteOffset, dir)=>indexOfBuffer(buf, utf16leToBytes(val), byteOffset, encodingsMap.utf16le, dir),
        slice: (buf, start, end)=>buf.ucs2Slice(start, end),
        write: (buf, string, offset, len)=>buf.ucs2Write(string, offset, len)
    }
};
function getEncodingOps(encoding) {
    encoding = String(encoding).toLowerCase();
    switch(encoding.length){
        case 4:
            if (encoding === "utf8") return encodingOps.utf8;
            if (encoding === "ucs2") return encodingOps.ucs2;
            break;
        case 5:
            if (encoding === "utf-8") return encodingOps.utf8;
            if (encoding === "ascii") return encodingOps.ascii;
            if (encoding === "ucs-2") return encodingOps.ucs2;
            break;
        case 7:
            if (encoding === "utf16le") {
                return encodingOps.utf16le;
            }
            break;
        case 8:
            if (encoding === "utf-16le") {
                return encodingOps.utf16le;
            }
            break;
        case 6:
            if (encoding === "latin1" || encoding === "binary") {
                return encodingOps.latin1;
            }
            if (encoding === "base64") return encodingOps.base64;
        case 3:
            if (encoding === "hex") {
                return encodingOps.hex;
            }
            break;
        case 9:
            if (encoding === "base64url") {
                return encodingOps.base64url;
            }
            break;
    }
}
function _copyActual(source, target, targetStart, sourceStart, sourceEnd) {
    if (sourceEnd - sourceStart > target.length - targetStart) {
        sourceEnd = sourceStart + target.length - targetStart;
    }
    let nb = sourceEnd - sourceStart;
    const sourceLen = source.length - sourceStart;
    if (nb > sourceLen) {
        nb = sourceLen;
    }
    if (sourceStart !== 0 || sourceEnd < source.length) {
        source = new Uint8Array(source.buffer, source.byteOffset + sourceStart, nb);
    }
    target.set(source, targetStart);
    return nb;
}
function boundsError(value, length, type) {
    if (Math.floor(value) !== value) {
        validateNumber(value, type);
        throw new codes.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
    }
    if (length < 0) {
        throw new codes.ERR_BUFFER_OUT_OF_BOUNDS();
    }
    throw new codes.ERR_OUT_OF_RANGE(type || "offset", `>= ${type ? 1 : 0} and <= ${length}`, value);
}
function validateNumber(value, name) {
    if (typeof value !== "number") {
        throw new codes.ERR_INVALID_ARG_TYPE(name, "number", value);
    }
}
function checkBounds(buf, offset, byteLength) {
    validateNumber(offset, "offset");
    if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
        boundsError(offset, buf.length - (byteLength + 1));
    }
}
function checkInt(value, min, max, buf, offset, byteLength) {
    if (value > max || value < min) {
        const n = typeof min === "bigint" ? "n" : "";
        let range;
        if (byteLength > 3) {
            if (min === 0 || min === 0n) {
                range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`;
            } else {
                range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and ` + `< 2${n} ** ${(byteLength + 1) * 8 - 1}${n}`;
            }
        } else {
            range = `>= ${min}${n} and <= ${max}${n}`;
        }
        throw new codes.ERR_OUT_OF_RANGE("value", range, value);
    }
    checkBounds(buf, offset, byteLength);
}
function toInteger(n, defaultVal) {
    n = +n;
    if (!Number.isNaN(n) && n >= Number.MIN_SAFE_INTEGER && n <= Number.MAX_SAFE_INTEGER) {
        return n % 1 === 0 ? n : Math.floor(n);
    }
    return defaultVal;
}
function writeU_Int8(buf, value, offset, min, max) {
    value = +value;
    validateNumber(offset, "offset");
    if (value > max || value < min) {
        throw new codes.ERR_OUT_OF_RANGE("value", `>= ${min} and <= ${max}`, value);
    }
    if (buf[offset] === undefined) {
        boundsError(offset, buf.length - 1);
    }
    buf[offset] = value;
    return offset + 1;
}
function writeU_Int16BE(buf, value, offset, min, max) {
    value = +value;
    checkInt(value, min, max, buf, offset, 1);
    buf[offset++] = value >>> 8;
    buf[offset++] = value;
    return offset;
}
function _writeUInt32LE(buf, value, offset, min, max) {
    value = +value;
    checkInt(value, min, max, buf, offset, 3);
    buf[offset++] = value;
    value = value >>> 8;
    buf[offset++] = value;
    value = value >>> 8;
    buf[offset++] = value;
    value = value >>> 8;
    buf[offset++] = value;
    return offset;
}
function writeU_Int16LE(buf, value, offset, min, max) {
    value = +value;
    checkInt(value, min, max, buf, offset, 1);
    buf[offset++] = value;
    buf[offset++] = value >>> 8;
    return offset;
}
function _writeUInt32BE(buf, value, offset, min, max) {
    value = +value;
    checkInt(value, min, max, buf, offset, 3);
    buf[offset + 3] = value;
    value = value >>> 8;
    buf[offset + 2] = value;
    value = value >>> 8;
    buf[offset + 1] = value;
    value = value >>> 8;
    buf[offset] = value;
    return offset + 4;
}
function writeU_Int48BE(buf, value, offset, min, max) {
    value = +value;
    checkInt(value, min, max, buf, offset, 5);
    const newVal = Math.floor(value * 2 ** -32);
    buf[offset++] = newVal >>> 8;
    buf[offset++] = newVal;
    buf[offset + 3] = value;
    value = value >>> 8;
    buf[offset + 2] = value;
    value = value >>> 8;
    buf[offset + 1] = value;
    value = value >>> 8;
    buf[offset] = value;
    return offset + 4;
}
function writeU_Int40BE(buf, value, offset, min, max) {
    value = +value;
    checkInt(value, min, max, buf, offset, 4);
    buf[offset++] = Math.floor(value * 2 ** -32);
    buf[offset + 3] = value;
    value = value >>> 8;
    buf[offset + 2] = value;
    value = value >>> 8;
    buf[offset + 1] = value;
    value = value >>> 8;
    buf[offset] = value;
    return offset + 4;
}
function writeU_Int32BE(buf, value, offset, min, max) {
    value = +value;
    checkInt(value, min, max, buf, offset, 3);
    buf[offset + 3] = value;
    value = value >>> 8;
    buf[offset + 2] = value;
    value = value >>> 8;
    buf[offset + 1] = value;
    value = value >>> 8;
    buf[offset] = value;
    return offset + 4;
}
function writeU_Int24BE(buf, value, offset, min, max) {
    value = +value;
    checkInt(value, min, max, buf, offset, 2);
    buf[offset + 2] = value;
    value = value >>> 8;
    buf[offset + 1] = value;
    value = value >>> 8;
    buf[offset] = value;
    return offset + 3;
}
function validateOffset(value, name, min = 0, max = Number.MAX_SAFE_INTEGER) {
    if (typeof value !== "number") {
        throw new codes.ERR_INVALID_ARG_TYPE(name, "number", value);
    }
    if (!Number.isInteger(value)) {
        throw new codes.ERR_OUT_OF_RANGE(name, "an integer", value);
    }
    if (value < min || value > max) {
        throw new codes.ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value);
    }
}
function writeU_Int48LE(buf, value, offset, min, max) {
    value = +value;
    checkInt(value, min, max, buf, offset, 5);
    const newVal = Math.floor(value * 2 ** -32);
    buf[offset++] = value;
    value = value >>> 8;
    buf[offset++] = value;
    value = value >>> 8;
    buf[offset++] = value;
    value = value >>> 8;
    buf[offset++] = value;
    buf[offset++] = newVal;
    buf[offset++] = newVal >>> 8;
    return offset;
}
function writeU_Int40LE(buf, value, offset, min, max) {
    value = +value;
    checkInt(value, min, max, buf, offset, 4);
    const newVal = value;
    buf[offset++] = value;
    value = value >>> 8;
    buf[offset++] = value;
    value = value >>> 8;
    buf[offset++] = value;
    value = value >>> 8;
    buf[offset++] = value;
    buf[offset++] = Math.floor(newVal * 2 ** -32);
    return offset;
}
function writeU_Int32LE(buf, value, offset, min, max) {
    value = +value;
    checkInt(value, min, max, buf, offset, 3);
    buf[offset++] = value;
    value = value >>> 8;
    buf[offset++] = value;
    value = value >>> 8;
    buf[offset++] = value;
    value = value >>> 8;
    buf[offset++] = value;
    return offset;
}
function writeU_Int24LE(buf, value, offset, min, max) {
    value = +value;
    checkInt(value, min, max, buf, offset, 2);
    buf[offset++] = value;
    value = value >>> 8;
    buf[offset++] = value;
    value = value >>> 8;
    buf[offset++] = value;
    return offset;
}
const kMaxLength = 2147483647;
const MAX_UINT32 = 2 ** 32;
const customInspectSymbol1 = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
const INSPECT_MAX_BYTES = 50;
Object.defineProperty(Buffer.prototype, "parent", {
    enumerable: true,
    get: function() {
        if (!Buffer.isBuffer(this)) {
            return void 0;
        }
        return this.buffer;
    }
});
Object.defineProperty(Buffer.prototype, "offset", {
    enumerable: true,
    get: function() {
        if (!Buffer.isBuffer(this)) {
            return void 0;
        }
        return this.byteOffset;
    }
});
function createBuffer(length) {
    if (length > 2147483647) {
        throw new RangeError('The value "' + length + '" is invalid for option "size"');
    }
    const buf = new Uint8Array(length);
    Object.setPrototypeOf(buf, Buffer.prototype);
    return buf;
}
function Buffer(arg, encodingOrOffset, length) {
    if (typeof arg === "number") {
        if (typeof encodingOrOffset === "string") {
            throw new codes.ERR_INVALID_ARG_TYPE("string", "string", arg);
        }
        return _allocUnsafe(arg);
    }
    return _from(arg, encodingOrOffset, length);
}
Buffer.poolSize = 8192;
function _from(value, encodingOrOffset, length) {
    if (typeof value === "string") {
        return fromString(value, encodingOrOffset);
    }
    if (typeof value === "object" && value !== null) {
        if (isAnyArrayBuffer1(value)) {
            return fromArrayBuffer(value, encodingOrOffset, length);
        }
        const valueOf = value.valueOf && value.valueOf();
        if (valueOf != null && valueOf !== value && (typeof valueOf === "string" || typeof valueOf === "object")) {
            return _from(valueOf, encodingOrOffset, length);
        }
        const b = fromObject(value);
        if (b) {
            return b;
        }
        if (typeof value[Symbol.toPrimitive] === "function") {
            const primitive = value[Symbol.toPrimitive]("string");
            if (typeof primitive === "string") {
                return fromString(primitive, encodingOrOffset);
            }
        }
    }
    throw new codes.ERR_INVALID_ARG_TYPE("first argument", [
        "string",
        "Buffer",
        "ArrayBuffer",
        "Array",
        "Array-like Object"
    ], value);
}
Buffer.from = function from(value, encodingOrOffset, length) {
    return _from(value, encodingOrOffset, length);
};
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
Object.setPrototypeOf(Buffer, Uint8Array);
function assertSize(size) {
    validateNumber(size, "size");
    if (!(size >= 0 && size <= 2147483647)) {
        throw new codes.ERR_INVALID_ARG_VALUE.RangeError("size", size);
    }
}
function _alloc(size, fill, encoding) {
    assertSize(size);
    const buffer = createBuffer(size);
    if (fill !== undefined) {
        if (encoding !== undefined && typeof encoding !== "string") {
            throw new codes.ERR_INVALID_ARG_TYPE("encoding", "string", encoding);
        }
        return buffer.fill(fill, encoding);
    }
    return buffer;
}
Buffer.alloc = function alloc(size, fill, encoding) {
    return _alloc(size, fill, encoding);
};
function _allocUnsafe(size) {
    assertSize(size);
    return createBuffer(size < 0 ? 0 : checked(size) | 0);
}
Buffer.allocUnsafe = function allocUnsafe(size) {
    return _allocUnsafe(size);
};
Buffer.allocUnsafeSlow = function allocUnsafeSlow(size) {
    return _allocUnsafe(size);
};
function fromString(string, encoding) {
    if (typeof encoding !== "string" || encoding === "") {
        encoding = "utf8";
    }
    if (!Buffer.isEncoding(encoding)) {
        throw new codes.ERR_UNKNOWN_ENCODING(encoding);
    }
    const length = byteLength(string, encoding) | 0;
    let buf = createBuffer(length);
    const actual = buf.write(string, encoding);
    if (actual !== length) {
        buf = buf.slice(0, actual);
    }
    return buf;
}
function fromArrayLike(array) {
    const length = array.length < 0 ? 0 : checked(array.length) | 0;
    const buf = createBuffer(length);
    for(let i = 0; i < length; i += 1){
        buf[i] = array[i] & 255;
    }
    return buf;
}
function fromObject(obj) {
    if (obj.length !== undefined || isAnyArrayBuffer1(obj.buffer)) {
        if (typeof obj.length !== "number") {
            return createBuffer(0);
        }
        return fromArrayLike(obj);
    }
    if (obj.type === "Buffer" && Array.isArray(obj.data)) {
        return fromArrayLike(obj.data);
    }
}
function checked(length) {
    if (length >= 2147483647) {
        throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + 2147483647..toString(16) + " bytes");
    }
    return length | 0;
}
function SlowBuffer(length) {
    assertSize(length);
    return Buffer.alloc(+length);
}
Object.setPrototypeOf(SlowBuffer.prototype, Uint8Array.prototype);
Object.setPrototypeOf(SlowBuffer, Uint8Array);
Buffer.isBuffer = function isBuffer(b) {
    return b != null && b._isBuffer === true && b !== Buffer.prototype;
};
Buffer.compare = function compare(a, b) {
    if (isInstance(a, Uint8Array)) {
        a = Buffer.from(a, a.offset, a.byteLength);
    }
    if (isInstance(b, Uint8Array)) {
        b = Buffer.from(b, b.offset, b.byteLength);
    }
    if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
        throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
    }
    if (a === b) {
        return 0;
    }
    let x = a.length;
    let y = b.length;
    for(let i = 0, len = Math.min(x, y); i < len; ++i){
        if (a[i] !== b[i]) {
            x = a[i];
            y = b[i];
            break;
        }
    }
    if (x < y) {
        return -1;
    }
    if (y < x) {
        return 1;
    }
    return 0;
};
Buffer.isEncoding = function isEncoding(encoding) {
    return typeof encoding === "string" && encoding.length !== 0 && normalizeEncoding(encoding) !== undefined;
};
Buffer.concat = function concat(list, length) {
    if (!Array.isArray(list)) {
        throw new codes.ERR_INVALID_ARG_TYPE("list", "Array", list);
    }
    if (list.length === 0) {
        return Buffer.alloc(0);
    }
    if (length === undefined) {
        length = 0;
        for(let i = 0; i < list.length; i++){
            if (list[i].length) {
                length += list[i].length;
            }
        }
    } else {
        validateOffset(length, "length");
    }
    const buffer = Buffer.allocUnsafe(length);
    let pos = 0;
    for(let i1 = 0; i1 < list.length; i1++){
        const buf = list[i1];
        if (!isUint8Array(buf)) {
            throw new codes.ERR_INVALID_ARG_TYPE(`list[${i1}]`, [
                "Buffer",
                "Uint8Array"
            ], list[i1]);
        }
        pos += _copyActual(buf, buffer, pos, 0, buf.length);
    }
    if (pos < length) {
        buffer.fill(0, pos, length);
    }
    return buffer;
};
function byteLength(string, encoding) {
    if (typeof string !== "string") {
        if (isArrayBufferView(string) || isAnyArrayBuffer1(string)) {
            return string.byteLength;
        }
        throw new codes.ERR_INVALID_ARG_TYPE("string", [
            "string",
            "Buffer",
            "ArrayBuffer"
        ], string);
    }
    const len = string.length;
    const mustMatch = arguments.length > 2 && arguments[2] === true;
    if (!mustMatch && len === 0) {
        return 0;
    }
    if (!encoding) {
        return mustMatch ? -1 : byteLengthUtf8(string);
    }
    const ops = getEncodingOps(encoding);
    if (ops === undefined) {
        return mustMatch ? -1 : byteLengthUtf8(string);
    }
    return ops.byteLength(string);
}
Buffer.byteLength = byteLength;
Buffer.prototype._isBuffer = true;
function swap(b, n, m) {
    const i = b[n];
    b[n] = b[m];
    b[m] = i;
}
Buffer.prototype.swap16 = function swap16() {
    const len = this.length;
    if (len % 2 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 16-bits");
    }
    for(let i = 0; i < len; i += 2){
        swap(this, i, i + 1);
    }
    return this;
};
Buffer.prototype.swap32 = function swap32() {
    const len = this.length;
    if (len % 4 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 32-bits");
    }
    for(let i = 0; i < len; i += 4){
        swap(this, i, i + 3);
        swap(this, i + 1, i + 2);
    }
    return this;
};
Buffer.prototype.swap64 = function swap64() {
    const len = this.length;
    if (len % 8 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 64-bits");
    }
    for(let i = 0; i < len; i += 8){
        swap(this, i, i + 7);
        swap(this, i + 1, i + 6);
        swap(this, i + 2, i + 5);
        swap(this, i + 3, i + 4);
    }
    return this;
};
Buffer.prototype.toString = function toString(encoding, start, end) {
    if (arguments.length === 0) {
        return this.utf8Slice(0, this.length);
    }
    const len = this.length;
    if (start <= 0) {
        start = 0;
    } else if (start >= len) {
        return "";
    } else {
        start |= 0;
    }
    if (end === undefined || end > len) {
        end = len;
    } else {
        end |= 0;
    }
    if (end <= start) {
        return "";
    }
    if (encoding === undefined) {
        return this.utf8Slice(start, end);
    }
    const ops = getEncodingOps(encoding);
    if (ops === undefined) {
        throw new codes.ERR_UNKNOWN_ENCODING(encoding);
    }
    return ops.slice(this, start, end);
};
Buffer.prototype.toLocaleString = Buffer.prototype.toString;
Buffer.prototype.equals = function equals(b) {
    if (!isUint8Array(b)) {
        throw new codes.ERR_INVALID_ARG_TYPE("otherBuffer", [
            "Buffer",
            "Uint8Array"
        ], b);
    }
    if (this === b) {
        return true;
    }
    return Buffer.compare(this, b) === 0;
};
Buffer.prototype.inspect = function inspect() {
    let str = "";
    const max = INSPECT_MAX_BYTES;
    str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
    if (this.length > max) {
        str += " ... ";
    }
    return "<Buffer " + str + ">";
};
if (customInspectSymbol1) {
    Buffer.prototype[customInspectSymbol1] = Buffer.prototype.inspect;
}
Buffer.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
    if (isInstance(target, Uint8Array)) {
        target = Buffer.from(target, target.offset, target.byteLength);
    }
    if (!Buffer.isBuffer(target)) {
        throw new codes.ERR_INVALID_ARG_TYPE("target", [
            "Buffer",
            "Uint8Array"
        ], target);
    }
    if (start === undefined) {
        start = 0;
    } else {
        validateOffset(start, "targetStart", 0, kMaxLength);
    }
    if (end === undefined) {
        end = target.length;
    } else {
        validateOffset(end, "targetEnd", 0, target.length);
    }
    if (thisStart === undefined) {
        thisStart = 0;
    } else {
        validateOffset(start, "sourceStart", 0, kMaxLength);
    }
    if (thisEnd === undefined) {
        thisEnd = this.length;
    } else {
        validateOffset(end, "sourceEnd", 0, this.length);
    }
    if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new codes.ERR_OUT_OF_RANGE("out of range index", "range");
    }
    if (thisStart >= thisEnd && start >= end) {
        return 0;
    }
    if (thisStart >= thisEnd) {
        return -1;
    }
    if (start >= end) {
        return 1;
    }
    start >>>= 0;
    end >>>= 0;
    thisStart >>>= 0;
    thisEnd >>>= 0;
    if (this === target) {
        return 0;
    }
    let x = thisEnd - thisStart;
    let y = end - start;
    const len = Math.min(x, y);
    const thisCopy = this.slice(thisStart, thisEnd);
    const targetCopy = target.slice(start, end);
    for(let i = 0; i < len; ++i){
        if (thisCopy[i] !== targetCopy[i]) {
            x = thisCopy[i];
            y = targetCopy[i];
            break;
        }
    }
    if (x < y) {
        return -1;
    }
    if (y < x) {
        return 1;
    }
    return 0;
};
function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
    validateBuffer(buffer);
    if (typeof byteOffset === "string") {
        encoding = byteOffset;
        byteOffset = undefined;
    } else if (byteOffset > 0x7fffffff) {
        byteOffset = 0x7fffffff;
    } else if (byteOffset < -0x80000000) {
        byteOffset = -0x80000000;
    }
    byteOffset = +byteOffset;
    if (Number.isNaN(byteOffset)) {
        byteOffset = dir ? 0 : buffer.length || buffer.byteLength;
    }
    dir = !!dir;
    if (typeof val === "number") {
        return indexOfNumber(buffer, val >>> 0, byteOffset, dir);
    }
    let ops;
    if (encoding === undefined) {
        ops = encodingOps.utf8;
    } else {
        ops = getEncodingOps(encoding);
    }
    if (typeof val === "string") {
        if (ops === undefined) {
            throw new codes.ERR_UNKNOWN_ENCODING(encoding);
        }
        return ops.indexOf(buffer, val, byteOffset, dir);
    }
    if (isUint8Array(val)) {
        const encodingVal = ops === undefined ? encodingsMap.utf8 : ops.encodingVal;
        return indexOfBuffer(buffer, val, byteOffset, encodingVal, dir);
    }
    throw new codes.ERR_INVALID_ARG_TYPE("value", [
        "number",
        "string",
        "Buffer",
        "Uint8Array"
    ], val);
}
Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
    return this.indexOf(val, byteOffset, encoding) !== -1;
};
Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
};
Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
};
Buffer.prototype.asciiSlice = function asciiSlice(offset, length) {
    if (offset === 0 && length === this.length) {
        return bytesToAscii(this);
    } else {
        return bytesToAscii(this.slice(offset, length));
    }
};
Buffer.prototype.asciiWrite = function asciiWrite(string, offset, length) {
    return blitBuffer(asciiToBytes(string), this, offset, length);
};
Buffer.prototype.base64Slice = function base64Slice(offset, length) {
    if (offset === 0 && length === this.length) {
        return encode(this);
    } else {
        return encode(this.slice(offset, length));
    }
};
Buffer.prototype.base64Write = function base64Write(string, offset, length) {
    return blitBuffer(base64ToBytes(string), this, offset, length);
};
Buffer.prototype.base64urlSlice = function base64urlSlice(offset, length) {
    if (offset === 0 && length === this.length) {
        return encode1(this);
    } else {
        return encode1(this.slice(offset, length));
    }
};
Buffer.prototype.base64urlWrite = function base64urlWrite(string, offset, length) {
    return blitBuffer(base64UrlToBytes(string), this, offset, length);
};
Buffer.prototype.hexWrite = function hexWrite(string, offset, length) {
    return blitBuffer(hexToBytes(string, this.length - offset), this, offset, length);
};
Buffer.prototype.hexSlice = function hexSlice(string, offset, length) {
    return _hexSlice(this, string, offset, length);
};
Buffer.prototype.latin1Slice = function latin1Slice(string, offset, length) {
    return _latin1Slice(this, string, offset, length);
};
Buffer.prototype.latin1Write = function latin1Write(string, offset, length) {
    return blitBuffer(asciiToBytes(string), this, offset, length);
};
Buffer.prototype.ucs2Slice = function ucs2Slice(offset, length) {
    if (offset === 0 && length === this.length) {
        return bytesToUtf16le(this);
    } else {
        return bytesToUtf16le(this.slice(offset, length));
    }
};
Buffer.prototype.ucs2Write = function ucs2Write(string, offset, length) {
    return blitBuffer(utf16leToBytes(string, this.length - offset), this, offset, length);
};
Buffer.prototype.utf8Slice = function utf8Slice(string, offset, length) {
    return _utf8Slice(this, string, offset, length);
};
Buffer.prototype.utf8Write = function utf8Write(string, offset, length) {
    return blitBuffer(utf8ToBytes(string, this.length - offset), this, offset, length);
};
Buffer.prototype.write = function write(string, offset, length, encoding) {
    if (offset === undefined) {
        return this.utf8Write(string, 0, this.length);
    }
    if (length === undefined && typeof offset === "string") {
        encoding = offset;
        length = this.length;
        offset = 0;
    } else {
        validateOffset(offset, "offset", 0, this.length);
        const remaining = this.length - offset;
        if (length === undefined) {
            length = remaining;
        } else if (typeof length === "string") {
            encoding = length;
            length = remaining;
        } else {
            validateOffset(length, "length", 0, this.length);
            if (length > remaining) {
                length = remaining;
            }
        }
    }
    if (!encoding) {
        return this.utf8Write(string, offset, length);
    }
    const ops = getEncodingOps(encoding);
    if (ops === undefined) {
        throw new codes.ERR_UNKNOWN_ENCODING(encoding);
    }
    return ops.write(this, string, offset, length);
};
Buffer.prototype.toJSON = function toJSON() {
    return {
        type: "Buffer",
        data: Array.prototype.slice.call(this._arr || this, 0)
    };
};
function fromArrayBuffer(obj, byteOffset, length) {
    if (byteOffset === undefined) {
        byteOffset = 0;
    } else {
        byteOffset = +byteOffset;
        if (Number.isNaN(byteOffset)) {
            byteOffset = 0;
        }
    }
    const maxLength = obj.byteLength - byteOffset;
    if (maxLength < 0) {
        throw new codes.ERR_BUFFER_OUT_OF_BOUNDS("offset");
    }
    if (length === undefined) {
        length = maxLength;
    } else {
        length = +length;
        if (length > 0) {
            if (length > maxLength) {
                throw new codes.ERR_BUFFER_OUT_OF_BOUNDS("length");
            }
        } else {
            length = 0;
        }
    }
    const buffer = new Uint8Array(obj, byteOffset, length);
    Object.setPrototypeOf(buffer, Buffer.prototype);
    return buffer;
}
function _utf8Slice(buf, start, end) {
    end = Math.min(buf.length, end);
    const res = [];
    let i = start;
    while(i < end){
        const firstByte = buf[i];
        let codePoint = null;
        let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
        if (i + bytesPerSequence <= end) {
            let secondByte, thirdByte, fourthByte, tempCodePoint;
            switch(bytesPerSequence){
                case 1:
                    if (firstByte < 128) {
                        codePoint = firstByte;
                    }
                    break;
                case 2:
                    secondByte = buf[i + 1];
                    if ((secondByte & 192) === 128) {
                        tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                        if (tempCodePoint > 127) {
                            codePoint = tempCodePoint;
                        }
                    }
                    break;
                case 3:
                    secondByte = buf[i + 1];
                    thirdByte = buf[i + 2];
                    if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                        tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                        if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                            codePoint = tempCodePoint;
                        }
                    }
                    break;
                case 4:
                    secondByte = buf[i + 1];
                    thirdByte = buf[i + 2];
                    fourthByte = buf[i + 3];
                    if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                        tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                        if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                            codePoint = tempCodePoint;
                        }
                    }
            }
        }
        if (codePoint === null) {
            codePoint = 65533;
            bytesPerSequence = 1;
        } else if (codePoint > 65535) {
            codePoint -= 65536;
            res.push(codePoint >>> 10 & 1023 | 55296);
            codePoint = 56320 | codePoint & 1023;
        }
        res.push(codePoint);
        i += bytesPerSequence;
    }
    return decodeCodePointsArray(res);
}
const MAX_ARGUMENTS_LENGTH = 4096;
function decodeCodePointsArray(codePoints) {
    const len = codePoints.length;
    if (len <= 4096) {
        return String.fromCharCode.apply(String, codePoints);
    }
    let res = "";
    let i = 0;
    while(i < len){
        res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
    }
    return res;
}
function _latin1Slice(buf, start, end) {
    let ret = "";
    end = Math.min(buf.length, end);
    for(let i = start; i < end; ++i){
        ret += String.fromCharCode(buf[i]);
    }
    return ret;
}
function _hexSlice(buf, start, end) {
    const len = buf.length;
    if (!start || start < 0) {
        start = 0;
    }
    if (!end || end < 0 || end > len) {
        end = len;
    }
    let out = "";
    for(let i = start; i < end; ++i){
        out += hexSliceLookupTable[buf[i]];
    }
    return out;
}
Buffer.prototype.slice = function slice(start, end) {
    const len = this.length;
    start = ~~start;
    end = end === void 0 ? len : ~~end;
    if (start < 0) {
        start += len;
        if (start < 0) {
            start = 0;
        }
    } else if (start > len) {
        start = len;
    }
    if (end < 0) {
        end += len;
        if (end < 0) {
            end = 0;
        }
    } else if (end > len) {
        end = len;
    }
    if (end < start) {
        end = start;
    }
    const newBuf = this.subarray(start, end);
    Object.setPrototypeOf(newBuf, Buffer.prototype);
    return newBuf;
};
Buffer.prototype.readUintLE = Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength) {
    if (offset === undefined) {
        throw new codes.ERR_INVALID_ARG_TYPE("offset", "number", offset);
    }
    if (byteLength === 6) {
        return readUInt48LE(this, offset);
    }
    if (byteLength === 5) {
        return readUInt40LE(this, offset);
    }
    if (byteLength === 3) {
        return readUInt24LE(this, offset);
    }
    if (byteLength === 4) {
        return this.readUInt32LE(offset);
    }
    if (byteLength === 2) {
        return this.readUInt16LE(offset);
    }
    if (byteLength === 1) {
        return this.readUInt8(offset);
    }
    boundsError(byteLength, 6, "byteLength");
};
Buffer.prototype.readUintBE = Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength) {
    if (offset === undefined) {
        throw new codes.ERR_INVALID_ARG_TYPE("offset", "number", offset);
    }
    if (byteLength === 6) {
        return readUInt48BE(this, offset);
    }
    if (byteLength === 5) {
        return readUInt40BE(this, offset);
    }
    if (byteLength === 3) {
        return readUInt24BE(this, offset);
    }
    if (byteLength === 4) {
        return this.readUInt32BE(offset);
    }
    if (byteLength === 2) {
        return this.readUInt16BE(offset);
    }
    if (byteLength === 1) {
        return this.readUInt8(offset);
    }
    boundsError(byteLength, 6, "byteLength");
};
Buffer.prototype.readUint8 = Buffer.prototype.readUInt8 = function readUInt8(offset = 0) {
    validateNumber(offset, "offset");
    const val = this[offset];
    if (val === undefined) {
        boundsError(offset, this.length - 1);
    }
    return val;
};
Buffer.prototype.readUint16BE = Buffer.prototype.readUInt16BE = readUInt16BE;
Buffer.prototype.readUint16LE = Buffer.prototype.readUInt16LE = function readUInt16LE(offset = 0) {
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 1];
    if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 2);
    }
    return first + last * 2 ** 8;
};
Buffer.prototype.readUint32LE = Buffer.prototype.readUInt32LE = function readUInt32LE(offset = 0) {
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 3];
    if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 4);
    }
    return first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
};
Buffer.prototype.readUint32BE = Buffer.prototype.readUInt32BE = readUInt32BE;
Buffer.prototype.readBigUint64LE = Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
    }
    const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
    const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
    return BigInt(lo) + (BigInt(hi) << BigInt(32));
});
Buffer.prototype.readBigUint64BE = Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
    }
    const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
    const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
    return (BigInt(hi) << BigInt(32)) + BigInt(lo);
});
Buffer.prototype.readIntLE = function readIntLE(offset, byteLength) {
    if (offset === undefined) {
        throw new codes.ERR_INVALID_ARG_TYPE("offset", "number", offset);
    }
    if (byteLength === 6) {
        return readInt48LE(this, offset);
    }
    if (byteLength === 5) {
        return readInt40LE(this, offset);
    }
    if (byteLength === 3) {
        return readInt24LE(this, offset);
    }
    if (byteLength === 4) {
        return this.readInt32LE(offset);
    }
    if (byteLength === 2) {
        return this.readInt16LE(offset);
    }
    if (byteLength === 1) {
        return this.readInt8(offset);
    }
    boundsError(byteLength, 6, "byteLength");
};
Buffer.prototype.readIntBE = function readIntBE(offset, byteLength) {
    if (offset === undefined) {
        throw new codes.ERR_INVALID_ARG_TYPE("offset", "number", offset);
    }
    if (byteLength === 6) {
        return readInt48BE(this, offset);
    }
    if (byteLength === 5) {
        return readInt40BE(this, offset);
    }
    if (byteLength === 3) {
        return readInt24BE(this, offset);
    }
    if (byteLength === 4) {
        return this.readInt32BE(offset);
    }
    if (byteLength === 2) {
        return this.readInt16BE(offset);
    }
    if (byteLength === 1) {
        return this.readInt8(offset);
    }
    boundsError(byteLength, 6, "byteLength");
};
Buffer.prototype.readInt8 = function readInt8(offset = 0) {
    validateNumber(offset, "offset");
    const val = this[offset];
    if (val === undefined) {
        boundsError(offset, this.length - 1);
    }
    return val | (val & 2 ** 7) * 0x1fffffe;
};
Buffer.prototype.readInt16LE = function readInt16LE(offset = 0) {
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 1];
    if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 2);
    }
    const val = first + last * 2 ** 8;
    return val | (val & 2 ** 15) * 0x1fffe;
};
Buffer.prototype.readInt16BE = function readInt16BE(offset = 0) {
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 1];
    if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 2);
    }
    const val = first * 2 ** 8 + last;
    return val | (val & 2 ** 15) * 0x1fffe;
};
Buffer.prototype.readInt32LE = function readInt32LE(offset = 0) {
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 3];
    if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 4);
    }
    return first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + (last << 24);
};
Buffer.prototype.readInt32BE = function readInt32BE(offset = 0) {
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 3];
    if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 4);
    }
    return (first << 24) + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
};
Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
    }
    const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
    return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
});
Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
    }
    const val = (first << 24) + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
    return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
});
Buffer.prototype.readFloatLE = function readFloatLE(offset) {
    return bigEndian ? readFloatBackwards(this, offset) : readFloatForwards(this, offset);
};
Buffer.prototype.readFloatBE = function readFloatBE(offset) {
    return bigEndian ? readFloatForwards(this, offset) : readFloatBackwards(this, offset);
};
Buffer.prototype.readDoubleLE = function readDoubleLE(offset) {
    return bigEndian ? readDoubleBackwards(this, offset) : readDoubleForwards(this, offset);
};
Buffer.prototype.readDoubleBE = function readDoubleBE(offset) {
    return bigEndian ? readDoubleForwards(this, offset) : readDoubleBackwards(this, offset);
};
Buffer.prototype.writeUintLE = Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength) {
    if (byteLength === 6) {
        return writeU_Int48LE(this, value, offset, 0, 0xffffffffffff);
    }
    if (byteLength === 5) {
        return writeU_Int40LE(this, value, offset, 0, 0xffffffffff);
    }
    if (byteLength === 3) {
        return writeU_Int24LE(this, value, offset, 0, 0xffffff);
    }
    if (byteLength === 4) {
        return writeU_Int32LE(this, value, offset, 0, 0xffffffff);
    }
    if (byteLength === 2) {
        return writeU_Int16LE(this, value, offset, 0, 0xffff);
    }
    if (byteLength === 1) {
        return writeU_Int8(this, value, offset, 0, 0xff);
    }
    boundsError(byteLength, 6, "byteLength");
};
Buffer.prototype.writeUintBE = Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength) {
    if (byteLength === 6) {
        return writeU_Int48BE(this, value, offset, 0, 0xffffffffffff);
    }
    if (byteLength === 5) {
        return writeU_Int40BE(this, value, offset, 0, 0xffffffffff);
    }
    if (byteLength === 3) {
        return writeU_Int24BE(this, value, offset, 0, 0xffffff);
    }
    if (byteLength === 4) {
        return writeU_Int32BE(this, value, offset, 0, 0xffffffff);
    }
    if (byteLength === 2) {
        return writeU_Int16BE(this, value, offset, 0, 0xffff);
    }
    if (byteLength === 1) {
        return writeU_Int8(this, value, offset, 0, 0xff);
    }
    boundsError(byteLength, 6, "byteLength");
};
Buffer.prototype.writeUint8 = Buffer.prototype.writeUInt8 = function writeUInt8(value, offset = 0) {
    return writeU_Int8(this, value, offset, 0, 0xff);
};
Buffer.prototype.writeUint16LE = Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset = 0) {
    return writeU_Int16LE(this, value, offset, 0, 0xffff);
};
Buffer.prototype.writeUint16BE = Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset = 0) {
    return writeU_Int16BE(this, value, offset, 0, 0xffff);
};
Buffer.prototype.writeUint32LE = Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset = 0) {
    return _writeUInt32LE(this, value, offset, 0, 0xffffffff);
};
Buffer.prototype.writeUint32BE = Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset = 0) {
    return _writeUInt32BE(this, value, offset, 0, 0xffffffff);
};
function wrtBigUInt64LE(buf, value, offset, min, max) {
    checkIntBI(value, min, max, buf, offset, 7);
    let lo = Number(value & BigInt(4294967295));
    buf[offset++] = lo;
    lo = lo >> 8;
    buf[offset++] = lo;
    lo = lo >> 8;
    buf[offset++] = lo;
    lo = lo >> 8;
    buf[offset++] = lo;
    let hi = Number(value >> BigInt(32) & BigInt(4294967295));
    buf[offset++] = hi;
    hi = hi >> 8;
    buf[offset++] = hi;
    hi = hi >> 8;
    buf[offset++] = hi;
    hi = hi >> 8;
    buf[offset++] = hi;
    return offset;
}
function wrtBigUInt64BE(buf, value, offset, min, max) {
    checkIntBI(value, min, max, buf, offset, 7);
    let lo = Number(value & BigInt(4294967295));
    buf[offset + 7] = lo;
    lo = lo >> 8;
    buf[offset + 6] = lo;
    lo = lo >> 8;
    buf[offset + 5] = lo;
    lo = lo >> 8;
    buf[offset + 4] = lo;
    let hi = Number(value >> BigInt(32) & BigInt(4294967295));
    buf[offset + 3] = hi;
    hi = hi >> 8;
    buf[offset + 2] = hi;
    hi = hi >> 8;
    buf[offset + 1] = hi;
    hi = hi >> 8;
    buf[offset] = hi;
    return offset + 8;
}
Buffer.prototype.writeBigUint64LE = Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
    return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
});
Buffer.prototype.writeBigUint64BE = Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
    return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
});
Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength) {
    if (byteLength === 6) {
        return writeU_Int48LE(this, value, offset, -0x800000000000, 0x7fffffffffff);
    }
    if (byteLength === 5) {
        return writeU_Int40LE(this, value, offset, -0x8000000000, 0x7fffffffff);
    }
    if (byteLength === 3) {
        return writeU_Int24LE(this, value, offset, -0x800000, 0x7fffff);
    }
    if (byteLength === 4) {
        return writeU_Int32LE(this, value, offset, -0x80000000, 0x7fffffff);
    }
    if (byteLength === 2) {
        return writeU_Int16LE(this, value, offset, -0x8000, 0x7fff);
    }
    if (byteLength === 1) {
        return writeU_Int8(this, value, offset, -0x80, 0x7f);
    }
    boundsError(byteLength, 6, "byteLength");
};
Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength) {
    if (byteLength === 6) {
        return writeU_Int48BE(this, value, offset, -0x800000000000, 0x7fffffffffff);
    }
    if (byteLength === 5) {
        return writeU_Int40BE(this, value, offset, -0x8000000000, 0x7fffffffff);
    }
    if (byteLength === 3) {
        return writeU_Int24BE(this, value, offset, -0x800000, 0x7fffff);
    }
    if (byteLength === 4) {
        return writeU_Int32BE(this, value, offset, -0x80000000, 0x7fffffff);
    }
    if (byteLength === 2) {
        return writeU_Int16BE(this, value, offset, -0x8000, 0x7fff);
    }
    if (byteLength === 1) {
        return writeU_Int8(this, value, offset, -0x80, 0x7f);
    }
    boundsError(byteLength, 6, "byteLength");
};
Buffer.prototype.writeInt8 = function writeInt8(value, offset = 0) {
    return writeU_Int8(this, value, offset, -0x80, 0x7f);
};
Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset = 0) {
    return writeU_Int16LE(this, value, offset, -0x8000, 0x7fff);
};
Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset = 0) {
    return writeU_Int16BE(this, value, offset, -0x8000, 0x7fff);
};
Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset = 0) {
    return writeU_Int32LE(this, value, offset, -0x80000000, 0x7fffffff);
};
Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset = 0) {
    return writeU_Int32BE(this, value, offset, -0x80000000, 0x7fffffff);
};
Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
    return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
});
Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
    return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
});
Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset) {
    return bigEndian ? writeFloatBackwards(this, value, offset) : writeFloatForwards(this, value, offset);
};
Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset) {
    return bigEndian ? writeFloatForwards(this, value, offset) : writeFloatBackwards(this, value, offset);
};
Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset) {
    return bigEndian ? writeDoubleBackwards(this, value, offset) : writeDoubleForwards(this, value, offset);
};
Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset) {
    return bigEndian ? writeDoubleForwards(this, value, offset) : writeDoubleBackwards(this, value, offset);
};
Buffer.prototype.copy = function copy(target, targetStart, sourceStart, sourceEnd) {
    if (!isUint8Array(this)) {
        throw new codes.ERR_INVALID_ARG_TYPE("source", [
            "Buffer",
            "Uint8Array"
        ], this);
    }
    if (!isUint8Array(target)) {
        throw new codes.ERR_INVALID_ARG_TYPE("target", [
            "Buffer",
            "Uint8Array"
        ], target);
    }
    if (targetStart === undefined) {
        targetStart = 0;
    } else {
        targetStart = toInteger(targetStart, 0);
        if (targetStart < 0) {
            throw new codes.ERR_OUT_OF_RANGE("targetStart", ">= 0", targetStart);
        }
    }
    if (sourceStart === undefined) {
        sourceStart = 0;
    } else {
        sourceStart = toInteger(sourceStart, 0);
        if (sourceStart < 0) {
            throw new codes.ERR_OUT_OF_RANGE("sourceStart", ">= 0", sourceStart);
        }
        if (sourceStart >= MAX_UINT32) {
            throw new codes.ERR_OUT_OF_RANGE("sourceStart", `< ${MAX_UINT32}`, sourceStart);
        }
    }
    if (sourceEnd === undefined) {
        sourceEnd = this.length;
    } else {
        sourceEnd = toInteger(sourceEnd, 0);
        if (sourceEnd < 0) {
            throw new codes.ERR_OUT_OF_RANGE("sourceEnd", ">= 0", sourceEnd);
        }
        if (sourceEnd >= MAX_UINT32) {
            throw new codes.ERR_OUT_OF_RANGE("sourceEnd", `< ${MAX_UINT32}`, sourceEnd);
        }
    }
    if (targetStart >= target.length) {
        return 0;
    }
    if (sourceEnd > 0 && sourceEnd < sourceStart) {
        sourceEnd = sourceStart;
    }
    if (sourceEnd === sourceStart) {
        return 0;
    }
    if (target.length === 0 || this.length === 0) {
        return 0;
    }
    if (sourceEnd > this.length) {
        sourceEnd = this.length;
    }
    if (target.length - targetStart < sourceEnd - sourceStart) {
        sourceEnd = target.length - targetStart + sourceStart;
    }
    const len = sourceEnd - sourceStart;
    if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
        this.copyWithin(targetStart, sourceStart, sourceEnd);
    } else {
        Uint8Array.prototype.set.call(target, this.subarray(sourceStart, sourceEnd), targetStart);
    }
    return len;
};
Buffer.prototype.fill = function fill(val, start, end, encoding) {
    if (typeof val === "string") {
        if (typeof start === "string") {
            encoding = start;
            start = 0;
            end = this.length;
        } else if (typeof end === "string") {
            encoding = end;
            end = this.length;
        }
        if (encoding !== void 0 && typeof encoding !== "string") {
            throw new TypeError("encoding must be a string");
        }
        if (typeof encoding === "string" && !Buffer.isEncoding(encoding)) {
            throw new TypeError("Unknown encoding: " + encoding);
        }
        if (val.length === 1) {
            const code = val.charCodeAt(0);
            if (encoding === "utf8" && code < 128 || encoding === "latin1") {
                val = code;
            }
        }
    } else if (typeof val === "number") {
        val = val & 255;
    } else if (typeof val === "boolean") {
        val = Number(val);
    }
    if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError("Out of range index");
    }
    if (end <= start) {
        return this;
    }
    start = start >>> 0;
    end = end === void 0 ? this.length : end >>> 0;
    if (!val) {
        val = 0;
    }
    let i;
    if (typeof val === "number") {
        for(i = start; i < end; ++i){
            this[i] = val;
        }
    } else {
        const bytes = Buffer.isBuffer(val) ? val : Buffer.from(val, encoding);
        const len = bytes.length;
        if (len === 0) {
            throw new codes.ERR_INVALID_ARG_VALUE("value", val);
        }
        for(i = 0; i < end - start; ++i){
            this[i + start] = bytes[i % len];
        }
    }
    return this;
};
function checkBounds1(buf, offset, byteLength2) {
    validateNumber(offset, "offset");
    if (buf[offset] === void 0 || buf[offset + byteLength2] === void 0) {
        boundsError(offset, buf.length - (byteLength2 + 1));
    }
}
function checkIntBI(value, min, max, buf, offset, byteLength2) {
    if (value > max || value < min) {
        const n = typeof min === "bigint" ? "n" : "";
        let range;
        if (byteLength2 > 3) {
            if (min === 0 || min === BigInt(0)) {
                range = `>= 0${n} and < 2${n} ** ${(byteLength2 + 1) * 8}${n}`;
            } else {
                range = `>= -(2${n} ** ${(byteLength2 + 1) * 8 - 1}${n}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n}`;
            }
        } else {
            range = `>= ${min}${n} and <= ${max}${n}`;
        }
        throw new codes.ERR_OUT_OF_RANGE("value", range, value);
    }
    checkBounds1(buf, offset, byteLength2);
}
function utf8ToBytes(string, units) {
    units = units || Infinity;
    let codePoint;
    const length = string.length;
    let leadSurrogate = null;
    const bytes = [];
    for(let i = 0; i < length; ++i){
        codePoint = string.charCodeAt(i);
        if (codePoint > 55295 && codePoint < 57344) {
            if (!leadSurrogate) {
                if (codePoint > 56319) {
                    if ((units -= 3) > -1) {
                        bytes.push(239, 191, 189);
                    }
                    continue;
                } else if (i + 1 === length) {
                    if ((units -= 3) > -1) {
                        bytes.push(239, 191, 189);
                    }
                    continue;
                }
                leadSurrogate = codePoint;
                continue;
            }
            if (codePoint < 56320) {
                if ((units -= 3) > -1) {
                    bytes.push(239, 191, 189);
                }
                leadSurrogate = codePoint;
                continue;
            }
            codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
        } else if (leadSurrogate) {
            if ((units -= 3) > -1) {
                bytes.push(239, 191, 189);
            }
        }
        leadSurrogate = null;
        if (codePoint < 128) {
            if ((units -= 1) < 0) {
                break;
            }
            bytes.push(codePoint);
        } else if (codePoint < 2048) {
            if ((units -= 2) < 0) {
                break;
            }
            bytes.push(codePoint >> 6 | 192, codePoint & 63 | 128);
        } else if (codePoint < 65536) {
            if ((units -= 3) < 0) {
                break;
            }
            bytes.push(codePoint >> 12 | 224, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
        } else if (codePoint < 1114112) {
            if ((units -= 4) < 0) {
                break;
            }
            bytes.push(codePoint >> 18 | 240, codePoint >> 12 & 63 | 128, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
        } else {
            throw new Error("Invalid code point");
        }
    }
    return bytes;
}
function blitBuffer(src, dst, offset, byteLength) {
    let i;
    const length = byteLength === undefined ? src.length : byteLength;
    for(i = 0; i < length; ++i){
        if (i + offset >= dst.length || i >= src.length) {
            break;
        }
        dst[i + offset] = src[i];
    }
    return i;
}
function isInstance(obj, type) {
    return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
}
const hexSliceLookupTable = function() {
    const alphabet = "0123456789abcdef";
    const table = new Array(256);
    for(let i = 0; i < 16; ++i){
        const i16 = i * 16;
        for(let j = 0; j < 16; ++j){
            table[i16 + j] = alphabet[i] + alphabet[j];
        }
    }
    return table;
}();
function defineBigIntMethod(fn) {
    return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
}
function BufferBigIntNotDefined() {
    throw new Error("BigInt not supported");
}
globalThis.atob;
globalThis.Blob;
globalThis.btoa;
var valueType;
(function(valueType) {
    valueType[valueType["noIterator"] = 0] = "noIterator";
    valueType[valueType["isArray"] = 1] = "isArray";
    valueType[valueType["isSet"] = 2] = "isSet";
    valueType[valueType["isMap"] = 3] = "isMap";
})(valueType || (valueType = {}));
const NumberIsSafeInteger = Number.isSafeInteger;
function getSystemErrorName(code) {
    if (typeof code !== "number") {
        throw new codes.ERR_INVALID_ARG_TYPE("err", "number", code);
    }
    if (code >= 0 || !NumberIsSafeInteger(code)) {
        throw new codes.ERR_OUT_OF_RANGE("err", "a negative integer", code);
    }
    return errorMap.get(code)?.[0];
}
const { errno: { ENOTDIR , ENOENT  }  } = os;
const kIsNodeError = Symbol("kIsNodeError");
const classRegExp1 = /^([A-Z][a-z0-9]*)+$/;
const kTypes = [
    "string",
    "function",
    "number",
    "object",
    "Function",
    "Object",
    "boolean",
    "bigint",
    "symbol"
];
class AbortError extends Error {
    code;
    constructor(){
        super("The operation was aborted");
        this.code = "ABORT_ERR";
        this.name = "AbortError";
    }
}
function addNumericalSeparator(val) {
    let res = "";
    let i = val.length;
    const start = val[0] === "-" ? 1 : 0;
    for(; i >= start + 4; i -= 3){
        res = `_${val.slice(i - 3, i)}${res}`;
    }
    return `${val.slice(0, i)}${res}`;
}
const captureLargerStackTrace = hideStackFrames(function captureLargerStackTrace(err) {
    Error.captureStackTrace(err);
    return err;
});
hideStackFrames(function uvExceptionWithHostPort(err, syscall, address, port) {
    const { 0: code , 1: uvmsg  } = uvErrmapGet(err) || uvUnmappedError;
    const message = `${syscall} ${code}: ${uvmsg}`;
    let details = "";
    if (port && port > 0) {
        details = ` ${address}:${port}`;
    } else if (address) {
        details = ` ${address}`;
    }
    const ex = new Error(`${message}${details}`);
    ex.code = code;
    ex.errno = err;
    ex.syscall = syscall;
    ex.address = address;
    if (port) {
        ex.port = port;
    }
    return captureLargerStackTrace(ex);
});
hideStackFrames(function errnoException(err, syscall, original) {
    const code = getSystemErrorName(err);
    const message = original ? `${syscall} ${code} ${original}` : `${syscall} ${code}`;
    const ex = new Error(message);
    ex.errno = err;
    ex.code = code;
    ex.syscall = syscall;
    return captureLargerStackTrace(ex);
});
function uvErrmapGet(name) {
    return errorMap.get(name);
}
const uvUnmappedError = [
    "UNKNOWN",
    "unknown error"
];
hideStackFrames(function uvException(ctx) {
    const { 0: code , 1: uvmsg  } = uvErrmapGet(ctx.errno) || uvUnmappedError;
    let message = `${code}: ${ctx.message || uvmsg}, ${ctx.syscall}`;
    let path;
    let dest;
    if (ctx.path) {
        path = ctx.path.toString();
        message += ` '${path}'`;
    }
    if (ctx.dest) {
        dest = ctx.dest.toString();
        message += ` -> '${dest}'`;
    }
    const err = new Error(message);
    for (const prop of Object.keys(ctx)){
        if (prop === "message" || prop === "path" || prop === "dest") {
            continue;
        }
        err[prop] = ctx[prop];
    }
    err.code = code;
    if (path) {
        err.path = path;
    }
    if (dest) {
        err.dest = dest;
    }
    return captureLargerStackTrace(err);
});
hideStackFrames(function exceptionWithHostPort(err, syscall, address, port, additional) {
    const code = getSystemErrorName(err);
    let details = "";
    if (port && port > 0) {
        details = ` ${address}:${port}`;
    } else if (address) {
        details = ` ${address}`;
    }
    if (additional) {
        details += ` - Local (${additional})`;
    }
    const ex = new Error(`${syscall} ${code}${details}`);
    ex.errno = err;
    ex.code = code;
    ex.syscall = syscall;
    ex.address = address;
    if (port) {
        ex.port = port;
    }
    return captureLargerStackTrace(ex);
});
hideStackFrames(function(code, syscall, hostname) {
    let errno;
    if (typeof code === "number") {
        errno = code;
        if (code === codeMap.get("EAI_NODATA") || code === codeMap.get("EAI_NONAME")) {
            code = "ENOTFOUND";
        } else {
            code = getSystemErrorName(code);
        }
    }
    const message = `${syscall} ${code}${hostname ? ` ${hostname}` : ""}`;
    const ex = new Error(message);
    ex.errno = errno;
    ex.code = code;
    ex.syscall = syscall;
    if (hostname) {
        ex.hostname = hostname;
    }
    return captureLargerStackTrace(ex);
});
class NodeErrorAbstraction extends Error {
    code;
    constructor(name, code, message){
        super(message);
        this.code = code;
        this.name = name;
        this.stack = this.stack && `${name} [${this.code}]${this.stack.slice(20)}`;
    }
    toString() {
        return `${this.name} [${this.code}]: ${this.message}`;
    }
}
class NodeError extends NodeErrorAbstraction {
    constructor(code, message){
        super(Error.prototype.name, code, message);
    }
}
class NodeRangeError extends NodeErrorAbstraction {
    constructor(code, message){
        super(RangeError.prototype.name, code, message);
        Object.setPrototypeOf(this, RangeError.prototype);
        this.toString = function() {
            return `${this.name} [${this.code}]: ${this.message}`;
        };
    }
}
class NodeTypeError extends NodeErrorAbstraction {
    constructor(code, message){
        super(TypeError.prototype.name, code, message);
        Object.setPrototypeOf(this, TypeError.prototype);
        this.toString = function() {
            return `${this.name} [${this.code}]: ${this.message}`;
        };
    }
}
class NodeSystemError extends NodeErrorAbstraction {
    constructor(key, context, msgPrefix){
        let message = `${msgPrefix}: ${context.syscall} returned ` + `${context.code} (${context.message})`;
        if (context.path !== undefined) {
            message += ` ${context.path}`;
        }
        if (context.dest !== undefined) {
            message += ` => ${context.dest}`;
        }
        super("SystemError", key, message);
        captureLargerStackTrace(this);
        Object.defineProperties(this, {
            [kIsNodeError]: {
                value: true,
                enumerable: false,
                writable: false,
                configurable: true
            },
            info: {
                value: context,
                enumerable: true,
                configurable: true,
                writable: false
            },
            errno: {
                get () {
                    return context.errno;
                },
                set: (value)=>{
                    context.errno = value;
                },
                enumerable: true,
                configurable: true
            },
            syscall: {
                get () {
                    return context.syscall;
                },
                set: (value)=>{
                    context.syscall = value;
                },
                enumerable: true,
                configurable: true
            }
        });
        if (context.path !== undefined) {
            Object.defineProperty(this, "path", {
                get () {
                    return context.path;
                },
                set: (value)=>{
                    context.path = value;
                },
                enumerable: true,
                configurable: true
            });
        }
        if (context.dest !== undefined) {
            Object.defineProperty(this, "dest", {
                get () {
                    return context.dest;
                },
                set: (value)=>{
                    context.dest = value;
                },
                enumerable: true,
                configurable: true
            });
        }
    }
    toString() {
        return `${this.name} [${this.code}]: ${this.message}`;
    }
}
function makeSystemErrorWithCode(key, msgPrfix) {
    return class NodeError extends NodeSystemError {
        constructor(ctx){
            super(key, ctx, msgPrfix);
        }
    };
}
makeSystemErrorWithCode("ERR_FS_EISDIR", "Path is a directory");
function createInvalidArgType(name, expected) {
    expected = Array.isArray(expected) ? expected : [
        expected
    ];
    let msg = "The ";
    if (name.endsWith(" argument")) {
        msg += `${name} `;
    } else {
        const type = name.includes(".") ? "property" : "argument";
        msg += `"${name}" ${type} `;
    }
    msg += "must be ";
    const types = [];
    const instances = [];
    const other = [];
    for (const value of expected){
        if (kTypes.includes(value)) {
            types.push(value.toLocaleLowerCase());
        } else if (classRegExp1.test(value)) {
            instances.push(value);
        } else {
            other.push(value);
        }
    }
    if (instances.length > 0) {
        const pos = types.indexOf("object");
        if (pos !== -1) {
            types.splice(pos, 1);
            instances.push("Object");
        }
    }
    if (types.length > 0) {
        if (types.length > 2) {
            const last = types.pop();
            msg += `one of type ${types.join(", ")}, or ${last}`;
        } else if (types.length === 2) {
            msg += `one of type ${types[0]} or ${types[1]}`;
        } else {
            msg += `of type ${types[0]}`;
        }
        if (instances.length > 0 || other.length > 0) {
            msg += " or ";
        }
    }
    if (instances.length > 0) {
        if (instances.length > 2) {
            const last1 = instances.pop();
            msg += `an instance of ${instances.join(", ")}, or ${last1}`;
        } else {
            msg += `an instance of ${instances[0]}`;
            if (instances.length === 2) {
                msg += ` or ${instances[1]}`;
            }
        }
        if (other.length > 0) {
            msg += " or ";
        }
    }
    if (other.length > 0) {
        if (other.length > 2) {
            const last2 = other.pop();
            msg += `one of ${other.join(", ")}, or ${last2}`;
        } else if (other.length === 2) {
            msg += `one of ${other[0]} or ${other[1]}`;
        } else {
            if (other[0].toLowerCase() !== other[0]) {
                msg += "an ";
            }
            msg += `${other[0]}`;
        }
    }
    return msg;
}
class ERR_INVALID_ARG_TYPE_RANGE extends NodeRangeError {
    constructor(name, expected, actual){
        const msg = createInvalidArgType(name, expected);
        super("ERR_INVALID_ARG_TYPE", `${msg}.${invalidArgTypeHelper(actual)}`);
    }
}
class ERR_INVALID_ARG_TYPE extends NodeTypeError {
    constructor(name, expected, actual){
        const msg = createInvalidArgType(name, expected);
        super("ERR_INVALID_ARG_TYPE", `${msg}.${invalidArgTypeHelper(actual)}`);
    }
    static RangeError = ERR_INVALID_ARG_TYPE_RANGE;
}
class ERR_INVALID_ARG_VALUE_RANGE extends NodeRangeError {
    constructor(name, value, reason = "is invalid"){
        const type = name.includes(".") ? "property" : "argument";
        const inspected = inspect(value);
        super("ERR_INVALID_ARG_VALUE", `The ${type} '${name}' ${reason}. Received ${inspected}`);
    }
}
class ERR_INVALID_ARG_VALUE extends NodeTypeError {
    constructor(name, value, reason = "is invalid"){
        const type = name.includes(".") ? "property" : "argument";
        const inspected = inspect(value);
        super("ERR_INVALID_ARG_VALUE", `The ${type} '${name}' ${reason}. Received ${inspected}`);
    }
    static RangeError = ERR_INVALID_ARG_VALUE_RANGE;
}
function invalidArgTypeHelper(input) {
    if (input == null) {
        return ` Received ${input}`;
    }
    if (typeof input === "function" && input.name) {
        return ` Received function ${input.name}`;
    }
    if (typeof input === "object") {
        if (input.constructor && input.constructor.name) {
            return ` Received an instance of ${input.constructor.name}`;
        }
        return ` Received ${inspect(input, {
            depth: -1
        })}`;
    }
    let inspected = inspect(input, {
        colors: false
    });
    if (inspected.length > 25) {
        inspected = `${inspected.slice(0, 25)}...`;
    }
    return ` Received type ${typeof input} (${inspected})`;
}
class ERR_OUT_OF_RANGE extends RangeError {
    code = "ERR_OUT_OF_RANGE";
    constructor(str, range, input, replaceDefaultBoolean = false){
        assert2(range, 'Missing "range" argument');
        let msg = replaceDefaultBoolean ? str : `The value of "${str}" is out of range.`;
        let received;
        if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
            received = addNumericalSeparator(String(input));
        } else if (typeof input === "bigint") {
            received = String(input);
            if (input > 2n ** 32n || input < -(2n ** 32n)) {
                received = addNumericalSeparator(received);
            }
            received += "n";
        } else {
            received = inspect(input);
        }
        msg += ` It must be ${range}. Received ${received}`;
        super(msg);
        const { name  } = this;
        this.name = `${name} [${this.code}]`;
        this.stack;
        this.name = name;
    }
}
class ERR_BUFFER_OUT_OF_BOUNDS extends NodeRangeError {
    constructor(name){
        super("ERR_BUFFER_OUT_OF_BOUNDS", name ? `"${name}" is outside of buffer bounds` : "Attempt to access memory outside buffer bounds");
    }
}
class ERR_CRYPTO_FIPS_FORCED extends NodeError {
    constructor(){
        super("ERR_CRYPTO_FIPS_FORCED", "Cannot set FIPS mode, it was forced with --force-fips at startup.");
    }
}
class ERR_INVALID_CALLBACK extends NodeTypeError {
    constructor(object){
        super("ERR_INVALID_CALLBACK", `Callback must be a function. Received ${inspect(object)}`);
    }
}
class ERR_IPC_CHANNEL_CLOSED extends NodeError {
    constructor(){
        super("ERR_IPC_CHANNEL_CLOSED", `Channel closed`);
    }
}
class ERR_METHOD_NOT_IMPLEMENTED extends NodeError {
    constructor(x){
        super("ERR_METHOD_NOT_IMPLEMENTED", `The ${x} method is not implemented`);
    }
}
class ERR_MISSING_ARGS extends NodeTypeError {
    constructor(...args){
        let msg = "The ";
        const len = args.length;
        const wrap = (a)=>`"${a}"`;
        args = args.map((a)=>Array.isArray(a) ? a.map(wrap).join(" or ") : wrap(a));
        switch(len){
            case 1:
                msg += `${args[0]} argument`;
                break;
            case 2:
                msg += `${args[0]} and ${args[1]} arguments`;
                break;
            default:
                msg += args.slice(0, len - 1).join(", ");
                msg += `, and ${args[len - 1]} arguments`;
                break;
        }
        super("ERR_MISSING_ARGS", `${msg} must be specified`);
    }
}
class ERR_MULTIPLE_CALLBACK extends NodeError {
    constructor(){
        super("ERR_MULTIPLE_CALLBACK", `Callback called multiple times`);
    }
}
class ERR_SOCKET_BAD_PORT extends NodeRangeError {
    constructor(name, port, allowZero = true){
        assert2(typeof allowZero === "boolean", "The 'allowZero' argument must be of type boolean.");
        const operator = allowZero ? ">=" : ">";
        super("ERR_SOCKET_BAD_PORT", `${name} should be ${operator} 0 and < 65536. Received ${port}.`);
    }
}
class ERR_STREAM_ALREADY_FINISHED extends NodeError {
    constructor(x){
        super("ERR_STREAM_ALREADY_FINISHED", `Cannot call ${x} after a stream was finished`);
    }
}
class ERR_STREAM_CANNOT_PIPE extends NodeError {
    constructor(){
        super("ERR_STREAM_CANNOT_PIPE", `Cannot pipe, not readable`);
    }
}
class ERR_STREAM_DESTROYED extends NodeError {
    constructor(x){
        super("ERR_STREAM_DESTROYED", `Cannot call ${x} after a stream was destroyed`);
    }
}
class ERR_STREAM_NULL_VALUES extends NodeTypeError {
    constructor(){
        super("ERR_STREAM_NULL_VALUES", `May not write null values to stream`);
    }
}
class ERR_STREAM_PREMATURE_CLOSE extends NodeError {
    constructor(){
        super("ERR_STREAM_PREMATURE_CLOSE", `Premature close`);
    }
}
class ERR_STREAM_PUSH_AFTER_EOF extends NodeError {
    constructor(){
        super("ERR_STREAM_PUSH_AFTER_EOF", `stream.push() after EOF`);
    }
}
class ERR_STREAM_UNSHIFT_AFTER_END_EVENT extends NodeError {
    constructor(){
        super("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", `stream.unshift() after end event`);
    }
}
class ERR_STREAM_WRITE_AFTER_END extends NodeError {
    constructor(){
        super("ERR_STREAM_WRITE_AFTER_END", `write after end`);
    }
}
class ERR_UNHANDLED_ERROR extends NodeError {
    constructor(x){
        super("ERR_UNHANDLED_ERROR", `Unhandled error. (${x})`);
    }
}
class ERR_UNKNOWN_ENCODING extends NodeTypeError {
    constructor(x){
        super("ERR_UNKNOWN_ENCODING", `Unknown encoding: ${x}`);
    }
}
function buildReturnPropertyType(value) {
    if (value && value.constructor && value.constructor.name) {
        return `instance of ${value.constructor.name}`;
    } else {
        return `type ${typeof value}`;
    }
}
class ERR_INVALID_RETURN_VALUE extends NodeTypeError {
    constructor(input, name, value){
        super("ERR_INVALID_RETURN_VALUE", `Expected ${input} to be returned from the "${name}" function but got ${buildReturnPropertyType(value)}.`);
    }
}
function aggregateTwoErrors(innerError, outerError) {
    if (innerError && outerError && innerError !== outerError) {
        if (Array.isArray(outerError.errors)) {
            outerError.errors.push(innerError);
            return outerError;
        }
        const err = new AggregateError([
            outerError,
            innerError
        ], outerError.message);
        err.code = outerError.code;
        return err;
    }
    return innerError || outerError;
}
codes.ERR_IPC_CHANNEL_CLOSED = ERR_IPC_CHANNEL_CLOSED;
codes.ERR_INVALID_ARG_TYPE = ERR_INVALID_ARG_TYPE;
codes.ERR_INVALID_ARG_VALUE = ERR_INVALID_ARG_VALUE;
codes.ERR_INVALID_CALLBACK = ERR_INVALID_CALLBACK;
codes.ERR_OUT_OF_RANGE = ERR_OUT_OF_RANGE;
codes.ERR_SOCKET_BAD_PORT = ERR_SOCKET_BAD_PORT;
codes.ERR_BUFFER_OUT_OF_BOUNDS = ERR_BUFFER_OUT_OF_BOUNDS;
codes.ERR_UNKNOWN_ENCODING = ERR_UNKNOWN_ENCODING;
hideStackFrames(function genericNodeError(message, errorProperties) {
    const err = new Error(message);
    Object.assign(err, errorProperties);
    return err;
});
const { hasOwn  } = Object;
function get(obj, key) {
    if (hasOwn(obj, key)) {
        return obj[key];
    }
}
function getForce(obj, key) {
    const v = get(obj, key);
    assert2(v != null);
    return v;
}
function isNumber(x) {
    if (typeof x === "number") return true;
    if (/^0x[0-9a-f]+$/i.test(String(x))) return true;
    return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(String(x));
}
function hasKey(obj, keys) {
    let o = obj;
    keys.slice(0, -1).forEach((key)=>{
        o = get(o, key) ?? {};
    });
    const key = keys[keys.length - 1];
    return hasOwn(o, key);
}
function parse(args, { "--": doubleDash = false , alias ={} , boolean: __boolean = false , default: defaults = {} , stopEarly =false , string =[] , collect =[] , negatable =[] , unknown =(i)=>i  } = {}) {
    const flags = {
        bools: {},
        strings: {},
        unknownFn: unknown,
        allBools: false,
        collect: {},
        negatable: {}
    };
    if (__boolean !== undefined) {
        if (typeof __boolean === "boolean") {
            flags.allBools = !!__boolean;
        } else {
            const booleanArgs = typeof __boolean === "string" ? [
                __boolean
            ] : __boolean;
            for (const key of booleanArgs.filter(Boolean)){
                flags.bools[key] = true;
            }
        }
    }
    const aliases = {};
    if (alias !== undefined) {
        for(const key1 in alias){
            const val = getForce(alias, key1);
            if (typeof val === "string") {
                aliases[key1] = [
                    val
                ];
            } else {
                aliases[key1] = val;
            }
            for (const alias1 of getForce(aliases, key1)){
                aliases[alias1] = [
                    key1
                ].concat(aliases[key1].filter((y)=>alias1 !== y));
            }
        }
    }
    if (string !== undefined) {
        const stringArgs = typeof string === "string" ? [
            string
        ] : string;
        for (const key2 of stringArgs.filter(Boolean)){
            flags.strings[key2] = true;
            const alias2 = get(aliases, key2);
            if (alias2) {
                for (const al of alias2){
                    flags.strings[al] = true;
                }
            }
        }
    }
    if (collect !== undefined) {
        const collectArgs = typeof collect === "string" ? [
            collect
        ] : collect;
        for (const key3 of collectArgs.filter(Boolean)){
            flags.collect[key3] = true;
            const alias3 = get(aliases, key3);
            if (alias3) {
                for (const al1 of alias3){
                    flags.collect[al1] = true;
                }
            }
        }
    }
    if (negatable !== undefined) {
        const negatableArgs = typeof negatable === "string" ? [
            negatable
        ] : negatable;
        for (const key4 of negatableArgs.filter(Boolean)){
            flags.negatable[key4] = true;
            const alias4 = get(aliases, key4);
            if (alias4) {
                for (const al2 of alias4){
                    flags.negatable[al2] = true;
                }
            }
        }
    }
    const argv = {
        _: []
    };
    function argDefined(key, arg) {
        return flags.allBools && /^--[^=]+$/.test(arg) || get(flags.bools, key) || !!get(flags.strings, key) || !!get(aliases, key);
    }
    function setKey(obj, name, value, collect = true) {
        let o = obj;
        const keys = name.split(".");
        keys.slice(0, -1).forEach(function(key) {
            if (get(o, key) === undefined) {
                o[key] = {};
            }
            o = get(o, key);
        });
        const key = keys[keys.length - 1];
        const collectable = collect && !!get(flags.collect, name);
        if (!collectable) {
            o[key] = value;
        } else if (get(o, key) === undefined) {
            o[key] = [
                value
            ];
        } else if (Array.isArray(get(o, key))) {
            o[key].push(value);
        } else {
            o[key] = [
                get(o, key),
                value
            ];
        }
    }
    function setArg(key, val, arg = undefined, collect) {
        if (arg && flags.unknownFn && !argDefined(key, arg)) {
            if (flags.unknownFn(arg, key, val) === false) return;
        }
        const value = !get(flags.strings, key) && isNumber(val) ? Number(val) : val;
        setKey(argv, key, value, collect);
        const alias = get(aliases, key);
        if (alias) {
            for (const x of alias){
                setKey(argv, x, value, collect);
            }
        }
    }
    function aliasIsBoolean(key) {
        return getForce(aliases, key).some((x)=>typeof get(flags.bools, x) === "boolean");
    }
    let notFlags = [];
    if (args.includes("--")) {
        notFlags = args.slice(args.indexOf("--") + 1);
        args = args.slice(0, args.indexOf("--"));
    }
    for(let i = 0; i < args.length; i++){
        const arg = args[i];
        if (/^--.+=/.test(arg)) {
            const m = arg.match(/^--([^=]+)=(.*)$/s);
            assert2(m != null);
            const [, key5, value] = m;
            if (flags.bools[key5]) {
                const booleanValue = value !== "false";
                setArg(key5, booleanValue, arg);
            } else {
                setArg(key5, value, arg);
            }
        } else if (/^--no-.+/.test(arg) && get(flags.negatable, arg.replace(/^--no-/, ""))) {
            const m1 = arg.match(/^--no-(.+)/);
            assert2(m1 != null);
            setArg(m1[1], false, arg, false);
        } else if (/^--.+/.test(arg)) {
            const m2 = arg.match(/^--(.+)/);
            assert2(m2 != null);
            const [, key6] = m2;
            const next = args[i + 1];
            if (next !== undefined && !/^-/.test(next) && !get(flags.bools, key6) && !flags.allBools && (get(aliases, key6) ? !aliasIsBoolean(key6) : true)) {
                setArg(key6, next, arg);
                i++;
            } else if (/^(true|false)$/.test(next)) {
                setArg(key6, next === "true", arg);
                i++;
            } else {
                setArg(key6, get(flags.strings, key6) ? "" : true, arg);
            }
        } else if (/^-[^-]+/.test(arg)) {
            const letters = arg.slice(1, -1).split("");
            let broken = false;
            for(let j = 0; j < letters.length; j++){
                const next1 = arg.slice(j + 2);
                if (next1 === "-") {
                    setArg(letters[j], next1, arg);
                    continue;
                }
                if (/[A-Za-z]/.test(letters[j]) && /=/.test(next1)) {
                    setArg(letters[j], next1.split(/=(.+)/)[1], arg);
                    broken = true;
                    break;
                }
                if (/[A-Za-z]/.test(letters[j]) && /-?\d+(\.\d*)?(e-?\d+)?$/.test(next1)) {
                    setArg(letters[j], next1, arg);
                    broken = true;
                    break;
                }
                if (letters[j + 1] && letters[j + 1].match(/\W/)) {
                    setArg(letters[j], arg.slice(j + 2), arg);
                    broken = true;
                    break;
                } else {
                    setArg(letters[j], get(flags.strings, letters[j]) ? "" : true, arg);
                }
            }
            const [key7] = arg.slice(-1);
            if (!broken && key7 !== "-") {
                if (args[i + 1] && !/^(-|--)[^-]/.test(args[i + 1]) && !get(flags.bools, key7) && (get(aliases, key7) ? !aliasIsBoolean(key7) : true)) {
                    setArg(key7, args[i + 1], arg);
                    i++;
                } else if (args[i + 1] && /^(true|false)$/.test(args[i + 1])) {
                    setArg(key7, args[i + 1] === "true", arg);
                    i++;
                } else {
                    setArg(key7, get(flags.strings, key7) ? "" : true, arg);
                }
            }
        } else {
            if (!flags.unknownFn || flags.unknownFn(arg) !== false) {
                argv._.push(flags.strings["_"] ?? !isNumber(arg) ? arg : Number(arg));
            }
            if (stopEarly) {
                argv._.push(...args.slice(i + 1));
                break;
            }
        }
    }
    for (const [key8, value1] of Object.entries(defaults)){
        if (!hasKey(argv, key8.split("."))) {
            setKey(argv, key8, value1);
            if (aliases[key8]) {
                for (const x of aliases[key8]){
                    setKey(argv, x, value1);
                }
            }
        }
    }
    for (const key9 of Object.keys(flags.bools)){
        if (!hasKey(argv, key9.split("."))) {
            const value2 = get(flags.collect, key9) ? [] : false;
            setKey(argv, key9, value2, false);
        }
    }
    for (const key10 of Object.keys(flags.strings)){
        if (!hasKey(argv, key10.split(".")) && get(flags.collect, key10)) {
            setKey(argv, key10, [], false);
        }
    }
    if (doubleDash) {
        argv["--"] = [];
        for (const key11 of notFlags){
            argv["--"].push(key11);
        }
    } else {
        for (const key12 of notFlags){
            argv._.push(key12);
        }
    }
    return argv;
}
function getOptions() {
    const args = parse(Deno.args);
    const options = new Map(Object.entries(args).map(([key, value])=>[
            key,
            {
                value
            }
        ]));
    return {
        options
    };
}
let optionsMap;
function getOptionsFromBinding() {
    if (!optionsMap) {
        ({ options: optionsMap  } = getOptions());
    }
    return optionsMap;
}
function getOptionValue(optionName) {
    const options = getOptionsFromBinding();
    if (optionName.startsWith("--no-")) {
        const option = options.get("--" + optionName.slice(5));
        return option && !option.value;
    }
    return options.get(optionName)?.value;
}
function timingSafeEqual(a, b) {
    if (a.byteLength !== b.byteLength) {
        return false;
    }
    if (!(a instanceof DataView)) {
        a = new DataView(ArrayBuffer.isView(a) ? a.buffer : a);
    }
    if (!(b instanceof DataView)) {
        b = new DataView(ArrayBuffer.isView(b) ? b.buffer : b);
    }
    assert1(a instanceof DataView);
    assert1(b instanceof DataView);
    const length = a.byteLength;
    let out = 0;
    let i = -1;
    while(++i < length){
        out |= a.getUint8(i) ^ b.getUint8(i);
    }
    return out === 0;
}
const timingSafeEqual1 = (a, b)=>{
    if (a instanceof Buffer) a = new DataView(a.buffer);
    if (a instanceof Buffer) b = new DataView(a.buffer);
    return timingSafeEqual(a, b);
};
function getFipsCrypto() {
    notImplemented("crypto.getFipsCrypto");
}
function setFipsCrypto(_fips) {
    notImplemented("crypto.setFipsCrypto");
}
const MAX_RANDOM_VALUES = 65536;
function generateRandomBytes(size) {
    if (size > 4294967295) {
        throw new RangeError(`The value of "size" is out of range. It must be >= 0 && <= ${4294967295}. Received ${size}`);
    }
    const bytes = Buffer.allocUnsafe(size);
    if (size > 65536) {
        for(let generated = 0; generated < size; generated += MAX_RANDOM_VALUES){
            globalThis.crypto.getRandomValues(bytes.slice(generated, generated + 65536));
        }
    } else {
        globalThis.crypto.getRandomValues(bytes);
    }
    return bytes;
}
function randomBytes(size, cb) {
    if (typeof cb === "function") {
        let err = null, bytes;
        try {
            bytes = generateRandomBytes(size);
        } catch (e) {
            if (e instanceof RangeError && e.message.includes('The value of "size" is out of range')) {
                throw e;
            } else if (e instanceof Error) {
                err = e;
            } else {
                err = new Error("[non-error thrown]");
            }
        }
        setTimeout(()=>{
            if (err) {
                cb(err);
            } else {
                cb(null, bytes);
            }
        }, 0);
    } else {
        return generateRandomBytes(size);
    }
}
function assertOffset(offset, length) {
    if (offset > 4294967295 || offset < 0) {
        throw new TypeError("offset must be a uint32");
    }
    if (offset > 0x7fffffff || offset > length) {
        throw new RangeError("offset out of range");
    }
}
function assertSize1(size, offset, length) {
    if (size > 4294967295 || size < 0) {
        throw new TypeError("size must be a uint32");
    }
    if (size + offset > length || size > 0x7fffffff) {
        throw new RangeError("buffer too small");
    }
}
function randomFill(buf, offset, size, cb) {
    if (typeof offset === "function") {
        cb = offset;
        offset = 0;
        size = buf.length;
    } else if (typeof size === "function") {
        cb = size;
        size = buf.length - Number(offset);
    }
    assertOffset(offset, buf.length);
    assertSize1(size, offset, buf.length);
    randomBytes(size, (err, bytes)=>{
        if (err) return cb(err, buf);
        bytes?.copy(buf, offset);
        cb(null, buf);
    });
}
function randomFillSync(buf, offset = 0, size) {
    assertOffset(offset, buf.length);
    if (size === undefined) size = buf.length - offset;
    assertSize1(size, offset, buf.length);
    const bytes = randomBytes(size);
    bytes.copy(buf, offset);
    return buf;
}
function randomInt(max, min, cb) {
    if (typeof max === "number" && typeof min === "number") {
        [max, min] = [
            min,
            max
        ];
    }
    if (min === undefined) min = 0;
    else if (typeof min === "function") {
        cb = min;
        min = 0;
    }
    if (!Number.isSafeInteger(min) || typeof max === "number" && !Number.isSafeInteger(max)) {
        throw new Error("max or min is not a Safe Number");
    }
    if (max - min > Math.pow(2, 48)) {
        throw new RangeError("max - min should be less than 2^48!");
    }
    if (min >= max) {
        throw new Error("Min is bigger than Max!");
    }
    const randomBuffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(randomBuffer);
    const randomNumber = randomBuffer[0] / (0xffffffff + 1);
    min = Math.ceil(min);
    max = Math.floor(max);
    const result = Math.floor(randomNumber * (max - min)) + min;
    if (cb) {
        cb(null, result);
        return;
    }
    return result;
}
function checkPrime(_candidate, _options, _callback) {
    notImplemented("crypto.checkPrime");
}
function checkPrimeSync(_candidate, _options) {
    notImplemented("crypto.checkPrimeSync");
}
function generatePrime(_size, _options, _callback) {
    notImplemented("crypto.generatePrime");
}
function generatePrimeSync(_size, _options) {
    notImplemented("crypto.generatePrimeSync");
}
const randomUUID = ()=>globalThis.crypto.randomUUID();
let wasm;
const heap = new Array(32).fill(undefined);
heap.push(undefined, null, true, false);
function getObject(idx) {
    return heap[idx];
}
let heap_next = heap.length;
function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}
function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}
function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];
    heap[idx] = obj;
    return idx;
}
const cachedTextDecoder = new TextDecoder("utf-8", {
    ignoreBOM: true,
    fatal: true
});
cachedTextDecoder.decode();
let cachedUint8Memory0;
function getUint8Memory0() {
    if (cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}
function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}
let WASM_VECTOR_LEN = 0;
const cachedTextEncoder = new TextEncoder("utf-8");
const encodeString = function(arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
};
function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }
    let len = arg.length;
    let ptr1 = malloc(len);
    const mem = getUint8Memory0();
    let offset = 0;
    for(; offset < len; offset++){
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr1 + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr1 = realloc(ptr1, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr1 + offset, ptr1 + len);
        const ret = encodeString(arg, view);
        offset += ret.written;
    }
    WASM_VECTOR_LEN = offset;
    return ptr1;
}
function isLikeNone(x) {
    return x === undefined || x === null;
}
let cachedInt32Memory0;
function getInt32Memory0() {
    if (cachedInt32Memory0.byteLength === 0) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}
function getArrayU8FromWasm0(ptr, len) {
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}
function digest(algorithm, data, length) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(algorithm, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.digest(retptr, ptr0, len0, addHeapObject(data), !isLikeNone(length), isLikeNone(length) ? 0 : length);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        var r3 = getInt32Memory0()[retptr / 4 + 3];
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally{
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}
const DigestContextFinalization = new FinalizationRegistry((ptr)=>wasm.__wbg_digestcontext_free(ptr));
class DigestContext {
    static __wrap(ptr) {
        const obj = Object.create(DigestContext.prototype);
        obj.ptr = ptr;
        DigestContextFinalization.register(obj, obj.ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;
        DigestContextFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_digestcontext_free(ptr);
    }
    constructor(algorithm){
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(algorithm, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.digestcontext_new(retptr, ptr0, len0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return DigestContext.__wrap(r0);
        } finally{
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    update(data) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.digestcontext_update(retptr, this.ptr, addHeapObject(data));
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            if (r1) {
                throw takeObject(r0);
            }
        } finally{
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    digest(length) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.digestcontext_digest(retptr, this.ptr, !isLikeNone(length), isLikeNone(length) ? 0 : length);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            if (r3) {
                throw takeObject(r2);
            }
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally{
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    digestAndReset(length) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.digestcontext_digestAndReset(retptr, this.ptr, !isLikeNone(length), isLikeNone(length) ? 0 : length);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            if (r3) {
                throw takeObject(r2);
            }
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally{
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    digestAndDrop(length) {
        try {
            const ptr = this.__destroy_into_raw();
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.digestcontext_digestAndDrop(retptr, ptr, !isLikeNone(length), isLikeNone(length) ? 0 : length);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            if (r3) {
                throw takeObject(r2);
            }
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally{
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    reset() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.digestcontext_reset(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            if (r1) {
                throw takeObject(r0);
            }
        } finally{
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    clone() {
        const ret = wasm.digestcontext_clone(this.ptr);
        return DigestContext.__wrap(ret);
    }
}
const imports = {
    __wbindgen_placeholder__: {
        __wbg_new_a4b61a0f54824cfd: function(arg0, arg1) {
            const ret = new TypeError(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbindgen_object_drop_ref: function(arg0) {
            takeObject(arg0);
        },
        __wbg_byteLength_3e250b41a8915757: function(arg0) {
            const ret = getObject(arg0).byteLength;
            return ret;
        },
        __wbg_byteOffset_4204ecb24a6e5df9: function(arg0) {
            const ret = getObject(arg0).byteOffset;
            return ret;
        },
        __wbg_buffer_facf0398a281c85b: function(arg0) {
            const ret = getObject(arg0).buffer;
            return addHeapObject(ret);
        },
        __wbg_newwithbyteoffsetandlength_4b9b8c4e3f5adbff: function(arg0, arg1, arg2) {
            const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
            return addHeapObject(ret);
        },
        __wbg_length_1eb8fc608a0d4cdb: function(arg0) {
            const ret = getObject(arg0).length;
            return ret;
        },
        __wbindgen_memory: function() {
            const ret = wasm.memory;
            return addHeapObject(ret);
        },
        __wbg_buffer_397eaa4d72ee94dd: function(arg0) {
            const ret = getObject(arg0).buffer;
            return addHeapObject(ret);
        },
        __wbg_new_a7ce447f15ff496f: function(arg0) {
            const ret = new Uint8Array(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_set_969ad0a60e51d320: function(arg0, arg1, arg2) {
            getObject(arg0).set(getObject(arg1), arg2 >>> 0);
        },
        __wbindgen_throw: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        }
    }
};
function instantiate() {
    return instantiateWithInstance().exports;
}
let instanceWithExports;
function instantiateWithInstance() {
    if (instanceWithExports == null) {
        const instance = instantiateInstance();
        wasm = instance.exports;
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
        instanceWithExports = {
            instance,
            exports: {
                digest,
                DigestContext
            }
        };
    }
    return instanceWithExports;
}
function instantiateInstance() {
    const wasmBytes = base64decode("\
AGFzbQEAAAABo4GAgAAYYAAAYAABf2ABfwBgAX8Bf2ABfwF+YAJ/fwBgAn9/AX9gA39/fwBgA39/fw\
F/YAR/f39/AGAEf39/fwF/YAV/f39/fwBgBX9/f39/AX9gBn9/f39/fwBgBn9/f39/fwF/YAV/f39+\
fwBgB39/f35/f38Bf2ADf39+AGAFf399f38AYAV/f3x/fwBgAn9+AGAEf31/fwBgBH98f38AYAJ+fw\
F/AqSFgIAADBhfX3diaW5kZ2VuX3BsYWNlaG9sZGVyX18aX193YmdfbmV3X2E0YjYxYTBmNTQ4MjRj\
ZmQABhhfX3diaW5kZ2VuX3BsYWNlaG9sZGVyX18aX193YmluZGdlbl9vYmplY3RfZHJvcF9yZWYAAh\
hfX3diaW5kZ2VuX3BsYWNlaG9sZGVyX18hX193YmdfYnl0ZUxlbmd0aF8zZTI1MGI0MWE4OTE1NzU3\
AAMYX193YmluZGdlbl9wbGFjZWhvbGRlcl9fIV9fd2JnX2J5dGVPZmZzZXRfNDIwNGVjYjI0YTZlNW\
RmOQADGF9fd2JpbmRnZW5fcGxhY2Vob2xkZXJfXx1fX3diZ19idWZmZXJfZmFjZjAzOThhMjgxYzg1\
YgADGF9fd2JpbmRnZW5fcGxhY2Vob2xkZXJfXzFfX3diZ19uZXd3aXRoYnl0ZW9mZnNldGFuZGxlbm\
d0aF80YjliOGM0ZTNmNWFkYmZmAAgYX193YmluZGdlbl9wbGFjZWhvbGRlcl9fHV9fd2JnX2xlbmd0\
aF8xZWI4ZmM2MDhhMGQ0Y2RiAAMYX193YmluZGdlbl9wbGFjZWhvbGRlcl9fEV9fd2JpbmRnZW5fbW\
Vtb3J5AAEYX193YmluZGdlbl9wbGFjZWhvbGRlcl9fHV9fd2JnX2J1ZmZlcl8zOTdlYWE0ZDcyZWU5\
NGRkAAMYX193YmluZGdlbl9wbGFjZWhvbGRlcl9fGl9fd2JnX25ld19hN2NlNDQ3ZjE1ZmY0OTZmAA\
MYX193YmluZGdlbl9wbGFjZWhvbGRlcl9fGl9fd2JnX3NldF85NjlhZDBhNjBlNTFkMzIwAAcYX193\
YmluZGdlbl9wbGFjZWhvbGRlcl9fEF9fd2JpbmRnZW5fdGhyb3cABQPrgICAAGoJBwkHBxEFBwcFAw\
cHDwMHBRACBQUFBwUCCAYHBxQMCA4HBwcHBwcIFw0FBQkICA0HCQUJCQYGBQUFBQUFBwcHBwcABQII\
CgcHAgUDDgwLDAsLEhMJBQgIAwYGAgUAAAYDBgAABQUEAAUCBIWAgIAAAXABFRUFg4CAgAABABEGiY\
CAgAABfwFBgIDAAAsHtoKAgAAOBm1lbW9yeQIABmRpZ2VzdAA1GF9fd2JnX2RpZ2VzdGNvbnRleHRf\
ZnJlZQBQEWRpZ2VzdGNvbnRleHRfbmV3ADwUZGlnZXN0Y29udGV4dF91cGRhdGUAVBRkaWdlc3Rjb2\
50ZXh0X2RpZ2VzdAA9HGRpZ2VzdGNvbnRleHRfZGlnZXN0QW5kUmVzZXQAPxtkaWdlc3Rjb250ZXh0\
X2RpZ2VzdEFuZERyb3AAOBNkaWdlc3Rjb250ZXh0X3Jlc2V0ACETZGlnZXN0Y29udGV4dF9jbG9uZQ\
AaH19fd2JpbmRnZW5fYWRkX3RvX3N0YWNrX3BvaW50ZXIAbBFfX3diaW5kZ2VuX21hbGxvYwBXEl9f\
d2JpbmRnZW5fcmVhbGxvYwBiD19fd2JpbmRnZW5fZnJlZQBoCZqAgIAAAQBBAQsUZWZtdGtZO1pbWG\
NgXF1eX3VBQnIK0smIgABqoH4CEn8CfiMAQbAlayIEJAACQAJAAkACQAJAAkACQAJAAkACQAJAAkAC\
QAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAgASgCAA4YAAECAwQcGxoZGB\
cWFRQTEhEQDw4NDAsKAAsgASgCBCEBQdABEBYiBUUNBCAEQZASakE4aiABQThqKQMANwMAIARBkBJq\
QTBqIAFBMGopAwA3AwAgBEGQEmpBKGogAUEoaikDADcDACAEQZASakEgaiABQSBqKQMANwMAIARBkB\
JqQRhqIAFBGGopAwA3AwAgBEGQEmpBEGogAUEQaikDADcDACAEQZASakEIaiABQQhqKQMANwMAIAQg\
ASkDADcDkBIgASkDQCEWIARBkBJqQcgAaiABQcgAahBDIAQgFjcD0BIgBSAEQZASakHQARA5GkEAIQ\
ZBACEBDB8LIAEoAgQhAUHQARAWIgVFDQQgBEGQEmpBOGogAUE4aikDADcDACAEQZASakEwaiABQTBq\
KQMANwMAIARBkBJqQShqIAFBKGopAwA3AwAgBEGQEmpBIGogAUEgaikDADcDACAEQZASakEYaiABQR\
hqKQMANwMAIARBkBJqQRBqIAFBEGopAwA3AwAgBEGQEmpBCGogAUEIaikDADcDACAEIAEpAwA3A5AS\
IAEpA0AhFiAEQZASakHIAGogAUHIAGoQQyAEIBY3A9ASIAUgBEGQEmpB0AEQORpBASEBDBsLIAEoAg\
QhAUHQARAWIgVFDQQgBEGQEmpBOGogAUE4aikDADcDACAEQZASakEwaiABQTBqKQMANwMAIARBkBJq\
QShqIAFBKGopAwA3AwAgBEGQEmpBIGogAUEgaikDADcDACAEQZASakEYaiABQRhqKQMANwMAIARBkB\
JqQRBqIAFBEGopAwA3AwAgBEGQEmpBCGogAUEIaikDADcDACAEIAEpAwA3A5ASIAEpA0AhFiAEQZAS\
akHIAGogAUHIAGoQQyAEIBY3A9ASIAUgBEGQEmpB0AEQORpBAiEBDBoLIAEoAgQhAUHwABAWIgVFDQ\
QgBEGQEmpBIGogAUEgaikDADcDACAEQZASakEYaiABQRhqKQMANwMAIARBkBJqQRBqIAFBEGopAwA3\
AwAgBCABKQMINwOYEiABKQMAIRYgBEGQEmpBKGogAUEoahA3IAQgFjcDkBIgBSAEQZASakHwABA5Gk\
EDIQEMGQsgASgCBCEBQfgOEBYiBUUNBCAEQZASakGIAWogAUGIAWopAwA3AwAgBEGQEmpBgAFqIAFB\
gAFqKQMANwMAIARBkBJqQfgAaiABQfgAaikDADcDACAEQZASakEQaiABQRBqKQMANwMAIARBkBJqQR\
hqIAFBGGopAwA3AwAgBEGQEmpBIGogAUEgaikDADcDACAEQZASakEwaiABQTBqKQMANwMAIARBkBJq\
QThqIAFBOGopAwA3AwAgBEGQEmpBwABqIAFBwABqKQMANwMAIARBkBJqQcgAaiABQcgAaikDADcDAC\
AEQZASakHQAGogAUHQAGopAwA3AwAgBEGQEmpB2ABqIAFB2ABqKQMANwMAIARBkBJqQeAAaiABQeAA\
aikDADcDACAEIAEpA3A3A4ATIAQgASkDCDcDmBIgBCABKQMoNwO4EiABKQMAIRYgAS0AaiEHIAEtAG\
khCCABLQBoIQkCQCABKAKQAUEFdCIKDQBBACEKDBsLIARBGGoiCyABQZQBaiIGQRhqKQAANwMAIARB\
EGoiDCAGQRBqKQAANwMAIARBCGoiDSAGQQhqKQAANwMAIAQgBikAADcDACABQdQBaiEGQQAgCkFgak\
EFdmshDiAEQcQTaiEBQQIhCgNAIAFBYGoiDyAEKQMANwAAIA9BGGogCykDADcAACAPQRBqIAwpAwA3\
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\
ASAEQZASaiABQcgBEDkaIARBkBJqQcgBaiABQcgBahBIIAUgBEGQEmpB4AIQORpBBSEBC0EAIQYMAg\
tB4AJBCEEAKAL41EAiBEEEIAQbEQUAAAsgBCAKNgKgEyAEIAc6APoSIAQgCDoA+RIgBCAJOgD4EiAE\
IBY3A5ASIAUgBEGQEmpB+A4QORpBBCEBQQEhBgsCQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAk\
ACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCAC\
DgIBABELQSAhAiABDhgBDwIPEAMPBAUGBgcHCA8JCgsPDA0QEA4BCyABQQJ0QZTUwABqKAIAIQMMDw\
tBwAAhAgwNC0EwIQIMDAtBHCECDAsLQTAhAgwKC0HAACECDAkLQRAhAgwIC0EUIQIMBwtBHCECDAYL\
QTAhAgwFC0HAACECDAQLQRwhAgwDC0EwIQIMAgtBwAAhAgwBC0EYIQILIAIgA0YNACAAQa2BwAA2Ag\
QgAEEBNgIAIABBCGpBOTYCAAJAIAZFDQAgBSgCkAFFDQAgBUEANgKQAQsgBRAeDAELAkACQAJAAkAC\
QAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAgAQ4YAAECAwQFBg\
cICQoLDA0ODxAREhMUFRYaAAsgBCAFQdABEDkiAUH4DmpBDGpCADcCACABQfgOakEUakIANwIAIAFB\
+A5qQRxqQgA3AgAgAUH4DmpBJGpCADcCACABQfgOakEsakIANwIAIAFB+A5qQTRqQgA3AgAgAUH4Dm\
pBPGpCADcCACABQgA3AvwOIAFBwAA2AvgOIAFBkBJqIAFB+A5qQcQAEDkaIAFBuCJqQThqIgogAUGQ\
EmpBPGopAgA3AwAgAUG4ImpBMGoiAyABQZASakE0aikCADcDACABQbgiakEoaiIPIAFBkBJqQSxqKQ\
IANwMAIAFBuCJqQSBqIgsgAUGQEmpBJGopAgA3AwAgAUG4ImpBGGoiDCABQZASakEcaikCADcDACAB\
QbgiakEQaiINIAFBkBJqQRRqKQIANwMAIAFBuCJqQQhqIhAgAUGQEmpBDGopAgA3AwAgASABKQKUEj\
cDuCIgAUGQEmogAUHQARA5GiABIAEpA9ASIAFB2BNqLQAAIgatfDcD0BIgAUHYEmohAgJAIAZBgAFG\
DQAgAiAGakEAQYABIAZrEDoaCyABQQA6ANgTIAFBkBJqIAJCfxARIAFB+A5qQQhqIgYgAUGQEmpBCG\
opAwA3AwAgAUH4DmpBEGoiAiABQZASakEQaikDADcDACABQfgOakEYaiIOIAFBkBJqQRhqKQMANwMA\
IAFB+A5qQSBqIgcgASkDsBI3AwAgAUH4DmpBKGoiCCABQZASakEoaikDADcDACABQfgOakEwaiIJIA\
FBkBJqQTBqKQMANwMAIAFB+A5qQThqIhEgAUGQEmpBOGopAwA3AwAgASABKQOQEjcD+A4gECAGKQMA\
NwMAIA0gAikDADcDACAMIA4pAwA3AwAgCyAHKQMANwMAIA8gCCkDADcDACADIAkpAwA3AwAgCiARKQ\
MANwMAIAEgASkD+A43A7giQcAAEBYiBkUNHCAGIAEpA7giNwAAIAZBOGogAUG4ImpBOGopAwA3AAAg\
BkEwaiABQbgiakEwaikDADcAACAGQShqIAFBuCJqQShqKQMANwAAIAZBIGogAUG4ImpBIGopAwA3AA\
AgBkEYaiABQbgiakEYaikDADcAACAGQRBqIAFBuCJqQRBqKQMANwAAIAZBCGogAUG4ImpBCGopAwA3\
AABBwAAhAwwaCyAEIAVB0AEQOSIBQfgOakEcakIANwIAIAFB+A5qQRRqQgA3AgAgAUH4DmpBDGpCAD\
cCACABQgA3AvwOIAFBIDYC+A4gAUGQEmpBGGoiCyABQfgOakEYaiICKQMANwMAIAFBkBJqQRBqIgwg\
AUH4DmpBEGoiCikDADcDACABQZASakEIaiINIAFB+A5qQQhqIgMpAwA3AwAgAUGQEmpBIGogAUH4Dm\
pBIGoiECgCADYCACABIAEpA/gONwOQEiABQbgiakEQaiIOIAFBkBJqQRRqKQIANwMAIAFBuCJqQQhq\
IgcgAUGQEmpBDGopAgA3AwAgAUG4ImpBGGoiCCABQZASakEcaikCADcDACABIAEpApQSNwO4IiABQZ\
ASaiABQdABEDkaIAEgASkD0BIgAUHYE2otAAAiBq18NwPQEiABQdgSaiEPAkAgBkGAAUYNACAPIAZq\
QQBBgAEgBmsQOhoLIAFBADoA2BMgAUGQEmogD0J/EBEgAyANKQMANwMAIAogDCkDADcDACACIAspAw\
A3AwAgECABKQOwEjcDACABQfgOakEoaiABQZASakEoaikDADcDACABQfgOakEwaiABQZASakEwaikD\
ADcDACABQfgOakE4aiABQZASakE4aikDADcDACABIAEpA5ASNwP4DiAHIAMpAwA3AwAgDiAKKQMANw\
MAIAggAikDADcDACABIAEpA/gONwO4IkEgEBYiBkUNHCAGIAEpA7giNwAAIAZBGGogAUG4ImpBGGop\
AwA3AAAgBkEQaiABQbgiakEQaikDADcAACAGQQhqIAFBuCJqQQhqKQMANwAAQSAhAwwZCyAEIAVB0A\
EQOSIBQfgOakEsakIANwIAIAFB+A5qQSRqQgA3AgAgAUH4DmpBHGpCADcCACABQfgOakEUakIANwIA\
IAFB+A5qQQxqQgA3AgAgAUIANwL8DiABQTA2AvgOIAFBkBJqQShqIg0gAUH4DmpBKGoiAikDADcDAC\
ABQZASakEgaiABQfgOakEgaiIKKQMANwMAIAFBkBJqQRhqIhAgAUH4DmpBGGoiAykDADcDACABQZAS\
akEQaiIOIAFB+A5qQRBqIg8pAwA3AwAgAUGQEmpBCGoiByABQfgOakEIaiILKQMANwMAIAFBkBJqQT\
BqIgggAUH4DmpBMGoiCSgCADYCACABIAEpA/gONwOQEiABQbgiakEgaiIRIAFBkBJqQSRqKQIANwMA\
IAFBuCJqQRhqIhIgAUGQEmpBHGopAgA3AwAgAUG4ImpBEGoiEyABQZASakEUaikCADcDACABQbgiak\
EIaiIUIAFBkBJqQQxqKQIANwMAIAFBuCJqQShqIhUgAUGQEmpBLGopAgA3AwAgASABKQKUEjcDuCIg\
AUGQEmogAUHQARA5GiABIAEpA9ASIAFB2BNqLQAAIgatfDcD0BIgAUHYEmohDAJAIAZBgAFGDQAgDC\
AGakEAQYABIAZrEDoaCyABQQA6ANgTIAFBkBJqIAxCfxARIAsgBykDADcDACAPIA4pAwA3AwAgAyAQ\
KQMANwMAIAogASkDsBI3AwAgAiANKQMANwMAIAkgCCkDADcDACABQfgOakE4aiABQZASakE4aikDAD\
cDACABIAEpA5ASNwP4DiAUIAspAwA3AwAgEyAPKQMANwMAIBIgAykDADcDACARIAopAwA3AwAgFSAC\
KQMANwMAIAEgASkD+A43A7giQTAQFiIGRQ0cIAYgASkDuCI3AAAgBkEoaiABQbgiakEoaikDADcAAC\
AGQSBqIAFBuCJqQSBqKQMANwAAIAZBGGogAUG4ImpBGGopAwA3AAAgBkEQaiABQbgiakEQaikDADcA\
ACAGQQhqIAFBuCJqQQhqKQMANwAAQTAhAwwYCyAEIAVB8AAQOSIBQfgOakEcakIANwIAIAFB+A5qQR\
RqQgA3AgAgAUH4DmpBDGpCADcCACABQgA3AvwOIAFBIDYC+A4gAUGQEmpBGGoiCiABQfgOakEYaikD\
ADcDACABQZASakEQaiIDIAFB+A5qQRBqKQMANwMAIAFBkBJqQQhqIAFB+A5qQQhqIg8pAwA3AwAgAU\
GQEmpBIGoiCyABQfgOakEgaigCADYCACABIAEpA/gONwOQEiABQegjakEQaiIMIAFBkBJqQRRqKQIA\
NwMAIAFB6CNqQQhqIg0gAUGQEmpBDGopAgA3AwAgAUHoI2pBGGoiECABQZASakEcaikCADcDACABIA\
EpApQSNwPoIyABQZASaiABQfAAEDkaIAEgASkDkBIgAUH4EmotAAAiBq18NwOQEiABQbgSaiECAkAg\
BkHAAEYNACACIAZqQQBBwAAgBmsQOhoLIAFBADoA+BIgAUGQEmogAkF/EBMgDyADKQMAIhY3AwAgDS\
AWNwMAIAwgCikDADcDACAQIAspAwA3AwAgASABKQOYEiIWNwP4DiABIBY3A+gjQSAQFiIGRQ0cIAYg\
ASkD6CM3AAAgBkEYaiABQegjakEYaikDADcAACAGQRBqIAFB6CNqQRBqKQMANwAAIAZBCGogAUHoI2\
pBCGopAwA3AABBICEDDBcLIAQgBUH4DhA5IQEgA0EASA0SAkACQCADDQBBASEGDAELIAMQFiIGRQ0d\
IAZBfGotAABBA3FFDQAgBkEAIAMQOhoLIAFBkBJqIAFB+A4QORogAUH4DmogAUGQEmoQIyABQfgOai\
AGIAMQGAwWCyAEIAVB4AIQOSIKQZASaiAKQeACEDkaIApBkBJqIApB6BRqLQAAIgFqQcgBaiECAkAg\
AUGQAUYNACACQQBBkAEgAWsQOhoLQQAhBiAKQQA6AOgUIAJBAToAACAKQecUaiIBIAEtAABBgAFyOg\
AAA0AgCkGQEmogBmoiASABLQAAIAFByAFqLQAAczoAACABQQFqIgIgAi0AACABQckBai0AAHM6AAAg\
AUECaiICIAItAAAgAUHKAWotAABzOgAAIAFBA2oiAiACLQAAIAFBywFqLQAAczoAACAGQQRqIgZBkA\
FHDQALIApBkBJqECQgCkH4DmpBGGoiASAKQZASakEYaigCADYCACAKQfgOakEQaiICIApBkBJqQRBq\
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\
KQKUEjcD6CMgAUGQEmogAUHgABA5GiABQZASaiABQagSaiABQegjahAuQRAQFiIGRQ0cIAYgASkD6C\
M3AAAgBkEIaiACKQMANwAADBALQRQhAyAEIAVB6AAQOSIBQfgOakEUakEANgIAIAFB+A5qQQxqQgA3\
AgAgAUEANgL4DiABQgA3AvwOIAFBFDYC+A4gAUGQEmpBEGogAUH4DmpBEGopAwA3AwAgAUGQEmpBCG\
ogAUH4DmpBCGopAwA3AwAgAUHoI2pBCGoiAiABQZASakEMaikCADcDACABQegjakEQaiIKIAFBkBJq\
QRRqKAIANgIAIAEgASkD+A43A5ASIAEgASkClBI3A+gjIAFBkBJqIAFB6AAQORogAUGQEmogAUGwEm\
ogAUHoI2oQLUEUEBYiBkUNHCAGIAEpA+gjNwAAIAZBEGogCigCADYAACAGQQhqIAIpAwA3AAAMDwtB\
FCEDIAQgBUHoABA5IgFB+A5qQRRqQQA2AgAgAUH4DmpBDGpCADcCACABQQA2AvgOIAFCADcC/A4gAU\
EUNgL4DiABQZASakEQaiABQfgOakEQaikDADcDACABQZASakEIaiABQfgOakEIaikDADcDACABQegj\
akEIaiICIAFBkBJqQQxqKQIANwMAIAFB6CNqQRBqIgogAUGQEmpBFGooAgA2AgAgASABKQP4DjcDkB\
IgASABKQKUEjcD6CMgAUGQEmogAUHoABA5GiABQZASaiABQbASaiABQegjahAoQRQQFiIGRQ0cIAYg\
ASkD6CM3AAAgBkEQaiAKKAIANgAAIAZBCGogAikDADcAAAwOCyAEIAVB4AIQOSIKQZASaiAKQeACED\
kaIApBkBJqIApB6BRqLQAAIgFqQcgBaiECAkAgAUGQAUYNACACQQBBkAEgAWsQOhoLQQAhBiAKQQA6\
AOgUIAJBBjoAACAKQecUaiIBIAEtAABBgAFyOgAAA0AgCkGQEmogBmoiASABLQAAIAFByAFqLQAAcz\
oAACABQQFqIgIgAi0AACABQckBai0AAHM6AAAgAUECaiICIAItAAAgAUHKAWotAABzOgAAIAFBA2oi\
AiACLQAAIAFBywFqLQAAczoAACAGQQRqIgZBkAFHDQALIApBkBJqECQgCkH4DmpBGGoiASAKQZASak\
EYaigCADYCACAKQfgOakEQaiICIApBkBJqQRBqKQMANwMAIApB+A5qQQhqIg8gCkGQEmpBCGopAwA3\
AwAgCiAKKQOQEjcD+A5BHCEDQRwQFiIGRQ0cIAYgCikD+A43AAAgBkEYaiABKAIANgAAIAZBEGogAi\
kDADcAACAGQQhqIA8pAwA3AAAMDQsgBCAFQdgCEDkiCkGQEmogCkHYAhA5GiAKQZASaiAKQeAUai0A\
ACIBakHIAWohAgJAIAFBiAFGDQAgAkEAQYgBIAFrEDoaC0EAIQYgCkEAOgDgFCACQQY6AAAgCkHfFG\
oiASABLQAAQYABcjoAAANAIApBkBJqIAZqIgEgAS0AACABQcgBai0AAHM6AAAgAUEBaiICIAItAAAg\
AUHJAWotAABzOgAAIAFBAmoiAiACLQAAIAFBygFqLQAAczoAACABQQNqIgIgAi0AACABQcsBai0AAH\
M6AAAgBkEEaiIGQYgBRw0ACyAKQZASahAkIApB+A5qQRhqIgEgCkGQEmpBGGopAwA3AwAgCkH4DmpB\
EGoiAiAKQZASakEQaikDADcDACAKQfgOakEIaiIPIApBkBJqQQhqKQMANwMAIAogCikDkBI3A/gOQS\
AhA0EgEBYiBkUNHCAGIAopA/gONwAAIAZBGGogASkDADcAACAGQRBqIAIpAwA3AAAgBkEIaiAPKQMA\
NwAADAwLIAQgBUG4AhA5IgpBkBJqIApBuAIQORogCkGQEmogCkHAFGotAAAiAWpByAFqIQICQCABQe\
gARg0AIAJBAEHoACABaxA6GgtBACEGIApBADoAwBQgAkEGOgAAIApBvxRqIgEgAS0AAEGAAXI6AAAD\
QCAKQZASaiAGaiIBIAEtAAAgAUHIAWotAABzOgAAIAFBAWoiAiACLQAAIAFByQFqLQAAczoAACABQQ\
JqIgIgAi0AACABQcoBai0AAHM6AAAgAUEDaiICIAItAAAgAUHLAWotAABzOgAAIAZBBGoiBkHoAEcN\
AAsgCkGQEmoQJCAKQfgOakEoaiIBIApBkBJqQShqKQMANwMAIApB+A5qQSBqIgIgCkGQEmpBIGopAw\
A3AwAgCkH4DmpBGGoiDyAKQZASakEYaikDADcDACAKQfgOakEQaiILIApBkBJqQRBqKQMANwMAIApB\
+A5qQQhqIgwgCkGQEmpBCGopAwA3AwAgCiAKKQOQEjcD+A5BMCEDQTAQFiIGRQ0cIAYgCikD+A43AA\
AgBkEoaiABKQMANwAAIAZBIGogAikDADcAACAGQRhqIA8pAwA3AAAgBkEQaiALKQMANwAAIAZBCGog\
DCkDADcAAAwLCyAEIAVBmAIQOSIKQZASaiAKQZgCEDkaIApBkBJqIApBoBRqLQAAIgFqQcgBaiECAk\
AgAUHIAEYNACACQQBByAAgAWsQOhoLQQAhBiAKQQA6AKAUIAJBBjoAACAKQZ8UaiIBIAEtAABBgAFy\
OgAAA0AgCkGQEmogBmoiASABLQAAIAFByAFqLQAAczoAACABQQFqIgIgAi0AACABQckBai0AAHM6AA\
AgAUECaiICIAItAAAgAUHKAWotAABzOgAAIAFBA2oiAiACLQAAIAFBywFqLQAAczoAACAGQQRqIgZB\
yABHDQALIApBkBJqECQgCkH4DmpBOGoiASAKQZASakE4aikDADcDACAKQfgOakEwaiICIApBkBJqQT\
BqKQMANwMAIApB+A5qQShqIg8gCkGQEmpBKGopAwA3AwAgCkH4DmpBIGoiCyAKQZASakEgaikDADcD\
ACAKQfgOakEYaiIMIApBkBJqQRhqKQMANwMAIApB+A5qQRBqIg0gCkGQEmpBEGopAwA3AwAgCkH4Dm\
pBCGoiECAKQZASakEIaikDADcDACAKIAopA5ASNwP4DkHAACEDQcAAEBYiBkUNHCAGIAopA/gONwAA\
IAZBOGogASkDADcAACAGQTBqIAIpAwA3AAAgBkEoaiAPKQMANwAAIAZBIGogCykDADcAACAGQRhqIA\
wpAwA3AAAgBkEQaiANKQMANwAAIAZBCGogECkDADcAAAwKCyAEIAVB8AAQOSIBQZASaiABQfAAEDka\
QRwhAyABQegjakEcakIANwIAIAFB6CNqQRRqQgA3AgAgAUHoI2pBDGpCADcCACABQgA3AuwjIAFBID\
YC6CMgAUH4DmpBGGoiAiABQegjakEYaikDADcDACABQfgOakEQaiIKIAFB6CNqQRBqKQMANwMAIAFB\
+A5qQQhqIg8gAUHoI2pBCGopAwA3AwAgAUH4DmpBIGogAUHoI2pBIGooAgA2AgAgASABKQPoIzcD+A\
4gAUG4ImpBEGoiBiABQfgOakEUaikCADcDACABQbgiakEIaiILIAFB+A5qQQxqKQIANwMAIAFBuCJq\
QRhqIgwgAUH4DmpBHGopAgA3AwAgASABKQL8DjcDuCIgAUGQEmogAUG4EmogAUG4ImoQJyACIAwoAg\
A2AgAgCiAGKQMANwMAIA8gCykDADcDACABIAEpA7giNwP4DkEcEBYiBkUNHCAGIAEpA/gONwAAIAZB\
GGogAigCADYAACAGQRBqIAopAwA3AAAgBkEIaiAPKQMANwAADAkLIAQgBUHwABA5IgFBkBJqIAFB8A\
AQORogAUHoI2pBHGpCADcCACABQegjakEUakIANwIAIAFB6CNqQQxqQgA3AgAgAUIANwLsI0EgIQMg\
AUEgNgLoIyABQfgOakEgaiABQegjakEgaigCADYCACABQfgOakEYaiICIAFB6CNqQRhqKQMANwMAIA\
FB+A5qQRBqIgogAUHoI2pBEGopAwA3AwAgAUH4DmpBCGoiDyABQegjakEIaikDADcDACABIAEpA+gj\
NwP4DiABQbgiakEYaiIGIAFB+A5qQRxqKQIANwMAIAFBuCJqQRBqIgsgAUH4DmpBFGopAgA3AwAgAU\
G4ImpBCGoiDCABQfgOakEMaikCADcDACABIAEpAvwONwO4IiABQZASaiABQbgSaiABQbgiahAnIAIg\
BikDADcDACAKIAspAwA3AwAgDyAMKQMANwMAIAEgASkDuCI3A/gOQSAQFiIGRQ0cIAYgASkD+A43AA\
AgBkEYaiACKQMANwAAIAZBEGogCikDADcAACAGQQhqIA8pAwA3AAAMCAsgBCAFQdgBEDkiAUGQEmog\
AUHYARA5GiABQegjakEMakIANwIAIAFB6CNqQRRqQgA3AgAgAUHoI2pBHGpCADcCACABQegjakEkak\
IANwIAIAFB6CNqQSxqQgA3AgAgAUHoI2pBNGpCADcCACABQegjakE8akIANwIAIAFCADcC7CMgAUHA\
ADYC6CMgAUH4DmogAUHoI2pBxAAQORogAUHwImogAUH4DmpBPGopAgA3AwBBMCEDIAFBuCJqQTBqIA\
FB+A5qQTRqKQIANwMAIAFBuCJqQShqIgYgAUH4DmpBLGopAgA3AwAgAUG4ImpBIGoiAiABQfgOakEk\
aikCADcDACABQbgiakEYaiIKIAFB+A5qQRxqKQIANwMAIAFBuCJqQRBqIg8gAUH4DmpBFGopAgA3Aw\
AgAUG4ImpBCGoiCyABQfgOakEMaikCADcDACABIAEpAvwONwO4IiABQZASaiABQeASaiABQbgiahAi\
IAFB+A5qQShqIgwgBikDADcDACABQfgOakEgaiINIAIpAwA3AwAgAUH4DmpBGGoiAiAKKQMANwMAIA\
FB+A5qQRBqIgogDykDADcDACABQfgOakEIaiIPIAspAwA3AwAgASABKQO4IjcD+A5BMBAWIgZFDRwg\
BiABKQP4DjcAACAGQShqIAwpAwA3AAAgBkEgaiANKQMANwAAIAZBGGogAikDADcAACAGQRBqIAopAw\
A3AAAgBkEIaiAPKQMANwAADAcLIAQgBUHYARA5IgFBkBJqIAFB2AEQORogAUHoI2pBDGpCADcCACAB\
QegjakEUakIANwIAIAFB6CNqQRxqQgA3AgAgAUHoI2pBJGpCADcCACABQegjakEsakIANwIAIAFB6C\
NqQTRqQgA3AgAgAUHoI2pBPGpCADcCACABQgA3AuwjQcAAIQMgAUHAADYC6CMgAUH4DmogAUHoI2pB\
xAAQORogAUG4ImpBOGoiBiABQfgOakE8aikCADcDACABQbgiakEwaiICIAFB+A5qQTRqKQIANwMAIA\
FBuCJqQShqIgogAUH4DmpBLGopAgA3AwAgAUG4ImpBIGoiDyABQfgOakEkaikCADcDACABQbgiakEY\
aiILIAFB+A5qQRxqKQIANwMAIAFBuCJqQRBqIgwgAUH4DmpBFGopAgA3AwAgAUG4ImpBCGoiDSABQf\
gOakEMaikCADcDACABIAEpAvwONwO4IiABQZASaiABQeASaiABQbgiahAiIAFB+A5qQThqIhAgBikD\
ADcDACABQfgOakEwaiIOIAIpAwA3AwAgAUH4DmpBKGoiAiAKKQMANwMAIAFB+A5qQSBqIgogDykDAD\
cDACABQfgOakEYaiIPIAspAwA3AwAgAUH4DmpBEGoiCyAMKQMANwMAIAFB+A5qQQhqIgwgDSkDADcD\
ACABIAEpA7giNwP4DkHAABAWIgZFDRwgBiABKQP4DjcAACAGQThqIBApAwA3AAAgBkEwaiAOKQMANw\
AAIAZBKGogAikDADcAACAGQSBqIAopAwA3AAAgBkEYaiAPKQMANwAAIAZBEGogCykDADcAACAGQQhq\
IAwpAwA3AAAMBgsgBEH4DmogBUH4AhA5GiADQQBIDQECQAJAIAMNAEEBIQYMAQsgAxAWIgZFDR0gBk\
F8ai0AAEEDcUUNACAGQQAgAxA6GgsgBEGQEmogBEH4DmpB+AIQORogBCAEQfgOakHIARA5Ig9ByAFq\
IA9BkBJqQcgBakGpARA5IQEgD0HoI2ogD0H4DmpByAEQORogD0GIIWogAUGpARA5GiAPQYghaiAPLQ\
CwIiIBaiEKAkAgAUGoAUYNACAKQQBBqAEgAWsQOhoLQQAhAiAPQQA6ALAiIApBHzoAACAPQa8iaiIB\
IAEtAABBgAFyOgAAA0AgD0HoI2ogAmoiASABLQAAIA9BiCFqIAJqIgotAABzOgAAIAFBAWoiCyALLQ\
AAIApBAWotAABzOgAAIAFBAmoiCyALLQAAIApBAmotAABzOgAAIAFBA2oiASABLQAAIApBA2otAABz\
OgAAIAJBBGoiAkGoAUcNAAsgD0HoI2oQJCAPQZASaiAPQegjakHIARA5GiAPQQA2ArgiIA9BuCJqQQ\
RyQQBBqAEQOhogD0GoATYCuCIgDyAPQbgiakGsARA5IgFBkBJqQcgBaiABQQRyQagBEDkaIAFBgBVq\
QQA6AAAgAUGQEmogBiADEDEMBQsgBEH4DmogBUHYAhA5GiADQQBIDQAgAw0BQQEhBgwCCxBpAAsgAx\
AWIgZFDRogBkF8ai0AAEEDcUUNACAGQQAgAxA6GgsgBEGQEmogBEH4DmpB2AIQORogBCAEQfgOakHI\
ARA5Ig9ByAFqIA9BkBJqQcgBakGJARA5IQEgD0HoI2ogD0H4DmpByAEQORogD0GIIWogAUGJARA5Gi\
APQYghaiAPLQCQIiIBaiEKAkAgAUGIAUYNACAKQQBBiAEgAWsQOhoLQQAhAiAPQQA6AJAiIApBHzoA\
ACAPQY8iaiIBIAEtAABBgAFyOgAAA0AgD0HoI2ogAmoiASABLQAAIA9BiCFqIAJqIgotAABzOgAAIA\
FBAWoiCyALLQAAIApBAWotAABzOgAAIAFBAmoiCyALLQAAIApBAmotAABzOgAAIAFBA2oiASABLQAA\
IApBA2otAABzOgAAIAJBBGoiAkGIAUcNAAsgD0HoI2oQJCAPQZASaiAPQegjakHIARA5GiAPQQA2Ar\
giIA9BuCJqQQRyQQBBiAEQOhogD0GIATYCuCIgDyAPQbgiakGMARA5IgFBkBJqQcgBaiABQQRyQYgB\
EDkaIAFB4BRqQQA6AAAgAUGQEmogBiADEDIMAQsgBCAFQegAEDkiAUH4DmpBFGpCADcCACABQfgOak\
EMakIANwIAIAFCADcC/A5BGCEDIAFBGDYC+A4gAUGQEmpBEGogAUH4DmpBEGopAwA3AwAgAUGQEmpB\
CGogAUH4DmpBCGopAwA3AwAgAUGQEmpBGGogAUH4DmpBGGooAgA2AgAgAUHoI2pBCGoiAiABQZASak\
EMaikCADcDACABQegjakEQaiIKIAFBkBJqQRRqKQIANwMAIAEgASkD+A43A5ASIAEgASkClBI3A+gj\
IAFBkBJqIAFB6AAQORogAUGQEmogAUGwEmogAUHoI2oQMEEYEBYiBkUNGSAGIAEpA+gjNwAAIAZBEG\
ogCikDADcAACAGQQhqIAIpAwA3AAALIAUQHiAAQQhqIAM2AgAgACAGNgIEIABBADYCAAsgBEGwJWok\
AA8LQcAAQQFBACgC+NRAIgRBBCAEGxEFAAALQSBBAUEAKAL41EAiBEEEIAQbEQUAAAtBMEEBQQAoAv\
jUQCIEQQQgBBsRBQAAC0EgQQFBACgC+NRAIgRBBCAEGxEFAAALIANBAUEAKAL41EAiBEEEIAQbEQUA\
AAtBHEEBQQAoAvjUQCIEQQQgBBsRBQAAC0EgQQFBACgC+NRAIgRBBCAEGxEFAAALQTBBAUEAKAL41E\
AiBEEEIAQbEQUAAAtBwABBAUEAKAL41EAiBEEEIAQbEQUAAAtBEEEBQQAoAvjUQCIEQQQgBBsRBQAA\
C0EQQQFBACgC+NRAIgRBBCAEGxEFAAALQRRBAUEAKAL41EAiBEEEIAQbEQUAAAtBFEEBQQAoAvjUQC\
IEQQQgBBsRBQAAC0EcQQFBACgC+NRAIgRBBCAEGxEFAAALQSBBAUEAKAL41EAiBEEEIAQbEQUAAAtB\
MEEBQQAoAvjUQCIEQQQgBBsRBQAAC0HAAEEBQQAoAvjUQCIEQQQgBBsRBQAAC0EcQQFBACgC+NRAIg\
RBBCAEGxEFAAALQSBBAUEAKAL41EAiBEEEIAQbEQUAAAtBMEEBQQAoAvjUQCIEQQQgBBsRBQAAC0HA\
AEEBQQAoAvjUQCIEQQQgBBsRBQAACyADQQFBACgC+NRAIgRBBCAEGxEFAAALIANBAUEAKAL41EAiBE\
EEIAQbEQUAAAtBGEEBQQAoAvjUQCIEQQQgBBsRBQAAC5JaAgF/In4jAEGAAWsiAyQAIANBAEGAARA6\
IQMgACkDOCEEIAApAzAhBSAAKQMoIQYgACkDICEHIAApAxghCCAAKQMQIQkgACkDCCEKIAApAwAhCw\
JAIAJBB3QiAkUNACABIAJqIQIDQCADIAEpAAAiDEI4hiAMQiiGQoCAgICAgMD/AIOEIAxCGIZCgICA\
gIDgP4MgDEIIhkKAgICA8B+DhIQgDEIIiEKAgID4D4MgDEIYiEKAgPwHg4QgDEIoiEKA/gODIAxCOI\
iEhIQ3AwAgAyABQQhqKQAAIgxCOIYgDEIohkKAgICAgIDA/wCDhCAMQhiGQoCAgICA4D+DIAxCCIZC\
gICAgPAfg4SEIAxCCIhCgICA+A+DIAxCGIhCgID8B4OEIAxCKIhCgP4DgyAMQjiIhISENwMIIAMgAU\
EQaikAACIMQjiGIAxCKIZCgICAgICAwP8Ag4QgDEIYhkKAgICAgOA/gyAMQgiGQoCAgIDwH4OEhCAM\
QgiIQoCAgPgPgyAMQhiIQoCA/AeDhCAMQiiIQoD+A4MgDEI4iISEhDcDECADIAFBGGopAAAiDEI4hi\
AMQiiGQoCAgICAgMD/AIOEIAxCGIZCgICAgIDgP4MgDEIIhkKAgICA8B+DhIQgDEIIiEKAgID4D4Mg\
DEIYiEKAgPwHg4QgDEIoiEKA/gODIAxCOIiEhIQ3AxggAyABQSBqKQAAIgxCOIYgDEIohkKAgICAgI\
DA/wCDhCAMQhiGQoCAgICA4D+DIAxCCIZCgICAgPAfg4SEIAxCCIhCgICA+A+DIAxCGIhCgID8B4OE\
IAxCKIhCgP4DgyAMQjiIhISENwMgIAMgAUEoaikAACIMQjiGIAxCKIZCgICAgICAwP8Ag4QgDEIYhk\
KAgICAgOA/gyAMQgiGQoCAgIDwH4OEhCAMQgiIQoCAgPgPgyAMQhiIQoCA/AeDhCAMQiiIQoD+A4Mg\
DEI4iISEhDcDKCADIAFBwABqKQAAIgxCOIYgDEIohkKAgICAgIDA/wCDhCAMQhiGQoCAgICA4D+DIA\
xCCIZCgICAgPAfg4SEIAxCCIhCgICA+A+DIAxCGIhCgID8B4OEIAxCKIhCgP4DgyAMQjiIhISEIg03\
A0AgAyABQThqKQAAIgxCOIYgDEIohkKAgICAgIDA/wCDhCAMQhiGQoCAgICA4D+DIAxCCIZCgICAgP\
Afg4SEIAxCCIhCgICA+A+DIAxCGIhCgID8B4OEIAxCKIhCgP4DgyAMQjiIhISEIg43AzggAyABQTBq\
KQAAIgxCOIYgDEIohkKAgICAgIDA/wCDhCAMQhiGQoCAgICA4D+DIAxCCIZCgICAgPAfg4SEIAxCCI\
hCgICA+A+DIAxCGIhCgID8B4OEIAxCKIhCgP4DgyAMQjiIhISEIg83AzAgAykDACEQIAMpAwghESAD\
KQMQIRIgAykDGCETIAMpAyAhFCADKQMoIRUgAyABQcgAaikAACIMQjiGIAxCKIZCgICAgICAwP8Ag4\
QgDEIYhkKAgICAgOA/gyAMQgiGQoCAgIDwH4OEhCAMQgiIQoCAgPgPgyAMQhiIQoCA/AeDhCAMQiiI\
QoD+A4MgDEI4iISEhCIWNwNIIAMgAUHQAGopAAAiDEI4hiAMQiiGQoCAgICAgMD/AIOEIAxCGIZCgI\
CAgIDgP4MgDEIIhkKAgICA8B+DhIQgDEIIiEKAgID4D4MgDEIYiEKAgPwHg4QgDEIoiEKA/gODIAxC\
OIiEhIQiFzcDUCADIAFB2ABqKQAAIgxCOIYgDEIohkKAgICAgIDA/wCDhCAMQhiGQoCAgICA4D+DIA\
xCCIZCgICAgPAfg4SEIAxCCIhCgICA+A+DIAxCGIhCgID8B4OEIAxCKIhCgP4DgyAMQjiIhISEIhg3\
A1ggAyABQeAAaikAACIMQjiGIAxCKIZCgICAgICAwP8Ag4QgDEIYhkKAgICAgOA/gyAMQgiGQoCAgI\
DwH4OEhCAMQgiIQoCAgPgPgyAMQhiIQoCA/AeDhCAMQiiIQoD+A4MgDEI4iISEhCIZNwNgIAMgAUHo\
AGopAAAiDEI4hiAMQiiGQoCAgICAgMD/AIOEIAxCGIZCgICAgIDgP4MgDEIIhkKAgICA8B+DhIQgDE\
IIiEKAgID4D4MgDEIYiEKAgPwHg4QgDEIoiEKA/gODIAxCOIiEhIQiGjcDaCADIAFB8ABqKQAAIgxC\
OIYgDEIohkKAgICAgIDA/wCDhCAMQhiGQoCAgICA4D+DIAxCCIZCgICAgPAfg4SEIAxCCIhCgICA+A\
+DIAxCGIhCgID8B4OEIAxCKIhCgP4DgyAMQjiIhISEIgw3A3AgAyABQfgAaikAACIbQjiGIBtCKIZC\
gICAgICAwP8Ag4QgG0IYhkKAgICAgOA/gyAbQgiGQoCAgIDwH4OEhCAbQgiIQoCAgPgPgyAbQhiIQo\
CA/AeDhCAbQiiIQoD+A4MgG0I4iISEhCIbNwN4IAtCJIkgC0IeiYUgC0IZiYUgCiAJhSALgyAKIAmD\
hXwgECAEIAYgBYUgB4MgBYV8IAdCMokgB0IuiYUgB0IXiYV8fEKi3KK5jfOLxcIAfCIcfCIdQiSJIB\
1CHomFIB1CGYmFIB0gCyAKhYMgCyAKg4V8IAUgEXwgHCAIfCIeIAcgBoWDIAaFfCAeQjKJIB5CLomF\
IB5CF4mFfELNy72fkpLRm/EAfCIffCIcQiSJIBxCHomFIBxCGYmFIBwgHSALhYMgHSALg4V8IAYgEn\
wgHyAJfCIgIB4gB4WDIAeFfCAgQjKJICBCLomFICBCF4mFfEKv9rTi/vm+4LV/fCIhfCIfQiSJIB9C\
HomFIB9CGYmFIB8gHCAdhYMgHCAdg4V8IAcgE3wgISAKfCIiICAgHoWDIB6FfCAiQjKJICJCLomFIC\
JCF4mFfEK8t6eM2PT22ml8IiN8IiFCJIkgIUIeiYUgIUIZiYUgISAfIByFgyAfIByDhXwgHiAUfCAj\
IAt8IiMgIiAghYMgIIV8ICNCMokgI0IuiYUgI0IXiYV8Qrjqopq/y7CrOXwiJHwiHkIkiSAeQh6JhS\
AeQhmJhSAeICEgH4WDICEgH4OFfCAVICB8ICQgHXwiICAjICKFgyAihXwgIEIyiSAgQi6JhSAgQheJ\
hXxCmaCXsJu+xPjZAHwiJHwiHUIkiSAdQh6JhSAdQhmJhSAdIB4gIYWDIB4gIYOFfCAPICJ8ICQgHH\
wiIiAgICOFgyAjhXwgIkIyiSAiQi6JhSAiQheJhXxCm5/l+MrU4J+Sf3wiJHwiHEIkiSAcQh6JhSAc\
QhmJhSAcIB0gHoWDIB0gHoOFfCAOICN8ICQgH3wiIyAiICCFgyAghXwgI0IyiSAjQi6JhSAjQheJhX\
xCmIK2093al46rf3wiJHwiH0IkiSAfQh6JhSAfQhmJhSAfIBwgHYWDIBwgHYOFfCANICB8ICQgIXwi\
ICAjICKFgyAihXwgIEIyiSAgQi6JhSAgQheJhXxCwoSMmIrT6oNYfCIkfCIhQiSJICFCHomFICFCGY\
mFICEgHyAchYMgHyAcg4V8IBYgInwgJCAefCIiICAgI4WDICOFfCAiQjKJICJCLomFICJCF4mFfEK+\
38GrlODWwRJ8IiR8Ih5CJIkgHkIeiYUgHkIZiYUgHiAhIB+FgyAhIB+DhXwgFyAjfCAkIB18IiMgIi\
AghYMgIIV8ICNCMokgI0IuiYUgI0IXiYV8Qozlkvfkt+GYJHwiJHwiHUIkiSAdQh6JhSAdQhmJhSAd\
IB4gIYWDIB4gIYOFfCAYICB8ICQgHHwiICAjICKFgyAihXwgIEIyiSAgQi6JhSAgQheJhXxC4un+r7\
24n4bVAHwiJHwiHEIkiSAcQh6JhSAcQhmJhSAcIB0gHoWDIB0gHoOFfCAZICJ8ICQgH3wiIiAgICOF\
gyAjhXwgIkIyiSAiQi6JhSAiQheJhXxC75Luk8+ul9/yAHwiJHwiH0IkiSAfQh6JhSAfQhmJhSAfIB\
wgHYWDIBwgHYOFfCAaICN8ICQgIXwiIyAiICCFgyAghXwgI0IyiSAjQi6JhSAjQheJhXxCsa3a2OO/\
rO+Af3wiJHwiIUIkiSAhQh6JhSAhQhmJhSAhIB8gHIWDIB8gHIOFfCAMICB8ICQgHnwiJCAjICKFgy\
AihXwgJEIyiSAkQi6JhSAkQheJhXxCtaScrvLUge6bf3wiIHwiHkIkiSAeQh6JhSAeQhmJhSAeICEg\
H4WDICEgH4OFfCAbICJ8ICAgHXwiJSAkICOFgyAjhXwgJUIyiSAlQi6JhSAlQheJhXxClM2k+8yu/M\
1BfCIifCIdQiSJIB1CHomFIB1CGYmFIB0gHiAhhYMgHiAhg4V8IBAgEUI/iSARQjiJhSARQgeIhXwg\
FnwgDEItiSAMQgOJhSAMQgaIhXwiICAjfCAiIBx8IhAgJSAkhYMgJIV8IBBCMokgEEIuiYUgEEIXiY\
V8QtKVxfeZuNrNZHwiI3wiHEIkiSAcQh6JhSAcQhmJhSAcIB0gHoWDIB0gHoOFfCARIBJCP4kgEkI4\
iYUgEkIHiIV8IBd8IBtCLYkgG0IDiYUgG0IGiIV8IiIgJHwgIyAffCIRIBAgJYWDICWFfCARQjKJIB\
FCLomFIBFCF4mFfELjy7zC4/CR3298IiR8Ih9CJIkgH0IeiYUgH0IZiYUgHyAcIB2FgyAcIB2DhXwg\
EiATQj+JIBNCOImFIBNCB4iFfCAYfCAgQi2JICBCA4mFICBCBoiFfCIjICV8ICQgIXwiEiARIBCFgy\
AQhXwgEkIyiSASQi6JhSASQheJhXxCtauz3Oi45+APfCIlfCIhQiSJICFCHomFICFCGYmFICEgHyAc\
hYMgHyAcg4V8IBMgFEI/iSAUQjiJhSAUQgeIhXwgGXwgIkItiSAiQgOJhSAiQgaIhXwiJCAQfCAlIB\
58IhMgEiARhYMgEYV8IBNCMokgE0IuiYUgE0IXiYV8QuW4sr3HuaiGJHwiEHwiHkIkiSAeQh6JhSAe\
QhmJhSAeICEgH4WDICEgH4OFfCAUIBVCP4kgFUI4iYUgFUIHiIV8IBp8ICNCLYkgI0IDiYUgI0IGiI\
V8IiUgEXwgECAdfCIUIBMgEoWDIBKFfCAUQjKJIBRCLomFIBRCF4mFfEL1hKzJ9Y3L9C18IhF8Ih1C\
JIkgHUIeiYUgHUIZiYUgHSAeICGFgyAeICGDhXwgFSAPQj+JIA9COImFIA9CB4iFfCAMfCAkQi2JIC\
RCA4mFICRCBoiFfCIQIBJ8IBEgHHwiFSAUIBOFgyAThXwgFUIyiSAVQi6JhSAVQheJhXxCg8mb9aaV\
obrKAHwiEnwiHEIkiSAcQh6JhSAcQhmJhSAcIB0gHoWDIB0gHoOFfCAOQj+JIA5COImFIA5CB4iFIA\
98IBt8ICVCLYkgJUIDiYUgJUIGiIV8IhEgE3wgEiAffCIPIBUgFIWDIBSFfCAPQjKJIA9CLomFIA9C\
F4mFfELU94fqy7uq2NwAfCITfCIfQiSJIB9CHomFIB9CGYmFIB8gHCAdhYMgHCAdg4V8IA1CP4kgDU\
I4iYUgDUIHiIUgDnwgIHwgEEItiSAQQgOJhSAQQgaIhXwiEiAUfCATICF8Ig4gDyAVhYMgFYV8IA5C\
MokgDkIuiYUgDkIXiYV8QrWnxZiom+L89gB8IhR8IiFCJIkgIUIeiYUgIUIZiYUgISAfIByFgyAfIB\
yDhXwgFkI/iSAWQjiJhSAWQgeIhSANfCAifCARQi2JIBFCA4mFIBFCBoiFfCITIBV8IBQgHnwiDSAO\
IA+FgyAPhXwgDUIyiSANQi6JhSANQheJhXxCq7+b866qlJ+Yf3wiFXwiHkIkiSAeQh6JhSAeQhmJhS\
AeICEgH4WDICEgH4OFfCAXQj+JIBdCOImFIBdCB4iFIBZ8ICN8IBJCLYkgEkIDiYUgEkIGiIV8IhQg\
D3wgFSAdfCIWIA0gDoWDIA6FfCAWQjKJIBZCLomFIBZCF4mFfEKQ5NDt0s3xmKh/fCIPfCIdQiSJIB\
1CHomFIB1CGYmFIB0gHiAhhYMgHiAhg4V8IBhCP4kgGEI4iYUgGEIHiIUgF3wgJHwgE0ItiSATQgOJ\
hSATQgaIhXwiFSAOfCAPIBx8IhcgFiANhYMgDYV8IBdCMokgF0IuiYUgF0IXiYV8Qr/C7MeJ+cmBsH\
98Ig58IhxCJIkgHEIeiYUgHEIZiYUgHCAdIB6FgyAdIB6DhXwgGUI/iSAZQjiJhSAZQgeIhSAYfCAl\
fCAUQi2JIBRCA4mFIBRCBoiFfCIPIA18IA4gH3wiGCAXIBaFgyAWhXwgGEIyiSAYQi6JhSAYQheJhX\
xC5J289/v436y/f3wiDXwiH0IkiSAfQh6JhSAfQhmJhSAfIBwgHYWDIBwgHYOFfCAaQj+JIBpCOImF\
IBpCB4iFIBl8IBB8IBVCLYkgFUIDiYUgFUIGiIV8Ig4gFnwgDSAhfCIWIBggF4WDIBeFfCAWQjKJIB\
ZCLomFIBZCF4mFfELCn6Lts/6C8EZ8Ihl8IiFCJIkgIUIeiYUgIUIZiYUgISAfIByFgyAfIByDhXwg\
DEI/iSAMQjiJhSAMQgeIhSAafCARfCAPQi2JIA9CA4mFIA9CBoiFfCINIBd8IBkgHnwiFyAWIBiFgy\
AYhXwgF0IyiSAXQi6JhSAXQheJhXxCpc6qmPmo5NNVfCIZfCIeQiSJIB5CHomFIB5CGYmFIB4gISAf\
hYMgISAfg4V8IBtCP4kgG0I4iYUgG0IHiIUgDHwgEnwgDkItiSAOQgOJhSAOQgaIhXwiDCAYfCAZIB\
18IhggFyAWhYMgFoV8IBhCMokgGEIuiYUgGEIXiYV8Qu+EjoCe6pjlBnwiGXwiHUIkiSAdQh6JhSAd\
QhmJhSAdIB4gIYWDIB4gIYOFfCAgQj+JICBCOImFICBCB4iFIBt8IBN8IA1CLYkgDUIDiYUgDUIGiI\
V8IhsgFnwgGSAcfCIWIBggF4WDIBeFfCAWQjKJIBZCLomFIBZCF4mFfELw3LnQ8KzKlBR8Ihl8IhxC\
JIkgHEIeiYUgHEIZiYUgHCAdIB6FgyAdIB6DhXwgIkI/iSAiQjiJhSAiQgeIhSAgfCAUfCAMQi2JIA\
xCA4mFIAxCBoiFfCIgIBd8IBkgH3wiFyAWIBiFgyAYhXwgF0IyiSAXQi6JhSAXQheJhXxC/N/IttTQ\
wtsnfCIZfCIfQiSJIB9CHomFIB9CGYmFIB8gHCAdhYMgHCAdg4V8ICNCP4kgI0I4iYUgI0IHiIUgIn\
wgFXwgG0ItiSAbQgOJhSAbQgaIhXwiIiAYfCAZICF8IhggFyAWhYMgFoV8IBhCMokgGEIuiYUgGEIX\
iYV8QqaSm+GFp8iNLnwiGXwiIUIkiSAhQh6JhSAhQhmJhSAhIB8gHIWDIB8gHIOFfCAkQj+JICRCOI\
mFICRCB4iFICN8IA98ICBCLYkgIEIDiYUgIEIGiIV8IiMgFnwgGSAefCIWIBggF4WDIBeFfCAWQjKJ\
IBZCLomFIBZCF4mFfELt1ZDWxb+bls0AfCIZfCIeQiSJIB5CHomFIB5CGYmFIB4gISAfhYMgISAfg4\
V8ICVCP4kgJUI4iYUgJUIHiIUgJHwgDnwgIkItiSAiQgOJhSAiQgaIhXwiJCAXfCAZIB18IhcgFiAY\
hYMgGIV8IBdCMokgF0IuiYUgF0IXiYV8Qt/n1uy5ooOc0wB8Ihl8Ih1CJIkgHUIeiYUgHUIZiYUgHS\
AeICGFgyAeICGDhXwgEEI/iSAQQjiJhSAQQgeIhSAlfCANfCAjQi2JICNCA4mFICNCBoiFfCIlIBh8\
IBkgHHwiGCAXIBaFgyAWhXwgGEIyiSAYQi6JhSAYQheJhXxC3se93cjqnIXlAHwiGXwiHEIkiSAcQh\
6JhSAcQhmJhSAcIB0gHoWDIB0gHoOFfCARQj+JIBFCOImFIBFCB4iFIBB8IAx8ICRCLYkgJEIDiYUg\
JEIGiIV8IhAgFnwgGSAffCIWIBggF4WDIBeFfCAWQjKJIBZCLomFIBZCF4mFfEKo5d7js9eCtfYAfC\
IZfCIfQiSJIB9CHomFIB9CGYmFIB8gHCAdhYMgHCAdg4V8IBJCP4kgEkI4iYUgEkIHiIUgEXwgG3wg\
JUItiSAlQgOJhSAlQgaIhXwiESAXfCAZICF8IhcgFiAYhYMgGIV8IBdCMokgF0IuiYUgF0IXiYV8Qu\
bdtr/kpbLhgX98Ihl8IiFCJIkgIUIeiYUgIUIZiYUgISAfIByFgyAfIByDhXwgE0I/iSATQjiJhSAT\
QgeIhSASfCAgfCAQQi2JIBBCA4mFIBBCBoiFfCISIBh8IBkgHnwiGCAXIBaFgyAWhXwgGEIyiSAYQi\
6JhSAYQheJhXxCu+qIpNGQi7mSf3wiGXwiHkIkiSAeQh6JhSAeQhmJhSAeICEgH4WDICEgH4OFfCAU\
Qj+JIBRCOImFIBRCB4iFIBN8ICJ8IBFCLYkgEUIDiYUgEUIGiIV8IhMgFnwgGSAdfCIWIBggF4WDIB\
eFfCAWQjKJIBZCLomFIBZCF4mFfELkhsTnlJT636J/fCIZfCIdQiSJIB1CHomFIB1CGYmFIB0gHiAh\
hYMgHiAhg4V8IBVCP4kgFUI4iYUgFUIHiIUgFHwgI3wgEkItiSASQgOJhSASQgaIhXwiFCAXfCAZIB\
x8IhcgFiAYhYMgGIV8IBdCMokgF0IuiYUgF0IXiYV8QoHgiOK7yZmNqH98Ihl8IhxCJIkgHEIeiYUg\
HEIZiYUgHCAdIB6FgyAdIB6DhXwgD0I/iSAPQjiJhSAPQgeIhSAVfCAkfCATQi2JIBNCA4mFIBNCBo\
iFfCIVIBh8IBkgH3wiGCAXIBaFgyAWhXwgGEIyiSAYQi6JhSAYQheJhXxCka/ih43u4qVCfCIZfCIf\
QiSJIB9CHomFIB9CGYmFIB8gHCAdhYMgHCAdg4V8IA5CP4kgDkI4iYUgDkIHiIUgD3wgJXwgFEItiS\
AUQgOJhSAUQgaIhXwiDyAWfCAZICF8IhYgGCAXhYMgF4V8IBZCMokgFkIuiYUgFkIXiYV8QrD80rKw\
tJS2R3wiGXwiIUIkiSAhQh6JhSAhQhmJhSAhIB8gHIWDIB8gHIOFfCANQj+JIA1COImFIA1CB4iFIA\
58IBB8IBVCLYkgFUIDiYUgFUIGiIV8Ig4gF3wgGSAefCIXIBYgGIWDIBiFfCAXQjKJIBdCLomFIBdC\
F4mFfEKYpL23nYO6yVF8Ihl8Ih5CJIkgHkIeiYUgHkIZiYUgHiAhIB+FgyAhIB+DhXwgDEI/iSAMQj\
iJhSAMQgeIhSANfCARfCAPQi2JIA9CA4mFIA9CBoiFfCINIBh8IBkgHXwiGCAXIBaFgyAWhXwgGEIy\
iSAYQi6JhSAYQheJhXxCkNKWq8XEwcxWfCIZfCIdQiSJIB1CHomFIB1CGYmFIB0gHiAhhYMgHiAhg4\
V8IBtCP4kgG0I4iYUgG0IHiIUgDHwgEnwgDkItiSAOQgOJhSAOQgaIhXwiDCAWfCAZIBx8IhYgGCAX\
hYMgF4V8IBZCMokgFkIuiYUgFkIXiYV8QqrAxLvVsI2HdHwiGXwiHEIkiSAcQh6JhSAcQhmJhSAcIB\
0gHoWDIB0gHoOFfCAgQj+JICBCOImFICBCB4iFIBt8IBN8IA1CLYkgDUIDiYUgDUIGiIV8IhsgF3wg\
GSAffCIXIBYgGIWDIBiFfCAXQjKJIBdCLomFIBdCF4mFfEK4o++Vg46otRB8Ihl8Ih9CJIkgH0IeiY\
UgH0IZiYUgHyAcIB2FgyAcIB2DhXwgIkI/iSAiQjiJhSAiQgeIhSAgfCAUfCAMQi2JIAxCA4mFIAxC\
BoiFfCIgIBh8IBkgIXwiGCAXIBaFgyAWhXwgGEIyiSAYQi6JhSAYQheJhXxCyKHLxuuisNIZfCIZfC\
IhQiSJICFCHomFICFCGYmFICEgHyAchYMgHyAcg4V8ICNCP4kgI0I4iYUgI0IHiIUgInwgFXwgG0It\
iSAbQgOJhSAbQgaIhXwiIiAWfCAZIB58IhYgGCAXhYMgF4V8IBZCMokgFkIuiYUgFkIXiYV8QtPWho\
qFgdubHnwiGXwiHkIkiSAeQh6JhSAeQhmJhSAeICEgH4WDICEgH4OFfCAkQj+JICRCOImFICRCB4iF\
ICN8IA98ICBCLYkgIEIDiYUgIEIGiIV8IiMgF3wgGSAdfCIXIBYgGIWDIBiFfCAXQjKJIBdCLomFIB\
dCF4mFfEKZ17v8zemdpCd8Ihl8Ih1CJIkgHUIeiYUgHUIZiYUgHSAeICGFgyAeICGDhXwgJUI/iSAl\
QjiJhSAlQgeIhSAkfCAOfCAiQi2JICJCA4mFICJCBoiFfCIkIBh8IBkgHHwiGCAXIBaFgyAWhXwgGE\
IyiSAYQi6JhSAYQheJhXxCqJHtjN6Wr9g0fCIZfCIcQiSJIBxCHomFIBxCGYmFIBwgHSAehYMgHSAe\
g4V8IBBCP4kgEEI4iYUgEEIHiIUgJXwgDXwgI0ItiSAjQgOJhSAjQgaIhXwiJSAWfCAZIB98IhYgGC\
AXhYMgF4V8IBZCMokgFkIuiYUgFkIXiYV8QuO0pa68loOOOXwiGXwiH0IkiSAfQh6JhSAfQhmJhSAf\
IBwgHYWDIBwgHYOFfCARQj+JIBFCOImFIBFCB4iFIBB8IAx8ICRCLYkgJEIDiYUgJEIGiIV8IhAgF3\
wgGSAhfCIXIBYgGIWDIBiFfCAXQjKJIBdCLomFIBdCF4mFfELLlYaarsmq7M4AfCIZfCIhQiSJICFC\
HomFICFCGYmFICEgHyAchYMgHyAcg4V8IBJCP4kgEkI4iYUgEkIHiIUgEXwgG3wgJUItiSAlQgOJhS\
AlQgaIhXwiESAYfCAZIB58IhggFyAWhYMgFoV8IBhCMokgGEIuiYUgGEIXiYV8QvPGj7v3ybLO2wB8\
Ihl8Ih5CJIkgHkIeiYUgHkIZiYUgHiAhIB+FgyAhIB+DhXwgE0I/iSATQjiJhSATQgeIhSASfCAgfC\
AQQi2JIBBCA4mFIBBCBoiFfCISIBZ8IBkgHXwiFiAYIBeFgyAXhXwgFkIyiSAWQi6JhSAWQheJhXxC\
o/HKtb3+m5foAHwiGXwiHUIkiSAdQh6JhSAdQhmJhSAdIB4gIYWDIB4gIYOFfCAUQj+JIBRCOImFIB\
RCB4iFIBN8ICJ8IBFCLYkgEUIDiYUgEUIGiIV8IhMgF3wgGSAcfCIXIBYgGIWDIBiFfCAXQjKJIBdC\
LomFIBdCF4mFfEL85b7v5d3gx/QAfCIZfCIcQiSJIBxCHomFIBxCGYmFIBwgHSAehYMgHSAeg4V8IB\
VCP4kgFUI4iYUgFUIHiIUgFHwgI3wgEkItiSASQgOJhSASQgaIhXwiFCAYfCAZIB98IhggFyAWhYMg\
FoV8IBhCMokgGEIuiYUgGEIXiYV8QuDe3Jj07djS+AB8Ihl8Ih9CJIkgH0IeiYUgH0IZiYUgHyAcIB\
2FgyAcIB2DhXwgD0I/iSAPQjiJhSAPQgeIhSAVfCAkfCATQi2JIBNCA4mFIBNCBoiFfCIVIBZ8IBkg\
IXwiFiAYIBeFgyAXhXwgFkIyiSAWQi6JhSAWQheJhXxC8tbCj8qCnuSEf3wiGXwiIUIkiSAhQh6JhS\
AhQhmJhSAhIB8gHIWDIB8gHIOFfCAOQj+JIA5COImFIA5CB4iFIA98ICV8IBRCLYkgFEIDiYUgFEIG\
iIV8Ig8gF3wgGSAefCIXIBYgGIWDIBiFfCAXQjKJIBdCLomFIBdCF4mFfELs85DTgcHA44x/fCIZfC\
IeQiSJIB5CHomFIB5CGYmFIB4gISAfhYMgISAfg4V8IA1CP4kgDUI4iYUgDUIHiIUgDnwgEHwgFUIt\
iSAVQgOJhSAVQgaIhXwiDiAYfCAZIB18IhggFyAWhYMgFoV8IBhCMokgGEIuiYUgGEIXiYV8Qqi8jJ\
ui/7/fkH98Ihl8Ih1CJIkgHUIeiYUgHUIZiYUgHSAeICGFgyAeICGDhXwgDEI/iSAMQjiJhSAMQgeI\
hSANfCARfCAPQi2JIA9CA4mFIA9CBoiFfCINIBZ8IBkgHHwiFiAYIBeFgyAXhXwgFkIyiSAWQi6JhS\
AWQheJhXxC6fuK9L2dm6ikf3wiGXwiHEIkiSAcQh6JhSAcQhmJhSAcIB0gHoWDIB0gHoOFfCAbQj+J\
IBtCOImFIBtCB4iFIAx8IBJ8IA5CLYkgDkIDiYUgDkIGiIV8IgwgF3wgGSAffCIXIBYgGIWDIBiFfC\
AXQjKJIBdCLomFIBdCF4mFfEKV8pmW+/7o/L5/fCIZfCIfQiSJIB9CHomFIB9CGYmFIB8gHCAdhYMg\
HCAdg4V8ICBCP4kgIEI4iYUgIEIHiIUgG3wgE3wgDUItiSANQgOJhSANQgaIhXwiGyAYfCAZICF8Ih\
ggFyAWhYMgFoV8IBhCMokgGEIuiYUgGEIXiYV8QqumyZuunt64RnwiGXwiIUIkiSAhQh6JhSAhQhmJ\
hSAhIB8gHIWDIB8gHIOFfCAiQj+JICJCOImFICJCB4iFICB8IBR8IAxCLYkgDEIDiYUgDEIGiIV8Ii\
AgFnwgGSAefCIWIBggF4WDIBeFfCAWQjKJIBZCLomFIBZCF4mFfEKcw5nR7tnPk0p8Ihp8Ih5CJIkg\
HkIeiYUgHkIZiYUgHiAhIB+FgyAhIB+DhXwgI0I/iSAjQjiJhSAjQgeIhSAifCAVfCAbQi2JIBtCA4\
mFIBtCBoiFfCIZIBd8IBogHXwiIiAWIBiFgyAYhXwgIkIyiSAiQi6JhSAiQheJhXxCh4SDjvKYrsNR\
fCIafCIdQiSJIB1CHomFIB1CGYmFIB0gHiAhhYMgHiAhg4V8ICRCP4kgJEI4iYUgJEIHiIUgI3wgD3\
wgIEItiSAgQgOJhSAgQgaIhXwiFyAYfCAaIBx8IiMgIiAWhYMgFoV8ICNCMokgI0IuiYUgI0IXiYV8\
Qp7Wg+/sup/tanwiGnwiHEIkiSAcQh6JhSAcQhmJhSAcIB0gHoWDIB0gHoOFfCAlQj+JICVCOImFIC\
VCB4iFICR8IA58IBlCLYkgGUIDiYUgGUIGiIV8IhggFnwgGiAffCIkICMgIoWDICKFfCAkQjKJICRC\
LomFICRCF4mFfEL4orvz/u/TvnV8IhZ8Ih9CJIkgH0IeiYUgH0IZiYUgHyAcIB2FgyAcIB2DhXwgEE\
I/iSAQQjiJhSAQQgeIhSAlfCANfCAXQi2JIBdCA4mFIBdCBoiFfCIlICJ8IBYgIXwiIiAkICOFgyAj\
hXwgIkIyiSAiQi6JhSAiQheJhXxCut/dkKf1mfgGfCIWfCIhQiSJICFCHomFICFCGYmFICEgHyAchY\
MgHyAcg4V8IBFCP4kgEUI4iYUgEUIHiIUgEHwgDHwgGEItiSAYQgOJhSAYQgaIhXwiECAjfCAWIB58\
IiMgIiAkhYMgJIV8ICNCMokgI0IuiYUgI0IXiYV8QqaxopbauN+xCnwiFnwiHkIkiSAeQh6JhSAeQh\
mJhSAeICEgH4WDICEgH4OFfCASQj+JIBJCOImFIBJCB4iFIBF8IBt8ICVCLYkgJUIDiYUgJUIGiIV8\
IhEgJHwgFiAdfCIkICMgIoWDICKFfCAkQjKJICRCLomFICRCF4mFfEKum+T3y4DmnxF8IhZ8Ih1CJI\
kgHUIeiYUgHUIZiYUgHSAeICGFgyAeICGDhXwgE0I/iSATQjiJhSATQgeIhSASfCAgfCAQQi2JIBBC\
A4mFIBBCBoiFfCISICJ8IBYgHHwiIiAkICOFgyAjhXwgIkIyiSAiQi6JhSAiQheJhXxCm47xmNHmwr\
gbfCIWfCIcQiSJIBxCHomFIBxCGYmFIBwgHSAehYMgHSAeg4V8IBRCP4kgFEI4iYUgFEIHiIUgE3wg\
GXwgEUItiSARQgOJhSARQgaIhXwiEyAjfCAWIB98IiMgIiAkhYMgJIV8ICNCMokgI0IuiYUgI0IXiY\
V8QoT7kZjS/t3tKHwiFnwiH0IkiSAfQh6JhSAfQhmJhSAfIBwgHYWDIBwgHYOFfCAVQj+JIBVCOImF\
IBVCB4iFIBR8IBd8IBJCLYkgEkIDiYUgEkIGiIV8IhQgJHwgFiAhfCIkICMgIoWDICKFfCAkQjKJIC\
RCLomFICRCF4mFfEKTyZyGtO+q5TJ8IhZ8IiFCJIkgIUIeiYUgIUIZiYUgISAfIByFgyAfIByDhXwg\
D0I/iSAPQjiJhSAPQgeIhSAVfCAYfCATQi2JIBNCA4mFIBNCBoiFfCIVICJ8IBYgHnwiIiAkICOFgy\
AjhXwgIkIyiSAiQi6JhSAiQheJhXxCvP2mrqHBr888fCIWfCIeQiSJIB5CHomFIB5CGYmFIB4gISAf\
hYMgISAfg4V8IA5CP4kgDkI4iYUgDkIHiIUgD3wgJXwgFEItiSAUQgOJhSAUQgaIhXwiJSAjfCAWIB\
18IiMgIiAkhYMgJIV8ICNCMokgI0IuiYUgI0IXiYV8QsyawODJ+NmOwwB8IhR8Ih1CJIkgHUIeiYUg\
HUIZiYUgHSAeICGFgyAeICGDhXwgDUI/iSANQjiJhSANQgeIhSAOfCAQfCAVQi2JIBVCA4mFIBVCBo\
iFfCIQICR8IBQgHHwiJCAjICKFgyAihXwgJEIyiSAkQi6JhSAkQheJhXxCtoX52eyX9eLMAHwiFHwi\
HEIkiSAcQh6JhSAcQhmJhSAcIB0gHoWDIB0gHoOFfCAMQj+JIAxCOImFIAxCB4iFIA18IBF8ICVCLY\
kgJUIDiYUgJUIGiIV8IiUgInwgFCAffCIfICQgI4WDICOFfCAfQjKJIB9CLomFIB9CF4mFfEKq/JXj\
z7PKv9kAfCIRfCIiQiSJICJCHomFICJCGYmFICIgHCAdhYMgHCAdg4V8IAwgG0I/iSAbQjiJhSAbQg\
eIhXwgEnwgEEItiSAQQgOJhSAQQgaIhXwgI3wgESAhfCIMIB8gJIWDICSFfCAMQjKJIAxCLomFIAxC\
F4mFfELs9dvWs/Xb5d8AfCIjfCIhICIgHIWDICIgHIOFIAt8ICFCJIkgIUIeiYUgIUIZiYV8IBsgIE\
I/iSAgQjiJhSAgQgeIhXwgE3wgJUItiSAlQgOJhSAlQgaIhXwgJHwgIyAefCIbIAwgH4WDIB+FfCAb\
QjKJIBtCLomFIBtCF4mFfEKXsJ3SxLGGouwAfCIefCELICEgCnwhCiAdIAd8IB58IQcgIiAJfCEJIB\
sgBnwhBiAcIAh8IQggDCAFfCEFIB8gBHwhBCABQYABaiIBIAJHDQALCyAAIAQ3AzggACAFNwMwIAAg\
BjcDKCAAIAc3AyAgACAINwMYIAAgCTcDECAAIAo3AwggACALNwMAIANBgAFqJAAL+FsCDH8FfiMAQY\
AGayIEJAACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAIAIOAgABAgsgASgC\
ACICQQJ0QbTTwABqKAIAIQMMEQtBICEFIAEoAgAiAg4YAQ8CDxADDwQFBgYHBwgPCQoLDwwNEBAOAQ\
sgASgCACECDA8LQcAAIQUMDQtBMCEFDAwLQRwhBQwLC0EwIQUMCgtBwAAhBQwJC0EQIQUMCAtBFCEF\
DAcLQRwhBQwGC0EwIQUMBQtBwAAhBQwEC0EcIQUMAwtBMCEFDAILQcAAIQUMAQtBGCEFCyAFIANGDQ\
BBASEBQTkhA0GtgcAAIQIMAQsCQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJA\
AkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQA\
JAAkAgAg4YAAECAwQFBgcICQoLDA0ODxAREhMUFRYaAAsgASgCBCECIARB0ARqQQxqQgA3AgAgBEHQ\
BGpBFGpCADcCACAEQdAEakEcakIANwIAIARB0ARqQSRqQgA3AgAgBEHQBGpBLGpCADcCACAEQdAEak\
E0akIANwIAIARB0ARqQTxqQgA3AgAgBEIANwLUBCAEQcAANgLQBCAEQShqIARB0ARqQcQAEDkaIARB\
oANqQThqIgYgBEEoakE8aikCADcDACAEQaADakEwaiIHIARBKGpBNGopAgA3AwAgBEGgA2pBKGoiCC\
AEQShqQSxqKQIANwMAIARBoANqQSBqIgkgBEEoakEkaikCADcDACAEQaADakEYaiIKIARBKGpBHGop\
AgA3AwAgBEGgA2pBEGoiCyAEQShqQRRqKQIANwMAIARBoANqQQhqIgwgBEEoakEMaikCADcDACAEIA\
QpAiw3A6ADIAIgAikDQCACQcgBaiIDLQAAIgGtfDcDQCACQcgAaiEFAkAgAUGAAUYNACAFIAFqQQBB\
gAEgAWsQOhoLQQAhASADQQA6AAAgAiAFQn8QESAEQShqQQhqIgUgAkEIaikDACIQNwMAIARBKGpBEG\
ogAkEQaikDACIRNwMAIARBKGpBGGogAkEYaikDACISNwMAIARBKGpBIGogAikDICITNwMAIARBKGpB\
KGogAkEoaikDACIUNwMAIAwgEDcDACALIBE3AwAgCiASNwMAIAkgEzcDACAIIBQ3AwAgByACQTBqKQ\
MANwMAIAYgAkE4aikDADcDACAEIAIpAwAiEDcDKCAEIBA3A6ADIAVBwAAQTyACIAVByAAQORogA0EA\
OgAAQcAAEBYiAkUNGiACIAQpA6ADNwAAIAJBOGogBEGgA2pBOGopAwA3AAAgAkEwaiAEQaADakEwai\
kDADcAACACQShqIARBoANqQShqKQMANwAAIAJBIGogBEGgA2pBIGopAwA3AAAgAkEYaiAEQaADakEY\
aikDADcAACACQRBqIARBoANqQRBqKQMANwAAIAJBCGogBEGgA2pBCGopAwA3AABBwAAhAwwyCyABKA\
IEIQIgBEHQBGpBHGpCADcCACAEQdAEakEUakIANwIAIARB0ARqQQxqQgA3AgAgBEIANwLUBCAEQSA2\
AtAEIARBKGpBGGoiByAEQdAEakEYaikDADcDACAEQShqQRBqIgggBEHQBGpBEGopAwA3AwAgBEEoak\
EIaiIDIARB0ARqQQhqKQMANwMAIARBKGpBIGoiCSAEQdAEakEgaigCADYCACAEIAQpA9AENwMoIARB\
oANqQRBqIgogBEEoakEUaikCADcDACAEQaADakEIaiILIARBKGpBDGopAgA3AwAgBEGgA2pBGGoiDC\
AEQShqQRxqKQIANwMAIAQgBCkCLDcDoAMgAiACKQNAIAJByAFqIgUtAAAiAa18NwNAIAJByABqIQYC\
QCABQYABRg0AIAYgAWpBAEGAASABaxA6GgtBACEBIAVBADoAACACIAZCfxARIAMgAkEIaikDACIQNw\
MAIAggAkEQaikDACIRNwMAIAcgAkEYaikDACISNwMAIAkgAikDIDcDACAEQShqQShqIAJBKGopAwA3\
AwAgCyAQNwMAIAogETcDACAMIBI3AwAgBCACKQMAIhA3AyggBCAQNwOgAyADQSAQTyACIANByAAQOR\
ogBUEAOgAAQSAQFiICRQ0aIAIgBCkDoAM3AAAgAkEYaiAEQaADakEYaikDADcAACACQRBqIARBoANq\
QRBqKQMANwAAIAJBCGogBEGgA2pBCGopAwA3AABBICEDDDELIAEoAgQhAiAEQdAEakEsakIANwIAIA\
RB0ARqQSRqQgA3AgAgBEHQBGpBHGpCADcCACAEQdAEakEUakIANwIAIARB0ARqQQxqQgA3AgAgBEIA\
NwLUBCAEQTA2AtAEIARBKGpBKGoiByAEQdAEakEoaikDADcDACAEQShqQSBqIgggBEHQBGpBIGopAw\
A3AwAgBEEoakEYaiIJIARB0ARqQRhqKQMANwMAIARBKGpBEGoiCiAEQdAEakEQaikDADcDACAEQShq\
QQhqIgMgBEHQBGpBCGopAwA3AwAgBEEoakEwaiAEQdAEakEwaigCADYCACAEIAQpA9AENwMoIARBoA\
NqQSBqIgsgBEEoakEkaikCADcDACAEQaADakEYaiIMIARBKGpBHGopAgA3AwAgBEGgA2pBEGoiDSAE\
QShqQRRqKQIANwMAIARBoANqQQhqIg4gBEEoakEMaikCADcDACAEQaADakEoaiIPIARBKGpBLGopAg\
A3AwAgBCAEKQIsNwOgAyACIAIpA0AgAkHIAWoiBS0AACIBrXw3A0AgAkHIAGohBgJAIAFBgAFGDQAg\
BiABakEAQYABIAFrEDoaC0EAIQEgBUEAOgAAIAIgBkJ/EBEgAyACQQhqKQMAIhA3AwAgCiACQRBqKQ\
MAIhE3AwAgCSACQRhqKQMAIhI3AwAgCCACKQMgIhM3AwAgByACQShqKQMAIhQ3AwAgDiAQNwMAIA0g\
ETcDACAMIBI3AwAgCyATNwMAIA8gFDcDACAEIAIpAwAiEDcDKCAEIBA3A6ADIANBMBBPIAIgA0HIAB\
A5GiAFQQA6AABBMBAWIgJFDRogAiAEKQOgAzcAACACQShqIARBoANqQShqKQMANwAAIAJBIGogBEGg\
A2pBIGopAwA3AAAgAkEYaiAEQaADakEYaikDADcAACACQRBqIARBoANqQRBqKQMANwAAIAJBCGogBE\
GgA2pBCGopAwA3AABBMCEDDDALIAEoAgQhAiAEQdAEakEcakIANwIAIARB0ARqQRRqQgA3AgAgBEHQ\
BGpBDGpCADcCACAEQgA3AtQEIARBIDYC0AQgBEEoakEYaiIHIARB0ARqQRhqKQMANwMAIARBKGpBEG\
oiCCAEQdAEakEQaikDADcDACAEQShqQQhqIgMgBEHQBGpBCGopAwA3AwAgBEEoakEgaiIJIARB0ARq\
QSBqKAIANgIAIAQgBCkD0AQ3AyggBEGgA2pBEGoiCiAEQShqQRRqKQIANwMAIARBoANqQQhqIgsgBE\
EoakEMaikCADcDACAEQaADakEYaiIMIARBKGpBHGopAgA3AwAgBCAEKQIsNwOgAyACIAIpAwAgAkHo\
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\
ECQgBEEoakE4aiIGIAVBOGopAAA3AwAgBEEoakEwaiIHIAVBMGopAAA3AwAgBEEoakEoaiIIIAVBKG\
opAAA3AwAgBEEoakEgaiIJIAVBIGopAAA3AwAgBEEoakEYaiIKIAVBGGopAAA3AwAgBEEoakEQaiIL\
IAVBEGopAAA3AwAgBEEoakEIaiIMIAVBCGopAAA3AwAgBCAFKQAANwMoQQAhASAFQQBByAEQOkGQAm\
pBADoAAEHAACEDQcAAEBYiAkUNGiACIAQpAyg3AAAgAkE4aiAGKQMANwAAIAJBMGogBykDADcAACAC\
QShqIAgpAwA3AAAgAkEgaiAJKQMANwAAIAJBGGogCikDADcAACACQRBqIAspAwA3AAAgAkEIaiAMKQ\
MANwAADCoLIAEoAgQhAiAEQdAEakEMakIANwIAIARCADcC1ARBECEDIARBEDYC0AQgBEEoakEQaiAE\
QdAEakEQaigCADYCACAEQShqQQhqIARB0ARqQQhqKQMANwMAIARBoANqQQhqIgUgBEEoakEMaikCAD\
cDACAEIAQpA9AENwMoIAQgBCkCLDcDoAMgAiACQRhqIARBoANqEC9BACEBIAJB2ABqQQA6AAAgAkEQ\
akL+uevF6Y6VmRA3AwAgAkKBxpS6lvHq5m83AwggAkIANwMAQRAQFiICRQ0aIAIgBCkDoAM3AAAgAk\
EIaiAFKQMANwAADCkLIAEoAgQhAiAEQdAEakEMakIANwIAIARCADcC1ARBECEDIARBEDYC0AQgBEEo\
akEQaiAEQdAEakEQaigCADYCACAEQShqQQhqIARB0ARqQQhqKQMANwMAIARBoANqQQhqIgUgBEEoak\
EMaikCADcDACAEIAQpA9AENwMoIAQgBCkCLDcDoAMgAiACQRhqIARBoANqEC5BACEBIAJB2ABqQQA6\
AAAgAkEQakL+uevF6Y6VmRA3AwAgAkKBxpS6lvHq5m83AwggAkIANwMAQRAQFiICRQ0aIAIgBCkDoA\
M3AAAgAkEIaiAFKQMANwAADCgLIAEoAgQhAkEUIQNBACEBIARB0ARqQRRqQQA2AgAgBEHQBGpBDGpC\
ADcCACAEQgA3AtQEIARBFDYC0AQgBEEoakEQaiAEQdAEakEQaikDADcDACAEQShqQQhqIARB0ARqQQ\
hqKQMANwMAIARBoANqQQhqIgUgBEEoakEMaikCADcDACAEQaADakEQaiIGIARBKGpBFGooAgA2AgAg\
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\
BEEoakEUaikCADcDACAEQaADakEIaiIJIARBKGpBDGopAgA3AwAgBCAEKQIsNwOgAyACIAJBKGogBE\
GgA2oQJyAFIAEpAwA3AwAgBiAIKQMANwMAIAcgCSkDADcDACAEIAQpA6ADNwMoIAJCADcDAEEAIQEg\
AkHoAGpBADoAACACQQApA/CNQDcDCCACQRBqQQApA/iNQDcDACACQRhqQQApA4COQDcDACACQSBqQQ\
ApA4iOQDcDAEEgEBYiAkUNGiACIAQpAyg3AAAgAkEYaiAFKQMANwAAIAJBEGogBikDADcAACACQQhq\
IAcpAwA3AAAMIAsgASgCBCECIARB0ARqQQxqQgA3AgAgBEHQBGpBFGpCADcCACAEQdAEakEcakIANw\
IAIARB0ARqQSRqQgA3AgAgBEHQBGpBLGpCADcCACAEQdAEakE0akIANwIAIARB0ARqQTxqQgA3AgAg\
BEIANwLUBCAEQcAANgLQBCAEQShqIARB0ARqQcQAEDkaIARBoANqQThqIARBKGpBPGopAgA3AwBBMC\
EDIARBoANqQTBqIARBKGpBNGopAgA3AwAgBEGgA2pBKGoiASAEQShqQSxqKQIANwMAIARBoANqQSBq\
IgUgBEEoakEkaikCADcDACAEQaADakEYaiIGIARBKGpBHGopAgA3AwAgBEGgA2pBEGoiByAEQShqQR\
RqKQIANwMAIARBoANqQQhqIgggBEEoakEMaikCADcDACAEIAQpAiw3A6ADIAIgAkHQAGogBEGgA2oQ\
IiAEQShqQShqIgkgASkDADcDACAEQShqQSBqIgogBSkDADcDACAEQShqQRhqIgUgBikDADcDACAEQS\
hqQRBqIgYgBykDADcDACAEQShqQQhqIgcgCCkDADcDACAEIAQpA6ADNwMoIAJByABqQgA3AwAgAkIA\
NwNAQQAhASACQThqQQApA6iPQDcDACACQTBqQQApA6CPQDcDACACQShqQQApA5iPQDcDACACQSBqQQ\
ApA5CPQDcDACACQRhqQQApA4iPQDcDACACQRBqQQApA4CPQDcDACACQQhqQQApA/iOQDcDACACQQAp\
A/COQDcDACACQdABakEAOgAAQTAQFiICRQ0aIAIgBCkDKDcAACACQShqIAkpAwA3AAAgAkEgaiAKKQ\
MANwAAIAJBGGogBSkDADcAACACQRBqIAYpAwA3AAAgAkEIaiAHKQMANwAADB8LIAEoAgQhAiAEQdAE\
akEMakIANwIAIARB0ARqQRRqQgA3AgAgBEHQBGpBHGpCADcCACAEQdAEakEkakIANwIAIARB0ARqQS\
xqQgA3AgAgBEHQBGpBNGpCADcCACAEQdAEakE8akIANwIAIARCADcC1ARBwAAhAyAEQcAANgLQBCAE\
QShqIARB0ARqQcQAEDkaIARBoANqQThqIgEgBEEoakE8aikCADcDACAEQaADakEwaiIFIARBKGpBNG\
opAgA3AwAgBEGgA2pBKGoiBiAEQShqQSxqKQIANwMAIARBoANqQSBqIgcgBEEoakEkaikCADcDACAE\
QaADakEYaiIIIARBKGpBHGopAgA3AwAgBEGgA2pBEGoiCSAEQShqQRRqKQIANwMAIARBoANqQQhqIg\
ogBEEoakEMaikCADcDACAEIAQpAiw3A6ADIAIgAkHQAGogBEGgA2oQIiAEQShqQThqIgsgASkDADcD\
ACAEQShqQTBqIgwgBSkDADcDACAEQShqQShqIgUgBikDADcDACAEQShqQSBqIgYgBykDADcDACAEQS\
hqQRhqIgcgCCkDADcDACAEQShqQRBqIgggCSkDADcDACAEQShqQQhqIgkgCikDADcDACAEIAQpA6AD\
NwMoIAJByABqQgA3AwAgAkIANwNAQQAhASACQThqQQApA+iOQDcDACACQTBqQQApA+COQDcDACACQS\
hqQQApA9iOQDcDACACQSBqQQApA9COQDcDACACQRhqQQApA8iOQDcDACACQRBqQQApA8COQDcDACAC\
QQhqQQApA7iOQDcDACACQQApA7COQDcDACACQdABakEAOgAAQcAAEBYiAkUNGiACIAQpAyg3AAAgAk\
E4aiALKQMANwAAIAJBMGogDCkDADcAACACQShqIAUpAwA3AAAgAkEgaiAGKQMANwAAIAJBGGogBykD\
ADcAACACQRBqIAgpAwA3AAAgAkEIaiAJKQMANwAADB4LIANBAEgNASABKAIEIQcCQAJAIAMNAEEBIQ\
IMAQsgAxAWIgJFDRsgAkF8ai0AAEEDcUUNACACQQAgAxA6GgsgByAHQfACaiIILQAAIgFqQcgBaiEG\
AkAgAUGoAUYNACAGQQBBqAEgAWsQOhoLQQAhBSAIQQA6AAAgBkEfOgAAIAdB7wJqIgEgAS0AAEGAAX\
I6AAADQCAHIAVqIgEgAS0AACABQcgBai0AAHM6AAAgAUEBaiIGIAYtAAAgAUHJAWotAABzOgAAIAFB\
AmoiBiAGLQAAIAFBygFqLQAAczoAACABQQNqIgYgBi0AACABQcsBai0AAHM6AAAgBUEEaiIFQagBRw\
0ACyAHECQgBEEoaiAHQcgBEDkaQQAhASAHQQBByAEQOkHwAmpBADoAACAEQQA2AqADIARBoANqQQRy\
QQBBqAEQOhogBEGoATYCoAMgBEHQBGogBEGgA2pBrAEQORogBEEoakHIAWogBEHQBGpBBHJBqAEQOR\
ogBEEoakHwAmpBADoAACAEQShqIAIgAxAxDB0LIANBAEgNACABKAIEIQcgAw0BQQEhAgwCCxBpAAsg\
AxAWIgJFDRggAkF8ai0AAEEDcUUNACACQQAgAxA6GgsgByAHQdACaiIILQAAIgFqQcgBaiEGAkAgAU\
GIAUYNACAGQQBBiAEgAWsQOhoLQQAhBSAIQQA6AAAgBkEfOgAAIAdBzwJqIgEgAS0AAEGAAXI6AAAD\
QCAHIAVqIgEgAS0AACABQcgBai0AAHM6AAAgAUEBaiIGIAYtAAAgAUHJAWotAABzOgAAIAFBAmoiBi\
AGLQAAIAFBygFqLQAAczoAACABQQNqIgYgBi0AACABQcsBai0AAHM6AAAgBUEEaiIFQYgBRw0ACyAH\
ECQgBEEoaiAHQcgBEDkaQQAhASAHQQBByAEQOkHQAmpBADoAACAEQQA2AqADIARBoANqQQRyQQBBiA\
EQOhogBEGIATYCoAMgBEHQBGogBEGgA2pBjAEQORogBEEoakHIAWogBEHQBGpBBHJBiAEQORogBEEo\
akHQAmpBADoAACAEQShqIAIgAxAyDBkLIAEoAgQhAiAEQdAEakEUakIANwIAIARB0ARqQQxqQgA3Ag\
AgBEIANwLUBEEYIQMgBEEYNgLQBCAEQShqQRBqIARB0ARqQRBqKQMANwMAIARBKGpBCGogBEHQBGpB\
CGopAwA3AwAgBEEoakEYaiAEQdAEakEYaigCADYCACAEQaADakEIaiIFIARBKGpBDGopAgA3AwAgBE\
GgA2pBEGoiBiAEQShqQRRqKQIANwMAIAQgBCkD0AQ3AyggBCAEKQIsNwOgAyACIAJBIGogBEGgA2oQ\
MCACQgA3AwBBACEBIAJB4ABqQQA6AAAgAkEAKQP4kUA3AwggAkEQakEAKQOAkkA3AwAgAkEYakEAKQ\
OIkkA3AwBBGBAWIgJFDRcgAiAEKQOgAzcAACACQRBqIAYpAwA3AAAgAkEIaiAFKQMANwAADBgLQcAA\
QQFBACgC+NRAIgRBBCAEGxEFAAALQSBBAUEAKAL41EAiBEEEIAQbEQUAAAtBMEEBQQAoAvjUQCIEQQ\
QgBBsRBQAAC0EgQQFBACgC+NRAIgRBBCAEGxEFAAALIANBAUEAKAL41EAiBEEEIAQbEQUAAAtBHEEB\
QQAoAvjUQCIEQQQgBBsRBQAAC0EgQQFBACgC+NRAIgRBBCAEGxEFAAALQTBBAUEAKAL41EAiBEEEIA\
QbEQUAAAtBwABBAUEAKAL41EAiBEEEIAQbEQUAAAtBEEEBQQAoAvjUQCIEQQQgBBsRBQAAC0EQQQFB\
ACgC+NRAIgRBBCAEGxEFAAALQRRBAUEAKAL41EAiBEEEIAQbEQUAAAtBFEEBQQAoAvjUQCIEQQQgBB\
sRBQAAC0EcQQFBACgC+NRAIgRBBCAEGxEFAAALQSBBAUEAKAL41EAiBEEEIAQbEQUAAAtBMEEBQQAo\
AvjUQCIEQQQgBBsRBQAAC0HAAEEBQQAoAvjUQCIEQQQgBBsRBQAAC0EcQQFBACgC+NRAIgRBBCAEGx\
EFAAALQSBBAUEAKAL41EAiBEEEIAQbEQUAAAtBMEEBQQAoAvjUQCIEQQQgBBsRBQAAC0HAAEEBQQAo\
AvjUQCIEQQQgBBsRBQAACyADQQFBACgC+NRAIgRBBCAEGxEFAAALIANBAUEAKAL41EAiBEEEIAQbEQ\
UAAAtBGEEBQQAoAvjUQCIEQQQgBBsRBQAACyAAIAI2AgQgACABNgIAIABBCGogAzYCACAEQYAGaiQA\
C5xWAhp/An4jAEGwAmsiAyQAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQA\
JAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAC\
QAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAgACgCAA4YAAECAw\
QFBgcICQoLDA0ODxAREhMUFRYXAAsgACgCBCIAQcgAaiEEAkBBgAEgAEHIAWotAAAiBWsiBiACTw0A\
AkAgBUUNACAEIAVqIAEgBhA5GiAAIAApA0BCgAF8NwNAIAAgBEIAEBEgASAGaiEBIAIgBmshAgsgAi\
ACQQd2IgYgAkEARyACQf8AcUVxIgdrIgVBB3QiCGshAiAFRQ1FIAhFDUUgBkEAIAdrakEHdCEGIAEh\
BQNAIAAgACkDQEKAAXw3A0AgACAFQgAQESAFQYABaiEFIAZBgH9qIgYNAAxGCwsgBCAFaiABIAIQOR\
ogBSACaiECDEULIAAoAgQiAEHIAGohBAJAQYABIABByAFqLQAAIgVrIgYgAk8NAAJAIAVFDQAgBCAF\
aiABIAYQORogACAAKQNAQoABfDcDQCAAIARCABARIAEgBmohASACIAZrIQILIAIgAkEHdiIGIAJBAE\
cgAkH/AHFFcSIHayIFQQd0IghrIQIgBUUNQSAIRQ1BIAZBACAHa2pBB3QhBiABIQUDQCAAIAApA0BC\
gAF8NwNAIAAgBUIAEBEgBUGAAWohBSAGQYB/aiIGDQAMQgsLIAQgBWogASACEDkaIAUgAmohAgxBCy\
AAKAIEIgBByABqIQQCQEGAASAAQcgBai0AACIFayIGIAJPDQACQCAFRQ0AIAQgBWogASAGEDkaIAAg\
ACkDQEKAAXw3A0AgACAEQgAQESABIAZqIQEgAiAGayECCyACIAJBB3YiBiACQQBHIAJB/wBxRXEiB2\
siBUEHdCIIayECIAVFDT0gCEUNPSAGQQAgB2tqQQd0IQYgASEFA0AgACAAKQNAQoABfDcDQCAAIAVC\
ABARIAVBgAFqIQUgBkGAf2oiBg0ADD4LCyAEIAVqIAEgAhA5GiAFIAJqIQIMPQsgACgCBCIAQShqIQ\
QCQEHAACAAQegAai0AACIFayIGIAJPDQACQCAFRQ0AIAQgBWogASAGEDkaIAAgACkDAELAAHw3AwAg\
ACAEQQAQEyABIAZqIQEgAiAGayECCyACIAJBBnYiBiACQQBHIAJBP3FFcSIHayIFQQZ0IghrIQIgBU\
UNOSAIRQ05IAZBACAHa2pBBnQhBiABIQUDQCAAIAApAwBCwAB8NwMAIAAgBUEAEBMgBUHAAGohBSAG\
QUBqIgYNAAw6CwsgBCAFaiABIAIQORogBSACaiECDDkLIAAoAgQiCEHpAGotAABBBnQgCC0AaGoiAE\
UNNiAIIAEgAkGACCAAayIAIAAgAksbIgUQMxogAiAFayICRQ1CIANB+ABqQRBqIAhBEGoiACkDADcD\
ACADQfgAakEYaiAIQRhqIgYpAwA3AwAgA0H4AGpBIGogCEEgaiIEKQMANwMAIANB+ABqQTBqIAhBMG\
opAwA3AwAgA0H4AGpBOGogCEE4aikDADcDACADQfgAakHAAGogCEHAAGopAwA3AwAgA0H4AGpByABq\
IAhByABqKQMANwMAIANB+ABqQdAAaiAIQdAAaikDADcDACADQfgAakHYAGogCEHYAGopAwA3AwAgA0\
H4AGpB4ABqIAhB4ABqKQMANwMAIAMgCCkDCDcDgAEgAyAIKQMoNwOgASAIQekAai0AACEHIAgtAGoh\
CSADIAgtAGgiCjoA4AEgAyAIKQMAIh03A3ggAyAJIAdFckECciIHOgDhASADQegBakEYaiIJIAQpAg\
A3AwAgA0HoAWpBEGoiBCAGKQIANwMAIANB6AFqQQhqIgYgACkCADcDACADIAgpAgg3A+gBIANB6AFq\
IANB+ABqQShqIAogHSAHEBkgCSgCACEHIAQoAgAhBCAGKAIAIQkgAygChAIhCiADKAL8ASELIAMoAv\
QBIQwgAygC7AEhDSADKALoASEOIAggCCkDABApIAgoApABIgZBN08NEyAIQZABaiAGQQV0aiIAQSBq\
IAo2AgAgAEEcaiAHNgIAIABBGGogCzYCACAAQRRqIAQ2AgAgAEEQaiAMNgIAIABBDGogCTYCACAAQQ\
hqIA02AgAgAEEEaiAONgIAIAggBkEBajYCkAEgCEEoaiIAQgA3AwAgAEEIakIANwMAIABBEGpCADcD\
ACAAQRhqQgA3AwAgAEEgakIANwMAIABBKGpCADcDACAAQTBqQgA3AwAgAEE4akIANwMAIAhBADsBaC\
AIQQhqIgAgCCkDcDcDACAAQQhqIAhB+ABqKQMANwMAIABBEGogCEGAAWopAwA3AwAgAEEYaiAIQYgB\
aikDADcDACAIIAgpAwBCAXw3AwAgASAFaiEBDDYLIAAoAgQiBEHIAWohCgJAQZABIARB2AJqLQAAIg\
BrIgggAksNAAJAIABFDQAgCiAAaiABIAgQORogAiAIayECQQAhBQNAIAQgBWoiACAALQAAIABByAFq\
LQAAczoAACAAQQFqIgYgBi0AACAAQckBai0AAHM6AAAgAEECaiIGIAYtAAAgAEHKAWotAABzOgAAIA\
BBA2oiBiAGLQAAIABBywFqLQAAczoAACAFQQRqIgVBkAFHDQALIAQQJCABIAhqIQELIAEgAkGQAW5B\
kAFsIgBqIQcgAiAAayEJIAJBjwFNDTMgAEUNMwNAIAFBkAFqIQhBACEFA0AgBCAFaiIAIAAtAAAgAS\
AFaiIGLQAAczoAACAAQQFqIgIgAi0AACAGQQFqLQAAczoAACAAQQJqIgIgAi0AACAGQQJqLQAAczoA\
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\
MGogGykDADcDACAKQThqIBwpAwA3AwAgAy0A4gEhDiADLQDhASEXIAMgAy0A4AEiGDoAcCADIAMpA3\
giHjcDCCADIA4gF0VyQQJyIg46AHEgA0HoAWpBGGoiFyAHKQIANwMAIANB6AFqQRBqIgcgBikCADcD\
ACADQegBakEIaiIGIAUpAgA3AwAgAyALKQIANwPoASADQegBaiAKIBggHiAOEBkgFygCACEOIAcoAg\
AhByAGKAIAIRcgAygChAIhGCADKAL8ASEZIAMoAvQBIRogAygC7AEhGyADKALoASEcIAggCCkDABAp\
IAgoApABIgZBN08NCSANIAZBBXRqIgUgGDYCHCAFIA42AhggBSAZNgIUIAUgBzYCECAFIBo2AgwgBS\
AXNgIIIAUgGzYCBCAFIBw2AgAgCCAGQQFqNgKQAQsgCCAIKQMAIB18Ih43AwAgAiAASQ0JIAEgAGoh\
ASACIABrIgJBgAhLDQALCyACRQ0TIAggASACEDMaIAggCCkDABApDBMLIAAgAkGghcAAEEkACyAFQc\
AAQeCEwAAQSQALIAZBwABB8ITAABBJAAsgBkEgQYCFwAAQSQALIANBkAJqQQhqIgEgGjYCACADQZAC\
akEQaiIAIBg2AgAgA0GQAmpBGGoiBSAONgIAIAMgGTYCnAIgA0GBAWoiBiABKQMANwAAIAMgFzYCpA\
IgA0GJAWoiASAAKQMANwAAIAMgBzYCrAIgA0GRAWoiACAFKQMANwAAIAMgGzYClAIgAyAcNgKQAiAD\
IAMpA5ACNwB5IANBCGpBGGogACkAADcDACADQQhqQRBqIAEpAAA3AwAgA0EIakEIaiAGKQAANwMAIA\
MgAykAeTcDCEGQksAAIANBCGpBgIbAAEH4hsAAEEAACyADQZACakEIaiIBIBQ2AgAgA0GQAmpBEGoi\
ACASNgIAIANBkAJqQRhqIgUgEDYCACADIBM2ApwCIANBgQFqIgYgASkDADcAACADIBE2AqQCIANBiQ\
FqIgEgACkDADcAACADIA82AqwCIANBkQFqIgAgBSkDADcAACADIBU2ApQCIAMgFjYCkAIgAyADKQOQ\
AjcAeSADQQhqQRhqIAApAAA3AwAgA0EIakEQaiABKQAANwMAIANBCGpBCGogBikAADcDACADIAMpAH\
k3AwhBkJLAACADQQhqQYCGwABB+IbAABBAAAsgA0GYAmoiASAXNgIAIANBoAJqIgAgBzYCACADQagC\
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\
NgIcIAMgAUEgaigAACICQRh0IAJBCHRBgID8B3FyIAJBCHZBgP4DcSACQRh2cnIiCzYCICADIAFBGG\
ooAAAiAkEYdCACQQh0QYCA/AdxciACQQh2QYD+A3EgAkEYdnJyIgw2AhggAygCACENIAMoAgQhDiAD\
KAIIIQ8gAygCECEQIAMoAgwhESADKAIUIRIgAyABQSRqKAAAIgJBGHQgAkEIdEGAgPwHcXIgAkEIdk\
GA/gNxIAJBGHZyciITNgIkIAMgAUEoaigAACICQRh0IAJBCHRBgID8B3FyIAJBCHZBgP4DcSACQRh2\
cnIiFDYCKCADIAFBMGooAAAiAkEYdCACQQh0QYCA/AdxciACQQh2QYD+A3EgAkEYdnJyIhU2AjAgAy\
ABQSxqKAAAIgJBGHQgAkEIdEGAgPwHcXIgAkEIdkGA/gNxIAJBGHZyciIWNgIsIAMgAUE0aigAACIC\
QRh0IAJBCHRBgID8B3FyIAJBCHZBgP4DcSACQRh2cnIiAjYCNCADIAFBOGooAAAiF0EYdCAXQQh0QY\
CA/AdxciAXQQh2QYD+A3EgF0EYdnJyIhc2AjggAyABQTxqKAAAIhhBGHQgGEEIdEGAgPwHcXIgGEEI\
dkGA/gNxIBhBGHZyciIYNgI8IAggEyAKcyAYcyAMIBBzIBVzIBEgDnMgE3MgF3NBAXciGXNBAXciGn\
NBAXciGyAKIBJzIAJzIBAgD3MgFHMgGHNBAXciHHNBAXciHXMgGCACcyAdcyAVIBRzIBxzIBtzQQF3\
Ih5zQQF3Ih9zIBogHHMgHnMgGSAYcyAbcyAXIBVzIBpzIBYgE3MgGXMgCyAMcyAXcyASIBFzIBZzIA\
8gDXMgC3MgAnNBAXciIHNBAXciIXNBAXciInNBAXciI3NBAXciJHNBAXciJXNBAXciJnNBAXciJyAd\
ICFzIAIgFnMgIXMgFCALcyAgcyAdc0EBdyIoc0EBdyIpcyAcICBzIChzIB9zQQF3IipzQQF3IitzIB\
8gKXMgK3MgHiAocyAqcyAnc0EBdyIsc0EBdyItcyAmICpzICxzICUgH3MgJ3MgJCAecyAmcyAjIBtz\
ICVzICIgGnMgJHMgISAZcyAjcyAgIBdzICJzIClzQQF3Ii5zQQF3Ii9zQQF3IjBzQQF3IjFzQQF3Ij\
JzQQF3IjNzQQF3IjRzQQF3IjUgKyAvcyApICNzIC9zICggInMgLnMgK3NBAXciNnNBAXciN3MgKiAu\
cyA2cyAtc0EBdyI4c0EBdyI5cyAtIDdzIDlzICwgNnMgOHMgNXNBAXciOnNBAXciO3MgNCA4cyA6cy\
AzIC1zIDVzIDIgLHMgNHMgMSAncyAzcyAwICZzIDJzIC8gJXMgMXMgLiAkcyAwcyA3c0EBdyI8c0EB\
dyI9c0EBdyI+c0EBdyI/c0EBdyJAc0EBdyJBc0EBdyJCc0EBdyJDIDkgPXMgNyAxcyA9cyA2IDBzID\
xzIDlzQQF3IkRzQQF3IkVzIDggPHMgRHMgO3NBAXciRnNBAXciR3MgOyBFcyBHcyA6IERzIEZzIENz\
QQF3IkhzQQF3IklzIEIgRnMgSHMgQSA7cyBDcyBAIDpzIEJzID8gNXMgQXMgPiA0cyBAcyA9IDNzID\
9zIDwgMnMgPnMgRXNBAXciSnNBAXciS3NBAXciTHNBAXciTXNBAXciTnNBAXciT3NBAXciUHNBAXdq\
IEYgSnMgRCA+cyBKcyBHc0EBdyJRcyBJc0EBdyJSIEUgP3MgS3MgUXNBAXciUyBMIEEgOiA5IDwgMS\
AmIB8gKCAhIBcgEyAQIAhBHnciVGogDiAFIAdBHnciECAGcyAIcSAGc2pqIA0gBCAIQQV3aiAGIAVz\
IAdxIAVzampBmfOJ1AVqIg5BBXdqQZnzidQFaiJVQR53IgggDkEedyINcyAGIA9qIA4gVCAQc3EgEH\
NqIFVBBXdqQZnzidQFaiIOcSANc2ogECARaiBVIA0gVHNxIFRzaiAOQQV3akGZ84nUBWoiEEEFd2pB\
mfOJ1AVqIhFBHnciD2ogDCAIaiARIBBBHnciEyAOQR53IgxzcSAMc2ogEiANaiAMIAhzIBBxIAhzai\
ARQQV3akGZ84nUBWoiEUEFd2pBmfOJ1AVqIhJBHnciCCARQR53IhBzIAogDGogESAPIBNzcSATc2og\
EkEFd2pBmfOJ1AVqIgpxIBBzaiALIBNqIBAgD3MgEnEgD3NqIApBBXdqQZnzidQFaiIMQQV3akGZ84\
nUBWoiD0EedyILaiAVIApBHnciF2ogCyAMQR53IhNzIBQgEGogDCAXIAhzcSAIc2ogD0EFd2pBmfOJ\
1AVqIhRxIBNzaiAWIAhqIA8gEyAXc3EgF3NqIBRBBXdqQZnzidQFaiIVQQV3akGZ84nUBWoiFiAVQR\
53IhcgFEEedyIIc3EgCHNqIAIgE2ogCCALcyAVcSALc2ogFkEFd2pBmfOJ1AVqIhRBBXdqQZnzidQF\
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\
ckEAQYABEDoaIAJBgAE2AgAgAkGwAWogAkGEARA5GiAEQdAAaiACQbABakEEckGAARA5GiAEQcgAak\
IANwMAIARCADcDQCAEQQA6ANABIARBACkDsI5ANwMAIARBCGpBACkDuI5ANwMAIARBEGpBACkDwI5A\
NwMAIARBGGpBACkDyI5ANwMAIARBIGpBACkD0I5ANwMAIARBKGpBACkD2I5ANwMAIARBMGpBACkD4I\
5ANwMAIARBOGpBACkD6I5ANwMAQRQhBQwjC0HwABAWIgRFDQwgAkGwAWpBCGoQVSAEQSBqIAJB2AFq\
KQMANwMAIARBGGogAkGwAWpBIGopAwA3AwAgBEEQaiACQbABakEYaikDADcDACAEQQhqIAJBsAFqQR\
BqKQMANwMAIAQgAikDuAE3AwAgAkEMakIANwIAIAJBFGpCADcCACACQRxqQgA3AgAgAkEkakIANwIA\
IAJBLGpCADcCACACQTRqQgA3AgAgAkE8akIANwIAIAJCADcCBCACQcAANgIAIAJBsAFqIAJBxAAQOR\
ogBEHgAGogAkGwAWpBPGopAgA3AAAgBEHYAGogAkGwAWpBNGopAgA3AAAgBEHQAGogAkGwAWpBLGop\
AgA3AAAgBEHIAGogAkGwAWpBJGopAgA3AAAgBEHAAGogAkGwAWpBHGopAgA3AAAgBEE4aiACQbABak\
EUaikCADcAACAEQTBqIAJBsAFqQQxqKQIANwAAIAQgAikCtAE3ACggBEEAOgBoQQMhBQwiCwJAAkAC\
QAJAIANBuoDAAEEKEFFFDQAgA0HEgMAAQQoQUUUNASADQc6AwABBChBRRQ0CIANB2IDAAEEKEFFFDQ\
MgA0HogMAAQQoQUQ0MQegAEBYiBEUNFiACQQxqQgA3AgAgAkEUakIANwIAIAJBHGpCADcCACACQSRq\
QgA3AgAgAkEsakIANwIAIAJBNGpCADcCACACQTxqQgA3AgAgAkIANwIEIAJBwAA2AgAgAkGwAWogAk\
HEABA5GiAEQdgAaiACQbABakE8aikCADcAACAEQdAAaiACQbABakE0aikCADcAACAEQcgAaiACQbAB\
akEsaikCADcAACAEQcAAaiACQbABakEkaikCADcAACAEQThqIAJBsAFqQRxqKQIANwAAIARBMGogAk\
GwAWpBFGopAgA3AAAgBEEoaiACQbABakEMaikCADcAACAEIAIpArQBNwAgIARCADcDACAEQQA6AGAg\
BEEAKQPYjUA3AwggBEEQakEAKQPgjUA3AwAgBEEYakEAKALojUA2AgBBCyEFDCULQeACEBYiBEUNDy\
AEQQBByAEQOiEFIAJBADYCACACQQRyQQBBkAEQOhogAkGQATYCACACQbABaiACQZQBEDkaIAVByAFq\
IAJBsAFqQQRyQZABEDkaIAVBADoA2AJBBSEFDCQLQdgCEBYiBEUNDyAEQQBByAEQOiEFIAJBADYCAC\
ACQQRyQQBBiAEQOhogAkGIATYCACACQbABaiACQYwBEDkaIAVByAFqIAJBsAFqQQRyQYgBEDkaIAVB\
ADoA0AJBBiEFDCMLQbgCEBYiBEUNDyAEQQBByAEQOiEFIAJBADYCACACQQRyQQBB6AAQOhogAkHoAD\
YCACACQbABaiACQewAEDkaIAVByAFqIAJBsAFqQQRyQegAEDkaIAVBADoAsAJBByEFDCILQZgCEBYi\
BEUNDyAEQQBByAEQOiEFIAJBADYCACACQQRyQQBByAAQOhogAkHIADYCACACQbABaiACQcwAEDkaIA\
VByAFqIAJBsAFqQQRyQcgAEDkaIAVBADoAkAJBCCEFDCELAkAgA0HigMAAQQMQUUUNACADQeWAwABB\
AxBRDQhB4AAQFiIERQ0RIAJBDGpCADcCACACQRRqQgA3AgAgAkEcakIANwIAIAJBJGpCADcCACACQS\
xqQgA3AgAgAkE0akIANwIAIAJBPGpCADcCACACQgA3AgQgAkHAADYCACACQbABaiACQcQAEDkaIARB\
0ABqIAJBsAFqQTxqKQIANwAAIARByABqIAJBsAFqQTRqKQIANwAAIARBwABqIAJBsAFqQSxqKQIANw\
AAIARBOGogAkGwAWpBJGopAgA3AAAgBEEwaiACQbABakEcaikCADcAACAEQShqIAJBsAFqQRRqKQIA\
NwAAIARBIGogAkGwAWpBDGopAgA3AAAgBCACKQK0ATcAGCAEQv6568XpjpWZEDcDECAEQoHGlLqW8e\
rmbzcDCCAEQgA3AwAgBEEAOgBYQQohBQwhC0HgABAWIgRFDQ8gAkEMakIANwIAIAJBFGpCADcCACAC\
QRxqQgA3AgAgAkEkakIANwIAIAJBLGpCADcCACACQTRqQgA3AgAgAkE8akIANwIAIAJCADcCBCACQc\
AANgIAIAJBsAFqIAJBxAAQORogBEHQAGogAkGwAWpBPGopAgA3AAAgBEHIAGogAkGwAWpBNGopAgA3\
AAAgBEHAAGogAkGwAWpBLGopAgA3AAAgBEE4aiACQbABakEkaikCADcAACAEQTBqIAJBsAFqQRxqKQ\
IANwAAIARBKGogAkGwAWpBFGopAgA3AAAgBEEgaiACQbABakEMaikCADcAACAEIAIpArQBNwAYIARC\
/rnrxemOlZkQNwMQIARCgcaUupbx6uZvNwMIIARCADcDACAEQQA6AFhBCSEFDCALAkACQAJAAkAgAy\
kAAELTkIWa08WMmTRRDQAgAykAAELTkIWa08XMmjZRDQEgAykAAELTkIWa0+WMnDRRDQIgAykAAELT\
kIWa06XNmDJRDQMgAykAAELTkIXa1KiMmThRDQcgAykAAELTkIXa1MjMmjZSDQpB2AIQFiIERQ0eIA\
RBAEHIARA6IQUgAkEANgIAIAJBBHJBAEGIARA6GiACQYgBNgIAIAJBsAFqIAJBjAEQORogBUHIAWog\
AkGwAWpBBHJBiAEQORogBUEAOgDQAkEWIQUMIwtB4AIQFiIERQ0UIARBAEHIARA6IQUgAkEANgIAIA\
JBBHJBAEGQARA6GiACQZABNgIAIAJBsAFqIAJBlAEQORogBUHIAWogAkGwAWpBBHJBkAEQORogBUEA\
OgDYAkENIQUMIgtB2AIQFiIERQ0UIARBAEHIARA6IQUgAkEANgIAIAJBBHJBAEGIARA6GiACQYgBNg\
IAIAJBsAFqIAJBjAEQORogBUHIAWogAkGwAWpBBHJBiAEQORogBUEAOgDQAkEOIQUMIQtBuAIQFiIE\
RQ0UIARBAEHIARA6IQUgAkEANgIAIAJBBHJBAEHoABA6GiACQegANgIAIAJBsAFqIAJB7AAQORogBU\
HIAWogAkGwAWpBBHJB6AAQORogBUEAOgCwAkEPIQUMIAtBmAIQFiIERQ0UIARBAEHIARA6IQUgAkEA\
NgIAIAJBBHJBAEHIABA6GiACQcgANgIAIAJBsAFqIAJBzAAQORogBUHIAWogAkGwAWpBBHJByAAQOR\
ogBUEAOgCQAkEQIQUMHwtB8AAQFiIERQ0UIAJBDGpCADcCACACQRRqQgA3AgAgAkEcakIANwIAIAJB\
JGpCADcCACACQSxqQgA3AgAgAkE0akIANwIAIAJBPGpCADcCACACQgA3AgQgAkHAADYCACACQbABai\
ACQcQAEDkaIARB4ABqIAJBsAFqQTxqKQIANwAAIARB2ABqIAJBsAFqQTRqKQIANwAAIARB0ABqIAJB\
sAFqQSxqKQIANwAAIARByABqIAJBsAFqQSRqKQIANwAAIARBwABqIAJBsAFqQRxqKQIANwAAIARBOG\
ogAkGwAWpBFGopAgA3AAAgBEEwaiACQbABakEMaikCADcAACAEIAIpArQBNwAoIARCADcDACAEQQA6\
AGggBEEAKQOQjkA3AwggBEEQakEAKQOYjkA3AwAgBEEYakEAKQOgjkA3AwAgBEEgakEAKQOojkA3Aw\
BBESEFDB4LQfAAEBYiBEUNFCACQQxqQgA3AgAgAkEUakIANwIAIAJBHGpCADcCACACQSRqQgA3AgAg\
AkEsakIANwIAIAJBNGpCADcCACACQTxqQgA3AgAgAkIANwIEIAJBwAA2AgAgAkGwAWogAkHEABA5Gi\
AEQeAAaiACQbABakE8aikCADcAACAEQdgAaiACQbABakE0aikCADcAACAEQdAAaiACQbABakEsaikC\
ADcAACAEQcgAaiACQbABakEkaikCADcAACAEQcAAaiACQbABakEcaikCADcAACAEQThqIAJBsAFqQR\
RqKQIANwAAIARBMGogAkGwAWpBDGopAgA3AAAgBCACKQK0ATcAKCAEQgA3AwAgBEEAOgBoIARBACkD\
8I1ANwMIIARBEGpBACkD+I1ANwMAIARBGGpBACkDgI5ANwMAIARBIGpBACkDiI5ANwMAQRIhBQwdC0\
HYARAWIgRFDRQgAkEANgIAIAJBBHJBAEGAARA6GiACQYABNgIAIAJBsAFqIAJBhAEQORogBEHQAGog\
AkGwAWpBBHJBgAEQORogBEHIAGpCADcDACAEQgA3A0AgBEEAOgDQASAEQQApA/COQDcDACAEQQhqQQ\
ApA/iOQDcDACAEQRBqQQApA4CPQDcDACAEQRhqQQApA4iPQDcDACAEQSBqQQApA5CPQDcDACAEQShq\
QQApA5iPQDcDACAEQTBqQQApA6CPQDcDACAEQThqQQApA6iPQDcDAEETIQUMHAtB+AIQFiIERQ0VIA\
RBAEHIARA6IQUgAkEANgIAIAJBBHJBAEGoARA6GiACQagBNgIAIAJBsAFqIAJBrAEQORogBUHIAWog\
AkGwAWpBBHJBqAEQORogBUEAOgDwAkEVIQUMGwsgA0HygMAAQQUQUUUNFyADQZOBwABBBRBRDQFB6A\
AQFiIERQ0WIARCADcDACAEQQApA/iRQDcDCCAEQRBqQQApA4CSQDcDACAEQRhqQQApA4iSQDcDACAC\
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\
QEEAQbTVwAA2ArzVQEEAQcTVwAA2AtDVQEEAQbzVwAA2AsTVQEEAQQA2ArjYQEEAQczVwAA2AtjVQE\
EAQcTVwAA2AszVQEEAQczVwAA2AtTVQEEAQdTVwAA2AuDVQEEAQdTVwAA2AtzVQEEAQdzVwAA2AujV\
QEEAQdzVwAA2AuTVQEEAQeTVwAA2AvDVQEEAQeTVwAA2AuzVQEEAQezVwAA2AvjVQEEAQezVwAA2Av\
TVQEEAQfTVwAA2AoDWQEEAQfTVwAA2AvzVQEEAQfzVwAA2AojWQEEAQfzVwAA2AoTWQEEAQYTWwAA2\
ApDWQEEAQYTWwAA2AozWQEEAQYzWwAA2ApjWQEEAQZTWwAA2AqDWQEEAQYzWwAA2ApTWQEEAQZzWwA\
A2AqjWQEEAQZTWwAA2ApzWQEEAQaTWwAA2ArDWQEEAQZzWwAA2AqTWQEEAQazWwAA2ArjWQEEAQaTW\
wAA2AqzWQEEAQbTWwAA2AsDWQEEAQazWwAA2ArTWQEEAQbzWwAA2AsjWQEEAQbTWwAA2ArzWQEEAQc\
TWwAA2AtDWQEEAQbzWwAA2AsTWQEEAQczWwAA2AtjWQEEAQcTWwAA2AszWQEEAQdTWwAA2AuDWQEEA\
QczWwAA2AtTWQEEAQdzWwAA2AujWQEEAQdTWwAA2AtzWQEEAQeTWwAA2AvDWQEEAQdzWwAA2AuTWQE\
EAQezWwAA2AvjWQEEAQeTWwAA2AuzWQEEAQfTWwAA2AoDXQEEAQezWwAA2AvTWQEEAQfzWwAA2AojX\
QEEAQfTWwAA2AvzWQEEAQYTXwAA2ApDXQEEAQfzWwAA2AoTXQEEAIAY2AqDYQEEAQYTXwAA2AozXQE\
EAIAhBWGoiADYCmNhAIAYgAEEBcjYCBCAIIAZqQVxqQSg2AgBBAEGAgIABNgK82EALQQAhAUEAKAKY\
2EAiACACTQ0AQQAgACACayIBNgKY2EBBAEEAKAKg2EAiACACaiIFNgKg2EAgBSABQQFyNgIEIAAgAk\
EDcjYCBCAAQQhqDwsgAQu5JQIDfx5+IwBBwABrIgNBOGpCADcDACADQTBqQgA3AwAgA0EoakIANwMA\
IANBIGpCADcDACADQRhqQgA3AwAgA0EQakIANwMAIANBCGpCADcDACADQgA3AwACQCACRQ0AIAEgAk\
EGdGohBCAAKQMQIQYgACkDCCEHIAApAwAhCANAIAMgAUEYaikAACIJIAEpAAAiCiABQThqKQAAIgtC\
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\
NwMAIAFBCGpBIGogA0EgaikDADcDACABQQhqQRhqIANBGGopAwA3AwAgAUEIakEQaiADQRBqKQMANw\
MAIAFBCGpBCGogA0EIaikDADcDACABIAMpAwA3AwggAykDQCEPIAFBCGpByABqIANByABqEEMgASAP\
NwNIIAIgAUEIakHQARA5GkEAIQMMHwsgAigCBCEDQdABEBYiAkUNBiABQQhqQThqIANBOGopAwA3Aw\
AgAUEIakEwaiADQTBqKQMANwMAIAFBCGpBKGogA0EoaikDADcDACABQQhqQSBqIANBIGopAwA3AwAg\
AUEIakEYaiADQRhqKQMANwMAIAFBCGpBEGogA0EQaikDADcDACABQQhqQQhqIANBCGopAwA3AwAgAS\
ADKQMANwMIIAMpA0AhDyABQQhqQcgAaiADQcgAahBDIAEgDzcDSCACIAFBCGpB0AEQORpBASEDDB4L\
IAIoAgQhA0HQARAWIgJFDQYgAUEIakE4aiADQThqKQMANwMAIAFBCGpBMGogA0EwaikDADcDACABQQ\
hqQShqIANBKGopAwA3AwAgAUEIakEgaiADQSBqKQMANwMAIAFBCGpBGGogA0EYaikDADcDACABQQhq\
QRBqIANBEGopAwA3AwAgAUEIakEIaiADQQhqKQMANwMAIAEgAykDADcDCCADKQNAIQ8gAUEIakHIAG\
ogA0HIAGoQQyABIA83A0ggAiABQQhqQdABEDkaQQIhAwwdCyACKAIEIQNB8AAQFiICRQ0GIAFBCGpB\
IGogA0EgaikDADcDACABQQhqQRhqIANBGGopAwA3AwAgAUEIakEQaiADQRBqKQMANwMAIAEgAykDCD\
cDECADKQMAIQ8gAUEIakEoaiADQShqEDcgASAPNwMIIAIgAUEIakHwABA5GkEDIQMMHAsgAigCBCED\
QfgOEBYiAkUNBiABQQhqQYgBaiADQYgBaikDADcDACABQQhqQYABaiADQYABaikDADcDACABQQhqQf\
gAaiADQfgAaikDADcDACABQQhqQRBqIANBEGopAwA3AwAgAUEIakEYaiADQRhqKQMANwMAIAFBCGpB\
IGogA0EgaikDADcDACABQQhqQTBqIANBMGopAwA3AwAgAUEIakE4aiADQThqKQMANwMAIAFBCGpBwA\
BqIANBwABqKQMANwMAIAFBCGpByABqIANByABqKQMANwMAIAFBCGpB0ABqIANB0ABqKQMANwMAIAFB\
CGpB2ABqIANB2ABqKQMANwMAIAFBCGpB4ABqIANB4ABqKQMANwMAIAEgAykDcDcDeCABIAMpAwg3Ax\
AgASADKQMoNwMwIAMpAwAhDyADLQBqIQQgAy0AaSEFIAMtAGghBgJAIAMoApABQQV0IgcNAEEAIQcM\
GwsgAUGAD2pBGGoiCCADQZQBaiIJQRhqKQAANwMAIAFBgA9qQRBqIgogCUEQaikAADcDACABQYAPak\
EIaiILIAlBCGopAAA3AwAgASAJKQAANwOADyADQdQBaiEJQQAgB0FgakEFdmshDCABQbwBaiEDQQIh\
BwNAIANBYGoiDSABKQOADzcAACANQRhqIAgpAwA3AAAgDUEQaiAKKQMANwAAIA1BCGogCykDADcAAA\
JAAkAgDCAHaiIOQQJGDQAgCCAJQWBqIg1BGGopAAA3AwAgCiANQRBqKQAANwMAIAsgDUEIaikAADcD\
ACABIA0pAAA3A4APIAdBOEcNARBqAAsgB0F/aiEHDBwLIAMgASkDgA83AAAgA0EYaiAIKQMANwAAIA\
NBEGogCikDADcAACADQQhqIAspAwA3AAAgDkEBRg0bIAggCUEYaikAADcDACAKIAlBEGopAAA3AwAg\
CyAJQQhqKQAANwMAIAEgCSkAADcDgA8gA0HAAGohAyAHQQJqIQcgCUHAAGohCQwACwsQbgALEG8AC0\
HQAUEIQQAoAvjUQCIBQQQgARsRBQAAC0HQAUEIQQAoAvjUQCIBQQQgARsRBQAAC0HQAUEIQQAoAvjU\
QCIBQQQgARsRBQAAC0HwAEEIQQAoAvjUQCIBQQQgARsRBQAAC0H4DkEIQQAoAvjUQCIBQQQgARsRBQ\
AACyACKAIEIQMCQEHoABAWIgJFDQAgAUEIakEQaiADQRBqKQMANwMAIAFBCGpBGGogA0EYaikDADcD\
ACABIAMpAwg3AxAgAykDACEPIAFBCGpBIGogA0EgahA3IAEgDzcDCCACIAFBCGpB6AAQORpBFyEDDB\
QLQegAQQhBACgC+NRAIgFBBCABGxEFAAALIAIoAgQhAwJAQdgCEBYiAkUNACABQQhqIANByAEQORog\
AUEIakHIAWogA0HIAWoQRCACIAFBCGpB2AIQORpBFiEDDBMLQdgCQQhBACgC+NRAIgFBBCABGxEFAA\
ALIAIoAgQhAwJAQfgCEBYiAkUNACABQQhqIANByAEQORogAUEIakHIAWogA0HIAWoQRSACIAFBCGpB\
+AIQORpBFSEDDBILQfgCQQhBACgC+NRAIgFBBCABGxEFAAALIAIoAgQhAwJAQdgBEBYiAkUNACABQQ\
hqQThqIANBOGopAwA3AwAgAUEIakEwaiADQTBqKQMANwMAIAFBCGpBKGogA0EoaikDADcDACABQQhq\
QSBqIANBIGopAwA3AwAgAUEIakEYaiADQRhqKQMANwMAIAFBCGpBEGogA0EQaikDADcDACABQQhqQQ\
hqIANBCGopAwA3AwAgASADKQMANwMIIANByABqKQMAIQ8gAykDQCEQIAFBCGpB0ABqIANB0ABqEEMg\
AUEIakHIAGogDzcDACABIBA3A0ggAiABQQhqQdgBEDkaQRQhAwwRC0HYAUEIQQAoAvjUQCIBQQQgAR\
sRBQAACyACKAIEIQMCQEHYARAWIgJFDQAgAUEIakE4aiADQThqKQMANwMAIAFBCGpBMGogA0EwaikD\
ADcDACABQQhqQShqIANBKGopAwA3AwAgAUEIakEgaiADQSBqKQMANwMAIAFBCGpBGGogA0EYaikDAD\
cDACABQQhqQRBqIANBEGopAwA3AwAgAUEIakEIaiADQQhqKQMANwMAIAEgAykDADcDCCADQcgAaikD\
ACEPIAMpA0AhECABQQhqQdAAaiADQdAAahBDIAFBCGpByABqIA83AwAgASAQNwNIIAIgAUEIakHYAR\
A5GkETIQMMEAtB2AFBCEEAKAL41EAiAUEEIAEbEQUAAAsgAigCBCEDAkBB8AAQFiICRQ0AIAFBCGpB\
IGogA0EgaikDADcDACABQQhqQRhqIANBGGopAwA3AwAgAUEIakEQaiADQRBqKQMANwMAIAEgAykDCD\
cDECADKQMAIQ8gAUEIakEoaiADQShqEDcgASAPNwMIIAIgAUEIakHwABA5GkESIQMMDwtB8ABBCEEA\
KAL41EAiAUEEIAEbEQUAAAsgAigCBCEDAkBB8AAQFiICRQ0AIAFBCGpBIGogA0EgaikDADcDACABQQ\
hqQRhqIANBGGopAwA3AwAgAUEIakEQaiADQRBqKQMANwMAIAEgAykDCDcDECADKQMAIQ8gAUEIakEo\
aiADQShqEDcgASAPNwMIIAIgAUEIakHwABA5GkERIQMMDgtB8ABBCEEAKAL41EAiAUEEIAEbEQUAAA\
sgAigCBCEDAkBBmAIQFiICRQ0AIAFBCGogA0HIARA5GiABQQhqQcgBaiADQcgBahBGIAIgAUEIakGY\
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\
AgAiA0UNAiACQQF0IQIgAyEFIAMoAgRBeHEgAEcNAAsLIAMoAggiACABNgIMIAMgATYCCCABQRhqQQ\
A2AgAgASADNgIMIAEgADYCCAwCCyAGIAE2AgAgAUEYaiAFNgIACyABIAE2AgwgASABNgIIC0EAQQAo\
AsTYQEF/aiIBNgLE2EAgAQ0DQQAoArTYQCIADQFB/x8hAQwCCyAAQQN2IgNBA3RBjNXAAGohAAJAAk\
BBACgChNVAIgJBASADdCIDcUUNACAAKAIIIQMMAQtBACACIANyNgKE1UAgACEDCyAAIAE2AgggAyAB\
NgIMIAEgADYCDCABIAM2AggPC0EAIQEDQCABQQFqIQEgACgCCCIADQALIAFB/x8gAUH/H0sbIQELQQ\
AgATYCxNhADwsLlQwBGH8jACECIAAoAgAhAyAAKAIIIQQgACgCDCEFIAAoAgQhBiACQcAAayICQRhq\
IgdCADcDACACQSBqIghCADcDACACQThqIglCADcDACACQTBqIgpCADcDACACQShqIgtCADcDACACQQ\
hqIgwgASkACDcDACACQRBqIg0gASkAEDcDACAHIAEoABgiDjYCACAIIAEoACAiDzYCACACIAEpAAA3\
AwAgAiABKAAcIhA2AhwgAiABKAAkIhE2AiQgCyABKAAoIhI2AgAgAiABKAAsIgs2AiwgCiABKAAwIh\
M2AgAgAiABKAA0Igo2AjQgCSABKAA4IhQ2AgAgAiABKAA8IhU2AjwgACADIBMgCyASIBEgDyAQIA4g\
BiAEIAUgBiADIAYgBHFqIAUgBkF/c3FqIAIoAgAiFmpBA3ciAXFqIAQgAUF/c3FqIAIoAgQiF2pBB3\
ciByABcWogBiAHQX9zcWogDCgCACIMakELdyIIIAdxaiABIAhBf3NxaiACKAIMIhhqQRN3IgkgCHEg\
AWogByAJQX9zcWogDSgCACINakEDdyIBIAlxIAdqIAggAUF/c3FqIAIoAhQiGWpBB3ciAiABcSAIai\
AJIAJBf3NxampBC3ciByACcSAJaiABIAdBf3NxampBE3ciCCAHcSABaiACIAhBf3NxampBA3ciASAI\
cSACaiAHIAFBf3NxampBB3ciAiABcSAHaiAIIAJBf3NxampBC3ciByACcSAIaiABIAdBf3NxampBE3\
ciCCAHcSABaiACIAhBf3NxampBA3ciASAUIAEgCiABIAhxIAJqIAcgAUF/c3FqakEHdyIJcSAHaiAI\
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\
aiACQRBqKQMANwMAIAMgAikDCDcDACADQegAakEAOgAADBQLIAMoAgQiA0IANwMAIAMgAykDcDcDCC\
ADQSBqIANBiAFqKQMANwMAIANBGGogA0GAAWopAwA3AwAgA0EQaiADQfgAaikDADcDACADQShqQQBB\
wgAQOhogAygCkAFFDRMgA0EANgKQAQwTCyADKAIEQQBByAEQOkHYAmpBADoAAAwSCyADKAIEQQBByA\
EQOkHQAmpBADoAAAwRCyADKAIEQQBByAEQOkGwAmpBADoAAAwQCyADKAIEQQBByAEQOkGQAmpBADoA\
AAwPCyADKAIEIgNCgcaUupbx6uZvNwMIIANCADcDACADQdgAakEAOgAAIANBEGpC/rnrxemOlZkQNw\
MADA4LIAMoAgQiA0KBxpS6lvHq5m83AwggA0IANwMAIANB2ABqQQA6AAAgA0EQakL+uevF6Y6VmRA3\
AwAMDQsgAygCBCIDQgA3AwAgA0HgAGpBADoAACADQQApA9iNQDcDCCADQRBqQQApA+CNQDcDACADQR\
hqQQAoAuiNQDYCAAwMCyADKAIEIgNCgcaUupbx6uZvNwMIIANCADcDACADQeAAakEAOgAAIANBGGpB\
8MPLnnw2AgAgA0EQakL+uevF6Y6VmRA3AwAMCwsgAygCBEEAQcgBEDpB2AJqQQA6AAAMCgsgAygCBE\
EAQcgBEDpB0AJqQQA6AAAMCQsgAygCBEEAQcgBEDpBsAJqQQA6AAAMCAsgAygCBEEAQcgBEDpBkAJq\
QQA6AAAMBwsgAygCBCIDQgA3AwAgA0HoAGpBADoAACADQQApA5COQDcDCCADQRBqQQApA5iOQDcDAC\
ADQRhqQQApA6COQDcDACADQSBqQQApA6iOQDcDAAwGCyADKAIEIgNCADcDACADQegAakEAOgAAIANB\
ACkD8I1ANwMIIANBEGpBACkD+I1ANwMAIANBGGpBACkDgI5ANwMAIANBIGpBACkDiI5ANwMADAULIA\
MoAgQiA0IANwNAIANBACkD8I5ANwMAIANByABqQgA3AwAgA0E4akEAKQOoj0A3AwAgA0EwakEAKQOg\
j0A3AwAgA0EoakEAKQOYj0A3AwAgA0EgakEAKQOQj0A3AwAgA0EYakEAKQOIj0A3AwAgA0EQakEAKQ\
OAj0A3AwAgA0EIakEAKQP4jkA3AwAgA0HQAWpBADoAAAwECyADKAIEIgNCADcDQCADQQApA7COQDcD\
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\
EzcDACACQcgAaiASNwMAQgAhEiACQgA3AwAgCEEEciEJIAJBCGohBAwBCyACQRBqIAFBEGopAwA3Aw\
AgAkEYaiABQRhqKQMANwMAIAJBIGogAUEgaikDADcDACACQTBqIAFBMGopAwA3AwAgAkE4aiABQThq\
KQMANwMAIAJBwABqIAFBwABqKQMANwMAIAJByABqIAFByABqKQMANwMAIAJB0ABqIAFB0ABqKQMANw\
MAIAJB2ABqIAFB2ABqKQMANwMAIAJB4ABqIAFB4ABqKQMANwMAIAIgASkDCDcDCCACIAEpAyg3Aygg\
AS0AaiEIIAIgASkDACISNwMAIAggBEVyQQJyIQkgAkEIaiEEIAMhBgsgAiAJOgBpIAIgBToAaAJAAk\
AgBkUNACABQfAAaiEKIAJBKGohB0EBIAZrIQsgCEEEciEIIAZBBXQgAWpB9ABqIQEgBkF/aiADTyEM\
A0AgDA0CIAJB8ABqQRhqIgYgBEEYaiINKQIANwMAIAJB8ABqQRBqIg4gBEEQaiIPKQIANwMAIAJB8A\
BqQQhqIhAgBEEIaiIRKQIANwMAIAIgBCkCADcDcCACQfAAaiAHIAUgEiAJEBkgECkDACETIA4pAwAh\
FCAGKQMAIRUgAikDcCEWIAdBGGogAUEYaikCADcCACAHQRBqIAFBEGopAgA3AgAgB0EIaiABQQhqKQ\
IANwIAIAcgASkCADcCACAEIAopAwA3AwAgESAKQQhqKQMANwMAIA8gCkEQaikDADcDACANIApBGGop\
AwA3AwBCACESIAJCADcDACACIBU3A2AgAiAUNwNYIAIgEzcDUCACIBY3A0ggAiAIOgBpQcAAIQUgAk\
HAADoAaCABQWBqIQEgCCEJIAtBAWoiC0EBRw0ACwsgACACQfAAEDkaDAILQQAgC2sgA0HQhcAAEE0A\
CyAAIAEpAwg3AwggACABKQMoNwMoIABBEGogAUEQaikDADcDACAAQRhqIAFBGGopAwA3AwAgAEEgai\
ABQSBqKQMANwMAIABBMGogAUEwaikDADcDACAAQThqIAFBOGopAwA3AwAgAEHAAGogAUHAAGopAwA3\
AwAgAEHIAGogAUHIAGopAwA3AwAgAEHQAGogAUHQAGopAwA3AwAgAEHYAGogAUHYAGopAwA3AwAgAE\
HgAGogAUHgAGopAwA3AwAgAUHpAGotAAAhBCABLQBqIQcgACABLQBoOgBoIAAgASkDADcDACAAIAcg\
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\
IAYoAgghBwsCQAJAAkACQCAJRQ0AIAdBBXQiAiAFSw0BIAUgAmsiAUEfTQ0CIAlBIEcNAyAEIAJqIg\
IgACAIaiIBKQAANwAAIAJBGGogAUEYaikAADcAACACQRBqIAFBEGopAAA3AAAgAkEIaiABQQhqKQAA\
NwAAIAdBAWohBwsgBkEwaiQAIAcPCyACIAVBsITAABBKAAtBICABQbCEwAAQSQALQSAgCUHki8AAEE\
wAC4EEAgN/An4jAEHwAWsiAyQAIAApAwAhBiABIAFBwABqLQAAIgRqIgVBgAE6AAAgA0EIakEQaiAA\
QRhqKAIANgIAIANBEGogAEEQaikCADcDACADIAApAgg3AwggBkIJhiEGIAStQgOGIQcCQCAEQT9zIg\
BFDQAgBUEBakEAIAAQOhoLIAYgB4QhBgJAAkAgBEE4cUE4Rg0AIAFBOGogBjcAACADQQhqIAEQEgwB\
CyADQQhqIAEQEiADQeAAakEMakIANwIAIANB4ABqQRRqQgA3AgAgA0HgAGpBHGpCADcCACADQeAAak\
EkakIANwIAIANB4ABqQSxqQgA3AgAgA0HgAGpBNGpCADcCACADQZwBakIANwIAIANCADcCZCADQcAA\
NgJgIANBqAFqIANB4ABqQcQAEDkaIANB0ABqIANBqAFqQTRqKQIANwMAIANByABqIANBqAFqQSxqKQ\
IANwMAIANBwABqIANBqAFqQSRqKQIANwMAIANBOGogA0GoAWpBHGopAgA3AwAgA0EwaiADQagBakEU\
aikCADcDACADQShqIANBqAFqQQxqKQIANwMAIAMgAykCrAE3AyAgAyAGNwNYIANBCGogA0EgahASCy\
ACIAMoAgg2AAAgAiADKQIMNwAEIAIgAykCFDcADCABQcAAakEAOgAAIANB8AFqJAAL8AMCA38CfiMA\
QfABayIDJAAgAUHAAGotAAAhBCAAKQMAIQYgA0EQaiAAQRBqKQIANwMAIAMgACkCCDcDCCABIARqIg\
BBgAE6AAAgBkIJhiEGIAStQgOGIQcgAyADQQhqNgIcAkAgBEE/cyIFRQ0AIABBAWpBACAFEDoaCyAH\
IAaEIQYCQAJAIARBOHFBOEYNACABQThqIAY3AAAgA0EcaiABEBwMAQsgA0EcaiABEBwgA0HgAGpBDG\
pCADcCACADQeAAakEUakIANwIAIANB4ABqQRxqQgA3AgAgA0HgAGpBJGpCADcCACADQeAAakEsakIA\
NwIAIANB4ABqQTRqQgA3AgAgA0GcAWpCADcCACADQgA3AmQgA0HAADYCYCADQagBaiADQeAAakHEAB\
A5GiADQdAAaiADQagBakE0aikCADcDACADQcgAaiADQagBakEsaikCADcDACADQcAAaiADQagBakEk\
aikCADcDACADQThqIANBqAFqQRxqKQIANwMAIANBMGogA0GoAWpBFGopAgA3AwAgA0EoaiADQagBak\
EMaikCADcDACADIAMpAqwBNwMgIAMgBjcDWCADQRxqIANBIGoQHAsgAUHAAGpBADoAACACIAMpAwg3\
AAAgAiADKQMQNwAIIANB8AFqJAAL2QMCA38CfiMAQeABayIDJAAgACkDACEGIAEgAUHAAGotAAAiBG\
oiBUGAAToAACADQQhqIABBEGopAgA3AwAgAyAAKQIINwMAIAZCCYYhBiAErUIDhiEHAkAgBEE/cyIA\
RQ0AIAVBAWpBACAAEDoaCyAHIAaEIQYCQAJAIARBOHFBOEYNACABQThqIAY3AAAgAyABEB8MAQsgAy\
ABEB8gA0HQAGpBDGpCADcCACADQdAAakEUakIANwIAIANB0ABqQRxqQgA3AgAgA0HQAGpBJGpCADcC\
ACADQdAAakEsakIANwIAIANB0ABqQTRqQgA3AgAgA0GMAWpCADcCACADQgA3AlQgA0HAADYCUCADQZ\
gBaiADQdAAakHEABA5GiADQcAAaiADQZgBakE0aikCADcDACADQThqIANBmAFqQSxqKQIANwMAIANB\
MGogA0GYAWpBJGopAgA3AwAgA0EoaiADQZgBakEcaikCADcDACADQSBqIANBmAFqQRRqKQIANwMAIA\
NBGGogA0GYAWpBDGopAgA3AwAgAyADKQKcATcDECADIAY3A0ggAyADQRBqEB8LIAIgAykDADcAACAC\
IAMpAwg3AAggAUHAAGpBADoAACADQeABaiQAC9QDAgR/An4jAEHQAWsiAyQAIAEgAUHAAGotAAAiBG\
oiBUEBOgAAIAApAwBCCYYhByAErUIDhiEIAkAgBEE/cyIGRQ0AIAVBAWpBACAGEDoaCyAHIAiEIQcC\
QAJAIARBOHFBOEYNACABQThqIAc3AAAgAEEIaiABQQEQFwwBCyAAQQhqIgQgAUEBEBcgA0HAAGpBDG\
pCADcCACADQcAAakEUakIANwIAIANBwABqQRxqQgA3AgAgA0HAAGpBJGpCADcCACADQcAAakEsakIA\
NwIAIANBwABqQTRqQgA3AgAgA0H8AGpCADcCACADQgA3AkQgA0HAADYCQCADQYgBaiADQcAAakHEAB\
A5GiADQTBqIANBiAFqQTRqKQIANwMAIANBKGogA0GIAWpBLGopAgA3AwAgA0EgaiADQYgBakEkaikC\
ADcDACADQRhqIANBiAFqQRxqKQIANwMAIANBEGogA0GIAWpBFGopAgA3AwAgA0EIaiADQYgBakEMai\
kCADcDACADIAMpAowBNwMAIAMgBzcDOCAEIANBARAXCyABQcAAakEAOgAAIAIgACkDCDcAACACIABB\
EGopAwA3AAggAiAAQRhqKQMANwAQIANB0AFqJAALlwMBBX8jAEGQBGsiAyQAIABByAFqIQQCQAJAAk\
ACQAJAIABB8AJqLQAAIgVFDQBBqAEgBWsiBiACSw0BIAEgBCAFaiAGEDkgBmohASACIAZrIQILIAIg\
AkGoAW4iBUGoAWwiB0kNASACIAdrIQYCQCAFQagBbCICRQ0AIAEhBQNAIANB4AJqIABBqAEQORogAB\
AkIAUgA0HgAmpBqAEQOUGoAWohBSACQdh+aiICDQALCwJAIAYNAEEAIQYMBAsgA0EANgKwASADQbAB\
akEEckEAQagBEDoaIANBqAE2ArABIANB4AJqIANBsAFqQawBEDkaIANBCGogA0HgAmpBBHJBqAEQOR\
ogA0HgAmogAEGoARA5GiAAECQgA0EIaiADQeACakGoARA5GiAGQakBTw0CIAEgB2ogA0EIaiAGEDka\
IAQgA0EIakGoARA5GgwDCyABIAQgBWogAhA5GiAFIAJqIQYMAgtBoY3AAEEjQcSNwAAQUwALIAZBqA\
FBxIzAABBJAAsgAEHwAmogBjoAACADQZAEaiQAC5cDAQV/IwBBsANrIgMkACAAQcgBaiEEAkACQAJA\
AkACQCAAQdACai0AACIFRQ0AQYgBIAVrIgYgAksNASABIAQgBWogBhA5IAZqIQEgAiAGayECCyACIA\
JBiAFuIgVBiAFsIgdJDQEgAiAHayEGAkAgBUGIAWwiAkUNACABIQUDQCADQaACaiAAQYgBEDkaIAAQ\
JCAFIANBoAJqQYgBEDlBiAFqIQUgAkH4fmoiAg0ACwsCQCAGDQBBACEGDAQLIANBADYCkAEgA0GQAW\
pBBHJBAEGIARA6GiADQYgBNgKQASADQaACaiADQZABakGMARA5GiADQQhqIANBoAJqQQRyQYgBEDka\
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\
BHJBqAEQOSABLQCoAToAqAEgAkHgAmokAAtyAQJ/IwBBoAFrIgIkAEEAIQMgAkEANgIAA0AgAiADak\
EEaiABIANqKAAANgIAIANBBGoiA0HIAEcNAAsgAkHIADYCACACQdAAaiACQcwAEDkaIAAgAkHQAGpB\
BHJByAAQOSABLQBIOgBIIAJBoAFqJAALcgECfyMAQeABayICJABBACEDIAJBADYCAANAIAIgA2pBBG\
ogASADaigAADYCACADQQRqIgNB6ABHDQALIAJB6AA2AgAgAkHwAGogAkHsABA5GiAAIAJB8ABqQQRy\
QegAEDkgAS0AaDoAaCACQeABaiQAC3QBAn8jAEGwAmsiAiQAQQAhAyACQQA2AgADQCACIANqQQRqIA\
EgA2ooAAA2AgAgA0EEaiIDQZABRw0ACyACQZABNgIAIAJBmAFqIAJBlAEQORogACACQZgBakEEckGQ\
ARA5IAEtAJABOgCQASACQbACaiQAC2wBAX8jAEEwayIDJAAgAyABNgIEIAMgADYCACADQRxqQQI2Ag\
AgA0EsakEDNgIAIANCAjcCDCADQciKwAA2AgggA0EDNgIkIAMgA0EgajYCGCADIANBBGo2AiggAyAD\
NgIgIANBCGogAhBWAAtsAQF/IwBBMGsiAyQAIAMgATYCBCADIAA2AgAgA0EcakECNgIAIANBLGpBAz\
YCACADQgI3AgwgA0GoisAANgIIIANBAzYCJCADIANBIGo2AhggAyADQQRqNgIoIAMgAzYCICADQQhq\
IAIQVgALbAEBfyMAQTBrIgMkACADIAE2AgQgAyAANgIAIANBHGpBAjYCACADQSxqQQM2AgAgA0ICNw\
IMIANB/IrAADYCCCADQQM2AiQgAyADQSBqNgIYIAMgA0EEajYCKCADIAM2AiAgA0EIaiACEFYAC2wB\
AX8jAEEwayIDJAAgAyABNgIEIAMgADYCACADQRxqQQI2AgAgA0EsakEDNgIAIANCAzcCDCADQcyLwA\
A2AgggA0EDNgIkIAMgA0EgajYCGCADIAM2AiggAyADQQRqNgIgIANBCGogAhBWAAtsAQF/IwBBMGsi\
AyQAIAMgATYCBCADIAA2AgAgA0EcakECNgIAIANBLGpBAzYCACADQgI3AgwgA0GEiMAANgIIIANBAz\
YCJCADIANBIGo2AhggAyADNgIoIAMgA0EEajYCICADQQhqIAIQVgALdQECf0EBIQBBAEEAKAKA1UAi\
AUEBajYCgNVAAkACQEEAKALI2EBBAUcNAEEAKALM2EBBAWohAAwBC0EAQQE2AsjYQAtBACAANgLM2E\
ACQCABQQBIDQAgAEECSw0AQQAoAvzUQEF/TA0AIABBAUsNABBzAAsAC5oBACMAQTBrGiAAQgA3A0Ag\
AEE4akL5wvibkaOz8NsANwMAIABBMGpC6/qG2r+19sEfNwMAIABBKGpCn9j52cKR2oKbfzcDACAAQt\
GFmu/6z5SH0QA3AyAgAELx7fT4paf9p6V/NwMYIABCq/DT9K/uvLc8NwMQIABCu86qptjQ67O7fzcD\
CCAAIAGtQoiS95X/zPmE6gCFNwMAC1UBAn8CQAJAIABFDQAgACgCAA0BIABBADYCACAAKAIIIQEgAC\
gCBCECIAAQHgJAIAJBBEcNACABKAKQAUUNACABQQA2ApABCyABEB4PCxBuAAsQbwALSgEDf0EAIQMC\
QCACRQ0AAkADQCAALQAAIgQgAS0AACIFRw0BIABBAWohACABQQFqIQEgAkF/aiICRQ0CDAALCyAEIA\
VrIQMLIAMLVAEBfwJAAkACQCABQYCAxABGDQBBASEEIAAoAhggASAAQRxqKAIAKAIQEQYADQELIAIN\
AUEAIQQLIAQPCyAAKAIYIAIgAyAAQRxqKAIAKAIMEQgAC0cBAX8jAEEgayIDJAAgA0EUakEANgIAIA\
NBoJHAADYCECADQgE3AgQgAyABNgIcIAMgADYCGCADIANBGGo2AgAgAyACEFYACzkAAkACQCABRQ0A\
IAEoAgANASABQX82AgAgAUEEaiACEDYgAUEANgIAIABCADcDAA8LEG4ACxBvAAtSACAAQsfMo9jW0O\
uzu383AwggAEIANwMAIABBIGpCq7OP/JGjs/DbADcDACAAQRhqQv+kuYjFkdqCm383AwAgAEEQakLy\
5rvjo6f9p6V/NwMACzQBAX8jAEEQayICJAAgAiABNgIMIAIgADYCCCACQcCHwAA2AgQgAkGgkcAANg\
IAIAIQZwALIwACQCAAQXxLDQACQCAADQBBBA8LIAAQFiIARQ0AIAAPCwALJQACQCAADQBBsI/AAEEw\
EHAACyAAIAIgAyAEIAUgASgCEBEMAAsjAAJAIAANAEGwj8AAQTAQcAALIAAgAiADIAQgASgCEBEKAA\
sjAAJAIAANAEGwj8AAQTAQcAALIAAgAiADIAQgASgCEBEJAAsjAAJAIAANAEGwj8AAQTAQcAALIAAg\
AiADIAQgASgCEBEKAAsjAAJAIAANAEGwj8AAQTAQcAALIAAgAiADIAQgASgCEBEJAAsjAAJAIAANAE\
Gwj8AAQTAQcAALIAAgAiADIAQgASgCEBEJAAsjAAJAIAANAEGwj8AAQTAQcAALIAAgAiADIAQgASgC\
EBEVAAsjAAJAIAANAEGwj8AAQTAQcAALIAAgAiADIAQgASgCEBEWAAshAAJAIAANAEGwj8AAQTAQcA\
ALIAAgAiADIAEoAhARBwALHgAgAEEUaigCABoCQCAAQQRqKAIADgIAAAALEE4ACxwAAkACQCABQXxL\
DQAgACACECYiAQ0BCwALIAELHwACQCAADQBBsI/AAEEwEHAACyAAIAIgASgCEBEGAAsaAAJAIAANAE\
GgkcAAQStB6JHAABBTAAsgAAsUACAAKAIAIAEgACgCBCgCDBEGAAsQACABIAAoAgAgACgCBBAlCw4A\
IAAoAggQZCAAEHEACw4AAkAgAUUNACAAEB4LCxEAQYKCwABBEUGUgsAAEFMACxEAQaSCwABBL0Gkg8\
AAEFMACw0AIAAoAgAaA38MAAsLCwAgACMAaiQAIwALCwAgADUCACABEDQLDABByNLAAEEbEHAACw0A\
QePSwABBzwAQcAALCQAgACABEAsACwkAIAAgARBhAAsMAEKl8JbP5f/ppVYLAwAACwIACwIACwv+1I\
CAAAEAQYCAwAAL9FT0BRAAUAAAAJUAAAAJAAAAQkxBS0UyQkJMQUtFMkItMjU2QkxBS0UyQi0zODRC\
TEFLRTJTQkxBS0UzS0VDQ0FLLTIyNEtFQ0NBSy0yNTZLRUNDQUstMzg0S0VDQ0FLLTUxMk1ENE1ENV\
JJUEVNRC0xNjBTSEEtMVNIQS0yMjRTSEEtMjU2U0hBLTM4NFNIQS01MTJUSUdFUnVuc3VwcG9ydGVk\
IGFsZ29yaXRobW5vbi1kZWZhdWx0IGxlbmd0aCBzcGVjaWZpZWQgZm9yIG5vbi1leHRlbmRhYmxlIG\
FsZ29yaXRobWxpYnJhcnkvYWxsb2Mvc3JjL3Jhd192ZWMucnNjYXBhY2l0eSBvdmVyZmxvdwDmABAA\
HAAAADICAAAFAAAAQXJyYXlWZWM6IGNhcGFjaXR5IGV4Y2VlZGVkIGluIGV4dGVuZC9mcm9tX2l0ZX\
J+Ly5jYXJnby9yZWdpc3RyeS9zcmMvZ2l0aHViLmNvbS0xZWNjNjI5OWRiOWVjODIzL2FycmF5dmVj\
LTAuNy4yL3NyYy9hcnJheXZlYy5ycwBTARAAUAAAAAEEAAAFAAAAVAYQAE0AAAABBgAACQAAAH4vLm\
NhcmdvL3JlZ2lzdHJ5L3NyYy9naXRodWIuY29tLTFlY2M2Mjk5ZGI5ZWM4MjMvYmxha2UzLTEuMy4w\
L3NyYy9saWIucnMAAADEARAASQAAALkBAAAJAAAAxAEQAEkAAABfAgAACgAAAMQBEABJAAAAjQIAAA\
kAAADEARAASQAAAN0CAAAKAAAAxAEQAEkAAADWAgAACQAAAMQBEABJAAAAAQMAABkAAADEARAASQAA\
AAMDAAAJAAAAxAEQAEkAAAADAwAAOAAAAMQBEABJAAAA+AMAADIAAADEARAASQAAAKoEAAAWAAAAxA\
EQAEkAAAC8BAAAFgAAAMQBEABJAAAA7QQAABIAAADEARAASQAAAPcEAAASAAAAxAEQAEkAAABpBQAA\
IQAAABEAAAAEAAAABAAAABIAAAARAAAAIAAAAAEAAAATAAAAEQAAAAQAAAAEAAAAEgAAAH4vLmNhcm\
dvL3JlZ2lzdHJ5L3NyYy9naXRodWIuY29tLTFlY2M2Mjk5ZGI5ZWM4MjMvYXJyYXl2ZWMtMC43LjIv\
c3JjL2FycmF5dmVjX2ltcGwucnMAAAAgAxAAVQAAACcAAAAgAAAAQ2FwYWNpdHlFcnJvcgAAAIgDEA\
ANAAAAaW5zdWZmaWNpZW50IGNhcGFjaXR5AAAAoAMQABUAAAARAAAAAAAAAAEAAAAUAAAAaW5kZXgg\
b3V0IG9mIGJvdW5kczogdGhlIGxlbiBpcyAgYnV0IHRoZSBpbmRleCBpcyAAANADEAAgAAAA8AMQAB\
IAAAA6IAAAoAgQAAAAAAAUBBAAAgAAACkwMDAxMDIwMzA0MDUwNjA3MDgwOTEwMTExMjEzMTQxNTE2\
MTcxODE5MjAyMTIyMjMyNDI1MjYyNzI4MjkzMDMxMzIzMzM0MzUzNjM3MzgzOTQwNDE0MjQzNDQ0NT\
Q2NDc0ODQ5NTA1MTUyNTM1NDU1NTY1NzU4NTk2MDYxNjI2MzY0NjU2NjY3Njg2OTcwNzE3MjczNzQ3\
NTc2Nzc3ODc5ODA4MTgyODM4NDg1ODY4Nzg4ODk5MDkxOTI5Mzk0OTU5Njk3OTg5OXJhbmdlIHN0YX\
J0IGluZGV4ICBvdXQgb2YgcmFuZ2UgZm9yIHNsaWNlIG9mIGxlbmd0aCAAAADxBBAAEgAAAAMFEAAi\
AAAAcmFuZ2UgZW5kIGluZGV4IDgFEAAQAAAAAwUQACIAAABzbGljZSBpbmRleCBzdGFydHMgYXQgIG\
J1dCBlbmRzIGF0IABYBRAAFgAAAG4FEAANAAAAc291cmNlIHNsaWNlIGxlbmd0aCAoKSBkb2VzIG5v\
dCBtYXRjaCBkZXN0aW5hdGlvbiBzbGljZSBsZW5ndGggKIwFEAAVAAAAoQUQACsAAAAoBBAAAQAAAF\
QGEABNAAAAEAwAAA0AAAB+Ly5jYXJnby9yZWdpc3RyeS9zcmMvZ2l0aHViLmNvbS0xZWNjNjI5OWRi\
OWVjODIzL2Jsb2NrLWJ1ZmZlci0wLjEwLjAvc3JjL2xpYi5yc/QFEABQAAAA/AAAACcAAAAvcnVzdG\
MvZjFlZGQwNDI5NTgyZGQyOWNjY2FjYWY1MGZkMTM0YjA1NTkzYmQ5Yy9saWJyYXJ5L2NvcmUvc3Jj\
L3NsaWNlL21vZC5yc2Fzc2VydGlvbiBmYWlsZWQ6IG1pZCA8PSBzZWxmLmxlbigpVAYQAE0AAAAfBg\
AACQAAAAAAAAABI0VniavN7/7cuph2VDIQ8OHSwwAAAABn5glqha5nu3Lzbjw69U+lf1IOUYxoBZur\
2YMfGc3gW9ieBcEH1Xw2F91wMDlZDvcxC8D/ERVYaKeP+WSkT/q+CMm882fmCWo7p8qEha5nuyv4lP\
5y82488TYdXzr1T6XRguatf1IOUR9sPiuMaAWba71B+6vZgx95IX4TGc3gW9ieBcFdnbvLB9V8Niop\
mmIX3XAwWgFZkTlZDvfY7C8VMQvA/2cmM2cRFVhoh0q0jqeP+WQNLgzbpE/6vh1ItUdjbG9zdXJlIG\
ludm9rZWQgcmVjdXJzaXZlbHkgb3IgZGVzdHJveWVkIGFscmVhZHkBAAAAAAAAAIKAAAAAAAAAioAA\
AAAAAIAAgACAAAAAgIuAAAAAAAAAAQAAgAAAAACBgACAAAAAgAmAAAAAAACAigAAAAAAAACIAAAAAA\
AAAAmAAIAAAAAACgAAgAAAAACLgACAAAAAAIsAAAAAAACAiYAAAAAAAIADgAAAAAAAgAKAAAAAAACA\
gAAAAAAAAIAKgAAAAAAAAAoAAIAAAACAgYAAgAAAAICAgAAAAAAAgAEAAIAAAAAACIAAgAAAAIBjYW\
xsZWQgYE9wdGlvbjo6dW53cmFwKClgIG9uIGEgYE5vbmVgIHZhbHVlbGlicmFyeS9zdGQvc3JjL3Bh\
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\
AAAAHAAAACAAAAAwAAAAQAAAABAAAAAQAAAAFAAAABQAAAAcAAAAIAAAADAAAABAAAAAHAAAACAAAA\
AwAAAAQAAAACAAAABAAAAAGAAAAEAAAAAgAAAAMAAAACAAAAAgAAAAHAAAACAAAAAwAAAAQAAAABAA\
AAAQAAAAFAAAABQAAAAcAAAAIAAAADAAAABAAAAAHAAAACAAAAAwAAAAQAAAACAAAABAAAAAGAAAAA\
Cnt4CAAARuYW1lAZy3gIAAdgBFanNfc3lzOjpUeXBlRXJyb3I6Om5ldzo6X193YmdfbmV3X2E0YjYx\
YTBmNTQ4MjRjZmQ6OmgzNzE2N2VmMDcyNjZmMmQ1ATt3YXNtX2JpbmRnZW46Ol9fd2JpbmRnZW5fb2\
JqZWN0X2Ryb3BfcmVmOjpoNzkzYmExMTZkNzVlMjJhMAJVanNfc3lzOjpVaW50OEFycmF5OjpieXRl\
X2xlbmd0aDo6X193YmdfYnl0ZUxlbmd0aF8zZTI1MGI0MWE4OTE1NzU3OjpoMTNkMDIzOGI2ODlhOT\
YwYwNVanNfc3lzOjpVaW50OEFycmF5OjpieXRlX29mZnNldDo6X193YmdfYnl0ZU9mZnNldF80MjA0\
ZWNiMjRhNmU1ZGY5OjpoOGY0YmM4MWQ5MGE4MjMzZQRManNfc3lzOjpVaW50OEFycmF5OjpidWZmZX\
I6Ol9fd2JnX2J1ZmZlcl9mYWNmMDM5OGEyODFjODViOjpoMGZiNjA5YTUxNjQ3NmU5MgV5anNfc3lz\
OjpVaW50OEFycmF5OjpuZXdfd2l0aF9ieXRlX29mZnNldF9hbmRfbGVuZ3RoOjpfX3diZ19uZXd3aX\
RoYnl0ZW9mZnNldGFuZGxlbmd0aF80YjliOGM0ZTNmNWFkYmZmOjpoYzI4MjE3ODU0OTVlMmE2MgZM\
anNfc3lzOjpVaW50OEFycmF5OjpsZW5ndGg6Ol9fd2JnX2xlbmd0aF8xZWI4ZmM2MDhhMGQ0Y2RiOj\
poNzNkYzkyYWJjODFkM2ZhNwcyd2FzbV9iaW5kZ2VuOjpfX3diaW5kZ2VuX21lbW9yeTo6aDRjOWRj\
YzlmYzQzMmZlMmMIVWpzX3N5czo6V2ViQXNzZW1ibHk6Ok1lbW9yeTo6YnVmZmVyOjpfX3diZ19idW\
ZmZXJfMzk3ZWFhNGQ3MmVlOTRkZDo6aDM5ZDIzMjAwNzgzMjBiYzAJRmpzX3N5czo6VWludDhBcnJh\
eTo6bmV3OjpfX3diZ19uZXdfYTdjZTQ0N2YxNWZmNDk2Zjo6aDZjZjg5NDdiODY4ZmRlZWYKRmpzX3\
N5czo6VWludDhBcnJheTo6c2V0OjpfX3diZ19zZXRfOTY5YWQwYTYwZTUxZDMyMDo6aDUxN2Q1OGEy\
M2QyYjc4MTkLMXdhc21fYmluZGdlbjo6X193YmluZGdlbl90aHJvdzo6aDY5MTE5ZDhjZWJhYTQ0M2\
YMQGRlbm9fc3RkX3dhc21fY3J5cHRvOjpkaWdlc3Q6OkNvbnRleHQ6OmRpZ2VzdDo6aDgyOGE3MDEx\
NDE1ZjA1MjANLHNoYTI6OnNoYTUxMjo6Y29tcHJlc3M1MTI6Omg2YjEwYzMzYWQwNWMzNWY2DkpkZW\
5vX3N0ZF93YXNtX2NyeXB0bzo6ZGlnZXN0OjpDb250ZXh0OjpkaWdlc3RfYW5kX3Jlc2V0OjpoZjlk\
NDIwYzUyNDhhOTJmNg9AZGVub19zdGRfd2FzbV9jcnlwdG86OmRpZ2VzdDo6Q29udGV4dDo6dXBkYX\
RlOjpoMWFhNzQ2YmE5ZTJlMTdhNRAsc2hhMjo6c2hhMjU2Ojpjb21wcmVzczI1Njo6aGU4NzgwMjlj\
Y2ZkZDNkZjQRM2JsYWtlMjo6Qmxha2UyYlZhckNvcmU6OmNvbXByZXNzOjpoOWY4N2E3NmE4ZmJlZT\
IyYhIpcmlwZW1kOjpjMTYwOjpjb21wcmVzczo6aDE4OWM0NzlmYmQ2N2FmYWQTM2JsYWtlMjo6Qmxh\
a2Uyc1ZhckNvcmU6OmNvbXByZXNzOjpoOWRkYTljMmEyYjYxNzY4ORQrc2hhMTo6Y29tcHJlc3M6Om\
NvbXByZXNzOjpoNTBlNWQ4M2U5MWQ2NTRhYRU7ZGVub19zdGRfd2FzbV9jcnlwdG86OkRpZ2VzdENv\
bnRleHQ6Om5ldzo6aGY0NjA2NTg2NmYzZDY2NjAWOmRsbWFsbG9jOjpkbG1hbGxvYzo6RGxtYWxsb2\
M8QT46Om1hbGxvYzo6aDJhMjcyMDdlZTlhZjdmZTkXLHRpZ2VyOjpjb21wcmVzczo6Y29tcHJlc3M6\
Omg2ZDI1OGZiZjc1NDhiZmUxGC1ibGFrZTM6Ok91dHB1dFJlYWRlcjo6ZmlsbDo6aGE5YzI3MGM5Yj\
dmZjQxZWUZNmJsYWtlMzo6cG9ydGFibGU6OmNvbXByZXNzX2luX3BsYWNlOjpoYzRhZDc0NzdjYmY1\
MmYwZRoTZGlnZXN0Y29udGV4dF9jbG9uZRtlPGRpZ2VzdDo6Y29yZV9hcGk6OndyYXBwZXI6OkNvcm\
VXcmFwcGVyPFQ+IGFzIGRpZ2VzdDo6VXBkYXRlPjo6dXBkYXRlOjp7e2Nsb3N1cmV9fTo6aGU3N2Fm\
YjMxMmY4OGY0MzccaDxtZDU6Ok1kNUNvcmUgYXMgZGlnZXN0Ojpjb3JlX2FwaTo6Rml4ZWRPdXRwdX\
RDb3JlPjo6ZmluYWxpemVfZml4ZWRfY29yZTo6e3tjbG9zdXJlfX06Omg3OThjNzA3YzdjZGEzNTky\
HTBibGFrZTM6OmNvbXByZXNzX3N1YnRyZWVfd2lkZTo6aDk5NWY5MmEwOTlkOTg2MzQeOGRsbWFsbG\
9jOjpkbG1hbGxvYzo6RGxtYWxsb2M8QT46OmZyZWU6OmhjYjc5NDdhOWE3ZTI4MmNhHyBtZDQ6OmNv\
bXByZXNzOjpoOTBkNTQwMzZjYTYzM2UzYyBBZGxtYWxsb2M6OmRsbWFsbG9jOjpEbG1hbGxvYzxBPj\
o6ZGlzcG9zZV9jaHVuazo6aDJmOTBiZGRmYWI5ZmRhZjkhE2RpZ2VzdGNvbnRleHRfcmVzZXQicjxz\
aGEyOjpjb3JlX2FwaTo6U2hhNTEyVmFyQ29yZSBhcyBkaWdlc3Q6OmNvcmVfYXBpOjpWYXJpYWJsZU\
91dHB1dENvcmU+OjpmaW5hbGl6ZV92YXJpYWJsZV9jb3JlOjpoOWVhNGEyMTU4ZTA3MDMzYiMvYmxh\
a2UzOjpIYXNoZXI6OmZpbmFsaXplX3hvZjo6aGI4ODNlNmM1YzRlNWQ0MGIkIGtlY2Nhazo6ZjE2MD\
A6OmhhODI1NzkwY2YyNWE1ZjVlJSxjb3JlOjpmbXQ6OkZvcm1hdHRlcjo6cGFkOjpoNDlkMmNmY2Nh\
ZmJiZGU0ZCYOX19ydXN0X3JlYWxsb2MncjxzaGEyOjpjb3JlX2FwaTo6U2hhMjU2VmFyQ29yZSBhcy\
BkaWdlc3Q6OmNvcmVfYXBpOjpWYXJpYWJsZU91dHB1dENvcmU+OjpmaW5hbGl6ZV92YXJpYWJsZV9j\
b3JlOjpoMDNhOTMwYjhjNzRjOWVkNShdPHNoYTE6OlNoYTFDb3JlIGFzIGRpZ2VzdDo6Y29yZV9hcG\
k6OkZpeGVkT3V0cHV0Q29yZT46OmZpbmFsaXplX2ZpeGVkX2NvcmU6OmhiNWQ5ZWM3MDI0OGUxODIw\
KTFibGFrZTM6Okhhc2hlcjo6bWVyZ2VfY3Zfc3RhY2s6Omg0N2I2ZTI0ZTY3ZTIxNjViKjVjb3JlOj\
pmbXQ6OkZvcm1hdHRlcjo6cGFkX2ludGVncmFsOjpoYzY2OTQ3YjFkZWQ1NzhhYSsjY29yZTo6Zm10\
Ojp3cml0ZTo6aGJiYWYzOWYwOWJmNDllZmIsNGJsYWtlMzo6Y29tcHJlc3NfcGFyZW50c19wYXJhbG\
xlbDo6aGEwNzMyZmFjYjEyNzY5YmItZDxyaXBlbWQ6OlJpcGVtZDE2MENvcmUgYXMgZGlnZXN0Ojpj\
b3JlX2FwaTo6Rml4ZWRPdXRwdXRDb3JlPjo6ZmluYWxpemVfZml4ZWRfY29yZTo6aGRlOGZjMmFmNz\
ExZjE4NWYuWzxtZDU6Ok1kNUNvcmUgYXMgZGlnZXN0Ojpjb3JlX2FwaTo6Rml4ZWRPdXRwdXRDb3Jl\
Pjo6ZmluYWxpemVfZml4ZWRfY29yZTo6aDBiMzAwM2U0ODQyOWFjM2QvWzxtZDQ6Ok1kNENvcmUgYX\
MgZGlnZXN0Ojpjb3JlX2FwaTo6Rml4ZWRPdXRwdXRDb3JlPjo6ZmluYWxpemVfZml4ZWRfY29yZTo6\
aDNlMmIzMDA3MzBhYThhZjAwXzx0aWdlcjo6VGlnZXJDb3JlIGFzIGRpZ2VzdDo6Y29yZV9hcGk6Ok\
ZpeGVkT3V0cHV0Q29yZT46OmZpbmFsaXplX2ZpeGVkX2NvcmU6Omg0NTczYTQwZWJjNTRjYTUzMWU8\
ZGlnZXN0Ojpjb3JlX2FwaTo6eG9mX3JlYWRlcjo6WG9mUmVhZGVyQ29yZVdyYXBwZXI8VD4gYXMgZG\
lnZXN0OjpYb2ZSZWFkZXI+OjpyZWFkOjpoZTUwZWUyZjliMmYyYmQ0YTJlPGRpZ2VzdDo6Y29yZV9h\
cGk6OnhvZl9yZWFkZXI6OlhvZlJlYWRlckNvcmVXcmFwcGVyPFQ+IGFzIGRpZ2VzdDo6WG9mUmVhZG\
VyPjo6cmVhZDo6aDZkN2E3MzhlNTE0MWViZTAzLWJsYWtlMzo6Q2h1bmtTdGF0ZTo6dXBkYXRlOjpo\
YzU4OGE4Y2Q3YzI2Y2VmNTQvY29yZTo6Zm10OjpudW06OmltcDo6Zm10X3U2NDo6aDY2MjhhM2U3Mj\
I3ZTg1NTM1BmRpZ2VzdDY+ZGVub19zdGRfd2FzbV9jcnlwdG86OkRpZ2VzdENvbnRleHQ6OnVwZGF0\
ZTo6aDEzYWE5MGI2YzVlZGM0ODY3WzxibG9ja19idWZmZXI6OkJsb2NrQnVmZmVyPEJsb2NrU2l6ZS\
xLaW5kPiBhcyBjb3JlOjpjbG9uZTo6Q2xvbmU+OjpjbG9uZTo6aDU2ZDNhMWQ5YzZmOTE3YmU4G2Rp\
Z2VzdGNvbnRleHRfZGlnZXN0QW5kRHJvcDkGbWVtY3B5OgZtZW1zZXQ7P3dhc21fYmluZGdlbjo6Y2\
9udmVydDo6Y2xvc3VyZXM6Omludm9rZTNfbXV0OjpoZDk2N2Y0MzRjNzJmNGU0MjwRZGlnZXN0Y29u\
dGV4dF9uZXc9FGRpZ2VzdGNvbnRleHRfZGlnZXN0Pi1qc19zeXM6OlVpbnQ4QXJyYXk6OnRvX3ZlYz\
o6aDYzOWJmOTBlOTEwZTgxZDQ/HGRpZ2VzdGNvbnRleHRfZGlnZXN0QW5kUmVzZXRALmNvcmU6OnJl\
c3VsdDo6dW53cmFwX2ZhaWxlZDo6aGQ1ODRlZmI3Yjg0YmYzMjZBUDxhcnJheXZlYzo6ZXJyb3JzOj\
pDYXBhY2l0eUVycm9yPFQ+IGFzIGNvcmU6OmZtdDo6RGVidWc+OjpmbXQ6Omg4Y2EzNjljOTgxMGMy\
MjI5QlA8YXJyYXl2ZWM6OmVycm9yczo6Q2FwYWNpdHlFcnJvcjxUPiBhcyBjb3JlOjpmbXQ6OkRlYn\
VnPjo6Zm10OjpoYWJkMmI2NDNkZDBlY2QyY0NbPGJsb2NrX2J1ZmZlcjo6QmxvY2tCdWZmZXI8Qmxv\
Y2tTaXplLEtpbmQ+IGFzIGNvcmU6OmNsb25lOjpDbG9uZT46OmNsb25lOjpoMDhkN2U1MzhlNjI5MD\
QzOERbPGJsb2NrX2J1ZmZlcjo6QmxvY2tCdWZmZXI8QmxvY2tTaXplLEtpbmQ+IGFzIGNvcmU6OmNs\
b25lOjpDbG9uZT46OmNsb25lOjpoODc3ODZlMzY2MmMyNmQ2NEVbPGJsb2NrX2J1ZmZlcjo6QmxvY2\
tCdWZmZXI8QmxvY2tTaXplLEtpbmQ+IGFzIGNvcmU6OmNsb25lOjpDbG9uZT46OmNsb25lOjpoNWEx\
YTExYjkwNmU5M2QwM0ZbPGJsb2NrX2J1ZmZlcjo6QmxvY2tCdWZmZXI8QmxvY2tTaXplLEtpbmQ+IG\
FzIGNvcmU6OmNsb25lOjpDbG9uZT46OmNsb25lOjpoNDUyMGIyMWMwYzI5ODk4Y0dbPGJsb2NrX2J1\
ZmZlcjo6QmxvY2tCdWZmZXI8QmxvY2tTaXplLEtpbmQ+IGFzIGNvcmU6OmNsb25lOjpDbG9uZT46Om\
Nsb25lOjpoYzQ4ZjUyNTk0NDZjMmVlY0hbPGJsb2NrX2J1ZmZlcjo6QmxvY2tCdWZmZXI8QmxvY2tT\
aXplLEtpbmQ+IGFzIGNvcmU6OmNsb25lOjpDbG9uZT46OmNsb25lOjpoMWM0ZTBjNjhlY2Q2NmI1NE\
k/Y29yZTo6c2xpY2U6OmluZGV4OjpzbGljZV9lbmRfaW5kZXhfbGVuX2ZhaWw6OmhjM2UwZGNmNmQ4\
NjZlMWJlSkFjb3JlOjpzbGljZTo6aW5kZXg6OnNsaWNlX3N0YXJ0X2luZGV4X2xlbl9mYWlsOjpoNm\
MxMDlhYzg1ODdmMjkxMUs9Y29yZTo6c2xpY2U6OmluZGV4OjpzbGljZV9pbmRleF9vcmRlcl9mYWls\
OjpoZDI3ZGMzODVhN2VjMTNjMUxOY29yZTo6c2xpY2U6OjxpbXBsIFtUXT46OmNvcHlfZnJvbV9zbG\
ljZTo6bGVuX21pc21hdGNoX2ZhaWw6OmhlZGQxMGM1YmNjMDI2MTBjTTZjb3JlOjpwYW5pY2tpbmc6\
OnBhbmljX2JvdW5kc19jaGVjazo6aGNlMDUwMmY2MzcxMWZhZDhON3N0ZDo6cGFuaWNraW5nOjpydX\
N0X3BhbmljX3dpdGhfaG9vazo6aDYwNmQ3YzdmN2E0MjNiOThPOmJsYWtlMjo6Qmxha2UyYlZhckNv\
cmU6Om5ld193aXRoX3BhcmFtczo6aDU4N2Y5YTcyNzlmMzcxNmRQGF9fd2JnX2RpZ2VzdGNvbnRleH\
RfZnJlZVEGbWVtY21wUkNjb3JlOjpmbXQ6OkZvcm1hdHRlcjo6cGFkX2ludGVncmFsOjp3cml0ZV9w\
cmVmaXg6OmhhYTBhZGYwMGNiNjdkZWQ3Uyljb3JlOjpwYW5pY2tpbmc6OnBhbmljOjpoZWMxZmMwNT\
diZDBiYWYwYlQUZGlnZXN0Y29udGV4dF91cGRhdGVVOmJsYWtlMjo6Qmxha2Uyc1ZhckNvcmU6Om5l\
d193aXRoX3BhcmFtczo6aDVmZjQ1OWYyMzFhYjhkNjhWLWNvcmU6OnBhbmlja2luZzo6cGFuaWNfZm\
10OjpoNjMxNGI1YzkxYWJlNzM0OVcRX193YmluZGdlbl9tYWxsb2NYP3dhc21fYmluZGdlbjo6Y29u\
dmVydDo6Y2xvc3VyZXM6Omludm9rZTRfbXV0OjpoMDhiMDAxNWQ0NTZmMjBjN1k/d2FzbV9iaW5kZ2\
VuOjpjb252ZXJ0OjpjbG9zdXJlczo6aW52b2tlM19tdXQ6OmgzYWI0ZThkMTgzNDk0OWU4Wj93YXNt\
X2JpbmRnZW46OmNvbnZlcnQ6OmNsb3N1cmVzOjppbnZva2UzX211dDo6aDBlZmUyNDJjN2Q3ZmU2MG\
VbP3dhc21fYmluZGdlbjo6Y29udmVydDo6Y2xvc3VyZXM6Omludm9rZTNfbXV0OjpoYzRhYTBlM2Vm\
MWQ2ZDdhMVw/d2FzbV9iaW5kZ2VuOjpjb252ZXJ0OjpjbG9zdXJlczo6aW52b2tlM19tdXQ6Omg3OT\
lhYmFiYmRjZDEyZmEzXT93YXNtX2JpbmRnZW46OmNvbnZlcnQ6OmNsb3N1cmVzOjppbnZva2UzX211\
dDo6aGE5NDFjMTBjNDA4ODhjNTBeP3dhc21fYmluZGdlbjo6Y29udmVydDo6Y2xvc3VyZXM6Omludm\
9rZTNfbXV0OjpoMTE4OWQ1YjVlY2U4MjQxYV8/d2FzbV9iaW5kZ2VuOjpjb252ZXJ0OjpjbG9zdXJl\
czo6aW52b2tlM19tdXQ6OmhiZGM0ZjBhM2ViZGQ5MDg2YD93YXNtX2JpbmRnZW46OmNvbnZlcnQ6Om\
Nsb3N1cmVzOjppbnZva2UyX211dDo6aGE2NDc2YjFhNTZlZDFhYjZhQ3N0ZDo6cGFuaWNraW5nOjpi\
ZWdpbl9wYW5pY19oYW5kbGVyOjp7e2Nsb3N1cmV9fTo6aDliOTg1YTI5M2FhYzRjZTFiEl9fd2Jpbm\
RnZW5fcmVhbGxvY2M/d2FzbV9iaW5kZ2VuOjpjb252ZXJ0OjpjbG9zdXJlczo6aW52b2tlMV9tdXQ6\
OmgwNzE4MzRjY2I3MGRmNzI1ZDJjb3JlOjpvcHRpb246Ok9wdGlvbjxUPjo6dW53cmFwOjpoNWE3ZG\
Y5MWI1ZDYwOTBjYmUwPCZUIGFzIGNvcmU6OmZtdDo6RGVidWc+OjpmbXQ6OmgwZDljZDYyNmRhYmFh\
MWVmZjI8JlQgYXMgY29yZTo6Zm10OjpEaXNwbGF5Pjo6Zm10OjpoZDMwM2JjMTZhZWU1NTkxMGcRcn\
VzdF9iZWdpbl91bndpbmRoD19fd2JpbmRnZW5fZnJlZWk0YWxsb2M6OnJhd192ZWM6OmNhcGFjaXR5\
X292ZXJmbG93OjpoNGI0OTAxNDgzMGNhZmU2M2ozYXJyYXl2ZWM6OmFycmF5dmVjOjpleHRlbmRfcG\
FuaWM6OmgzN2Q1OThkNzVkMGQyZTZmazljb3JlOjpvcHM6OmZ1bmN0aW9uOjpGbk9uY2U6OmNhbGxf\
b25jZTo6aDJhYjg2NzY3ZWMxN2M1MGRsH19fd2JpbmRnZW5fYWRkX3RvX3N0YWNrX3BvaW50ZXJtTm\
NvcmU6OmZtdDo6bnVtOjppbXA6OjxpbXBsIGNvcmU6OmZtdDo6RGlzcGxheSBmb3IgdTMyPjo6Zm10\
OjpoMDQ2ZWNjNWVhYWIzNGNkNW4xd2FzbV9iaW5kZ2VuOjpfX3J0Ojp0aHJvd19udWxsOjpoM2Q3Yj\
Q3NDgzNGRkZjJkOW8yd2FzbV9iaW5kZ2VuOjpfX3J0Ojpib3Jyb3dfZmFpbDo6aGU1Njk3Y2E4ZTIx\
ZWQ1YTVwKndhc21fYmluZGdlbjo6dGhyb3dfc3RyOjpoNWViNDYxODBmZTVlMWQxYXFJc3RkOjpzeX\
NfY29tbW9uOjpiYWNrdHJhY2U6Ol9fcnVzdF9lbmRfc2hvcnRfYmFja3RyYWNlOjpoYTAzYWJlZjAy\
YThiNzBmZHIxPFQgYXMgY29yZTo6YW55OjpBbnk+Ojp0eXBlX2lkOjpoYTBjNDQ5MjIxNmQ0ZDJlN3\
MKcnVzdF9wYW5pY3Q3c3RkOjphbGxvYzo6ZGVmYXVsdF9hbGxvY19lcnJvcl9ob29rOjpoZjljMzkz\
YmEzY2QyODdlMXVvY29yZTo6cHRyOjpkcm9wX2luX3BsYWNlPCZjb3JlOjppdGVyOjphZGFwdGVycz\
o6Y29waWVkOjpDb3BpZWQ8Y29yZTo6c2xpY2U6Oml0ZXI6Okl0ZXI8dTg+Pj46Omg2M2MyZTE0OTdi\
NTJmM2Q3AO+AgIAACXByb2R1Y2VycwIIbGFuZ3VhZ2UBBFJ1c3QADHByb2Nlc3NlZC1ieQMFcnVzdG\
MdMS41Ny4wIChmMWVkZDA0MjkgMjAyMS0xMS0yOSkGd2FscnVzBjAuMTkuMAx3YXNtLWJpbmRnZW4G\
MC4yLjgx\
");
    const wasmModule = new WebAssembly.Module(wasmBytes);
    return new WebAssembly.Instance(wasmModule, imports);
}
function base64decode(b64) {
    const binString = atob(b64);
    const size = binString.length;
    const bytes = new Uint8Array(size);
    for(let i = 0; i < size; i++){
        bytes[i] = binString.charCodeAt(i);
    }
    return bytes;
}
const digestAlgorithms = [
    "BLAKE2B-256",
    "BLAKE2B-384",
    "BLAKE2B",
    "BLAKE2S",
    "BLAKE3",
    "KECCAK-224",
    "KECCAK-256",
    "KECCAK-384",
    "KECCAK-512",
    "SHA-384",
    "SHA3-224",
    "SHA3-256",
    "SHA3-384",
    "SHA3-512",
    "SHAKE128",
    "SHAKE256",
    "TIGER",
    "RIPEMD-160",
    "SHA-224",
    "SHA-256",
    "SHA-512",
    "MD4",
    "MD5",
    "SHA-1"
];
function _uint8ArrayToBuffer(chunk) {
    return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
}
function _arch() {
    if (Deno.build.arch == "x86_64") {
        return "x64";
    } else if (Deno.build.arch == "aarch64") {
        return "arm64";
    } else {
        throw Error("unreachable");
    }
}
_arch();
Deno.chdir;
Deno.cwd;
const nextTick1 = nextTick;
const OBJECT_PROTO_PROP_NAMES = Object.getOwnPropertyNames(Object.prototype);
new Proxy(Object(), {
    get: (target, prop)=>{
        if (typeof prop === "symbol") {
            return target[prop];
        }
        const envValue = Deno.env.get(prop);
        if (envValue) {
            return envValue;
        }
        if (OBJECT_PROTO_PROP_NAMES.includes(prop)) {
            return target[prop];
        }
        return envValue;
    },
    ownKeys: ()=>Reflect.ownKeys(Deno.env.toObject()),
    getOwnPropertyDescriptor: (_target, name)=>{
        const e = Deno.env.toObject();
        if (name in Deno.env.toObject()) {
            const o = {
                enumerable: true,
                configurable: true
            };
            if (typeof name === "string") {
                o.value = e[name];
            }
            return o;
        }
    },
    set (_target, prop, value) {
        Deno.env.set(String(prop), String(value));
        return value;
    },
    has: (_target, prop)=>Reflect.ownKeys(Deno.env.toObject()).includes(prop)
});
Deno.pid;
isWindows ? "win32" : Deno.build.os;
({
    node: "16.11.1",
    uv: "1.42.0",
    zlib: "1.2.11",
    brotli: "1.0.9",
    ares: "1.17.2",
    modules: "93",
    nghttp2: "1.45.1",
    napi: "8",
    llhttp: "6.0.4",
    openssl: "1.1.1l",
    cldr: "39.0",
    icu: "69.1",
    tz: "2021a",
    unicode: "13.0",
    ...Deno.version
});
function isRequest(stream) {
    return stream.setHeader && typeof stream.abort === "function";
}
function isServerResponse(stream) {
    return typeof stream._sent100 === "boolean" && typeof stream._removedConnection === "boolean" && typeof stream._removedContLen === "boolean" && typeof stream._removedTE === "boolean" && typeof stream._closed === "boolean";
}
function isReadable(stream) {
    return typeof stream.readable === "boolean" || typeof stream.readableEnded === "boolean" || !!stream._readableState;
}
function isWritable(stream) {
    return typeof stream.writable === "boolean" || typeof stream.writableEnded === "boolean" || !!stream._writableState;
}
function isWritableFinished(stream) {
    if (stream.writableFinished) return true;
    const wState = stream._writableState;
    if (!wState || wState.errored) return false;
    return wState.finished || wState.ended && wState.length === 0;
}
const nop = ()=>{};
function isReadableEnded(stream) {
    if (stream.readableEnded) return true;
    const rState = stream._readableState;
    if (!rState || rState.errored) return false;
    return rState.endEmitted || rState.ended && rState.length === 0;
}
function eos(stream, options, callback) {
    if (arguments.length === 2) {
        callback = options;
        options = {};
    } else if (options == null) {
        options = {};
    } else {
        validateObject(options, "options");
    }
    validateFunction(callback, "callback");
    validateAbortSignal(options.signal, "options.signal");
    callback = once(callback);
    const readable = options.readable || options.readable !== false && isReadable(stream);
    const writable = options.writable || options.writable !== false && isWritable(stream);
    const wState = stream._writableState;
    const rState = stream._readableState;
    const state = wState || rState;
    const onlegacyfinish = ()=>{
        if (!stream.writable) onfinish();
    };
    let willEmitClose = isServerResponse(stream) || state && state.autoDestroy && state.emitClose && state.closed === false && isReadable(stream) === readable && isWritable(stream) === writable;
    let writableFinished = stream.writableFinished || wState && wState.finished;
    const onfinish = ()=>{
        writableFinished = true;
        if (stream.destroyed) willEmitClose = false;
        if (willEmitClose && (!stream.readable || readable)) return;
        if (!readable || readableEnded) callback.call(stream);
    };
    let readableEnded = stream.readableEnded || rState && rState.endEmitted;
    const onend = ()=>{
        readableEnded = true;
        if (stream.destroyed) willEmitClose = false;
        if (willEmitClose && (!stream.writable || writable)) return;
        if (!writable || writableFinished) callback.call(stream);
    };
    const onerror = (err)=>{
        callback.call(stream, err);
    };
    const onclose = ()=>{
        if (readable && !readableEnded) {
            if (!isReadableEnded(stream)) {
                return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE());
            }
        }
        if (writable && !writableFinished) {
            if (!isWritableFinished(stream)) {
                return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE());
            }
        }
        callback.call(stream);
    };
    const onrequest = ()=>{
        stream.req.on("finish", onfinish);
    };
    if (isRequest(stream)) {
        stream.on("complete", onfinish);
        if (!willEmitClose) {
            stream.on("abort", onclose);
        }
        if (stream.req) onrequest();
        else stream.on("request", onrequest);
    } else if (writable && !wState) {
        stream.on("end", onlegacyfinish);
        stream.on("close", onlegacyfinish);
    }
    if (!willEmitClose && typeof stream.aborted === "boolean") {
        stream.on("aborted", onclose);
    }
    stream.on("end", onend);
    stream.on("finish", onfinish);
    if (options.error !== false) stream.on("error", onerror);
    stream.on("close", onclose);
    const closed = !wState && !rState && stream._closed === true || wState && wState.closed || rState && rState.closed || wState && wState.errorEmitted || rState && rState.errorEmitted || rState && stream.req && stream.aborted || (!wState || !willEmitClose || typeof wState.closed !== "boolean") && (!rState || !willEmitClose || typeof rState.closed !== "boolean") && (!writable || wState && wState.finished) && (!readable || rState && rState.endEmitted);
    if (closed) {
        nextTick(()=>{
            callback();
        });
    }
    const cleanup = ()=>{
        callback = nop;
        stream.removeListener("aborted", onclose);
        stream.removeListener("complete", onfinish);
        stream.removeListener("abort", onclose);
        stream.removeListener("request", onrequest);
        if (stream.req) stream.req.removeListener("finish", onfinish);
        stream.removeListener("end", onlegacyfinish);
        stream.removeListener("close", onlegacyfinish);
        stream.removeListener("finish", onfinish);
        stream.removeListener("end", onend);
        stream.removeListener("error", onerror);
        stream.removeListener("close", onclose);
    };
    if (options.signal && !closed) {
        const abort = ()=>{
            const endCallback = callback;
            cleanup();
            endCallback.call(stream, new AbortError());
        };
        if (options.signal.aborted) {
            nextTick(abort);
        } else {
            const originalCallback = callback;
            callback = once((...args)=>{
                options.signal.removeEventListener("abort", abort);
                originalCallback.apply(stream, args);
            });
            options.signal.addEventListener("abort", abort);
        }
    }
    return cleanup;
}
const validateAbortSignal1 = (signal, name)=>{
    if (typeof signal !== "object" || !("aborted" in signal)) {
        throw new ERR_INVALID_ARG_TYPE(name, "AbortSignal", signal);
    }
};
function isStream(obj) {
    return !!(obj && typeof obj.pipe === "function");
}
function addAbortSignal(signal, stream) {
    validateAbortSignal1(signal, "signal");
    if (!isStream(stream)) {
        throw new ERR_INVALID_ARG_TYPE("stream", "stream.Stream", stream);
    }
    return addAbortSignalNoValidate(signal, stream);
}
function addAbortSignalNoValidate(signal, stream) {
    if (typeof signal !== "object" || !("aborted" in signal)) {
        return stream;
    }
    const onAbort = ()=>{
        stream.destroy(new AbortError());
    };
    if (signal.aborted) {
        onAbort();
    } else {
        signal.addEventListener("abort", onAbort);
        eos(stream, ()=>signal.removeEventListener("abort", onAbort));
    }
    return stream;
}
const kDestroy = Symbol("kDestroy");
const kConstruct = Symbol("kConstruct");
function checkError(err, w, r) {
    if (err) {
        err.stack;
        if (w && !w.errored) {
            w.errored = err;
        }
        if (r && !r.errored) {
            r.errored = err;
        }
    }
}
function destroy1(err, cb) {
    const r = this._readableState;
    const w = this._writableState;
    const s = w || r;
    if (w && w.destroyed || r && r.destroyed) {
        if (typeof cb === "function") {
            cb();
        }
        return this;
    }
    checkError(err, w, r);
    if (w) {
        w.destroyed = true;
    }
    if (r) {
        r.destroyed = true;
    }
    if (!s.constructed) {
        this.once(kDestroy, function(er) {
            _destroy(this, aggregateTwoErrors(er, err), cb);
        });
    } else {
        _destroy(this, err, cb);
    }
    return this;
}
function _destroy(self1, err, cb) {
    let called = false;
    function onDestroy(err) {
        if (called) {
            return;
        }
        called = true;
        const r = self1._readableState;
        const w = self1._writableState;
        checkError(err, w, r);
        if (w) {
            w.closed = true;
        }
        if (r) {
            r.closed = true;
        }
        if (typeof cb === "function") {
            cb(err);
        }
        if (err) {
            nextTick(emitErrorCloseNT, self1, err);
        } else {
            nextTick(emitCloseNT, self1);
        }
    }
    try {
        const result = self1._destroy(err || null, onDestroy);
        if (result != null) {
            const then = result.then;
            if (typeof then === "function") {
                then.call(result, function() {
                    nextTick(onDestroy, null);
                }, function(err) {
                    nextTick(onDestroy, err);
                });
            }
        }
    } catch (err1) {
        onDestroy(err1);
    }
}
function emitErrorCloseNT(self1, err) {
    emitErrorNT(self1, err);
    emitCloseNT(self1);
}
function emitCloseNT(self1) {
    const r = self1._readableState;
    const w = self1._writableState;
    if (w) {
        w.closeEmitted = true;
    }
    if (r) {
        r.closeEmitted = true;
    }
    if (w && w.emitClose || r && r.emitClose) {
        self1.emit("close");
    }
}
function emitErrorNT(self1, err) {
    const r = self1._readableState;
    const w = self1._writableState;
    if (w && w.errorEmitted || r && r.errorEmitted) {
        return;
    }
    if (w) {
        w.errorEmitted = true;
    }
    if (r) {
        r.errorEmitted = true;
    }
    self1.emit("error", err);
}
function undestroy() {
    const r = this._readableState;
    const w = this._writableState;
    if (r) {
        r.constructed = true;
        r.closed = false;
        r.closeEmitted = false;
        r.destroyed = false;
        r.errored = null;
        r.errorEmitted = false;
        r.reading = false;
        r.ended = false;
        r.endEmitted = false;
    }
    if (w) {
        w.constructed = true;
        w.destroyed = false;
        w.closed = false;
        w.closeEmitted = false;
        w.errored = null;
        w.errorEmitted = false;
        w.ended = false;
        w.ending = false;
        w.finalCalled = false;
        w.prefinished = false;
        w.finished = false;
    }
}
function errorOrDestroy(stream, err, sync) {
    const r = stream._readableState;
    const w = stream._writableState;
    if (w && w.destroyed || r && r.destroyed) {
        return this;
    }
    if (r && r.autoDestroy || w && w.autoDestroy) {
        stream.destroy(err);
    } else if (err) {
        err.stack;
        if (w && !w.errored) {
            w.errored = err;
        }
        if (r && !r.errored) {
            r.errored = err;
        }
        if (sync) {
            nextTick(emitErrorNT, stream, err);
        } else {
            emitErrorNT(stream, err);
        }
    }
}
function construct(stream, cb) {
    if (typeof stream._construct !== "function") {
        return;
    }
    const r = stream._readableState;
    const w = stream._writableState;
    if (r) {
        r.constructed = false;
    }
    if (w) {
        w.constructed = false;
    }
    stream.once(kConstruct, cb);
    if (stream.listenerCount(kConstruct) > 1) {
        return;
    }
    nextTick(constructNT, stream);
}
function constructNT(stream) {
    let called = false;
    function onConstruct(err) {
        if (called) {
            errorOrDestroy(stream, err ?? new ERR_MULTIPLE_CALLBACK());
            return;
        }
        called = true;
        const r = stream._readableState;
        const w = stream._writableState;
        const s = w || r;
        if (r) {
            r.constructed = true;
        }
        if (w) {
            w.constructed = true;
        }
        if (s.destroyed) {
            stream.emit(kDestroy, err);
        } else if (err) {
            errorOrDestroy(stream, err, true);
        } else {
            nextTick(emitConstructNT, stream);
        }
    }
    try {
        const result = stream._construct(onConstruct);
        if (result != null) {
            const then = result.then;
            if (typeof then === "function") {
                then.call(result, function() {
                    nextTick(onConstruct, null);
                }, function(err) {
                    nextTick(onConstruct, err);
                });
            }
        }
    } catch (err) {
        onConstruct(err);
    }
}
function emitConstructNT(stream) {
    stream.emit(kConstruct);
}
function isRequest1(stream) {
    return stream && stream.setHeader && typeof stream.abort === "function";
}
function destroyer(stream, err) {
    if (!stream) return;
    if (isRequest1(stream)) return stream.abort();
    if (isRequest1(stream.req)) return stream.req.abort();
    if (typeof stream.destroy === "function") return stream.destroy(err);
    if (typeof stream.close === "function") return stream.close();
}
const __default1 = {
    construct,
    destroyer,
    destroy: destroy1,
    undestroy,
    errorOrDestroy
};
const kIsDisturbed = Symbol("kIsDisturbed");
function isReadableNodeStream(obj) {
    return !!(obj && typeof obj.pipe === "function" && typeof obj.on === "function" && (!obj._writableState || obj._readableState?.readable !== false) && (!obj._writableState || obj._readableState));
}
function isWritableNodeStream(obj) {
    return !!(obj && typeof obj.write === "function" && typeof obj.on === "function" && (!obj._readableState || obj._writableState?.writable !== false));
}
function isDuplexNodeStream(obj) {
    return !!(obj && typeof obj.pipe === "function" && obj._readableState && typeof obj.on === "function" && typeof obj.write === "function");
}
function isNodeStream(obj) {
    return obj && (obj._readableState || obj._writableState || typeof obj.write === "function" && typeof obj.on === "function" || typeof obj.pipe === "function" && typeof obj.on === "function");
}
function isIterable(obj, isAsync) {
    if (obj == null) return false;
    if (isAsync === true) return typeof obj[Symbol.asyncIterator] === "function";
    if (isAsync === false) return typeof obj[Symbol.iterator] === "function";
    return typeof obj[Symbol.asyncIterator] === "function" || typeof obj[Symbol.iterator] === "function";
}
function isDestroyed(stream) {
    if (!isNodeStream(stream)) return null;
    const wState = stream._writableState;
    const rState = stream._readableState;
    const state = wState || rState;
    return !!(stream.destroyed || state?.destroyed);
}
function isWritableEnded(stream) {
    if (!isWritableNodeStream(stream)) return null;
    if (stream.writableEnded === true) return true;
    const wState = stream._writableState;
    if (wState?.errored) return false;
    if (typeof wState?.ended !== "boolean") return null;
    return wState.ended;
}
function isReadableEnded1(stream) {
    if (!isReadableNodeStream(stream)) return null;
    if (stream.readableEnded === true) return true;
    const rState = stream._readableState;
    if (!rState || rState.errored) return false;
    if (typeof rState?.ended !== "boolean") return null;
    return rState.ended;
}
function isReadableFinished(stream, strict) {
    if (!isReadableNodeStream(stream)) return null;
    const rState = stream._readableState;
    if (rState?.errored) return false;
    if (typeof rState?.endEmitted !== "boolean") return null;
    return !!(rState.endEmitted || strict === false && rState.ended === true && rState.length === 0);
}
function isDisturbed(stream) {
    return !!(stream && (stream.readableDidRead || stream.readableAborted || stream[kIsDisturbed]));
}
function isReadable1(stream) {
    const r = isReadableNodeStream(stream);
    if (r === null || typeof stream?.readable !== "boolean") return null;
    if (isDestroyed(stream)) return false;
    return r && stream.readable && !isReadableFinished(stream);
}
function isWritable1(stream) {
    const r = isWritableNodeStream(stream);
    if (r === null || typeof stream?.writable !== "boolean") return null;
    if (isDestroyed(stream)) return false;
    return r && stream.writable && !isWritableEnded(stream);
}
const stdio = {};
function isBlob(object) {
    return object instanceof Blob;
}
function _from1(Readable, iterable, opts) {
    let iterator;
    if (typeof iterable === "string" || iterable instanceof Buffer) {
        return new Readable({
            objectMode: true,
            ...opts,
            read () {
                this.push(iterable);
                this.push(null);
            }
        });
    }
    let isAsync;
    if (iterable && iterable[Symbol.asyncIterator]) {
        isAsync = true;
        iterator = iterable[Symbol.asyncIterator]();
    } else if (iterable && iterable[Symbol.iterator]) {
        isAsync = false;
        iterator = iterable[Symbol.iterator]();
    } else {
        throw new ERR_INVALID_ARG_TYPE("iterable", [
            "Iterable"
        ], iterable);
    }
    const readable = new Readable({
        objectMode: true,
        highWaterMark: 1,
        ...opts
    });
    let reading = false;
    readable._read = function() {
        if (!reading) {
            reading = true;
            next();
        }
    };
    readable._destroy = function(error, cb) {
        close(error).then(()=>nextTick1(cb, error), (e)=>nextTick1(cb, e || error));
    };
    async function close(error) {
        const hadError = error !== undefined && error !== null;
        const hasThrow = typeof iterator.throw === "function";
        if (hadError && hasThrow) {
            const { value , done  } = await iterator.throw(error);
            await value;
            if (done) {
                return;
            }
        }
        if (typeof iterator.return === "function") {
            const { value: value1  } = await iterator.return();
            await value1;
        }
    }
    async function next() {
        for(;;){
            try {
                const { value , done  } = isAsync ? await iterator.next() : iterator.next();
                if (done) {
                    readable.push(null);
                } else {
                    const res = value && typeof value.then === "function" ? await value : value;
                    if (res === null) {
                        reading = false;
                        throw new ERR_STREAM_NULL_VALUES();
                    } else if (readable.push(res)) {
                        continue;
                    } else {
                        reading = false;
                    }
                }
            } catch (err) {
                readable.destroy(err);
            }
            break;
        }
    }
    return readable;
}
function highWaterMarkFrom(options, isDuplex, duplexKey) {
    return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
}
function getDefaultHighWaterMark(objectMode) {
    return objectMode ? 16 : 16 * 1024;
}
function getHighWaterMark(state, options, duplexKey, isDuplex) {
    const hwm = highWaterMarkFrom(options, isDuplex, duplexKey);
    if (hwm != null) {
        if (!Number.isInteger(hwm) || hwm < 0) {
            const name = isDuplex ? `options.${duplexKey}` : "options.highWaterMark";
            throw new ERR_INVALID_ARG_VALUE(name, hwm);
        }
        return Math.floor(hwm);
    }
    return getDefaultHighWaterMark(state.objectMode);
}
"use strict";
const kRejection = Symbol.for("nodejs.rejection");
const kCapture = Symbol("kCapture");
const kErrorMonitor = Symbol("events.errorMonitor");
const kMaxEventTargetListeners = Symbol("events.maxEventTargetListeners");
const kMaxEventTargetListenersWarned = Symbol("events.maxEventTargetListenersWarned");
function EventEmitter2(opts) {
    EventEmitter2.init.call(this, opts);
}
EventEmitter2.on = on;
EventEmitter2.once = once1;
EventEmitter2.getEventListeners = getEventListeners;
EventEmitter2.setMaxListeners = setMaxListeners;
EventEmitter2.listenerCount = listenerCount;
EventEmitter2.EventEmitter = EventEmitter2;
EventEmitter2.usingDomains = false;
EventEmitter2.captureRejectionSymbol = kRejection;
EventEmitter2.captureRejectionSymbol;
EventEmitter2.errorMonitor;
Object.defineProperty(EventEmitter2, "captureRejections", {
    get () {
        return EventEmitter2.prototype[kCapture];
    },
    set (value) {
        validateBoolean(value, "EventEmitter.captureRejections");
        EventEmitter2.prototype[kCapture] = value;
    },
    enumerable: true
});
EventEmitter2.errorMonitor = kErrorMonitor;
Object.defineProperty(EventEmitter2.prototype, kCapture, {
    value: false,
    writable: true,
    enumerable: false
});
EventEmitter2.prototype._events = undefined;
EventEmitter2.prototype._eventsCount = 0;
EventEmitter2.prototype._maxListeners = undefined;
let defaultMaxListeners1 = 10;
function checkListener(listener) {
    validateFunction(listener, "listener");
}
Object.defineProperty(EventEmitter2, "defaultMaxListeners", {
    enumerable: true,
    get: function() {
        return defaultMaxListeners1;
    },
    set: function(arg) {
        if (typeof arg !== "number" || arg < 0 || Number.isNaN(arg)) {
            throw new ERR_OUT_OF_RANGE("defaultMaxListeners", "a non-negative number", arg);
        }
        defaultMaxListeners1 = arg;
    }
});
Object.defineProperties(EventEmitter2, {
    kMaxEventTargetListeners: {
        value: kMaxEventTargetListeners,
        enumerable: false,
        configurable: false,
        writable: false
    },
    kMaxEventTargetListenersWarned: {
        value: kMaxEventTargetListenersWarned,
        enumerable: false,
        configurable: false,
        writable: false
    }
});
function setMaxListeners(n = defaultMaxListeners1, ...eventTargets) {
    if (typeof n !== "number" || n < 0 || Number.isNaN(n)) {
        throw new ERR_OUT_OF_RANGE("n", "a non-negative number", n);
    }
    if (eventTargets.length === 0) {
        defaultMaxListeners1 = n;
    } else {
        for(let i = 0; i < eventTargets.length; i++){
            const target = eventTargets[i];
            if (target instanceof EventTarget) {
                target[kMaxEventTargetListeners] = n;
                target[kMaxEventTargetListenersWarned] = false;
            } else if (typeof target.setMaxListeners === "function") {
                target.setMaxListeners(n);
            } else {
                throw new ERR_INVALID_ARG_TYPE("eventTargets", [
                    "EventEmitter",
                    "EventTarget"
                ], target);
            }
        }
    }
}
EventEmitter2.init = function(opts) {
    if (this._events === undefined || this._events === Object.getPrototypeOf(this)._events) {
        this._events = Object.create(null);
        this._eventsCount = 0;
    }
    this._maxListeners = this._maxListeners || undefined;
    if (opts?.captureRejections) {
        validateBoolean(opts.captureRejections, "options.captureRejections");
        this[kCapture] = Boolean(opts.captureRejections);
    } else {
        this[kCapture] = EventEmitter2.prototype[kCapture];
    }
};
function addCatch(that, promise, type, args) {
    if (!that[kCapture]) {
        return;
    }
    try {
        const then = promise.then;
        if (typeof then === "function") {
            then.call(promise, undefined, function(err) {
                process.nextTick(emitUnhandledRejectionOrErr, that, err, type, args);
            });
        }
    } catch (err) {
        that.emit("error", err);
    }
}
function emitUnhandledRejectionOrErr(ee, err, type, args) {
    if (typeof ee[kRejection] === "function") {
        ee[kRejection](err, type, ...args);
    } else {
        const prev = ee[kCapture];
        try {
            ee[kCapture] = false;
            ee.emit("error", err);
        } finally{
            ee[kCapture] = prev;
        }
    }
}
EventEmitter2.prototype.setMaxListeners = function setMaxListeners(n) {
    if (typeof n !== "number" || n < 0 || Number.isNaN(n)) {
        throw new ERR_OUT_OF_RANGE("n", "a non-negative number", n);
    }
    this._maxListeners = n;
    return this;
};
function _getMaxListeners(that) {
    if (that._maxListeners === undefined) {
        return EventEmitter2.defaultMaxListeners;
    }
    return that._maxListeners;
}
EventEmitter2.prototype.getMaxListeners = function getMaxListeners() {
    return _getMaxListeners(this);
};
EventEmitter2.prototype.emit = function emit(type, ...args) {
    let doError = type === "error";
    const events = this._events;
    if (events !== undefined) {
        if (doError && events[kErrorMonitor] !== undefined) {
            this.emit(kErrorMonitor, ...args);
        }
        doError = doError && events.error === undefined;
    } else if (!doError) {
        return false;
    }
    if (doError) {
        let er;
        if (args.length > 0) {
            er = args[0];
        }
        if (er instanceof Error) {
            try {
                const capture = {};
                Error.captureStackTrace(capture, EventEmitter2.prototype.emit);
            } catch  {}
            throw er;
        }
        let stringifiedEr;
        try {
            stringifiedEr = inspect(er);
        } catch  {
            stringifiedEr = er;
        }
        const err = new ERR_UNHANDLED_ERROR(stringifiedEr);
        err.context = er;
        throw err;
    }
    const handler = events[type];
    if (handler === undefined) {
        return false;
    }
    if (typeof handler === "function") {
        const result = handler.apply(this, args);
        if (result !== undefined && result !== null) {
            addCatch(this, result, type, args);
        }
    } else {
        const len = handler.length;
        const listeners = arrayClone(handler);
        for(let i = 0; i < len; ++i){
            const result1 = listeners[i].apply(this, args);
            if (result1 !== undefined && result1 !== null) {
                addCatch(this, result1, type, args);
            }
        }
    }
    return true;
};
function _addListener(target, type, listener, prepend) {
    let m;
    let events;
    let existing;
    checkListener(listener);
    events = target._events;
    if (events === undefined) {
        events = target._events = Object.create(null);
        target._eventsCount = 0;
    } else {
        if (events.newListener !== undefined) {
            target.emit("newListener", type, listener.listener ?? listener);
            events = target._events;
        }
        existing = events[type];
    }
    if (existing === undefined) {
        events[type] = listener;
        ++target._eventsCount;
    } else {
        if (typeof existing === "function") {
            existing = events[type] = prepend ? [
                listener,
                existing
            ] : [
                existing,
                listener
            ];
        } else if (prepend) {
            existing.unshift(listener);
        } else {
            existing.push(listener);
        }
        m = _getMaxListeners(target);
        if (m > 0 && existing.length > m && !existing.warned) {
            existing.warned = true;
            const w = new Error("Possible EventEmitter memory leak detected. " + `${existing.length} ${String(type)} listeners ` + `added to ${inspect(target, {
                depth: -1
            })}. Use ` + "emitter.setMaxListeners() to increase limit");
            w.name = "MaxListenersExceededWarning";
            w.emitter = target;
            w.type = type;
            w.count = existing.length;
            process.emitWarning(w);
        }
    }
    return target;
}
EventEmitter2.prototype.addListener = function addListener(type, listener) {
    return _addListener(this, type, listener, false);
};
EventEmitter2.prototype.on = EventEmitter2.prototype.addListener;
EventEmitter2.prototype.prependListener = function prependListener(type, listener) {
    return _addListener(this, type, listener, true);
};
function onceWrapper() {
    if (!this.fired) {
        this.target.removeListener(this.type, this.wrapFn);
        this.fired = true;
        if (arguments.length === 0) {
            return this.listener.call(this.target);
        }
        return this.listener.apply(this.target, arguments);
    }
}
function _onceWrap(target, type, listener) {
    const state = {
        fired: false,
        wrapFn: undefined,
        target,
        type,
        listener
    };
    const wrapped = onceWrapper.bind(state);
    wrapped.listener = listener;
    state.wrapFn = wrapped;
    return wrapped;
}
EventEmitter2.prototype.once = function once(type, listener) {
    checkListener(listener);
    this.on(type, _onceWrap(this, type, listener));
    return this;
};
EventEmitter2.prototype.prependOnceListener = function prependOnceListener(type, listener) {
    checkListener(listener);
    this.prependListener(type, _onceWrap(this, type, listener));
    return this;
};
EventEmitter2.prototype.removeListener = function removeListener(type, listener) {
    checkListener(listener);
    const events = this._events;
    if (events === undefined) {
        return this;
    }
    const list = events[type];
    if (list === undefined) {
        return this;
    }
    if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0) {
            this._events = Object.create(null);
        } else {
            delete events[type];
            if (events.removeListener) {
                this.emit("removeListener", type, list.listener || listener);
            }
        }
    } else if (typeof list !== "function") {
        let position = -1;
        for(let i = list.length - 1; i >= 0; i--){
            if (list[i] === listener || list[i].listener === listener) {
                position = i;
                break;
            }
        }
        if (position < 0) {
            return this;
        }
        if (position === 0) {
            list.shift();
        } else {
            spliceOne(list, position);
        }
        if (list.length === 1) {
            events[type] = list[0];
        }
        if (events.removeListener !== undefined) {
            this.emit("removeListener", type, listener);
        }
    }
    return this;
};
EventEmitter2.prototype.off = EventEmitter2.prototype.removeListener;
EventEmitter2.prototype.removeAllListeners = function removeAllListeners(type) {
    const events = this._events;
    if (events === undefined) {
        return this;
    }
    if (events.removeListener === undefined) {
        if (arguments.length === 0) {
            this._events = Object.create(null);
            this._eventsCount = 0;
        } else if (events[type] !== undefined) {
            if (--this._eventsCount === 0) {
                this._events = Object.create(null);
            } else {
                delete events[type];
            }
        }
        return this;
    }
    if (arguments.length === 0) {
        for (const key of Reflect.ownKeys(events)){
            if (key === "removeListener") continue;
            this.removeAllListeners(key);
        }
        this.removeAllListeners("removeListener");
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
    }
    const listeners = events[type];
    if (typeof listeners === "function") {
        this.removeListener(type, listeners);
    } else if (listeners !== undefined) {
        for(let i = listeners.length - 1; i >= 0; i--){
            this.removeListener(type, listeners[i]);
        }
    }
    return this;
};
function _listeners(target, type, unwrap) {
    const events = target._events;
    if (events === undefined) {
        return [];
    }
    const evlistener = events[type];
    if (evlistener === undefined) {
        return [];
    }
    if (typeof evlistener === "function") {
        return unwrap ? [
            evlistener.listener || evlistener
        ] : [
            evlistener
        ];
    }
    return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener);
}
EventEmitter2.prototype.listeners = function listeners(type) {
    return _listeners(this, type, true);
};
EventEmitter2.prototype.rawListeners = function rawListeners(type) {
    return _listeners(this, type, false);
};
const _listenerCount = function listenerCount(type) {
    const events = this._events;
    if (events !== undefined) {
        const evlistener = events[type];
        if (typeof evlistener === "function") {
            return 1;
        } else if (evlistener !== undefined) {
            return evlistener.length;
        }
    }
    return 0;
};
EventEmitter2.prototype.listenerCount = _listenerCount;
function listenerCount(emitter, type) {
    if (typeof emitter.listenerCount === "function") {
        return emitter.listenerCount(type);
    }
    return _listenerCount.call(emitter, type);
}
EventEmitter2.prototype.eventNames = function eventNames() {
    return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};
function arrayClone(arr) {
    switch(arr.length){
        case 2:
            return [
                arr[0],
                arr[1]
            ];
        case 3:
            return [
                arr[0],
                arr[1],
                arr[2]
            ];
        case 4:
            return [
                arr[0],
                arr[1],
                arr[2],
                arr[3]
            ];
        case 5:
            return [
                arr[0],
                arr[1],
                arr[2],
                arr[3],
                arr[4]
            ];
        case 6:
            return [
                arr[0],
                arr[1],
                arr[2],
                arr[3],
                arr[4],
                arr[5]
            ];
    }
    return arr.slice();
}
function unwrapListeners(arr) {
    const ret = arrayClone(arr);
    for(let i = 0; i < ret.length; ++i){
        const orig = ret[i].listener;
        if (typeof orig === "function") {
            ret[i] = orig;
        }
    }
    return ret;
}
function getEventListeners(emitterOrTarget, type) {
    if (typeof emitterOrTarget.listeners === "function") {
        return emitterOrTarget.listeners(type);
    }
    if (emitterOrTarget instanceof EventTarget) {
        const root = emitterOrTarget[kEvents].get(type);
        const listeners = [];
        let handler = root?.next;
        while(handler?.listener !== undefined){
            const listener = handler.listener?.deref ? handler.listener.deref() : handler.listener;
            listeners.push(listener);
            handler = handler.next;
        }
        return listeners;
    }
    throw new ERR_INVALID_ARG_TYPE("emitter", [
        "EventEmitter",
        "EventTarget"
    ], emitterOrTarget);
}
async function once1(emitter, name, options = {}) {
    const signal = options?.signal;
    validateAbortSignal(signal, "options.signal");
    if (signal?.aborted) {
        throw new AbortError();
    }
    return new Promise((resolve, reject)=>{
        const errorListener = (err)=>{
            emitter.removeListener(name, resolver);
            if (signal != null) {
                eventTargetAgnosticRemoveListener(signal, "abort", abortListener);
            }
            reject(err);
        };
        const resolver = (...args)=>{
            if (typeof emitter.removeListener === "function") {
                emitter.removeListener("error", errorListener);
            }
            if (signal != null) {
                eventTargetAgnosticRemoveListener(signal, "abort", abortListener);
            }
            resolve(args);
        };
        eventTargetAgnosticAddListener(emitter, name, resolver, {
            once: true
        });
        if (name !== "error" && typeof emitter.once === "function") {
            emitter.once("error", errorListener);
        }
        function abortListener() {
            eventTargetAgnosticRemoveListener(emitter, name, resolver);
            eventTargetAgnosticRemoveListener(emitter, "error", errorListener);
            reject(new AbortError());
        }
        if (signal != null) {
            eventTargetAgnosticAddListener(signal, "abort", abortListener, {
                once: true
            });
        }
    });
}
const AsyncIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(async function*() {}).prototype);
function createIterResult1(value, done) {
    return {
        value,
        done
    };
}
function eventTargetAgnosticRemoveListener(emitter, name, listener, flags) {
    if (typeof emitter.removeListener === "function") {
        emitter.removeListener(name, listener);
    } else if (typeof emitter.removeEventListener === "function") {
        emitter.removeEventListener(name, listener, flags);
    } else {
        throw new ERR_INVALID_ARG_TYPE("emitter", "EventEmitter", emitter);
    }
}
function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
    if (typeof emitter.on === "function") {
        if (flags?.once) {
            emitter.once(name, listener);
        } else {
            emitter.on(name, listener);
        }
    } else if (typeof emitter.addEventListener === "function") {
        emitter.addEventListener(name, (arg)=>{
            listener(arg);
        }, flags);
    } else {
        throw new ERR_INVALID_ARG_TYPE("emitter", "EventEmitter", emitter);
    }
}
function on(emitter, event, options) {
    const signal = options?.signal;
    validateAbortSignal(signal, "options.signal");
    if (signal?.aborted) {
        throw new AbortError();
    }
    const unconsumedEvents = [];
    const unconsumedPromises = [];
    let error = null;
    let finished = false;
    const iterator = Object.setPrototypeOf({
        next () {
            const value = unconsumedEvents.shift();
            if (value) {
                return Promise.resolve(createIterResult1(value, false));
            }
            if (error) {
                const p = Promise.reject(error);
                error = null;
                return p;
            }
            if (finished) {
                return Promise.resolve(createIterResult1(undefined, true));
            }
            return new Promise(function(resolve, reject) {
                unconsumedPromises.push({
                    resolve,
                    reject
                });
            });
        },
        return () {
            eventTargetAgnosticRemoveListener(emitter, event, eventHandler);
            eventTargetAgnosticRemoveListener(emitter, "error", errorHandler);
            if (signal) {
                eventTargetAgnosticRemoveListener(signal, "abort", abortListener, {
                    once: true
                });
            }
            finished = true;
            for (const promise of unconsumedPromises){
                promise.resolve(createIterResult1(undefined, true));
            }
            return Promise.resolve(createIterResult1(undefined, true));
        },
        throw (err) {
            if (!err || !(err instanceof Error)) {
                throw new ERR_INVALID_ARG_TYPE("EventEmitter.AsyncIterator", "Error", err);
            }
            error = err;
            eventTargetAgnosticRemoveListener(emitter, event, eventHandler);
            eventTargetAgnosticRemoveListener(emitter, "error", errorHandler);
        },
        [Symbol.asyncIterator] () {
            return this;
        }
    }, AsyncIteratorPrototype);
    eventTargetAgnosticAddListener(emitter, event, eventHandler);
    if (event !== "error" && typeof emitter.on === "function") {
        emitter.on("error", errorHandler);
    }
    if (signal) {
        eventTargetAgnosticAddListener(signal, "abort", abortListener, {
            once: true
        });
    }
    return iterator;
    function abortListener() {
        errorHandler(new AbortError());
    }
    function eventHandler(...args) {
        const promise = unconsumedPromises.shift();
        if (promise) {
            promise.resolve(createIterResult1(args, false));
        } else {
            unconsumedEvents.push(args);
        }
    }
    function errorHandler(err) {
        finished = true;
        const toError = unconsumedPromises.shift();
        if (toError) {
            toError.reject(err);
        } else {
            error = err;
        }
        iterator.return();
    }
}
function Stream(opts) {
    EventEmitter2.call(this, opts);
}
Object.setPrototypeOf(Stream.prototype, EventEmitter2.prototype);
Object.setPrototypeOf(Stream, EventEmitter2);
Stream.prototype.pipe = function(dest, options) {
    const source = this;
    function ondata(chunk) {
        if (dest.writable && dest.write(chunk) === false && source.pause) {
            source.pause();
        }
    }
    source.on("data", ondata);
    function ondrain() {
        if (source.readable && source.resume) {
            source.resume();
        }
    }
    dest.on("drain", ondrain);
    if (!dest._isStdio && (!options || options.end !== false)) {
        source.on("end", onend);
        source.on("close", onclose);
    }
    let didOnEnd = false;
    function onend() {
        if (didOnEnd) return;
        didOnEnd = true;
        dest.end();
    }
    function onclose() {
        if (didOnEnd) return;
        didOnEnd = true;
        if (typeof dest.destroy === "function") dest.destroy();
    }
    function onerror(er) {
        cleanup();
        if (EventEmitter2.listenerCount(this, "error") === 0) {
            this.emit("error", er);
        }
    }
    prependListener(source, "error", onerror);
    prependListener(dest, "error", onerror);
    function cleanup() {
        source.removeListener("data", ondata);
        dest.removeListener("drain", ondrain);
        source.removeListener("end", onend);
        source.removeListener("close", onclose);
        source.removeListener("error", onerror);
        dest.removeListener("error", onerror);
        source.removeListener("end", cleanup);
        source.removeListener("close", cleanup);
        dest.removeListener("close", cleanup);
    }
    source.on("end", cleanup);
    source.on("close", cleanup);
    dest.on("close", cleanup);
    dest.emit("pipe", source);
    return dest;
};
function prependListener(emitter, event, fn) {
    if (typeof emitter.prependListener === "function") {
        return emitter.prependListener(event, fn);
    }
    if (!emitter._events || !emitter._events[event]) {
        emitter.on(event, fn);
    } else if (Array.isArray(emitter._events[event])) {
        emitter._events[event].unshift(fn);
    } else {
        emitter._events[event] = [
            fn,
            emitter._events[event]
        ];
    }
}
var NotImplemented;
(function(NotImplemented) {
    NotImplemented[NotImplemented["ascii"] = 0] = "ascii";
    NotImplemented[NotImplemented["latin1"] = 1] = "latin1";
    NotImplemented[NotImplemented["utf16le"] = 2] = "utf16le";
})(NotImplemented || (NotImplemented = {}));
function normalizeEncoding2(enc) {
    const encoding = normalizeEncoding1(enc ?? null);
    if (encoding && encoding in NotImplemented) notImplemented(encoding);
    if (!encoding && typeof enc === "string" && enc.toLowerCase() !== "raw") {
        throw new Error(`Unknown encoding: ${enc}`);
    }
    return String(encoding);
}
function utf8CheckByte(__byte) {
    if (__byte <= 0x7f) return 0;
    else if (__byte >> 5 === 0x06) return 2;
    else if (__byte >> 4 === 0x0e) return 3;
    else if (__byte >> 3 === 0x1e) return 4;
    return __byte >> 6 === 0x02 ? -1 : -2;
}
function utf8CheckIncomplete(self1, buf, i) {
    let j = buf.length - 1;
    if (j < i) return 0;
    let nb = utf8CheckByte(buf[j]);
    if (nb >= 0) {
        if (nb > 0) self1.lastNeed = nb - 1;
        return nb;
    }
    if (--j < i || nb === -2) return 0;
    nb = utf8CheckByte(buf[j]);
    if (nb >= 0) {
        if (nb > 0) self1.lastNeed = nb - 2;
        return nb;
    }
    if (--j < i || nb === -2) return 0;
    nb = utf8CheckByte(buf[j]);
    if (nb >= 0) {
        if (nb > 0) {
            if (nb === 2) nb = 0;
            else self1.lastNeed = nb - 3;
        }
        return nb;
    }
    return 0;
}
function utf8CheckExtraBytes(self1, buf) {
    if ((buf[0] & 0xc0) !== 0x80) {
        self1.lastNeed = 0;
        return "\ufffd";
    }
    if (self1.lastNeed > 1 && buf.length > 1) {
        if ((buf[1] & 0xc0) !== 0x80) {
            self1.lastNeed = 1;
            return "\ufffd";
        }
        if (self1.lastNeed > 2 && buf.length > 2) {
            if ((buf[2] & 0xc0) !== 0x80) {
                self1.lastNeed = 2;
                return "\ufffd";
            }
        }
    }
}
function utf8FillLastComplete(buf) {
    const p = this.lastTotal - this.lastNeed;
    const r = utf8CheckExtraBytes(this, buf);
    if (r !== undefined) return r;
    if (this.lastNeed <= buf.length) {
        buf.copy(this.lastChar, p, 0, this.lastNeed);
        return this.lastChar.toString(this.encoding, 0, this.lastTotal);
    }
    buf.copy(this.lastChar, p, 0, buf.length);
    this.lastNeed -= buf.length;
}
function utf8FillLastIncomplete(buf) {
    if (this.lastNeed <= buf.length) {
        buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
        return this.lastChar.toString(this.encoding, 0, this.lastTotal);
    }
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
    this.lastNeed -= buf.length;
}
function utf8Text(buf, i) {
    const total = utf8CheckIncomplete(this, buf, i);
    if (!this.lastNeed) return buf.toString("utf8", i);
    this.lastTotal = total;
    const end = buf.length - (total - this.lastNeed);
    buf.copy(this.lastChar, 0, end);
    return buf.toString("utf8", i, end);
}
function utf8End(buf) {
    const r = buf && buf.length ? this.write(buf) : "";
    if (this.lastNeed) return r + "\ufffd";
    return r;
}
function utf8Write(buf) {
    if (typeof buf === "string") {
        return buf;
    }
    if (buf.length === 0) return "";
    let r;
    let i;
    if (this.lastNeed) {
        r = this.fillLast(buf);
        if (r === undefined) return "";
        i = this.lastNeed;
        this.lastNeed = 0;
    } else {
        i = 0;
    }
    if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
    return r || "";
}
function base64Text(buf, i) {
    const n = (buf.length - i) % 3;
    if (n === 0) return buf.toString("base64", i);
    this.lastNeed = 3 - n;
    this.lastTotal = 3;
    if (n === 1) {
        this.lastChar[0] = buf[buf.length - 1];
    } else {
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
    }
    return buf.toString("base64", i, buf.length - n);
}
function base64End(buf) {
    const r = buf && buf.length ? this.write(buf) : "";
    if (this.lastNeed) {
        return r + this.lastChar.toString("base64", 0, 3 - this.lastNeed);
    }
    return r;
}
function simpleWrite(buf) {
    if (typeof buf === "string") {
        return buf;
    }
    return buf.toString(this.encoding);
}
function simpleEnd(buf) {
    return buf && buf.length ? this.write(buf) : "";
}
class StringDecoderBase {
    lastChar;
    lastNeed;
    lastTotal;
    constructor(encoding, nb){
        this.encoding = encoding;
        this.lastNeed = 0;
        this.lastTotal = 0;
        this.lastChar = Buffer.allocUnsafe(nb);
    }
    encoding;
}
class Base64Decoder extends StringDecoderBase {
    end = base64End;
    fillLast = utf8FillLastIncomplete;
    text = base64Text;
    write = utf8Write;
    constructor(encoding){
        super(normalizeEncoding2(encoding), 3);
    }
}
class GenericDecoder extends StringDecoderBase {
    end = simpleEnd;
    fillLast = undefined;
    text = utf8Text;
    write = simpleWrite;
    constructor(encoding){
        super(normalizeEncoding2(encoding), 4);
    }
}
class Utf8Decoder extends StringDecoderBase {
    end = utf8End;
    fillLast = utf8FillLastComplete;
    text = utf8Text;
    write = utf8Write;
    constructor(encoding){
        super(normalizeEncoding2(encoding), 4);
    }
}
class StringDecoder {
    encoding;
    end;
    fillLast;
    lastChar;
    lastNeed;
    lastTotal;
    text;
    write;
    constructor(encoding){
        let decoder;
        switch(encoding){
            case "utf8":
                decoder = new Utf8Decoder(encoding);
                break;
            case "base64":
                decoder = new Base64Decoder(encoding);
                break;
            default:
                decoder = new GenericDecoder(encoding);
        }
        this.encoding = decoder.encoding;
        this.end = decoder.end;
        this.fillLast = decoder.fillLast;
        this.lastChar = decoder.lastChar;
        this.lastNeed = decoder.lastNeed;
        this.lastTotal = decoder.lastTotal;
        this.text = decoder.text;
        this.write = decoder.write;
    }
}
new Proxy(StringDecoder, {
    apply (_target, thisArg, args) {
        return Object.assign(thisArg, new StringDecoder(...args));
    }
});
class BufferList {
    constructor(){
        this.head = null;
        this.tail = null;
        this.length = 0;
    }
    push(v) {
        const entry = {
            data: v,
            next: null
        };
        if (this.length > 0) {
            this.tail.next = entry;
        } else {
            this.head = entry;
        }
        this.tail = entry;
        ++this.length;
    }
    unshift(v) {
        const entry = {
            data: v,
            next: this.head
        };
        if (this.length === 0) {
            this.tail = entry;
        }
        this.head = entry;
        ++this.length;
    }
    shift() {
        if (this.length === 0) {
            return;
        }
        const ret = this.head.data;
        if (this.length === 1) {
            this.head = this.tail = null;
        } else {
            this.head = this.head.next;
        }
        --this.length;
        return ret;
    }
    clear() {
        this.head = this.tail = null;
        this.length = 0;
    }
    join(s) {
        if (this.length === 0) {
            return "";
        }
        let p = this.head;
        let ret = "" + p.data;
        while(p = p.next){
            ret += s + p.data;
        }
        return ret;
    }
    concat(n) {
        if (this.length === 0) {
            return Buffer.alloc(0);
        }
        const ret = Buffer.allocUnsafe(n >>> 0);
        let p = this.head;
        let i = 0;
        while(p){
            ret.set(p.data, i);
            i += p.data.length;
            p = p.next;
        }
        return ret;
    }
    consume(n, hasStrings) {
        const data = this.head.data;
        if (n < data.length) {
            const slice = data.slice(0, n);
            this.head.data = data.slice(n);
            return slice;
        }
        if (n === data.length) {
            return this.shift();
        }
        return hasStrings ? this._getString(n) : this._getBuffer(n);
    }
    first() {
        return this.head.data;
    }
    *[Symbol.iterator]() {
        for(let p = this.head; p; p = p.next){
            yield p.data;
        }
    }
    _getString(n) {
        let ret = "";
        let p = this.head;
        let c = 0;
        do {
            const str = p.data;
            if (n > str.length) {
                ret += str;
                n -= str.length;
            } else {
                if (n === str.length) {
                    ret += str;
                    ++c;
                    if (p.next) {
                        this.head = p.next;
                    } else {
                        this.head = this.tail = null;
                    }
                } else {
                    ret += str.slice(0, n);
                    this.head = p;
                    p.data = str.slice(n);
                }
                break;
            }
            ++c;
        }while (p = p.next)
        this.length -= c;
        return ret;
    }
    _getBuffer(n) {
        const ret = Buffer.allocUnsafe(n);
        const retLen = n;
        let p = this.head;
        let c = 0;
        do {
            const buf = p.data;
            if (n > buf.length) {
                ret.set(buf, retLen - n);
                n -= buf.length;
            } else {
                if (n === buf.length) {
                    ret.set(buf, retLen - n);
                    ++c;
                    if (p.next) {
                        this.head = p.next;
                    } else {
                        this.head = this.tail = null;
                    }
                } else {
                    ret.set(new Uint8Array(buf.buffer, buf.byteOffset, n), retLen - n);
                    this.head = p;
                    p.data = buf.slice(n);
                }
                break;
            }
            ++c;
        }while (p = p.next)
        this.length -= c;
        return ret;
    }
    [inspect.custom](_, options) {
        return inspect(this, {
            ...options,
            depth: 0,
            customInspect: false
        });
    }
}
let debug = debuglog("stream", (fn)=>{
    debug = fn;
});
const kPaused = Symbol("kPaused");
Object.setPrototypeOf(Readable.prototype, Stream.prototype);
Object.setPrototypeOf(Readable, Stream);
const nop1 = ()=>{};
const { errorOrDestroy: errorOrDestroy1  } = __default1;
function ReadableState(options, stream, isDuplex) {
    if (typeof isDuplex !== "boolean") {
        isDuplex = stream instanceof Stream.Duplex;
    }
    this.objectMode = !!(options && options.objectMode);
    if (isDuplex) {
        this.objectMode = this.objectMode || !!(options && options.readableObjectMode);
    }
    this.highWaterMark = options ? getHighWaterMark(this, options, "readableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
    this.buffer = new BufferList();
    this.length = 0;
    this.pipes = [];
    this.flowing = null;
    this.ended = false;
    this.endEmitted = false;
    this.reading = false;
    this.constructed = true;
    this.sync = true;
    this.needReadable = false;
    this.emittedReadable = false;
    this.readableListening = false;
    this.resumeScheduled = false;
    this[kPaused] = null;
    this.errorEmitted = false;
    this.emitClose = !options || options.emitClose !== false;
    this.autoDestroy = !options || options.autoDestroy !== false;
    this.destroyed = false;
    this.errored = null;
    this.closed = false;
    this.closeEmitted = false;
    this.defaultEncoding = options && options.defaultEncoding || "utf8";
    this.awaitDrainWriters = null;
    this.multiAwaitDrain = false;
    this.readingMore = false;
    this.dataEmitted = false;
    this.decoder = null;
    this.encoding = null;
    if (options && options.encoding) {
        this.decoder = new StringDecoder(options.encoding);
        this.encoding = options.encoding;
    }
}
function Readable(options) {
    if (!(this instanceof Readable)) {
        return new Readable(options);
    }
    const isDuplex = this instanceof Stream.Duplex;
    this._readableState = new ReadableState(options, this, isDuplex);
    if (options) {
        if (typeof options.read === "function") {
            this._read = options.read;
        }
        if (typeof options.destroy === "function") {
            this._destroy = options.destroy;
        }
        if (typeof options.construct === "function") {
            this._construct = options.construct;
        }
        if (options.signal && !isDuplex) {
            addAbortSignalNoValidate(options.signal, this);
        }
    }
    Stream.call(this, options);
    __default1.construct(this, ()=>{
        if (this._readableState.needReadable) {
            maybeReadMore(this, this._readableState);
        }
    });
}
Readable.prototype.destroy = __default1.destroy;
Readable.prototype._undestroy = __default1.undestroy;
Readable.prototype._destroy = function(err, cb) {
    cb(err);
};
Readable.prototype[EventEmitter2.captureRejectionSymbol] = function(err) {
    this.destroy(err);
};
Readable.prototype.push = function(chunk, encoding) {
    return readableAddChunk(this, chunk, encoding, false);
};
Readable.prototype.unshift = function(chunk, encoding) {
    return readableAddChunk(this, chunk, encoding, true);
};
function readableAddChunk(stream, chunk, encoding, addToFront) {
    debug("readableAddChunk", chunk);
    const state = stream._readableState;
    let err;
    if (!state.objectMode) {
        if (typeof chunk === "string") {
            encoding = encoding || state.defaultEncoding;
            if (state.encoding !== encoding) {
                if (addToFront && state.encoding) {
                    chunk = Buffer.from(chunk, encoding).toString(state.encoding);
                } else {
                    chunk = Buffer.from(chunk, encoding);
                    encoding = "";
                }
            }
        } else if (chunk instanceof Buffer) {
            encoding = "";
        } else if (Stream._isUint8Array(chunk)) {
            chunk = Stream._uint8ArrayToBuffer(chunk);
            encoding = "";
        } else if (chunk != null) {
            err = new ERR_INVALID_ARG_TYPE("chunk", [
                "string",
                "Buffer",
                "Uint8Array"
            ], chunk);
        }
    }
    if (err) {
        errorOrDestroy1(stream, err);
    } else if (chunk === null) {
        state.reading = false;
        onEofChunk(stream, state);
    } else if (state.objectMode || chunk && chunk.length > 0) {
        if (addToFront) {
            if (state.endEmitted) {
                errorOrDestroy1(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());
            } else {
                addChunk(stream, state, chunk, true);
            }
        } else if (state.ended) {
            errorOrDestroy1(stream, new ERR_STREAM_PUSH_AFTER_EOF());
        } else if (state.destroyed || state.errored) {
            return false;
        } else {
            state.reading = false;
            if (state.decoder && !encoding) {
                chunk = state.decoder.write(chunk);
                if (state.objectMode || chunk.length !== 0) {
                    addChunk(stream, state, chunk, false);
                } else {
                    maybeReadMore(stream, state);
                }
            } else {
                addChunk(stream, state, chunk, false);
            }
        }
    } else if (!addToFront) {
        state.reading = false;
        maybeReadMore(stream, state);
    }
    return !state.ended && (state.length < state.highWaterMark || state.length === 0);
}
function addChunk(stream, state, chunk, addToFront) {
    if (state.flowing && state.length === 0 && !state.sync && stream.listenerCount("data") > 0) {
        if (state.multiAwaitDrain) {
            state.awaitDrainWriters.clear();
        } else {
            state.awaitDrainWriters = null;
        }
        state.dataEmitted = true;
        stream.emit("data", chunk);
    } else {
        state.length += state.objectMode ? 1 : chunk.length;
        if (addToFront) {
            state.buffer.unshift(chunk);
        } else {
            state.buffer.push(chunk);
        }
        if (state.needReadable) {
            emitReadable(stream);
        }
    }
    maybeReadMore(stream, state);
}
Readable.prototype.isPaused = function() {
    const state = this._readableState;
    return state[kPaused] === true || state.flowing === false;
};
Readable.prototype.setEncoding = function(enc) {
    const decoder = new StringDecoder(enc);
    this._readableState.decoder = decoder;
    this._readableState.encoding = this._readableState.decoder.encoding;
    const buffer = this._readableState.buffer;
    let content = "";
    for (const data of buffer){
        content += decoder.write(data);
    }
    buffer.clear();
    if (content !== "") {
        buffer.push(content);
    }
    this._readableState.length = content.length;
    return this;
};
const MAX_HWM = 0x40000000;
function computeNewHighWaterMark(n) {
    if (n >= 0x40000000) {
        n = MAX_HWM;
    } else {
        n--;
        n |= n >>> 1;
        n |= n >>> 2;
        n |= n >>> 4;
        n |= n >>> 8;
        n |= n >>> 16;
        n++;
    }
    return n;
}
function howMuchToRead(n, state) {
    if (n <= 0 || state.length === 0 && state.ended) {
        return 0;
    }
    if (state.objectMode) {
        return 1;
    }
    if (Number.isNaN(n)) {
        if (state.flowing && state.length) {
            return state.buffer.first().length;
        }
        return state.length;
    }
    if (n <= state.length) {
        return n;
    }
    return state.ended ? state.length : 0;
}
Readable.prototype.read = function(n) {
    debug("read", n);
    if (n === undefined) {
        n = NaN;
    } else if (!Number.isInteger(n)) {
        n = Number.parseInt(n, 10);
    }
    const state = this._readableState;
    const nOrig = n;
    if (n > state.highWaterMark) {
        state.highWaterMark = computeNewHighWaterMark(n);
    }
    if (n !== 0) {
        state.emittedReadable = false;
    }
    if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
        debug("read: emitReadable", state.length, state.ended);
        if (state.length === 0 && state.ended) {
            endReadable(this);
        } else {
            emitReadable(this);
        }
        return null;
    }
    n = howMuchToRead(n, state);
    if (n === 0 && state.ended) {
        if (state.length === 0) {
            endReadable(this);
        }
        return null;
    }
    let doRead = state.needReadable;
    debug("need readable", doRead);
    if (state.length === 0 || state.length - n < state.highWaterMark) {
        doRead = true;
        debug("length less than watermark", doRead);
    }
    if (state.ended || state.reading || state.destroyed || state.errored || !state.constructed) {
        doRead = false;
        debug("reading, ended or constructing", doRead);
    } else if (doRead) {
        debug("do read");
        state.reading = true;
        state.sync = true;
        if (state.length === 0) {
            state.needReadable = true;
        }
        this._read(state.highWaterMark);
        state.sync = false;
        if (!state.reading) {
            n = howMuchToRead(nOrig, state);
        }
    }
    let ret;
    if (n > 0) {
        ret = fromList(n, state);
    } else {
        ret = null;
    }
    if (ret === null) {
        state.needReadable = state.length <= state.highWaterMark;
        n = 0;
    } else {
        state.length -= n;
        if (state.multiAwaitDrain) {
            state.awaitDrainWriters.clear();
        } else {
            state.awaitDrainWriters = null;
        }
    }
    if (state.length === 0) {
        if (!state.ended) {
            state.needReadable = true;
        }
        if (nOrig !== n && state.ended) {
            endReadable(this);
        }
    }
    if (ret !== null) {
        state.dataEmitted = true;
        this.emit("data", ret);
    }
    return ret;
};
function onEofChunk(stream, state) {
    debug("onEofChunk");
    if (state.ended) return;
    if (state.decoder) {
        const chunk = state.decoder.end();
        if (chunk && chunk.length) {
            state.buffer.push(chunk);
            state.length += state.objectMode ? 1 : chunk.length;
        }
    }
    state.ended = true;
    if (state.sync) {
        emitReadable(stream);
    } else {
        state.needReadable = false;
        state.emittedReadable = true;
        emitReadable_(stream);
    }
}
function emitReadable(stream) {
    const state = stream._readableState;
    debug("emitReadable", state.needReadable, state.emittedReadable);
    state.needReadable = false;
    if (!state.emittedReadable) {
        debug("emitReadable", state.flowing);
        state.emittedReadable = true;
        nextTick(emitReadable_, stream);
    }
}
function emitReadable_(stream) {
    const state = stream._readableState;
    debug("emitReadable_", state.destroyed, state.length, state.ended);
    if (!state.destroyed && !state.errored && (state.length || state.ended)) {
        stream.emit("readable");
        state.emittedReadable = false;
    }
    state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
    flow(stream);
}
function maybeReadMore(stream, state) {
    if (!state.readingMore && state.constructed) {
        state.readingMore = true;
        nextTick(maybeReadMore_, stream, state);
    }
}
function maybeReadMore_(stream, state) {
    while(!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)){
        const len = state.length;
        debug("maybeReadMore read 0");
        stream.read(0);
        if (len === state.length) {
            break;
        }
    }
    state.readingMore = false;
}
Readable.prototype._read = function(n) {
    throw new ERR_METHOD_NOT_IMPLEMENTED("_read()");
};
Readable.prototype.pipe = function(dest, pipeOpts) {
    const src = this;
    const state = this._readableState;
    if (state.pipes.length === 1) {
        if (!state.multiAwaitDrain) {
            state.multiAwaitDrain = true;
            state.awaitDrainWriters = new Set(state.awaitDrainWriters ? [
                state.awaitDrainWriters
            ] : []);
        }
    }
    state.pipes.push(dest);
    debug("pipe count=%d opts=%j", state.pipes.length, pipeOpts);
    const doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== stdio.stdout && dest !== stdio.stderr;
    const endFn = doEnd ? onend : unpipe;
    if (state.endEmitted) {
        nextTick(endFn);
    } else {
        src.once("end", endFn);
    }
    dest.on("unpipe", onunpipe);
    function onunpipe(readable, unpipeInfo) {
        debug("onunpipe");
        if (readable === src) {
            if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
                unpipeInfo.hasUnpiped = true;
                cleanup();
            }
        }
    }
    function onend() {
        debug("onend");
        dest.end();
    }
    let ondrain;
    let cleanedUp = false;
    function cleanup() {
        debug("cleanup");
        dest.removeListener("close", onclose);
        dest.removeListener("finish", onfinish);
        if (ondrain) {
            dest.removeListener("drain", ondrain);
        }
        dest.removeListener("error", onerror);
        dest.removeListener("unpipe", onunpipe);
        src.removeListener("end", onend);
        src.removeListener("end", unpipe);
        src.removeListener("data", ondata);
        cleanedUp = true;
        if (ondrain && state.awaitDrainWriters && (!dest._writableState || dest._writableState.needDrain)) {
            ondrain();
        }
    }
    function pause() {
        if (!cleanedUp) {
            if (state.pipes.length === 1 && state.pipes[0] === dest) {
                debug("false write response, pause", 0);
                state.awaitDrainWriters = dest;
                state.multiAwaitDrain = false;
            } else if (state.pipes.length > 1 && state.pipes.includes(dest)) {
                debug("false write response, pause", state.awaitDrainWriters.size);
                state.awaitDrainWriters.add(dest);
            }
            src.pause();
        }
        if (!ondrain) {
            ondrain = pipeOnDrain(src, dest);
            dest.on("drain", ondrain);
        }
    }
    src.on("data", ondata);
    function ondata(chunk) {
        debug("ondata");
        const ret = dest.write(chunk);
        debug("dest.write", ret);
        if (ret === false) {
            pause();
        }
    }
    function onerror(er) {
        debug("onerror", er);
        unpipe();
        dest.removeListener("error", onerror);
        if (EventEmitter2.listenerCount(dest, "error") === 0) {
            const s = dest._writableState || dest._readableState;
            if (s && !s.errorEmitted) {
                errorOrDestroy1(dest, er);
            } else {
                dest.emit("error", er);
            }
        }
    }
    prependListener(dest, "error", onerror);
    function onclose() {
        dest.removeListener("finish", onfinish);
        unpipe();
    }
    dest.once("close", onclose);
    function onfinish() {
        debug("onfinish");
        dest.removeListener("close", onclose);
        unpipe();
    }
    dest.once("finish", onfinish);
    function unpipe() {
        debug("unpipe");
        src.unpipe(dest);
    }
    dest.emit("pipe", src);
    if (dest.writableNeedDrain === true) {
        if (state.flowing) {
            pause();
        }
    } else if (!state.flowing) {
        debug("pipe resume");
        src.resume();
    }
    return dest;
};
function pipeOnDrain(src, dest) {
    return function pipeOnDrainFunctionResult() {
        const state = src._readableState;
        if (state.awaitDrainWriters === dest) {
            debug("pipeOnDrain", 1);
            state.awaitDrainWriters = null;
        } else if (state.multiAwaitDrain) {
            debug("pipeOnDrain", state.awaitDrainWriters.size);
            state.awaitDrainWriters.delete(dest);
        }
        if ((!state.awaitDrainWriters || state.awaitDrainWriters.size === 0) && EventEmitter2.listenerCount(src, "data")) {
            state.flowing = true;
            flow(src);
        }
    };
}
Readable.prototype.unpipe = function(dest) {
    const state = this._readableState;
    const unpipeInfo = {
        hasUnpiped: false
    };
    if (state.pipes.length === 0) {
        return this;
    }
    if (!dest) {
        const dests = state.pipes;
        state.pipes = [];
        this.pause();
        for(let i = 0; i < dests.length; i++){
            dests[i].emit("unpipe", this, {
                hasUnpiped: false
            });
        }
        return this;
    }
    const index = state.pipes.indexOf(dest);
    if (index === -1) {
        return this;
    }
    state.pipes.splice(index, 1);
    if (state.pipes.length === 0) {
        this.pause();
    }
    dest.emit("unpipe", this, unpipeInfo);
    return this;
};
Readable.prototype.on = function(ev, fn) {
    const res = Stream.prototype.on.call(this, ev, fn);
    const state = this._readableState;
    if (ev === "data") {
        state.readableListening = this.listenerCount("readable") > 0;
        if (state.flowing !== false) {
            this.resume();
        }
    } else if (ev === "readable") {
        if (!state.endEmitted && !state.readableListening) {
            state.readableListening = state.needReadable = true;
            state.flowing = false;
            state.emittedReadable = false;
            debug("on readable", state.length, state.reading);
            if (state.length) {
                emitReadable(this);
            } else if (!state.reading) {
                nextTick(nReadingNextTick, this);
            }
        }
    }
    return res;
};
Readable.prototype.addListener = Readable.prototype.on;
Readable.prototype.removeListener = function(ev, fn) {
    const res = Stream.prototype.removeListener.call(this, ev, fn);
    if (ev === "readable") {
        nextTick(updateReadableListening, this);
    }
    return res;
};
Readable.prototype.off = Readable.prototype.removeListener;
Readable.prototype.removeAllListeners = function(ev) {
    const res = Stream.prototype.removeAllListeners.apply(this, arguments);
    if (ev === "readable" || ev === undefined) {
        nextTick(updateReadableListening, this);
    }
    return res;
};
function updateReadableListening(self1) {
    const state = self1._readableState;
    state.readableListening = self1.listenerCount("readable") > 0;
    if (state.resumeScheduled && state[kPaused] === false) {
        state.flowing = true;
    } else if (self1.listenerCount("data") > 0) {
        self1.resume();
    } else if (!state.readableListening) {
        state.flowing = null;
    }
}
function nReadingNextTick(self1) {
    debug("readable nexttick read 0");
    self1.read(0);
}
Readable.prototype.resume = function() {
    const state = this._readableState;
    if (!state.flowing) {
        debug("resume");
        state.flowing = !state.readableListening;
        resume(this, state);
    }
    state[kPaused] = false;
    return this;
};
function resume(stream, state) {
    if (!state.resumeScheduled) {
        state.resumeScheduled = true;
        nextTick(resume_, stream, state);
    }
}
function resume_(stream, state) {
    debug("resume", state.reading);
    if (!state.reading) {
        stream.read(0);
    }
    state.resumeScheduled = false;
    stream.emit("resume");
    flow(stream);
    if (state.flowing && !state.reading) {
        stream.read(0);
    }
}
Readable.prototype.pause = function() {
    debug("call pause flowing=%j", this._readableState.flowing);
    if (this._readableState.flowing !== false) {
        debug("pause");
        this._readableState.flowing = false;
        this.emit("pause");
    }
    this._readableState[kPaused] = true;
    return this;
};
function flow(stream) {
    const state = stream._readableState;
    debug("flow", state.flowing);
    while(state.flowing && stream.read() !== null);
}
Readable.prototype.wrap = function(stream) {
    let paused = false;
    stream.on("data", (chunk)=>{
        if (!this.push(chunk) && stream.pause) {
            paused = true;
            stream.pause();
        }
    });
    stream.on("end", ()=>{
        this.push(null);
    });
    stream.on("error", (err)=>{
        errorOrDestroy1(this, err);
    });
    stream.on("close", ()=>{
        this.destroy();
    });
    stream.on("destroy", ()=>{
        this.destroy();
    });
    this._read = ()=>{
        if (paused && stream.resume) {
            paused = false;
            stream.resume();
        }
    };
    const streamKeys = Object.keys(stream);
    for(let j = 1; j < streamKeys.length; j++){
        const i = streamKeys[j];
        if (this[i] === undefined && typeof stream[i] === "function") {
            this[i] = stream[i].bind(stream);
        }
    }
    return this;
};
Readable.prototype[Symbol.asyncIterator] = function() {
    return streamToAsyncIterator(this);
};
Readable.prototype.iterator = function(options) {
    if (options !== undefined) {
        validateObject(options, "options");
    }
    return streamToAsyncIterator(this, options);
};
function streamToAsyncIterator(stream, options) {
    if (typeof stream.read !== "function") {
        stream = Readable.wrap(stream, {
            objectMode: true
        });
    }
    const iter = createAsyncIterator(stream, options);
    iter.stream = stream;
    return iter;
}
async function* createAsyncIterator(stream, options) {
    let callback = nop1;
    const opts = {
        destroyOnReturn: true,
        destroyOnError: true,
        ...options
    };
    function next(resolve) {
        if (this === stream) {
            callback();
            callback = nop1;
        } else {
            callback = resolve;
        }
    }
    const state = stream._readableState;
    let error = state.errored;
    let errorEmitted = state.errorEmitted;
    let endEmitted = state.endEmitted;
    let closeEmitted = state.closeEmitted;
    stream.on("readable", next).on("error", function(err) {
        error = err;
        errorEmitted = true;
        next.call(this);
    }).on("end", function() {
        endEmitted = true;
        next.call(this);
    }).on("close", function() {
        closeEmitted = true;
        next.call(this);
    });
    let errorThrown = false;
    try {
        while(true){
            const chunk = stream.destroyed ? null : stream.read();
            if (chunk !== null) {
                yield chunk;
            } else if (errorEmitted) {
                throw error;
            } else if (endEmitted) {
                break;
            } else if (closeEmitted) {
                break;
            } else {
                await new Promise(next);
            }
        }
    } catch (err) {
        if (opts.destroyOnError) {
            __default1.destroyer(stream, err);
        }
        errorThrown = true;
        throw err;
    } finally{
        if (!errorThrown && opts.destroyOnReturn) {
            if (state.autoDestroy || !endEmitted) {
                __default1.destroyer(stream, null);
            }
        }
    }
}
Object.defineProperties(Readable.prototype, {
    readable: {
        get () {
            const r = this._readableState;
            return !!r && r.readable !== false && !r.destroyed && !r.errorEmitted && !r.endEmitted;
        },
        set (val) {
            if (this._readableState) {
                this._readableState.readable = !!val;
            }
        }
    },
    readableDidRead: {
        enumerable: false,
        get: function() {
            return this._readableState.dataEmitted;
        }
    },
    readableAborted: {
        enumerable: false,
        get: function() {
            return !!(this._readableState.destroyed || this._readableState.errored) && !this._readableState.endEmitted;
        }
    },
    readableHighWaterMark: {
        enumerable: false,
        get: function() {
            return this._readableState.highWaterMark;
        }
    },
    readableBuffer: {
        enumerable: false,
        get: function() {
            return this._readableState && this._readableState.buffer;
        }
    },
    readableFlowing: {
        enumerable: false,
        get: function() {
            return this._readableState.flowing;
        },
        set: function(state) {
            if (this._readableState) {
                this._readableState.flowing = state;
            }
        }
    },
    readableLength: {
        enumerable: false,
        get () {
            return this._readableState.length;
        }
    },
    readableObjectMode: {
        enumerable: false,
        get () {
            return this._readableState ? this._readableState.objectMode : false;
        }
    },
    readableEncoding: {
        enumerable: false,
        get () {
            return this._readableState ? this._readableState.encoding : null;
        }
    },
    destroyed: {
        enumerable: false,
        get () {
            if (this._readableState === undefined) {
                return false;
            }
            return this._readableState.destroyed;
        },
        set (value) {
            if (!this._readableState) {
                return;
            }
            this._readableState.destroyed = value;
        }
    },
    readableEnded: {
        enumerable: false,
        get () {
            return this._readableState ? this._readableState.endEmitted : false;
        }
    }
});
Object.defineProperties(ReadableState.prototype, {
    pipesCount: {
        get () {
            return this.pipes.length;
        }
    },
    paused: {
        get () {
            return this[kPaused] !== false;
        },
        set (value) {
            this[kPaused] = !!value;
        }
    }
});
function fromList(n, state) {
    if (state.length === 0) {
        return null;
    }
    let ret;
    if (state.objectMode) {
        ret = state.buffer.shift();
    } else if (!n || n >= state.length) {
        if (state.decoder) {
            ret = state.buffer.join("");
        } else if (state.buffer.length === 1) {
            ret = state.buffer.first();
        } else {
            ret = state.buffer.concat(state.length);
        }
        state.buffer.clear();
    } else {
        ret = state.buffer.consume(n, state.decoder);
    }
    return ret;
}
function endReadable(stream) {
    const state = stream._readableState;
    debug("endReadable", state.endEmitted);
    if (!state.endEmitted) {
        state.ended = true;
        nextTick(endReadableNT, state, stream);
    }
}
function endReadableNT(state, stream) {
    debug("endReadableNT", state.endEmitted, state.length);
    if (!state.errorEmitted && !state.closeEmitted && !state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.emit("end");
        if (stream.writable && stream.allowHalfOpen === false) {
            nextTick(endWritableNT, stream);
        } else if (state.autoDestroy) {
            const wState = stream._writableState;
            const autoDestroy = !wState || wState.autoDestroy && (wState.finished || wState.writable === false);
            if (autoDestroy) {
                stream.destroy();
            }
        }
    }
}
function endWritableNT(stream) {
    const writable = stream.writable && !stream.writableEnded && !stream.destroyed;
    if (writable) {
        stream.end();
    }
}
function readableFrom(iterable, opts) {
    return _from1(Readable, iterable, opts);
}
function isReadableStream(object) {
    return object instanceof ReadableStream;
}
Readable.fromWeb = function(readableStream, options = {}) {
    if (!isReadableStream(readableStream)) {
        throw new ERR_INVALID_ARG_TYPE("readableStream", "ReadableStream", readableStream);
    }
    validateObject(options, "options");
    const { highWaterMark , encoding , objectMode =false , signal  } = options;
    if (encoding !== undefined && !Buffer.isEncoding(encoding)) {
        throw new ERR_INVALID_ARG_VALUE(encoding, "options.encoding");
    }
    validateBoolean(objectMode, "options.objectMode");
    const reader = readableStream.getReader();
    let closed = false;
    const readable = new Readable({
        objectMode,
        highWaterMark,
        encoding,
        signal,
        read () {
            reader.read().then((chunk)=>{
                if (chunk.done) {
                    readable.push(null);
                } else {
                    readable.push(chunk.value);
                }
            }, (error)=>destroy.call(readable, error));
        },
        destroy (error, callback) {
            function done() {
                try {
                    callback(error);
                } catch (error1) {
                    process.nextTick(()=>{
                        throw error1;
                    });
                }
            }
            if (!closed) {
                reader.cancel(error).then(done, done);
                return;
            }
            done();
        }
    });
    reader.closed.then(()=>{
        closed = true;
        if (!isReadableEnded1(readable)) {
            readable.push(null);
        }
    }, (error)=>{
        closed = true;
        destroy.call(readable, error);
    });
    return readable;
};
function wrap(src, options) {
    return new Readable({
        objectMode: src.readableObjectMode ?? src.objectMode ?? true,
        ...options,
        destroy (err, callback) {
            __default1.destroyer(src, err);
            callback(err);
        }
    }).wrap(src);
}
Readable._fromList = fromList;
Readable.ReadableState = ReadableState;
Readable.from = readableFrom;
Readable.wrap = wrap;
const { errorOrDestroy: errorOrDestroy2  } = __default1;
function isDuplexStream(maybe_duplex) {
    const isReadable = Readable.prototype.isPrototypeOf(maybe_duplex);
    let prototype = maybe_duplex;
    let isDuplex = false;
    while(prototype?.constructor && prototype.constructor.name !== "Object"){
        if (prototype.constructor.name === "Duplex") {
            isDuplex = true;
            break;
        }
        prototype = Object.getPrototypeOf(prototype);
    }
    return isReadable && isDuplex;
}
Object.setPrototypeOf(Writable.prototype, Stream.prototype);
Object.setPrototypeOf(Writable, Stream);
function nop2() {}
const kOnFinished = Symbol("kOnFinished");
function WritableState(options, stream, isDuplex) {
    if (typeof isDuplex !== "boolean") {
        isDuplex = isDuplexStream(stream);
    }
    this.objectMode = !!(options && options.objectMode);
    if (isDuplex) {
        this.objectMode = this.objectMode || !!(options && options.writableObjectMode);
    }
    this.highWaterMark = options ? getHighWaterMark(this, options, "writableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
    this.finalCalled = false;
    this.needDrain = false;
    this.ending = false;
    this.ended = false;
    this.finished = false;
    this.destroyed = false;
    const noDecode = !!(options && options.decodeStrings === false);
    this.decodeStrings = !noDecode;
    this.defaultEncoding = options && options.defaultEncoding || "utf8";
    this.length = 0;
    this.writing = false;
    this.corked = 0;
    this.sync = true;
    this.bufferProcessing = false;
    this.onwrite = onwrite.bind(undefined, stream);
    this.writecb = null;
    this.writelen = 0;
    this.afterWriteTickInfo = null;
    resetBuffer(this);
    this.pendingcb = 0;
    this.constructed = true;
    this.prefinished = false;
    this.errorEmitted = false;
    this.emitClose = !options || options.emitClose !== false;
    this.autoDestroy = !options || options.autoDestroy !== false;
    this.errored = null;
    this.closed = false;
    this.closeEmitted = false;
    this[kOnFinished] = [];
}
function resetBuffer(state) {
    state.buffered = [];
    state.bufferedIndex = 0;
    state.allBuffers = true;
    state.allNoop = true;
}
WritableState.prototype.getBuffer = function getBuffer() {
    return this.buffered.slice(this.bufferedIndex);
};
Object.defineProperty(WritableState.prototype, "bufferedRequestCount", {
    get () {
        return this.buffered.length - this.bufferedIndex;
    }
});
function Writable(options) {
    const isDuplex = isDuplexStream(this);
    if (!isDuplex && !Function.prototype[Symbol.hasInstance].call(Writable, this)) {
        return new Writable(options);
    }
    this._writableState = new WritableState(options, this, isDuplex);
    if (options) {
        if (typeof options.write === "function") {
            this._write = options.write;
        }
        if (typeof options.writev === "function") {
            this._writev = options.writev;
        }
        if (typeof options.destroy === "function") {
            this._destroy = options.destroy;
        }
        if (typeof options.final === "function") {
            this._final = options.final;
        }
        if (typeof options.construct === "function") {
            this._construct = options.construct;
        }
        if (options.signal) {
            addAbortSignalNoValidate(options.signal, this);
        }
    }
    Stream.call(this, options);
    __default1.construct(this, ()=>{
        const state = this._writableState;
        if (!state.writing) {
            clearBuffer(this, state);
        }
        finishMaybe(this, state);
    });
}
Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function(object) {
        if (Function.prototype[Symbol.hasInstance].call(this, object)) return true;
        if (this !== Writable) return false;
        return object && object._writableState instanceof WritableState;
    }
});
Writable.prototype.pipe = function() {
    errorOrDestroy2(this, new ERR_STREAM_CANNOT_PIPE());
};
function _write(stream, chunk, encoding, cb) {
    const state = stream._writableState;
    if (typeof encoding === "function") {
        cb = encoding;
        encoding = state.defaultEncoding;
    } else {
        if (!encoding) {
            encoding = state.defaultEncoding;
        } else if (encoding !== "buffer" && !Buffer.isEncoding(encoding)) {
            throw new ERR_UNKNOWN_ENCODING(encoding);
        }
        if (typeof cb !== "function") {
            cb = nop2;
        }
    }
    if (chunk === null) {
        throw new ERR_STREAM_NULL_VALUES();
    } else if (!state.objectMode) {
        if (typeof chunk === "string") {
            if (state.decodeStrings !== false) {
                chunk = Buffer.from(chunk, encoding);
                encoding = "buffer";
            }
        } else if (chunk instanceof Buffer) {
            encoding = "buffer";
        } else if (isUint8Array(chunk)) {
            chunk = _uint8ArrayToBuffer(chunk);
            encoding = "buffer";
        } else {
            throw new ERR_INVALID_ARG_TYPE("chunk", [
                "string",
                "Buffer",
                "Uint8Array"
            ], chunk);
        }
    }
    let err;
    if (state.ending) {
        err = new ERR_STREAM_WRITE_AFTER_END();
    } else if (state.destroyed) {
        err = new ERR_STREAM_DESTROYED("write");
    }
    if (err) {
        nextTick(cb, err);
        errorOrDestroy2(stream, err, true);
        return err;
    }
    state.pendingcb++;
    return writeOrBuffer(stream, state, chunk, encoding, cb);
}
Writable.prototype.write = function(chunk, encoding, cb) {
    return _write(this, chunk, encoding, cb) === true;
};
Writable.prototype.cork = function() {
    this._writableState.corked++;
};
Writable.prototype.uncork = function() {
    const state = this._writableState;
    if (state.corked) {
        state.corked--;
        if (!state.writing) {
            clearBuffer(this, state);
        }
    }
};
Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
    if (typeof encoding === "string") {
        encoding = encoding.toLowerCase();
    }
    if (!Buffer.isEncoding(encoding)) {
        throw new ERR_UNKNOWN_ENCODING(encoding);
    }
    this._writableState.defaultEncoding = encoding;
    return this;
};
function writeOrBuffer(stream, state, chunk, encoding, callback) {
    const len = state.objectMode ? 1 : chunk.length;
    state.length += len;
    const ret = state.length < state.highWaterMark;
    if (!ret) {
        state.needDrain = true;
    }
    if (state.writing || state.corked || state.errored || !state.constructed) {
        state.buffered.push({
            chunk,
            encoding,
            callback
        });
        if (state.allBuffers && encoding !== "buffer") {
            state.allBuffers = false;
        }
        if (state.allNoop && callback !== nop2) {
            state.allNoop = false;
        }
    } else {
        state.writelen = len;
        state.writecb = callback;
        state.writing = true;
        state.sync = true;
        stream._write(chunk, encoding, state.onwrite);
        state.sync = false;
    }
    return ret && !state.errored && !state.destroyed;
}
function doWrite(stream, state, writev, len, chunk, encoding, cb) {
    state.writelen = len;
    state.writecb = cb;
    state.writing = true;
    state.sync = true;
    if (state.destroyed) {
        state.onwrite(new ERR_STREAM_DESTROYED("write"));
    } else if (writev) {
        stream._writev(chunk, state.onwrite);
    } else {
        stream._write(chunk, encoding, state.onwrite);
    }
    state.sync = false;
}
function onwriteError(stream, state, er, cb) {
    --state.pendingcb;
    cb(er);
    errorBuffer(state);
    errorOrDestroy2(stream, er);
}
function onwrite(stream, er) {
    const state = stream._writableState;
    const sync = state.sync;
    const cb = state.writecb;
    if (typeof cb !== "function") {
        errorOrDestroy2(stream, new ERR_MULTIPLE_CALLBACK());
        return;
    }
    state.writing = false;
    state.writecb = null;
    state.length -= state.writelen;
    state.writelen = 0;
    if (er) {
        er.stack;
        if (!state.errored) {
            state.errored = er;
        }
        if (stream._readableState && !stream._readableState.errored) {
            stream._readableState.errored = er;
        }
        if (sync) {
            nextTick(onwriteError, stream, state, er, cb);
        } else {
            onwriteError(stream, state, er, cb);
        }
    } else {
        if (state.buffered.length > state.bufferedIndex) {
            clearBuffer(stream, state);
        }
        if (sync) {
            if (state.afterWriteTickInfo !== null && state.afterWriteTickInfo.cb === cb) {
                state.afterWriteTickInfo.count++;
            } else {
                state.afterWriteTickInfo = {
                    count: 1,
                    cb,
                    stream,
                    state
                };
                nextTick(afterWriteTick, state.afterWriteTickInfo);
            }
        } else {
            afterWrite(stream, state, 1, cb);
        }
    }
}
function afterWriteTick({ stream , state , count , cb  }) {
    state.afterWriteTickInfo = null;
    return afterWrite(stream, state, count, cb);
}
function afterWrite(stream, state, count, cb) {
    const needDrain = !state.ending && !stream.destroyed && state.length === 0 && state.needDrain;
    if (needDrain) {
        state.needDrain = false;
        stream.emit("drain");
    }
    while(count-- > 0){
        state.pendingcb--;
        cb();
    }
    if (state.destroyed) {
        errorBuffer(state);
    }
    finishMaybe(stream, state);
}
function errorBuffer(state) {
    if (state.writing) {
        return;
    }
    for(let n = state.bufferedIndex; n < state.buffered.length; ++n){
        const { chunk , callback  } = state.buffered[n];
        const len = state.objectMode ? 1 : chunk.length;
        state.length -= len;
        callback(new ERR_STREAM_DESTROYED("write"));
    }
    const onfinishCallbacks = state[kOnFinished].splice(0);
    for(let i = 0; i < onfinishCallbacks.length; i++){
        onfinishCallbacks[i](new ERR_STREAM_DESTROYED("end"));
    }
    resetBuffer(state);
}
function clearBuffer(stream, state) {
    if (state.corked || state.bufferProcessing || state.destroyed || !state.constructed) {
        return;
    }
    const { buffered , bufferedIndex , objectMode  } = state;
    const bufferedLength = buffered.length - bufferedIndex;
    if (!bufferedLength) {
        return;
    }
    let i = bufferedIndex;
    state.bufferProcessing = true;
    if (bufferedLength > 1 && stream._writev) {
        state.pendingcb -= bufferedLength - 1;
        const callback = state.allNoop ? nop2 : (err)=>{
            for(let n = i; n < buffered.length; ++n){
                buffered[n].callback(err);
            }
        };
        const chunks = state.allNoop && i === 0 ? buffered : buffered.slice(i);
        chunks.allBuffers = state.allBuffers;
        doWrite(stream, state, true, state.length, chunks, "", callback);
        resetBuffer(state);
    } else {
        do {
            const { chunk , encoding , callback: callback1  } = buffered[i];
            buffered[i++] = null;
            const len = objectMode ? 1 : chunk.length;
            doWrite(stream, state, false, len, chunk, encoding, callback1);
        }while (i < buffered.length && !state.writing)
        if (i === buffered.length) {
            resetBuffer(state);
        } else if (i > 256) {
            buffered.splice(0, i);
            state.bufferedIndex = 0;
        } else {
            state.bufferedIndex = i;
        }
    }
    state.bufferProcessing = false;
}
Writable.prototype._write = function(chunk, encoding, cb) {
    if (this._writev) {
        this._writev([
            {
                chunk,
                encoding
            }
        ], cb);
    } else {
        throw new ERR_METHOD_NOT_IMPLEMENTED("_write()");
    }
};
Writable.prototype._writev = null;
Writable.prototype.end = function(chunk, encoding, cb) {
    const state = this._writableState;
    if (typeof chunk === "function") {
        cb = chunk;
        chunk = null;
        encoding = null;
    } else if (typeof encoding === "function") {
        cb = encoding;
        encoding = null;
    }
    let err;
    if (chunk !== null && chunk !== undefined) {
        const ret = _write(this, chunk, encoding);
        if (ret instanceof Error) {
            err = ret;
        }
    }
    if (state.corked) {
        state.corked = 1;
        this.uncork();
    }
    if (err) {} else if (!state.errored && !state.ending) {
        state.ending = true;
        finishMaybe(this, state, true);
        state.ended = true;
    } else if (state.finished) {
        err = new ERR_STREAM_ALREADY_FINISHED("end");
    } else if (state.destroyed) {
        err = new ERR_STREAM_DESTROYED("end");
    }
    if (typeof cb === "function") {
        if (err || state.finished) {
            nextTick1(cb, err);
        } else {
            state[kOnFinished].push(cb);
        }
    }
    return this;
};
function needFinish(state) {
    return state.ending && state.constructed && state.length === 0 && !state.errored && state.buffered.length === 0 && !state.finished && !state.writing && !state.errorEmitted && !state.closeEmitted;
}
function callFinal(stream, state) {
    let called = false;
    function onFinish(err) {
        if (called) {
            errorOrDestroy2(stream, err ?? ERR_MULTIPLE_CALLBACK());
            return;
        }
        called = true;
        state.pendingcb--;
        if (err) {
            const onfinishCallbacks = state[kOnFinished].splice(0);
            for(let i = 0; i < onfinishCallbacks.length; i++){
                onfinishCallbacks[i](err);
            }
            errorOrDestroy2(stream, err, state.sync);
        } else if (needFinish(state)) {
            state.prefinished = true;
            stream.emit("prefinish");
            state.pendingcb++;
            nextTick(finish, stream, state);
        }
    }
    state.sync = true;
    state.pendingcb++;
    try {
        const result = stream._final(onFinish);
        if (result != null) {
            const then = result.then;
            if (typeof then === "function") {
                then.call(result, function() {
                    nextTick(onFinish, null);
                }, function(err) {
                    nextTick(onFinish, err);
                });
            }
        }
    } catch (err) {
        onFinish(stream, state, err);
    }
    state.sync = false;
}
function prefinish(stream, state) {
    if (!state.prefinished && !state.finalCalled) {
        if (typeof stream._final === "function" && !state.destroyed) {
            state.finalCalled = true;
            callFinal(stream, state);
        } else {
            state.prefinished = true;
            stream.emit("prefinish");
        }
    }
}
function finishMaybe(stream, state, sync) {
    if (needFinish(state)) {
        prefinish(stream, state);
        if (state.pendingcb === 0 && needFinish(state)) {
            state.pendingcb++;
            if (sync) {
                nextTick(finish, stream, state);
            } else {
                finish(stream, state);
            }
        }
    }
}
function finish(stream, state) {
    state.pendingcb--;
    state.finished = true;
    const onfinishCallbacks = state[kOnFinished].splice(0);
    for(let i = 0; i < onfinishCallbacks.length; i++){
        onfinishCallbacks[i]();
    }
    stream.emit("finish");
    if (state.autoDestroy) {
        const rState = stream._readableState;
        const autoDestroy = !rState || rState.autoDestroy && (rState.endEmitted || rState.readable === false);
        if (autoDestroy) {
            stream.destroy();
        }
    }
}
Object.defineProperties(Writable.prototype, {
    destroyed: {
        get () {
            return this._writableState ? this._writableState.destroyed : false;
        },
        set (value) {
            if (this._writableState) {
                this._writableState.destroyed = value;
            }
        }
    },
    writable: {
        get () {
            const w = this._writableState;
            return !!w && w.writable !== false && !w.destroyed && !w.errored && !w.ending && !w.ended;
        },
        set (val) {
            if (this._writableState) {
                this._writableState.writable = !!val;
            }
        }
    },
    writableFinished: {
        get () {
            return this._writableState ? this._writableState.finished : false;
        }
    },
    writableObjectMode: {
        get () {
            return this._writableState ? this._writableState.objectMode : false;
        }
    },
    writableBuffer: {
        get () {
            return this._writableState && this._writableState.getBuffer();
        }
    },
    writableEnded: {
        get () {
            return this._writableState ? this._writableState.ending : false;
        }
    },
    writableNeedDrain: {
        get () {
            const wState = this._writableState;
            if (!wState) return false;
            return !wState.destroyed && !wState.ending && wState.needDrain;
        }
    },
    writableHighWaterMark: {
        get () {
            return this._writableState && this._writableState.highWaterMark;
        }
    },
    writableCorked: {
        get () {
            return this._writableState ? this._writableState.corked : 0;
        }
    },
    writableLength: {
        get () {
            return this._writableState && this._writableState.length;
        }
    }
});
const destroy2 = __default1.destroy;
Writable.prototype.destroy = function(err, cb) {
    const state = this._writableState;
    if (!state.destroyed && (state.bufferedIndex < state.buffered.length || state[kOnFinished].length)) {
        nextTick1(errorBuffer, state);
    }
    destroy2.call(this, err, cb);
    return this;
};
Writable.prototype._undestroy = __default1.undestroy;
Writable.prototype._destroy = function(err, cb) {
    cb(err);
};
Writable.prototype[EventEmitter2.captureRejectionSymbol] = function(err) {
    this.destroy(err);
};
Writable.WritableState = WritableState;
function isWritableStream(object) {
    return object instanceof WritableStream;
}
Writable.fromWeb = function(writableStream, options = {}) {
    if (!isWritableStream(writableStream)) {
        throw new ERR_INVALID_ARG_TYPE("writableStream", "WritableStream", writableStream);
    }
    validateObject(options, "options");
    const { highWaterMark , decodeStrings =true , objectMode =false , signal  } = options;
    validateBoolean(objectMode, "options.objectMode");
    validateBoolean(decodeStrings, "options.decodeStrings");
    const writer = writableStream.getWriter();
    let closed = false;
    const writable = new Writable({
        highWaterMark,
        objectMode,
        decodeStrings,
        signal,
        writev (chunks, callback) {
            function done(error) {
                error = error.filter((e)=>e);
                try {
                    callback(error.length === 0 ? undefined : error);
                } catch (error1) {
                    nextTick1(()=>destroy2.call(writable, error1));
                }
            }
            writer.ready.then(()=>Promise.All(chunks.map((data)=>writer.write(data.chunk))).then(done, done), done);
        },
        write (chunk, encoding, callback) {
            if (typeof chunk === "string" && decodeStrings && !objectMode) {
                chunk = Buffer.from(chunk, encoding);
                chunk = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
            }
            function done(error) {
                try {
                    callback(error);
                } catch (error1) {
                    destroy2(this, duplex, error1);
                }
            }
            writer.ready.then(()=>writer.write(chunk).then(done, done), done);
        },
        destroy (error, callback) {
            function done() {
                try {
                    callback(error);
                } catch (error1) {
                    nextTick1(()=>{
                        throw error1;
                    });
                }
            }
            if (!closed) {
                if (error != null) {
                    writer.abort(error).then(done, done);
                } else {
                    writer.close().then(done, done);
                }
                return;
            }
            done();
        },
        final (callback) {
            function done(error) {
                try {
                    callback(error);
                } catch (error1) {
                    nextTick1(()=>destroy2.call(writable, error1));
                }
            }
            if (!closed) {
                writer.close().then(done, done);
            }
        }
    });
    writer.closed.then(()=>{
        closed = true;
        if (!isWritableEnded(writable)) {
            destroy2.call(writable, new ERR_STREAM_PREMATURE_CLOSE());
        }
    }, (error)=>{
        closed = true;
        destroy2.call(writable, error);
    });
    return writable;
};
Writable.Writable = Writable;
Object.setPrototypeOf(Duplex.prototype, Readable.prototype);
Object.setPrototypeOf(Duplex, Readable);
{
    for (const method of Object.keys(Writable.prototype)){
        if (!Duplex.prototype[method]) {
            Duplex.prototype[method] = Writable.prototype[method];
        }
    }
}function Duplex(options) {
    if (!(this instanceof Duplex)) {
        return new Duplex(options);
    }
    Readable.call(this, options);
    Writable.call(this, options);
    this.allowHalfOpen = true;
    if (options) {
        if (options.readable === false) {
            this.readable = false;
        }
        if (options.writable === false) {
            this.writable = false;
        }
        if (options.allowHalfOpen === false) {
            this.allowHalfOpen = false;
        }
    }
}
Object.defineProperties(Duplex.prototype, {
    writable: Object.getOwnPropertyDescriptor(Writable.prototype, "writable"),
    writableHighWaterMark: Object.getOwnPropertyDescriptor(Writable.prototype, "writableHighWaterMark"),
    writableObjectMode: Object.getOwnPropertyDescriptor(Writable.prototype, "writableObjectMode"),
    writableBuffer: Object.getOwnPropertyDescriptor(Writable.prototype, "writableBuffer"),
    writableLength: Object.getOwnPropertyDescriptor(Writable.prototype, "writableLength"),
    writableFinished: Object.getOwnPropertyDescriptor(Writable.prototype, "writableFinished"),
    writableCorked: Object.getOwnPropertyDescriptor(Writable.prototype, "writableCorked"),
    writableEnded: Object.getOwnPropertyDescriptor(Writable.prototype, "writableEnded"),
    writableNeedDrain: Object.getOwnPropertyDescriptor(Writable.prototype, "writableNeedDrain"),
    destroyed: {
        get () {
            if (this._readableState === undefined || this._writableState === undefined) {
                return false;
            }
            return this._readableState.destroyed && this._writableState.destroyed;
        },
        set (value) {
            if (this._readableState && this._writableState) {
                this._readableState.destroyed = value;
                this._writableState.destroyed = value;
            }
        }
    }
});
function isReadableStream1(object) {
    return object instanceof ReadableStream;
}
function isWritableStream1(object) {
    return object instanceof WritableStream;
}
Duplex.fromWeb = function(pair, options) {
    validateObject(pair, "pair");
    const { readable: readableStream , writable: writableStream  } = pair;
    if (!isReadableStream1(readableStream)) {
        throw new ERR_INVALID_ARG_TYPE("pair.readable", "ReadableStream", readableStream);
    }
    if (!isWritableStream1(writableStream)) {
        throw new ERR_INVALID_ARG_TYPE("pair.writable", "WritableStream", writableStream);
    }
    validateObject(options, "options");
    const { allowHalfOpen =false , objectMode =false , encoding , decodeStrings =true , highWaterMark , signal  } = options;
    validateBoolean(objectMode, "options.objectMode");
    if (encoding !== undefined && !Buffer.isEncoding(encoding)) {
        throw new ERR_INVALID_ARG_VALUE(encoding, "options.encoding");
    }
    const writer = writableStream.getWriter();
    const reader = readableStream.getReader();
    let writableClosed = false;
    let readableClosed = false;
    const duplex1 = new Duplex({
        allowHalfOpen,
        highWaterMark,
        objectMode,
        encoding,
        decodeStrings,
        signal,
        writev (chunks, callback) {
            function done(error) {
                error = error.filter((e)=>e);
                try {
                    callback(error.length === 0 ? undefined : error);
                } catch (error1) {
                    nextTick1(()=>destroy(duplex1, error1));
                }
            }
            writer.ready.then(()=>Promise.All(chunks.map((data)=>writer.write(data.chunk))).then(done, done), done);
        },
        write (chunk, encoding, callback) {
            if (typeof chunk === "string" && decodeStrings && !objectMode) {
                chunk = Buffer.from(chunk, encoding);
                chunk = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
            }
            function done(error) {
                try {
                    callback(error);
                } catch (error1) {
                    destroy(duplex1, error1);
                }
            }
            writer.ready.then(()=>writer.write(chunk).then(done, done), done);
        },
        final (callback) {
            function done(error) {
                try {
                    callback(error);
                } catch (error1) {
                    nextTick1(()=>destroy(duplex1, error1));
                }
            }
            if (!writableClosed) {
                writer.close().then(done, done);
            }
        },
        read () {
            reader.read().then((chunk)=>{
                if (chunk.done) {
                    duplex1.push(null);
                } else {
                    duplex1.push(chunk.value);
                }
            }, (error)=>destroy(duplex1, error));
        },
        destroy (error, callback) {
            function done() {
                try {
                    callback(error);
                } catch (error1) {
                    nextTick1(()=>{
                        throw error1;
                    });
                }
            }
            async function closeWriter() {
                if (!writableClosed) {
                    await writer.abort(error);
                }
            }
            async function closeReader() {
                if (!readableClosed) {
                    await reader.cancel(error);
                }
            }
            if (!writableClosed || !readableClosed) {
                Promise.All([
                    closeWriter(),
                    closeReader()
                ]).then(done, done);
                return;
            }
            done();
        }
    });
    writer.closed.then(()=>{
        writableClosed = true;
        if (!isWritableEnded(duplex1)) {
            destroy(duplex1, new ERR_STREAM_PREMATURE_CLOSE());
        }
    }, (error)=>{
        writableClosed = true;
        readableClosed = true;
        destroy(duplex1, error);
    });
    reader.closed.then(()=>{
        readableClosed = true;
        if (!isReadableEnded1(duplex1)) {
            duplex1.push(null);
        }
    }, (error)=>{
        writableClosed = true;
        readableClosed = true;
        destroy(duplex1, error);
    });
    return duplex1;
};
class Duplexify extends Duplex {
    constructor(options){
        super(options);
        if (options?.readable === false) {
            this._readableState.readable = false;
            this._readableState.ended = true;
            this._readableState.endEmitted = true;
        }
        if (options?.writable === false) {
            this._writableState.writable = false;
            this._writableState.ending = true;
            this._writableState.ended = true;
            this._writableState.finished = true;
        }
    }
}
function duplexify(body, name) {
    if (isDuplexNodeStream(body)) {
        return body;
    }
    if (isReadableNodeStream(body)) {
        return _duplexify({
            readable: body
        });
    }
    if (isWritableNodeStream(body)) {
        return _duplexify({
            writable: body
        });
    }
    if (isNodeStream(body)) {
        return _duplexify({
            writable: false,
            readable: false
        });
    }
    if (typeof body === "function") {
        const { value , write , final: __final , destroy: destroy1  } = fromAsyncGen(body);
        if (isIterable(value)) {
            return _from1(Duplexify, value, {
                objectMode: true,
                write,
                final: __final,
                destroy: destroy1
            });
        }
        const then = value?.then;
        if (typeof then === "function") {
            let d;
            const promise = then.call(value, (val)=>{
                if (val != null) {
                    throw new ERR_INVALID_RETURN_VALUE("nully", "body", val);
                }
            }, (err)=>{
                destroyer(d, err);
            });
            return d = new Duplexify({
                objectMode: true,
                readable: false,
                write,
                final (cb) {
                    __final(async ()=>{
                        try {
                            await promise;
                            nextTick1(cb, null);
                        } catch (err) {
                            nextTick1(cb, err);
                        }
                    });
                },
                destroy: destroy1
            });
        }
        throw new ERR_INVALID_RETURN_VALUE("Iterable, AsyncIterable or AsyncFunction", name, value);
    }
    if (isBlob(body)) {
        return duplexify(body.arrayBuffer());
    }
    if (isIterable(body)) {
        return _from1(Duplexify, body, {
            objectMode: true,
            writable: false
        });
    }
    if (typeof body?.writable === "object" || typeof body?.readable === "object") {
        const readable = body?.readable ? isReadableNodeStream(body?.readable) ? body?.readable : duplexify(body.readable) : undefined;
        const writable = body?.writable ? isWritableNodeStream(body?.writable) ? body?.writable : duplexify(body.writable) : undefined;
        return _duplexify({
            readable,
            writable
        });
    }
    const then1 = body?.then;
    if (typeof then1 === "function") {
        let d1;
        then1.call(body, (val)=>{
            if (val != null) {
                d1.push(val);
            }
            d1.push(null);
        }, (err)=>{
            destroyer(d1, err);
        });
        return d1 = new Duplexify({
            objectMode: true,
            writable: false,
            read () {}
        });
    }
    throw new ERR_INVALID_ARG_TYPE(name, [
        "Blob",
        "ReadableStream",
        "WritableStream",
        "Stream",
        "Iterable",
        "AsyncIterable",
        "Function",
        "{ readable, writable } pair",
        "Promise"
    ], body);
}
function fromAsyncGen(fn) {
    let { promise , resolve  } = createDeferredPromise();
    const ac = new AbortController();
    const signal = ac.signal;
    const value = fn(async function*() {
        while(true){
            const _promise = promise;
            promise = null;
            const { chunk , done , cb  } = await _promise;
            nextTick(cb);
            if (done) return;
            if (signal.aborted) throw new AbortError();
            ({ promise , resolve  } = createDeferredPromise());
            yield chunk;
        }
    }(), {
        signal
    });
    return {
        value,
        write (chunk, encoding, cb) {
            const _resolve = resolve;
            resolve = null;
            _resolve({
                chunk,
                done: false,
                cb
            });
        },
        final (cb) {
            const _resolve = resolve;
            resolve = null;
            _resolve({
                done: true,
                cb
            });
        },
        destroy (err, cb) {
            ac.abort();
            cb(err);
        }
    };
}
function _duplexify(pair) {
    const r = pair.readable && typeof pair.readable.read !== "function" ? Readable.wrap(pair.readable) : pair.readable;
    const w = pair.writable;
    let readable = !!isReadable1(r);
    let writable = !!isWritable1(w);
    let ondrain;
    let onfinish;
    let onreadable;
    let onclose;
    let d;
    function onfinished(err) {
        const cb = onclose;
        onclose = null;
        if (cb) {
            cb(err);
        } else if (err) {
            d.destroy(err);
        } else if (!readable && !writable) {
            d.destroy();
        }
    }
    d = new Duplexify({
        readableObjectMode: !!r?.readableObjectMode,
        writableObjectMode: !!w?.writableObjectMode,
        readable,
        writable
    });
    if (writable) {
        eos(w, (err)=>{
            writable = false;
            if (err) {
                destroyer(r, err);
            }
            onfinished(err);
        });
        d._write = function(chunk, encoding, callback) {
            if (w.write(chunk, encoding)) {
                callback();
            } else {
                ondrain = callback;
            }
        };
        d._final = function(callback) {
            w.end();
            onfinish = callback;
        };
        w.on("drain", function() {
            if (ondrain) {
                const cb = ondrain;
                ondrain = null;
                cb();
            }
        });
        w.on("finish", function() {
            if (onfinish) {
                const cb = onfinish;
                onfinish = null;
                cb();
            }
        });
    }
    if (readable) {
        eos(r, (err)=>{
            readable = false;
            if (err) {
                destroyer(r, err);
            }
            onfinished(err);
        });
        r.on("readable", function() {
            if (onreadable) {
                const cb = onreadable;
                onreadable = null;
                cb();
            }
        });
        r.on("end", function() {
            d.push(null);
        });
        d._read = function() {
            while(true){
                const buf = r.read();
                if (buf === null) {
                    onreadable = d._read;
                    return;
                }
                if (!d.push(buf)) {
                    return;
                }
            }
        };
    }
    d._destroy = function(err, callback) {
        if (!err && onclose !== null) {
            err = new AbortError();
        }
        onreadable = null;
        ondrain = null;
        onfinish = null;
        if (onclose === null) {
            callback(err);
        } else {
            onclose = callback;
            destroyer(w, err);
            destroyer(r, err);
        }
    };
    return d;
}
function duplexFrom(body) {
    return duplexify(body, "body");
}
Duplex.from = duplexFrom;
Duplex.duplexify = duplexify;
Object.setPrototypeOf(Transform.prototype, Duplex.prototype);
Object.setPrototypeOf(Transform, Duplex);
const kCallback = Symbol("kCallback");
function Transform(options) {
    if (!(this instanceof Transform)) {
        return new Transform(options);
    }
    Duplex.call(this, options);
    this._readableState.sync = false;
    this[kCallback] = null;
    if (options) {
        if (typeof options.transform === "function") {
            this._transform = options.transform;
        }
        if (typeof options.flush === "function") {
            this._flush = options.flush;
        }
    }
    this.on("prefinish", prefinish1);
}
function __final(cb) {
    let called = false;
    if (typeof this._flush === "function" && !this.destroyed) {
        const result = this._flush((er, data)=>{
            called = true;
            if (er) {
                if (cb) {
                    cb(er);
                } else {
                    this.destroy(er);
                }
                return;
            }
            if (data != null) {
                this.push(data);
            }
            this.push(null);
            if (cb) {
                cb();
            }
        });
        if (result !== undefined && result !== null) {
            try {
                const then = result.then;
                if (typeof then === "function") {
                    then.call(result, (data)=>{
                        if (called) {
                            return;
                        }
                        if (data != null) {
                            this.push(data);
                        }
                        this.push(null);
                        if (cb) {
                            nextTick(cb);
                        }
                    }, (err)=>{
                        if (cb) {
                            nextTick(cb, err);
                        } else {
                            nextTick(()=>this.destroy(err));
                        }
                    });
                }
            } catch (err) {
                nextTick(()=>this.destroy(err));
            }
        }
    } else {
        this.push(null);
        if (cb) {
            cb();
        }
    }
}
function prefinish1() {
    if (this._final !== __final) {
        __final.call(this);
    }
}
Transform.prototype._final = __final;
Transform.prototype._transform = function(chunk, encoding, callback) {
    throw new ERR_METHOD_NOT_IMPLEMENTED("_transform()");
};
Transform.prototype._write = function(chunk, encoding, callback) {
    const rState = this._readableState;
    const wState = this._writableState;
    const length = rState.length;
    let called = false;
    const result = this._transform(chunk, encoding, (err, val)=>{
        called = true;
        if (err) {
            callback(err);
            return;
        }
        if (val != null) {
            this.push(val);
        }
        if (wState.ended || length === rState.length || rState.length < rState.highWaterMark || rState.length === 0) {
            callback();
        } else {
            this[kCallback] = callback;
        }
    });
    if (result !== undefined && result != null) {
        try {
            const then = result.then;
            if (typeof then === "function") {
                then.call(result, (val)=>{
                    if (called) {
                        return;
                    }
                    if (val != null) {
                        this.push(val);
                    }
                    if (wState.ended || length === rState.length || rState.length < rState.highWaterMark || rState.length === 0) {
                        nextTick1(callback);
                    } else {
                        this[kCallback] = callback;
                    }
                }, (err)=>{
                    nextTick1(callback, err);
                });
            }
        } catch (err) {
            nextTick1(callback, err);
        }
    }
};
Transform.prototype._read = function() {
    if (this[kCallback]) {
        const callback = this[kCallback];
        this[kCallback] = null;
        callback();
    }
};
Object.setPrototypeOf(PassThrough.prototype, Transform.prototype);
Object.setPrototypeOf(PassThrough, Transform);
function PassThrough(options) {
    if (!(this instanceof PassThrough)) {
        return new PassThrough(options);
    }
    Transform.call(this, options);
}
PassThrough.prototype._transform = function(chunk, encoding, cb) {
    cb(null, chunk);
};
function destroyer1(stream, reading, writing, callback) {
    callback = once(callback);
    let finished = false;
    stream.on("close", ()=>{
        finished = true;
    });
    eos(stream, {
        readable: reading,
        writable: writing
    }, (err)=>{
        finished = !err;
        const rState = stream._readableState;
        if (err && err.code === "ERR_STREAM_PREMATURE_CLOSE" && reading && rState && rState.ended && !rState.errored && !rState.errorEmitted) {
            stream.once("end", callback).once("error", callback);
        } else {
            callback(err);
        }
    });
    return (err)=>{
        if (finished) return;
        finished = true;
        __default1.destroyer(stream, err);
        callback(err || new ERR_STREAM_DESTROYED("pipe"));
    };
}
function popCallback(streams) {
    validateCallback(streams[streams.length - 1]);
    return streams.pop();
}
function makeAsyncIterable(val) {
    if (isIterable(val)) {
        return val;
    } else if (isReadableNodeStream(val)) {
        return fromReadable(val);
    }
    throw new ERR_INVALID_ARG_TYPE("val", [
        "Readable",
        "Iterable",
        "AsyncIterable"
    ], val);
}
async function* fromReadable(val) {
    yield* Readable.prototype[Symbol.asyncIterator].call(val);
}
async function pump(iterable, writable, finish) {
    let error;
    let onresolve = null;
    const resume = (err)=>{
        if (err) {
            error = err;
        }
        if (onresolve) {
            const callback = onresolve;
            onresolve = null;
            callback();
        }
    };
    const wait = ()=>new Promise((resolve, reject)=>{
            if (error) {
                reject(error);
            } else {
                onresolve = ()=>{
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                };
            }
        });
    writable.on("drain", resume);
    const cleanup = eos(writable, {
        readable: false
    }, resume);
    try {
        if (writable.writableNeedDrain) {
            await wait();
        }
        for await (const chunk of iterable){
            if (!writable.write(chunk)) {
                await wait();
            }
        }
        writable.end();
        await wait();
        finish();
    } catch (err) {
        finish(error !== err ? aggregateTwoErrors(error, err) : err);
    } finally{
        cleanup();
        writable.off("drain", resume);
    }
}
function pipeline(...streams) {
    const callback = once(popCallback(streams));
    if (Array.isArray(streams[0]) && streams.length === 1) {
        streams = streams[0];
    }
    return pipelineImpl(streams, callback);
}
function pipelineImpl(streams, callback, opts) {
    if (streams.length < 2) {
        throw new ERR_MISSING_ARGS("streams");
    }
    const ac = new AbortController();
    const signal = ac.signal;
    const outerSignal = opts?.signal;
    validateAbortSignal(outerSignal, "options.signal");
    function abort() {
        finishImpl(new AbortError());
    }
    outerSignal?.addEventListener("abort", abort);
    let error;
    let value;
    const destroys = [];
    let finishCount = 0;
    function finish(err) {
        finishImpl(err, --finishCount === 0);
    }
    function finishImpl(err, __final) {
        if (err && (!error || error.code === "ERR_STREAM_PREMATURE_CLOSE")) {
            error = err;
        }
        if (!error && !__final) {
            return;
        }
        while(destroys.length){
            destroys.shift()(error);
        }
        outerSignal?.removeEventListener("abort", abort);
        ac.abort();
        if (__final) {
            callback(error, value);
        }
    }
    let ret;
    for(let i = 0; i < streams.length; i++){
        const stream = streams[i];
        const reading = i < streams.length - 1;
        const writing = i > 0;
        if (isNodeStream(stream)) {
            finishCount++;
            destroys.push(destroyer1(stream, reading, writing, finish));
        }
        if (i === 0) {
            if (typeof stream === "function") {
                ret = stream({
                    signal
                });
                if (!isIterable(ret)) {
                    throw new ERR_INVALID_RETURN_VALUE("Iterable, AsyncIterable or Stream", "source", ret);
                }
            } else if (isIterable(stream) || isReadableNodeStream(stream)) {
                ret = stream;
            } else {
                ret = Duplex.from(stream);
            }
        } else if (typeof stream === "function") {
            ret = makeAsyncIterable(ret);
            ret = stream(ret, {
                signal
            });
            if (reading) {
                if (!isIterable(ret, true)) {
                    throw new ERR_INVALID_RETURN_VALUE("AsyncIterable", `transform[${i - 1}]`, ret);
                }
            } else {
                const pt = new PassThrough({
                    objectMode: true
                });
                const then = ret?.then;
                if (typeof then === "function") {
                    then.call(ret, (val)=>{
                        value = val;
                        pt.end(val);
                    }, (err)=>{
                        pt.destroy(err);
                    });
                } else if (isIterable(ret, true)) {
                    finishCount++;
                    pump(ret, pt, finish);
                } else {
                    throw new ERR_INVALID_RETURN_VALUE("AsyncIterable or Promise", "destination", ret);
                }
                ret = pt;
                finishCount++;
                destroys.push(destroyer1(ret, false, true, finish));
            }
        } else if (isNodeStream(stream)) {
            if (isReadableNodeStream(ret)) {
                ret.pipe(stream);
                if (stream === stdio.stdout || stream === stdio.stderr) {
                    ret.on("end", ()=>stream.end());
                }
            } else {
                ret = makeAsyncIterable(ret);
                finishCount++;
                pump(ret, stream, finish);
            }
            ret = stream;
        } else {
            ret = Duplex.from(stream);
        }
    }
    if (signal?.aborted || outerSignal?.aborted) {
        nextTick(abort);
    }
    return ret;
}
class ComposeDuplex extends Duplex {
    constructor(options){
        super(options);
        if (options?.readable === false) {
            this._readableState.readable = false;
            this._readableState.ended = true;
            this._readableState.endEmitted = true;
        }
        if (options?.writable === false) {
            this._writableState.writable = false;
            this._writableState.ending = true;
            this._writableState.ended = true;
            this._writableState.finished = true;
        }
    }
}
function compose(...streams) {
    if (streams.length === 0) {
        throw new ERR_MISSING_ARGS("streams");
    }
    if (streams.length === 1) {
        return Duplex.from(streams[0]);
    }
    const orgStreams = [
        ...streams
    ];
    if (typeof streams[0] === "function") {
        streams[0] = Duplex.from(streams[0]);
    }
    if (typeof streams[streams.length - 1] === "function") {
        const idx = streams.length - 1;
        streams[idx] = Duplex.from(streams[idx]);
    }
    for(let n = 0; n < streams.length; ++n){
        if (!isNodeStream(streams[n])) {
            continue;
        }
        if (n < streams.length - 1 && !isReadable1(streams[n])) {
            throw new ERR_INVALID_ARG_VALUE(`streams[${n}]`, orgStreams[n], "must be readable");
        }
        if (n > 0 && !isWritable1(streams[n])) {
            throw new ERR_INVALID_ARG_VALUE(`streams[${n}]`, orgStreams[n], "must be writable");
        }
    }
    let ondrain;
    let onfinish;
    let onreadable;
    let onclose;
    let d;
    function onfinished(err) {
        const cb = onclose;
        onclose = null;
        if (cb) {
            cb(err);
        } else if (err) {
            d.destroy(err);
        } else if (!readable && !writable) {
            d.destroy();
        }
    }
    const head = streams[0];
    const tail = pipeline(streams, onfinished);
    const writable = !!isWritable1(head);
    const readable = !!isReadable1(tail);
    d = new ComposeDuplex({
        writableObjectMode: !!head?.writableObjectMode,
        readableObjectMode: !!tail?.writableObjectMode,
        writable,
        readable
    });
    if (writable) {
        d._write = function(chunk, encoding, callback) {
            if (head.write(chunk, encoding)) {
                callback();
            } else {
                ondrain = callback;
            }
        };
        d._final = function(callback) {
            head.end();
            onfinish = callback;
        };
        head.on("drain", function() {
            if (ondrain) {
                const cb = ondrain;
                ondrain = null;
                cb();
            }
        });
        tail.on("finish", function() {
            if (onfinish) {
                const cb = onfinish;
                onfinish = null;
                cb();
            }
        });
    }
    if (readable) {
        tail.on("readable", function() {
            if (onreadable) {
                const cb = onreadable;
                onreadable = null;
                cb();
            }
        });
        tail.on("end", function() {
            d.push(null);
        });
        d._read = function() {
            while(true){
                const buf = tail.read();
                if (buf === null) {
                    onreadable = d._read;
                    return;
                }
                if (!d.push(buf)) {
                    return;
                }
            }
        };
    }
    d._destroy = function(err, callback) {
        if (!err && onclose !== null) {
            err = new AbortError();
        }
        onreadable = null;
        ondrain = null;
        onfinish = null;
        if (onclose === null) {
            callback(err);
        } else {
            onclose = callback;
            destroyer(tail, err);
        }
    };
    return d;
}
function pipeline1(...streams) {
    return new Promise((resolve, reject)=>{
        let signal;
        let end;
        const lastArg = streams[streams.length - 1];
        if (lastArg && typeof lastArg === "object" && !isNodeStream(lastArg) && !isIterable(lastArg)) {
            const options = streams.pop();
            signal = options.signal;
            end = options.end;
        }
        pipelineImpl(streams, (err, value)=>{
            if (err) {
                reject(err);
            } else {
                resolve(value);
            }
        }, {
            signal,
            end
        });
    });
}
function finished(stream, opts) {
    return new Promise((resolve, reject)=>{
        eos(stream, opts, (err)=>{
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
const __default2 = {
    finished,
    pipeline: pipeline1
};
const { custom: customPromisify  } = promisify;
Stream.isDisturbed = isDisturbed;
Stream.Readable = Readable;
Stream.Writable = Writable;
Stream.Duplex = Duplex;
Stream.Transform = Transform;
Stream.PassThrough = PassThrough;
Stream.pipeline = pipeline;
Stream.addAbortSignal = addAbortSignal;
Stream.finished = eos;
Stream.destroy = destroyer;
Stream.compose = compose;
Object.defineProperty(Stream, "promises", {
    configurable: true,
    enumerable: true,
    get () {
        return __default2;
    }
});
Object.defineProperty(pipeline, customPromisify, {
    enumerable: true,
    get () {
        return __default2.pipeline;
    }
});
Object.defineProperty(eos, customPromisify, {
    enumerable: true,
    get () {
        return __default2.finished;
    }
});
Stream.Stream = Stream;
Stream._isUint8Array = isUint8Array;
Stream._uint8ArrayToBuffer = _uint8ArrayToBuffer;
const hexTable = new TextEncoder().encode("0123456789abcdef");
function encode2(src) {
    const dst = new Uint8Array(src.length * 2);
    for(let i = 0; i < dst.length; i++){
        const v = src[i];
        dst[i * 2] = hexTable[v >> 4];
        dst[i * 2 + 1] = hexTable[v & 0x0f];
    }
    return dst;
}
const coerceToBytes = (data)=>{
    if (data instanceof Uint8Array) {
        return data;
    } else if (typeof data === "string") {
        return new TextEncoder().encode(data);
    } else if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } else if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
    } else {
        throw new TypeError("expected data to be string | BufferSource");
    }
};
class Hash extends Transform {
    #context;
    constructor(algorithm, _opts){
        super({
            transform (chunk, _encoding, callback) {
                context.update(coerceToBytes(chunk));
                callback();
            },
            flush (callback) {
                this.push(context.digest(undefined));
                callback();
            }
        });
        if (typeof algorithm === "string") {
            algorithm = algorithm.toUpperCase();
            if (opensslToWebCryptoDigestNames[algorithm]) {
                algorithm = opensslToWebCryptoDigestNames[algorithm];
            }
            this.#context = new (instantiate()).DigestContext(algorithm);
        } else {
            this.#context = algorithm;
        }
        const context = this.#context;
    }
    copy() {
        return new Hash(this.#context.clone());
    }
    update(data, _encoding) {
        let bytes;
        if (typeof data === "string") {
            data = new TextEncoder().encode(data);
            bytes = coerceToBytes(data);
        } else {
            bytes = coerceToBytes(data);
        }
        this.#context.update(bytes);
        return this;
    }
    digest(encoding) {
        const digest = this.#context.digest(undefined);
        if (encoding === undefined) {
            return Buffer.from(digest);
        }
        switch(encoding){
            case "hex":
                return new TextDecoder().decode(encode2(new Uint8Array(digest)));
            case "binary":
                return String.fromCharCode(...digest);
            case "base64":
                return encode(digest);
            default:
                throw new Error(`The output encoding for hash digest is not implemented: ${encoding}`);
        }
    }
}
class Hmac extends Transform {
    constructor(hmac, _key, _options){
        validateString(hmac, "hmac");
        super();
        notImplemented("crypto.Hmac");
    }
    digest(_encoding) {
        notImplemented("crypto.Hmac.prototype.digest");
    }
    update(_data, _inputEncoding) {
        notImplemented("crypto.Hmac.prototype.update");
    }
}
const opensslToWebCryptoDigestNames = {
    BLAKE2B512: "BLAKE2B",
    BLAKE2S256: "BLAKE2S",
    RIPEMD160: "RIPEMD-160",
    RMD160: "RIPEMD-160",
    SHA1: "SHA-1",
    SHA224: "SHA-224",
    SHA256: "SHA-256",
    SHA384: "SHA-384",
    SHA512: "SHA-512"
};
function createHash(algorithm, opts) {
    return new Hash(algorithm, opts);
}
const MAX_ALLOC = Math.pow(2, 30) - 1;
const createHasher = (algorithm)=>(value)=>Buffer.from(createHash(algorithm).update(value).digest());
function getZeroes(zeros) {
    return Buffer.alloc(zeros);
}
const sizes = {
    md5: 16,
    sha1: 20,
    sha224: 28,
    sha256: 32,
    sha384: 48,
    sha512: 64,
    rmd160: 20,
    ripemd160: 20
};
function toBuffer(bufferable) {
    if (bufferable instanceof Uint8Array || typeof bufferable === "string") {
        return Buffer.from(bufferable);
    } else {
        return Buffer.from(bufferable.buffer);
    }
}
class Hmac1 {
    hash;
    ipad1;
    opad;
    alg;
    blocksize;
    size;
    ipad2;
    constructor(alg, key, saltLen){
        this.hash = createHasher(alg);
        const blocksize = alg === "sha512" || alg === "sha384" ? 128 : 64;
        if (key.length > blocksize) {
            key = this.hash(key);
        } else if (key.length < blocksize) {
            key = Buffer.concat([
                key,
                getZeroes(blocksize - key.length)
            ], blocksize);
        }
        const ipad = Buffer.allocUnsafe(blocksize + sizes[alg]);
        const opad = Buffer.allocUnsafe(blocksize + sizes[alg]);
        for(let i = 0; i < blocksize; i++){
            ipad[i] = key[i] ^ 0x36;
            opad[i] = key[i] ^ 0x5c;
        }
        const ipad1 = Buffer.allocUnsafe(blocksize + saltLen + 4);
        ipad.copy(ipad1, 0, 0, blocksize);
        this.ipad1 = ipad1;
        this.ipad2 = ipad;
        this.opad = opad;
        this.alg = alg;
        this.blocksize = blocksize;
        this.size = sizes[alg];
    }
    run(data, ipad) {
        data.copy(ipad, this.blocksize);
        const h = this.hash(ipad);
        h.copy(this.opad, this.blocksize);
        return this.hash(this.opad);
    }
}
function pbkdf2Sync(password, salt, iterations, keylen, digest = "sha1") {
    if (typeof iterations !== "number" || iterations < 0) {
        throw new TypeError("Bad iterations");
    }
    if (typeof keylen !== "number" || keylen < 0 || keylen > MAX_ALLOC) {
        throw new TypeError("Bad key length");
    }
    const bufferedPassword = toBuffer(password);
    const bufferedSalt = toBuffer(salt);
    const hmac = new Hmac1(digest, bufferedPassword, bufferedSalt.length);
    const DK = Buffer.allocUnsafe(keylen);
    const block1 = Buffer.allocUnsafe(bufferedSalt.length + 4);
    bufferedSalt.copy(block1, 0, 0, bufferedSalt.length);
    let destPos = 0;
    const hLen = sizes[digest];
    const l = Math.ceil(keylen / hLen);
    for(let i = 1; i <= l; i++){
        block1.writeUInt32BE(i, bufferedSalt.length);
        const T = hmac.run(block1, hmac.ipad1);
        let U = T;
        for(let j = 1; j < iterations; j++){
            U = hmac.run(U, hmac.ipad2);
            for(let k = 0; k < hLen; k++)T[k] ^= U[k];
        }
        T.copy(DK, destPos);
        destPos += hLen;
    }
    return DK;
}
function pbkdf2(password, salt, iterations, keylen, digest = "sha1", callback) {
    setTimeout(()=>{
        let err = null, res;
        try {
            res = pbkdf2Sync(password, salt, iterations, keylen, digest);
        } catch (e) {
            err = e;
        }
        if (err) {
            callback(err instanceof Error ? err : new Error("[non-error thrown]"));
        } else {
            callback(null, res);
        }
    }, 0);
}
const fixOpts = (opts)=>{
    const out = {
        N: 16384,
        p: 1,
        r: 8,
        maxmem: 32 << 20
    };
    if (!opts) return out;
    if (opts.N) out.N = opts.N;
    else if (opts.cost) out.N = opts.cost;
    if (opts.p) out.p = opts.p;
    else if (opts.parallelization) out.p = opts.parallelization;
    if (opts.r) out.r = opts.r;
    else if (opts.blockSize) out.r = opts.blockSize;
    if (opts.maxmem) out.maxmem = opts.maxmem;
    return out;
};
function blockxor(S, Si, D, Di, len) {
    let i = -1;
    while(++i < len)D[Di + i] ^= S[Si + i];
}
function arraycopy(src, srcPos, dest, destPos, length) {
    src.copy(dest, destPos, srcPos, srcPos + length);
}
const R = (a, b)=>a << b | a >>> 32 - b;
class ScryptRom {
    B;
    r;
    N;
    p;
    XY;
    V;
    B32;
    x;
    _X;
    constructor(b, r, N, p){
        this.B = b;
        this.r = r;
        this.N = N;
        this.p = p;
        this.XY = Buffer.allocUnsafe(256 * r);
        this.V = Buffer.allocUnsafe(128 * r * N);
        this.B32 = new Int32Array(16);
        this.x = new Int32Array(16);
        this._X = Buffer.allocUnsafe(64);
    }
    run() {
        const p = this.p | 0;
        const r = this.r | 0;
        for(let i = 0; i < p; i++)this.scryptROMix(i, r);
        return this.B;
    }
    scryptROMix(i, r) {
        const blockStart = i * 128 * r;
        const offset = (2 * r - 1) * 64;
        const blockLen = 128 * r;
        const B = this.B;
        const N = this.N | 0;
        const V = this.V;
        const XY = this.XY;
        B.copy(XY, 0, blockStart, blockStart + blockLen);
        for(let i1 = 0; i1 < N; i1++){
            XY.copy(V, i1 * blockLen, 0, blockLen);
            this.blockmix_salsa8(blockLen);
        }
        let j;
        for(let i2 = 0; i2 < N; i2++){
            j = XY.readUInt32LE(offset) & N - 1;
            blockxor(V, j * blockLen, XY, 0, blockLen);
            this.blockmix_salsa8(blockLen);
        }
        XY.copy(B, blockStart, 0, blockLen);
    }
    blockmix_salsa8(blockLen) {
        const BY = this.XY;
        const r = this.r;
        const _X = this._X;
        arraycopy(BY, (2 * r - 1) * 64, _X, 0, 64);
        let i;
        for(i = 0; i < 2 * r; i++){
            blockxor(BY, i * 64, _X, 0, 64);
            this.salsa20_8();
            arraycopy(_X, 0, BY, blockLen + i * 64, 64);
        }
        for(i = 0; i < r; i++){
            arraycopy(BY, blockLen + i * 2 * 64, BY, i * 64, 64);
            arraycopy(BY, blockLen + (i * 2 + 1) * 64, BY, (i + r) * 64, 64);
        }
    }
    salsa20_8() {
        const B32 = this.B32;
        const B = this._X;
        const x = this.x;
        let i;
        for(i = 0; i < 16; i++){
            B32[i] = (B[i * 4 + 0] & 0xff) << 0;
            B32[i] |= (B[i * 4 + 1] & 0xff) << 8;
            B32[i] |= (B[i * 4 + 2] & 0xff) << 16;
            B32[i] |= (B[i * 4 + 3] & 0xff) << 24;
        }
        for(i = 0; i < 16; i++)x[i] = B32[i];
        for(i = 0; i < 4; i++){
            x[4] ^= R(x[0] + x[12], 7);
            x[8] ^= R(x[4] + x[0], 9);
            x[12] ^= R(x[8] + x[4], 13);
            x[0] ^= R(x[12] + x[8], 18);
            x[9] ^= R(x[5] + x[1], 7);
            x[13] ^= R(x[9] + x[5], 9);
            x[1] ^= R(x[13] + x[9], 13);
            x[5] ^= R(x[1] + x[13], 18);
            x[14] ^= R(x[10] + x[6], 7);
            x[2] ^= R(x[14] + x[10], 9);
            x[6] ^= R(x[2] + x[14], 13);
            x[10] ^= R(x[6] + x[2], 18);
            x[3] ^= R(x[15] + x[11], 7);
            x[7] ^= R(x[3] + x[15], 9);
            x[11] ^= R(x[7] + x[3], 13);
            x[15] ^= R(x[11] + x[7], 18);
            x[1] ^= R(x[0] + x[3], 7);
            x[2] ^= R(x[1] + x[0], 9);
            x[3] ^= R(x[2] + x[1], 13);
            x[0] ^= R(x[3] + x[2], 18);
            x[6] ^= R(x[5] + x[4], 7);
            x[7] ^= R(x[6] + x[5], 9);
            x[4] ^= R(x[7] + x[6], 13);
            x[5] ^= R(x[4] + x[7], 18);
            x[11] ^= R(x[10] + x[9], 7);
            x[8] ^= R(x[11] + x[10], 9);
            x[9] ^= R(x[8] + x[11], 13);
            x[10] ^= R(x[9] + x[8], 18);
            x[12] ^= R(x[15] + x[14], 7);
            x[13] ^= R(x[12] + x[15], 9);
            x[14] ^= R(x[13] + x[12], 13);
            x[15] ^= R(x[14] + x[13], 18);
        }
        for(i = 0; i < 16; i++)B32[i] += x[i];
        let bi;
        for(i = 0; i < 16; i++){
            bi = i * 4;
            B[bi + 0] = B32[i] >> 0 & 0xff;
            B[bi + 1] = B32[i] >> 8 & 0xff;
            B[bi + 2] = B32[i] >> 16 & 0xff;
            B[bi + 3] = B32[i] >> 24 & 0xff;
        }
    }
    clean() {
        this.XY.fill(0);
        this.V.fill(0);
        this._X.fill(0);
        this.B.fill(0);
        for(let i = 0; i < 16; i++){
            this.B32[i] = 0;
            this.x[i] = 0;
        }
    }
}
function scryptSync(password, salt, keylen, _opts) {
    const { N , r , p , maxmem  } = fixOpts(_opts);
    const blen = p * 128 * r;
    if (32 * r * (N + 2) * 4 + blen > maxmem) {
        throw new Error("excedes max memory");
    }
    const b = pbkdf2Sync(password, salt, 1, blen, "sha256");
    const scryptRom = new ScryptRom(b, r, N, p);
    const out = scryptRom.run();
    const fin = pbkdf2Sync(password, out, 1, keylen, "sha256");
    scryptRom.clean();
    return fin;
}
function scrypt(password, salt, keylen, _opts, cb) {
    if (!cb) {
        cb = _opts;
        _opts = null;
    }
    const { N , r , p , maxmem  } = fixOpts(_opts);
    const blen = p * 128 * r;
    if (32 * r * (N + 2) * 4 + blen > maxmem) {
        throw new Error("excedes max memory");
    }
    try {
        const b = pbkdf2Sync(password, salt, 1, blen, "sha256");
        const scryptRom = new ScryptRom(b, r, N, p);
        const out = scryptRom.run();
        const result = pbkdf2Sync(password, out, 1, keylen, "sha256");
        scryptRom.clean();
        cb(null, result);
    } catch (err) {
        return cb(err);
    }
}
const encrypt = function(self1, block) {
    return self1._cipher.encryptBlock(block);
};
const decrypt = function(self1, block) {
    return self1._cipher.decryptBlock(block);
};
const mod2 = {
    encrypt: encrypt,
    decrypt: decrypt
};
function xor(a, b) {
    const length = Math.min(a.length, b.length);
    const buffer = Buffer.allocUnsafe(length);
    for(let i = 0; i < length; ++i){
        buffer[i] = a[i] ^ b[i];
    }
    return buffer;
}
const encrypt1 = function(self1, block) {
    const data = xor(block, self1._prev);
    self1._prev = self1._cipher.encryptBlock(data);
    return self1._prev;
};
const decrypt1 = function(self1, block) {
    const pad = self1._prev;
    self1._prev = block;
    const out = self1._cipher.decryptBlock(block);
    return xor(out, pad);
};
const mod3 = {
    encrypt: encrypt1,
    decrypt: decrypt1
};
function encryptStart(self1, data, decrypt) {
    const len = data.length;
    const out = xor(data, self1._cache);
    self1._cache = self1._cache.slice(len);
    self1._prev = Buffer.concat([
        self1._prev,
        decrypt ? data : out
    ]);
    return out;
}
const encrypt2 = function(self1, data, decrypt) {
    let out = Buffer.allocUnsafe(0);
    let len;
    while(data.length){
        if (self1._cache.length === 0) {
            self1._cache = self1._cipher.encryptBlock(self1._prev);
            self1._prev = Buffer.allocUnsafe(0);
        }
        if (self1._cache.length <= data.length) {
            len = self1._cache.length;
            out = Buffer.concat([
                out,
                encryptStart(self1, data.slice(0, len), decrypt)
            ]);
            data = data.slice(len);
        } else {
            out = Buffer.concat([
                out,
                encryptStart(self1, data, decrypt)
            ]);
            break;
        }
    }
    return out;
};
const mod4 = {
    encrypt: encrypt2
};
function encryptByte(self1, byteParam, decrypt) {
    const pad = self1._cipher.encryptBlock(self1._prev);
    const out = pad[0] ^ byteParam;
    self1._prev = Buffer.concat([
        self1._prev.slice(1),
        Buffer.from([
            decrypt ? byteParam : out
        ])
    ]);
    return out;
}
const encrypt3 = function(self1, chunk, decrypt) {
    const len = chunk.length;
    const out = Buffer.allocUnsafe(len);
    let i = -1;
    while(++i < len){
        out[i] = encryptByte(self1, chunk[i], decrypt);
    }
    return out;
};
const mod5 = {
    encrypt: encrypt3
};
function encryptByte1(self1, byteParam, decrypt) {
    let pad;
    let i = -1;
    let out = 0;
    let bit, value;
    while(++i < 8){
        pad = self1._cipher.encryptBlock(self1._prev);
        bit = byteParam & 1 << 7 - i ? 0x80 : 0;
        value = pad[0] ^ bit;
        out += (value & 0x80) >> i % 8;
        self1._prev = shiftIn(self1._prev, decrypt ? bit : value);
    }
    return out;
}
function shiftIn(buffer, value) {
    const len = buffer.length;
    let i = -1;
    const out = Buffer.allocUnsafe(buffer.length);
    buffer = Buffer.concat([
        buffer,
        Buffer.from([
            value
        ])
    ]);
    while(++i < len){
        out[i] = buffer[i] << 1 | buffer[i + 1] >> 7;
    }
    return out;
}
const encrypt4 = function(self1, chunk, decrypt) {
    const len = chunk.length;
    const out = Buffer.allocUnsafe(len);
    let i = -1;
    while(++i < len){
        out[i] = encryptByte1(self1, chunk[i], decrypt);
    }
    return out;
};
const mod6 = {
    encrypt: encrypt4
};
function getBlock(self1) {
    self1._prev = self1._cipher.encryptBlock(self1._prev);
    return self1._prev;
}
const encrypt5 = function(self1, chunk) {
    while(self1._cache.length < chunk.length){
        self1._cache = Buffer.concat([
            self1._cache,
            getBlock(self1)
        ]);
    }
    const pad = self1._cache.slice(0, chunk.length);
    self1._cache = self1._cache.slice(chunk.length);
    return xor(chunk, pad);
};
const mod7 = {
    encrypt: encrypt5
};
function incr32(iv) {
    let len = iv.length;
    let item;
    while(len--){
        item = iv.readUInt8(len);
        if (item === 255) {
            iv.writeUInt8(0, len);
        } else {
            item++;
            iv.writeUInt8(item, len);
            break;
        }
    }
}
function getBlock1(self1) {
    const out = self1._cipher.encryptBlockRaw(self1._prev);
    incr32(self1._prev);
    return out;
}
const blockSize = 16;
const encrypt6 = function(self1, chunk) {
    const chunkNum = Math.ceil(chunk.length / 16);
    const start = self1._cache.length;
    self1._cache = Buffer.concat([
        self1._cache,
        Buffer.allocUnsafe(chunkNum * blockSize)
    ]);
    for(let i = 0; i < chunkNum; i++){
        const out = getBlock1(self1);
        const offset = start + i * 16;
        self1._cache.writeUInt32BE(out[0], offset + 0);
        self1._cache.writeUInt32BE(out[1], offset + 4);
        self1._cache.writeUInt32BE(out[2], offset + 8);
        self1._cache.writeUInt32BE(out[3], offset + 12);
    }
    const pad = self1._cache.slice(0, chunk.length);
    self1._cache = self1._cache.slice(chunk.length);
    return xor(chunk, pad);
};
const mod8 = {
    encrypt: encrypt6
};
const modeModules = {
    ECB: mod2,
    CBC: mod3,
    CFB: mod4,
    CFB8: mod5,
    CFB1: mod6,
    OFB: mod7,
    CTR: mod8,
    GCM: mod8
};
const MODES = {
    "aes-128-ecb": {
        "cipher": "AES",
        "key": 128,
        "iv": 0,
        "mode": "ECB",
        "type": "block"
    },
    "aes-192-ecb": {
        "cipher": "AES",
        "key": 192,
        "iv": 0,
        "mode": "ECB",
        "type": "block"
    },
    "aes-256-ecb": {
        "cipher": "AES",
        "key": 256,
        "iv": 0,
        "mode": "ECB",
        "type": "block"
    },
    "aes-128-cbc": {
        "cipher": "AES",
        "key": 128,
        "iv": 16,
        "mode": "CBC",
        "type": "block"
    },
    "aes-192-cbc": {
        "cipher": "AES",
        "key": 192,
        "iv": 16,
        "mode": "CBC",
        "type": "block"
    },
    "aes-256-cbc": {
        "cipher": "AES",
        "key": 256,
        "iv": 16,
        "mode": "CBC",
        "type": "block"
    },
    "aes128": {
        "cipher": "AES",
        "key": 128,
        "iv": 16,
        "mode": "CBC",
        "type": "block"
    },
    "aes192": {
        "cipher": "AES",
        "key": 192,
        "iv": 16,
        "mode": "CBC",
        "type": "block"
    },
    "aes256": {
        "cipher": "AES",
        "key": 256,
        "iv": 16,
        "mode": "CBC",
        "type": "block"
    },
    "aes-128-cfb": {
        "cipher": "AES",
        "key": 128,
        "iv": 16,
        "mode": "CFB",
        "type": "stream"
    },
    "aes-192-cfb": {
        "cipher": "AES",
        "key": 192,
        "iv": 16,
        "mode": "CFB",
        "type": "stream"
    },
    "aes-256-cfb": {
        "cipher": "AES",
        "key": 256,
        "iv": 16,
        "mode": "CFB",
        "type": "stream"
    },
    "aes-128-cfb8": {
        "cipher": "AES",
        "key": 128,
        "iv": 16,
        "mode": "CFB8",
        "type": "stream"
    },
    "aes-192-cfb8": {
        "cipher": "AES",
        "key": 192,
        "iv": 16,
        "mode": "CFB8",
        "type": "stream"
    },
    "aes-256-cfb8": {
        "cipher": "AES",
        "key": 256,
        "iv": 16,
        "mode": "CFB8",
        "type": "stream"
    },
    "aes-128-cfb1": {
        "cipher": "AES",
        "key": 128,
        "iv": 16,
        "mode": "CFB1",
        "type": "stream"
    },
    "aes-192-cfb1": {
        "cipher": "AES",
        "key": 192,
        "iv": 16,
        "mode": "CFB1",
        "type": "stream"
    },
    "aes-256-cfb1": {
        "cipher": "AES",
        "key": 256,
        "iv": 16,
        "mode": "CFB1",
        "type": "stream"
    },
    "aes-128-ofb": {
        "cipher": "AES",
        "key": 128,
        "iv": 16,
        "mode": "OFB",
        "type": "stream"
    },
    "aes-192-ofb": {
        "cipher": "AES",
        "key": 192,
        "iv": 16,
        "mode": "OFB",
        "type": "stream"
    },
    "aes-256-ofb": {
        "cipher": "AES",
        "key": 256,
        "iv": 16,
        "mode": "OFB",
        "type": "stream"
    },
    "aes-128-ctr": {
        "cipher": "AES",
        "key": 128,
        "iv": 16,
        "mode": "CTR",
        "type": "stream"
    },
    "aes-192-ctr": {
        "cipher": "AES",
        "key": 192,
        "iv": 16,
        "mode": "CTR",
        "type": "stream"
    },
    "aes-256-ctr": {
        "cipher": "AES",
        "key": 256,
        "iv": 16,
        "mode": "CTR",
        "type": "stream"
    },
    "aes-128-gcm": {
        "cipher": "AES",
        "key": 128,
        "iv": 12,
        "mode": "GCM",
        "type": "auth"
    },
    "aes-192-gcm": {
        "cipher": "AES",
        "key": 192,
        "iv": 12,
        "mode": "GCM",
        "type": "auth"
    },
    "aes-256-gcm": {
        "cipher": "AES",
        "key": 256,
        "iv": 12,
        "mode": "GCM",
        "type": "auth"
    }
};
for (const mode of Object.values(MODES)){
    mode.module = modeModules[mode.mode];
}
function asUInt32Array(buf) {
    if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
    var len = buf.length / 4 | 0;
    var out = new Array(len);
    for(var i = 0; i < len; i++){
        out[i] = buf.readUInt32BE(i * 4);
    }
    return out;
}
function scrubVec(v) {
    for(var i = 0; i < v.length; v++){
        v[i] = 0;
    }
}
function cryptBlock(M, keySchedule, SUB_MIX, SBOX, nRounds) {
    var SUB_MIX0 = SUB_MIX[0];
    var SUB_MIX1 = SUB_MIX[1];
    var SUB_MIX2 = SUB_MIX[2];
    var SUB_MIX3 = SUB_MIX[3];
    var s0 = M[0] ^ keySchedule[0];
    var s1 = M[1] ^ keySchedule[1];
    var s2 = M[2] ^ keySchedule[2];
    var s3 = M[3] ^ keySchedule[3];
    var t0, t1, t2, t3;
    var ksRow = 4;
    for(var round = 1; round < nRounds; round++){
        t0 = SUB_MIX0[s0 >>> 24] ^ SUB_MIX1[s1 >>> 16 & 0xff] ^ SUB_MIX2[s2 >>> 8 & 0xff] ^ SUB_MIX3[s3 & 0xff] ^ keySchedule[ksRow++];
        t1 = SUB_MIX0[s1 >>> 24] ^ SUB_MIX1[s2 >>> 16 & 0xff] ^ SUB_MIX2[s3 >>> 8 & 0xff] ^ SUB_MIX3[s0 & 0xff] ^ keySchedule[ksRow++];
        t2 = SUB_MIX0[s2 >>> 24] ^ SUB_MIX1[s3 >>> 16 & 0xff] ^ SUB_MIX2[s0 >>> 8 & 0xff] ^ SUB_MIX3[s1 & 0xff] ^ keySchedule[ksRow++];
        t3 = SUB_MIX0[s3 >>> 24] ^ SUB_MIX1[s0 >>> 16 & 0xff] ^ SUB_MIX2[s1 >>> 8 & 0xff] ^ SUB_MIX3[s2 & 0xff] ^ keySchedule[ksRow++];
        s0 = t0;
        s1 = t1;
        s2 = t2;
        s3 = t3;
    }
    t0 = (SBOX[s0 >>> 24] << 24 | SBOX[s1 >>> 16 & 0xff] << 16 | SBOX[s2 >>> 8 & 0xff] << 8 | SBOX[s3 & 0xff]) ^ keySchedule[ksRow++];
    t1 = (SBOX[s1 >>> 24] << 24 | SBOX[s2 >>> 16 & 0xff] << 16 | SBOX[s3 >>> 8 & 0xff] << 8 | SBOX[s0 & 0xff]) ^ keySchedule[ksRow++];
    t2 = (SBOX[s2 >>> 24] << 24 | SBOX[s3 >>> 16 & 0xff] << 16 | SBOX[s0 >>> 8 & 0xff] << 8 | SBOX[s1 & 0xff]) ^ keySchedule[ksRow++];
    t3 = (SBOX[s3 >>> 24] << 24 | SBOX[s0 >>> 16 & 0xff] << 16 | SBOX[s1 >>> 8 & 0xff] << 8 | SBOX[s2 & 0xff]) ^ keySchedule[ksRow++];
    t0 = t0 >>> 0;
    t1 = t1 >>> 0;
    t2 = t2 >>> 0;
    t3 = t3 >>> 0;
    return [
        t0,
        t1,
        t2,
        t3
    ];
}
var RCON = [
    0x00,
    0x01,
    0x02,
    0x04,
    0x08,
    0x10,
    0x20,
    0x40,
    0x80,
    0x1b,
    0x36
];
var G = function() {
    var d = new Array(256);
    for(var j = 0; j < 256; j++){
        if (j < 128) {
            d[j] = j << 1;
        } else {
            d[j] = j << 1 ^ 0x11b;
        }
    }
    var SBOX = [];
    var INV_SBOX = [];
    var SUB_MIX = [
        [],
        [],
        [],
        []
    ];
    var INV_SUB_MIX = [
        [],
        [],
        [],
        []
    ];
    var x = 0;
    var xi = 0;
    for(var i = 0; i < 256; ++i){
        var sx = xi ^ xi << 1 ^ xi << 2 ^ xi << 3 ^ xi << 4;
        sx = sx >>> 8 ^ sx & 0xff ^ 0x63;
        SBOX[x] = sx;
        INV_SBOX[sx] = x;
        var x2 = d[x];
        var x4 = d[x2];
        var x8 = d[x4];
        var t = d[sx] * 0x101 ^ sx * 0x1010100;
        SUB_MIX[0][x] = t << 24 | t >>> 8;
        SUB_MIX[1][x] = t << 16 | t >>> 16;
        SUB_MIX[2][x] = t << 8 | t >>> 24;
        SUB_MIX[3][x] = t;
        t = x8 * 0x1010101 ^ x4 * 0x10001 ^ x2 * 0x101 ^ x * 0x1010100;
        INV_SUB_MIX[0][sx] = t << 24 | t >>> 8;
        INV_SUB_MIX[1][sx] = t << 16 | t >>> 16;
        INV_SUB_MIX[2][sx] = t << 8 | t >>> 24;
        INV_SUB_MIX[3][sx] = t;
        if (x === 0) {
            x = xi = 1;
        } else {
            x = x2 ^ d[d[d[x8 ^ x2]]];
            xi ^= d[d[xi]];
        }
    }
    return {
        SBOX: SBOX,
        INV_SBOX: INV_SBOX,
        SUB_MIX: SUB_MIX,
        INV_SUB_MIX: INV_SUB_MIX
    };
}();
function AES(key) {
    this._key = asUInt32Array(key);
    this._reset();
}
AES.blockSize = 4 * 4;
AES.keySize = 256 / 8;
AES.prototype.blockSize = AES.blockSize;
AES.prototype.keySize = AES.keySize;
AES.prototype._reset = function() {
    var keyWords = this._key;
    var keySize = keyWords.length;
    var nRounds = keySize + 6;
    var ksRows = (nRounds + 1) * 4;
    var keySchedule = [];
    for(var k = 0; k < keySize; k++){
        keySchedule[k] = keyWords[k];
    }
    for(k = keySize; k < ksRows; k++){
        var t = keySchedule[k - 1];
        if (k % keySize === 0) {
            t = t << 8 | t >>> 24;
            t = G.SBOX[t >>> 24] << 24 | G.SBOX[t >>> 16 & 0xff] << 16 | G.SBOX[t >>> 8 & 0xff] << 8 | G.SBOX[t & 0xff];
            t ^= RCON[k / keySize | 0] << 24;
        } else if (keySize > 6 && k % keySize === 4) {
            t = G.SBOX[t >>> 24] << 24 | G.SBOX[t >>> 16 & 0xff] << 16 | G.SBOX[t >>> 8 & 0xff] << 8 | G.SBOX[t & 0xff];
        }
        keySchedule[k] = keySchedule[k - keySize] ^ t;
    }
    var invKeySchedule = [];
    for(var ik = 0; ik < ksRows; ik++){
        var ksR = ksRows - ik;
        var tt = keySchedule[ksR - (ik % 4 ? 0 : 4)];
        if (ik < 4 || ksR <= 4) {
            invKeySchedule[ik] = tt;
        } else {
            invKeySchedule[ik] = G.INV_SUB_MIX[0][G.SBOX[tt >>> 24]] ^ G.INV_SUB_MIX[1][G.SBOX[tt >>> 16 & 0xff]] ^ G.INV_SUB_MIX[2][G.SBOX[tt >>> 8 & 0xff]] ^ G.INV_SUB_MIX[3][G.SBOX[tt & 0xff]];
        }
    }
    this._nRounds = nRounds;
    this._keySchedule = keySchedule;
    this._invKeySchedule = invKeySchedule;
};
AES.prototype.encryptBlockRaw = function(M) {
    M = asUInt32Array(M);
    return cryptBlock(M, this._keySchedule, G.SUB_MIX, G.SBOX, this._nRounds);
};
AES.prototype.encryptBlock = function(M) {
    var out = this.encryptBlockRaw(M);
    var buf = Buffer.allocUnsafe(16);
    buf.writeUInt32BE(out[0], 0);
    buf.writeUInt32BE(out[1], 4);
    buf.writeUInt32BE(out[2], 8);
    buf.writeUInt32BE(out[3], 12);
    return buf;
};
AES.prototype.decryptBlock = function(M) {
    M = asUInt32Array(M);
    var m1 = M[1];
    M[1] = M[3];
    M[3] = m1;
    var out = cryptBlock(M, this._invKeySchedule, G.INV_SUB_MIX, G.INV_SBOX, this._nRounds);
    var buf = Buffer.allocUnsafe(16);
    buf.writeUInt32BE(out[0], 0);
    buf.writeUInt32BE(out[3], 4);
    buf.writeUInt32BE(out[2], 8);
    buf.writeUInt32BE(out[1], 12);
    return buf;
};
AES.prototype.scrub = function() {
    scrubVec(this._keySchedule);
    scrubVec(this._invKeySchedule);
    scrubVec(this._key);
};
function CipherBase(hashMode) {
    Transform.call(this);
    this.hashMode = typeof hashMode === "string";
    if (this.hashMode) {
        this[hashMode] = this._finalOrDigest;
    } else {
        this.final = this._finalOrDigest;
    }
    if (this._final) {
        this.__final = this._final;
        this._final = null;
    }
    this._decoder = null;
    this._encoding = null;
}
CipherBase.prototype = Object.create(Transform.prototype, {
    constructor: {
        value: CipherBase,
        enumerable: false,
        writable: true,
        configurable: true
    }
});
CipherBase.prototype.update = function(data, inputEnc, outputEnc) {
    if (typeof data === "string") {
        data = Buffer.from(data, inputEnc);
    }
    var outData = this._update(data);
    if (this.hashMode) return this;
    if (outputEnc) {
        outData = this._toString(outData, outputEnc);
    }
    return outData;
};
CipherBase.prototype.setAutoPadding = function() {};
CipherBase.prototype.getAuthTag = function() {
    throw new Error("trying to get auth tag in unsupported state");
};
CipherBase.prototype.setAuthTag = function() {
    throw new Error("trying to set auth tag in unsupported state");
};
CipherBase.prototype.setAAD = function() {
    throw new Error("trying to set aad in unsupported state");
};
CipherBase.prototype._transform = function(data, _, next) {
    var err;
    try {
        if (this.hashMode) {
            this._update(data);
        } else {
            this.push(this._update(data));
        }
    } catch (e) {
        err = e;
    } finally{
        next(err);
    }
};
CipherBase.prototype._flush = function(done) {
    var err;
    try {
        this.push(this.__final());
    } catch (e) {
        err = e;
    }
    done(err);
};
CipherBase.prototype._finalOrDigest = function(outputEnc) {
    var outData = this.__final() || Buffer.alloc(0);
    if (outputEnc) {
        outData = this._toString(outData, outputEnc, true);
    }
    return outData;
};
CipherBase.prototype._toString = function(value, enc, fin) {
    if (!this._decoder) {
        this._decoder = new StringDecoder(enc);
        this._encoding = enc;
    }
    if (this._encoding !== enc) throw new Error("can't switch encodings");
    var out = this._decoder.write(value);
    if (fin) {
        out += this._decoder.end();
    }
    return out;
};
var ZEROES = Buffer.alloc(16, 0);
function toArray(buf) {
    return [
        buf.readUInt32BE(0),
        buf.readUInt32BE(4),
        buf.readUInt32BE(8),
        buf.readUInt32BE(12)
    ];
}
function fromArray(out) {
    var buf = Buffer.allocUnsafe(16);
    buf.writeUInt32BE(out[0] >>> 0, 0);
    buf.writeUInt32BE(out[1] >>> 0, 4);
    buf.writeUInt32BE(out[2] >>> 0, 8);
    buf.writeUInt32BE(out[3] >>> 0, 12);
    return buf;
}
function GHASH(key) {
    this.h = key;
    this.state = Buffer.alloc(16, 0);
    this.cache = Buffer.allocUnsafe(0);
}
GHASH.prototype.ghash = function(block) {
    var i = -1;
    while(++i < block.length){
        this.state[i] ^= block[i];
    }
    this._multiply();
};
GHASH.prototype._multiply = function() {
    var Vi = toArray(this.h);
    var Zi = [
        0,
        0,
        0,
        0
    ];
    var j, xi, lsbVi;
    var i = -1;
    while(++i < 128){
        xi = (this.state[~~(i / 8)] & 1 << 7 - i % 8) !== 0;
        if (xi) {
            Zi[0] ^= Vi[0];
            Zi[1] ^= Vi[1];
            Zi[2] ^= Vi[2];
            Zi[3] ^= Vi[3];
        }
        lsbVi = (Vi[3] & 1) !== 0;
        for(j = 3; j > 0; j--){
            Vi[j] = Vi[j] >>> 1 | (Vi[j - 1] & 1) << 31;
        }
        Vi[0] = Vi[0] >>> 1;
        if (lsbVi) {
            Vi[0] = Vi[0] ^ 0xe1 << 24;
        }
    }
    this.state = fromArray(Zi);
};
GHASH.prototype.update = function(buf) {
    this.cache = Buffer.concat([
        this.cache,
        buf
    ]);
    var chunk;
    while(this.cache.length >= 16){
        chunk = this.cache.slice(0, 16);
        this.cache = this.cache.slice(16);
        this.ghash(chunk);
    }
};
GHASH.prototype.final = function(abl, bl) {
    if (this.cache.length) {
        this.ghash(Buffer.concat([
            this.cache,
            ZEROES
        ], 16));
    }
    this.ghash(fromArray([
        0,
        abl,
        0,
        bl
    ]));
    return this.state;
};
function xorTest(a, b) {
    var out = 0;
    if (a.length !== b.length) out++;
    var len = Math.min(a.length, b.length);
    for(var i = 0; i < len; ++i){
        out += a[i] ^ b[i];
    }
    return out;
}
function calcIv(self1, iv, ck) {
    if (iv.length === 12) {
        self1._finID = Buffer.concat([
            iv,
            Buffer.from([
                0,
                0,
                0,
                1
            ])
        ]);
        return Buffer.concat([
            iv,
            Buffer.from([
                0,
                0,
                0,
                2
            ])
        ]);
    }
    var ghash = new GHASH(ck);
    var len = iv.length;
    var toPad = len % 16;
    ghash.update(iv);
    if (toPad) {
        toPad = 16 - toPad;
        ghash.update(Buffer.alloc(toPad, 0));
    }
    ghash.update(Buffer.alloc(8, 0));
    var ivBits = len * 8;
    var tail = Buffer.alloc(8);
    tail.writeUIntBE(ivBits, 2, 6);
    ghash.update(tail);
    self1._finID = ghash.state;
    var out = Buffer.from(self1._finID);
    incr32(out);
    return out;
}
function StreamCipher(mode, key, iv, decrypt) {
    CipherBase.call(this);
    var h = Buffer.alloc(4, 0);
    this._cipher = new AES(key);
    var ck = this._cipher.encryptBlock(h);
    this._ghash = new GHASH(ck);
    iv = calcIv(this, iv, ck);
    this._prev = Buffer.from(iv);
    this._cache = Buffer.allocUnsafe(0);
    this._secCache = Buffer.allocUnsafe(0);
    this._decrypt = decrypt;
    this._alen = 0;
    this._len = 0;
    this._mode = mode;
    this._authTag = null;
    this._called = false;
}
StreamCipher.prototype = Object.create(CipherBase.prototype, {
    constructor: {
        value: StreamCipher,
        enumerable: false,
        writable: true,
        configurable: true
    }
});
StreamCipher.prototype._update = function(chunk) {
    if (!this._called && this._alen) {
        var rump = 16 - this._alen % 16;
        if (rump < 16) {
            rump = Buffer.alloc(rump, 0);
            this._ghash.update(rump);
        }
    }
    this._called = true;
    var out = this._mode.encrypt(this, chunk);
    if (this._decrypt) {
        this._ghash.update(chunk);
    } else {
        this._ghash.update(out);
    }
    this._len += chunk.length;
    return out;
};
StreamCipher.prototype._final = function() {
    if (this._decrypt && !this._authTag) {
        throw new Error("Unsupported state or unable to authenticate data");
    }
    var tag = xor(this._ghash.final(this._alen * 8, this._len * 8), this._cipher.encryptBlock(this._finID));
    if (this._decrypt && xorTest(tag, this._authTag)) {
        throw new Error("Unsupported state or unable to authenticate data");
    }
    this._authTag = tag;
    this._cipher.scrub();
};
StreamCipher.prototype.getAuthTag = function getAuthTag() {
    if (this._decrypt || !Buffer.isBuffer(this._authTag)) {
        throw new Error("Attempting to get auth tag in unsupported state");
    }
    return this._authTag;
};
StreamCipher.prototype.setAuthTag = function setAuthTag(tag) {
    if (!this._decrypt) {
        throw new Error("Attempting to set auth tag in unsupported state");
    }
    this._authTag = tag;
};
StreamCipher.prototype.setAAD = function setAAD(buf) {
    if (this._called) {
        throw new Error("Attempting to set AAD in unsupported state");
    }
    this._ghash.update(buf);
    this._alen += buf.length;
};
function StreamCipher1(mode, key, iv, decrypt) {
    CipherBase.call(this);
    this._cipher = new AES(key);
    this._prev = Buffer.from(iv);
    this._cache = Buffer.allocUnsafe(0);
    this._secCache = Buffer.allocUnsafe(0);
    this._decrypt = decrypt;
    this._mode = mode;
}
StreamCipher1.prototype = Object.create(CipherBase.prototype, {
    constructor: {
        value: StreamCipher1,
        enumerable: false,
        writable: true,
        configurable: true
    }
});
StreamCipher1.prototype._update = function(chunk) {
    return this._mode.encrypt(this, chunk, this._decrypt);
};
StreamCipher1.prototype._final = function() {
    this._cipher.scrub();
};
function EVP_BytesToKey(password, salt, keyBits, ivLen) {
    if (!Buffer.isBuffer(password)) password = Buffer.from(password, "binary");
    if (salt) {
        if (!Buffer.isBuffer(salt)) salt = Buffer.from(salt, "binary");
        if (salt.length !== 8) {
            throw new RangeError("salt should be Buffer with 8 byte length");
        }
    }
    let keyLen = keyBits / 8;
    const key = Buffer.alloc(keyLen);
    const iv = Buffer.alloc(ivLen || 0);
    let tmp = Buffer.alloc(0);
    while(keyLen > 0 || ivLen > 0){
        const hash = createHash("md5");
        hash.update(tmp);
        hash.update(password);
        if (salt) hash.update(salt);
        tmp = hash.digest();
        let used = 0;
        if (keyLen > 0) {
            const keyStart = key.length - keyLen;
            used = Math.min(keyLen, tmp.length);
            tmp.copy(key, keyStart, 0, used);
            keyLen -= used;
        }
        if (used < tmp.length && ivLen > 0) {
            const ivStart = iv.length - ivLen;
            const length = Math.min(ivLen, tmp.length - used);
            tmp.copy(iv, ivStart, used, used + length);
            ivLen -= length;
        }
    }
    tmp.fill(0);
    return {
        key,
        iv
    };
}
function Cipher(mode, key, iv) {
    CipherBase.call(this);
    this._cache = new Splitter();
    this._cipher = new AES(key);
    this._prev = Buffer.from(iv);
    this._mode = mode;
    this._autopadding = true;
}
Cipher.prototype = Object.create(CipherBase.prototype, {
    constructor: {
        value: Cipher,
        enumerable: false,
        writable: true,
        configurable: true
    }
});
Cipher.prototype._update = function(data) {
    this._cache.add(data);
    var chunk;
    var thing;
    var out = [];
    while(chunk = this._cache.get()){
        thing = this._mode.encrypt(this, chunk);
        out.push(thing);
    }
    return Buffer.concat(out);
};
var PADDING = Buffer.alloc(16, 0x10);
Cipher.prototype._final = function() {
    var chunk = this._cache.flush();
    if (this._autopadding) {
        chunk = this._mode.encrypt(this, chunk);
        this._cipher.scrub();
        return chunk;
    }
    if (!chunk.equals(PADDING)) {
        this._cipher.scrub();
        throw new Error("data not multiple of block length");
    }
};
Cipher.prototype.setAutoPadding = function(setTo) {
    this._autopadding = !!setTo;
    return this;
};
function Splitter() {
    this.cache = Buffer.allocUnsafe(0);
}
Splitter.prototype.add = function(data) {
    this.cache = Buffer.concat([
        this.cache,
        data
    ]);
};
Splitter.prototype.get = function() {
    if (this.cache.length > 15) {
        const out = this.cache.slice(0, 16);
        this.cache = this.cache.slice(16);
        return out;
    }
    return null;
};
Splitter.prototype.flush = function() {
    var len = 16 - this.cache.length;
    var padBuff = Buffer.allocUnsafe(len);
    var i = -1;
    while(++i < len){
        padBuff.writeUInt8(len, i);
    }
    return Buffer.concat([
        this.cache,
        padBuff
    ]);
};
function Decipher(mode, key, iv) {
    CipherBase.call(this);
    this._cache = new Splitter1();
    this._last = void 0;
    this._cipher = new AES(key);
    this._prev = Buffer.from(iv);
    this._mode = mode;
    this._autopadding = true;
}
Decipher.prototype = Object.create(CipherBase.prototype, {
    constructor: {
        value: Decipher,
        enumerable: false,
        writable: true,
        configurable: true
    }
});
Decipher.prototype._update = function(data) {
    this._cache.add(data);
    var chunk;
    var thing;
    var out = [];
    while(chunk = this._cache.get(this._autopadding)){
        thing = this._mode.decrypt(this, chunk);
        out.push(thing);
    }
    return Buffer.concat(out);
};
Decipher.prototype._final = function() {
    var chunk = this._cache.flush();
    if (this._autopadding) {
        return unpad(this._mode.decrypt(this, chunk));
    } else if (chunk) {
        throw new Error("data not multiple of block length");
    }
};
Decipher.prototype.setAutoPadding = function(setTo) {
    this._autopadding = !!setTo;
    return this;
};
function Splitter1() {
    this.cache = Buffer.allocUnsafe(0);
}
Splitter1.prototype.add = function(data) {
    this.cache = Buffer.concat([
        this.cache,
        data
    ]);
};
Splitter1.prototype.get = function(autoPadding) {
    var out;
    if (autoPadding) {
        if (this.cache.length > 16) {
            out = this.cache.slice(0, 16);
            this.cache = this.cache.slice(16);
            return out;
        }
    } else {
        if (this.cache.length >= 16) {
            out = this.cache.slice(0, 16);
            this.cache = this.cache.slice(16);
            return out;
        }
    }
    return null;
};
Splitter1.prototype.flush = function() {
    if (this.cache.length) return this.cache;
};
function unpad(last) {
    var padded = last[15];
    if (padded < 1 || padded > 16) {
        throw new Error("unable to decrypt data");
    }
    var i = -1;
    while(++i < padded){
        if (last[i + (16 - padded)] !== padded) {
            throw new Error("unable to decrypt data");
        }
    }
    if (padded === 16) return;
    return last.slice(0, 16 - padded);
}
function createDecipheriv(suite, password, iv) {
    var config = MODES[suite.toLowerCase()];
    if (!config) throw new TypeError("invalid suite type");
    if (typeof iv === "string") iv = Buffer.from(iv);
    if (config.mode !== "GCM" && iv.length !== config.iv) {
        throw new TypeError("invalid iv length " + iv.length);
    }
    if (typeof password === "string") password = Buffer.from(password);
    if (password.length !== config.key / 8) {
        throw new TypeError("invalid key length " + password.length);
    }
    if (config.type === "stream") {
        return new StreamCipher1(config.module, password, iv, true);
    } else if (config.type === "auth") {
        return new StreamCipher(config.module, password, iv, true);
    }
    return new Decipher(config.module, password, iv);
}
function getCiphers() {
    return Object.keys(MODES);
}
let defaultEncoding = "buffer";
function getDefaultEncoding() {
    return defaultEncoding;
}
function toBuf(val, encoding) {
    if (typeof val === "string") {
        if (encoding === "buffer") {
            encoding = "utf8";
        }
        return Buffer.from(val, encoding);
    }
    return val;
}
const validateByteSource = hideStackFrames((val, name)=>{
    val = toBuf(val);
    if (isAnyArrayBuffer1(val) || isArrayBufferView(val)) {
        return;
    }
    throw new ERR_INVALID_ARG_TYPE(name, [
        "string",
        "ArrayBuffer",
        "TypedArray",
        "DataView",
        "Buffer"
    ], val);
});
function getHashes() {
    return digestAlgorithms;
}
function getCurves() {
    notImplemented("crypto.getCurves");
}
function secureHeapUsed() {
    notImplemented("crypto.secureHeapUsed");
}
function setEngine(_engine, _flags) {
    notImplemented("crypto.setEngine");
}
class KeyObject {
    [kKeyType];
    [kHandle];
    constructor(type, handle){
        if (type !== "secret" && type !== "public" && type !== "private") {
            throw new ERR_INVALID_ARG_VALUE("type", type);
        }
        if (typeof handle !== "object") {
            throw new ERR_INVALID_ARG_TYPE("handle", "object", handle);
        }
        this[kKeyType] = type;
        Object.defineProperty(this, kHandle, {
            value: handle,
            enumerable: false,
            configurable: false,
            writable: false
        });
    }
    get type() {
        return this[kKeyType];
    }
    get asymmetricKeyDetails() {
        notImplemented("crypto.KeyObject.prototype.asymmetricKeyDetails");
        return undefined;
    }
    get asymmetricKeyType() {
        notImplemented("crypto.KeyObject.prototype.asymmetricKeyType");
        return undefined;
    }
    get symmetricKeySize() {
        notImplemented("crypto.KeyObject.prototype.symmetricKeySize");
        return undefined;
    }
    static from(key) {
        if (!isCryptoKey(key)) {
            throw new ERR_INVALID_ARG_TYPE("key", "CryptoKey", key);
        }
        notImplemented("crypto.KeyObject.prototype.from");
    }
    equals(otherKeyObject) {
        if (!isKeyObject(otherKeyObject)) {
            throw new ERR_INVALID_ARG_TYPE("otherKeyObject", "KeyObject", otherKeyObject);
        }
        notImplemented("crypto.KeyObject.prototype.equals");
    }
    export(_options) {
        notImplemented("crypto.KeyObject.prototype.asymmetricKeyType");
    }
}
function createPrivateKey(_key) {
    notImplemented("crypto.createPrivateKey");
}
function createPublicKey(_key) {
    notImplemented("crypto.createPublicKey");
}
function createSecretKey(_key, _encoding) {
    notImplemented("crypto.createSecretKey");
}
const validateParameters = hideStackFrames((hash, key, salt, info, length)=>{
    key = prepareKey(key);
    salt = toBuf(salt);
    info = toBuf(info);
    validateString(hash, "digest");
    validateByteSource(salt, "salt");
    validateByteSource(info, "info");
    validateInteger(length, "length", 0, 2147483647);
    if (info.byteLength > 1024) {
        throw new ERR_OUT_OF_RANGE("info", "must not contain more than 1024 bytes", info.byteLength);
    }
    return {
        hash,
        key,
        salt,
        info,
        length
    };
});
function prepareKey(key) {
    if (isKeyObject(key)) {
        return key;
    }
    if (isAnyArrayBuffer1(key)) {
        return createSecretKey(new Uint8Array(key));
    }
    key = toBuf(key);
    if (!isArrayBufferView(key)) {
        throw new ERR_INVALID_ARG_TYPE("ikm", [
            "string",
            "SecretKeyObject",
            "ArrayBuffer",
            "TypedArray",
            "DataView",
            "Buffer"
        ], key);
    }
    return createSecretKey(key);
}
function hkdf(hash, key, salt, info, length, callback) {
    ({ hash , key , salt , info , length  } = validateParameters(hash, key, salt, info, length));
    validateCallback(callback);
    notImplemented("crypto.hkdf");
}
function hkdfSync(hash, key, salt, info, length) {
    ({ hash , key , salt , info , length  } = validateParameters(hash, key, salt, info, length));
    notImplemented("crypto.hkdfSync");
}
function generateKey(_type, _options, _callback) {
    notImplemented("crypto.generateKey");
}
function generateKeyPair(_type, _options, _callback) {
    notImplemented("crypto.generateKeyPair");
}
function generateKeyPairSync(_type, _options) {
    notImplemented("crypto.generateKeyPairSync");
}
function generateKeySync(_type, _options) {
    notImplemented("crypto.generateKeySync");
}
const DH_GENERATOR = 2;
class DiffieHellman {
    verifyError;
    constructor(sizeOrKey, keyEncoding, generator, genEncoding){
        if (typeof sizeOrKey !== "number" && typeof sizeOrKey !== "string" && !isArrayBufferView(sizeOrKey) && !isAnyArrayBuffer1(sizeOrKey)) {
            throw new ERR_INVALID_ARG_TYPE("sizeOrKey", [
                "number",
                "string",
                "ArrayBuffer",
                "Buffer",
                "TypedArray",
                "DataView"
            ], sizeOrKey);
        }
        if (typeof sizeOrKey === "number") {
            validateInt32(sizeOrKey, "sizeOrKey");
        }
        if (keyEncoding && !Buffer.isEncoding(keyEncoding) && keyEncoding !== "buffer") {
            genEncoding = generator;
            generator = keyEncoding;
            keyEncoding = false;
        }
        const encoding = getDefaultEncoding();
        keyEncoding = keyEncoding || encoding;
        genEncoding = genEncoding || encoding;
        if (typeof sizeOrKey !== "number") {
            sizeOrKey = toBuf(sizeOrKey, keyEncoding);
        }
        if (!generator) {
            generator = DH_GENERATOR;
        } else if (typeof generator === "number") {
            validateInt32(generator, "generator");
        } else if (typeof generator === "string") {
            generator = toBuf(generator, genEncoding);
        } else if (!isArrayBufferView(generator) && !isAnyArrayBuffer1(generator)) {
            throw new ERR_INVALID_ARG_TYPE("generator", [
                "number",
                "string",
                "ArrayBuffer",
                "Buffer",
                "TypedArray",
                "DataView"
            ], generator);
        }
        notImplemented("crypto.DiffieHellman");
    }
    computeSecret(_otherPublicKey, _inputEncoding, _outputEncoding) {
        notImplemented("crypto.DiffieHellman.prototype.computeSecret");
    }
    generateKeys(_encoding) {
        notImplemented("crypto.DiffieHellman.prototype.generateKeys");
    }
    getGenerator(_encoding) {
        notImplemented("crypto.DiffieHellman.prototype.getGenerator");
    }
    getPrime(_encoding) {
        notImplemented("crypto.DiffieHellman.prototype.getPrime");
    }
    getPrivateKey(_encoding) {
        notImplemented("crypto.DiffieHellman.prototype.getPrivateKey");
    }
    getPublicKey(_encoding) {
        notImplemented("crypto.DiffieHellman.prototype.getPublicKey");
    }
    setPrivateKey(_privateKey, _encoding) {
        notImplemented("crypto.DiffieHellman.prototype.setPrivateKey");
    }
    setPublicKey(_publicKey, _encoding) {
        notImplemented("crypto.DiffieHellman.prototype.setPublicKey");
    }
}
class DiffieHellmanGroup {
    verifyError;
    constructor(_name){
        notImplemented("crypto.DiffieHellmanGroup");
    }
    computeSecret(_otherPublicKey, _inputEncoding, _outputEncoding) {
        notImplemented("crypto.DiffieHellman.prototype.computeSecret");
    }
    generateKeys(_encoding) {
        notImplemented("crypto.DiffieHellman.prototype.generateKeys");
    }
    getGenerator(_encoding) {
        notImplemented("crypto.DiffieHellman.prototype.getGenerator");
    }
    getPrime(_encoding) {
        notImplemented("crypto.DiffieHellman.prototype.getPrime");
    }
    getPrivateKey(_encoding) {
        notImplemented("crypto.DiffieHellman.prototype.getPrivateKey");
    }
    getPublicKey(_encoding) {
        notImplemented("crypto.DiffieHellman.prototype.getPublicKey");
    }
}
class ECDH {
    constructor(curve){
        validateString(curve, "curve");
        notImplemented("crypto.ECDH");
    }
    static convertKey(_key, _curve, _inputEncoding, _outputEncoding, _format) {
        notImplemented("crypto.ECDH.prototype.convertKey");
    }
    computeSecret(_otherPublicKey, _inputEncoding, _outputEncoding) {
        notImplemented("crypto.ECDH.prototype.computeSecret");
    }
    generateKeys(_encoding, _format) {
        notImplemented("crypto.ECDH.prototype.generateKeys");
    }
    getPrivateKey(_encoding) {
        notImplemented("crypto.ECDH.prototype.getPrivateKey");
    }
    getPublicKey(_encoding, _format) {
        notImplemented("crypto.ECDH.prototype.getPublicKey");
    }
    setPrivateKey(_privateKey, _encoding) {
        notImplemented("crypto.ECDH.prototype.setPrivateKey");
    }
}
function diffieHellman(_options) {
    notImplemented("crypto.diffieHellman");
}
function assert3(val, msg) {
    if (!val) throw new Error(msg || "Assertion failed");
}
function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    var TempCtor = function() {};
    TempCtor.prototype = superCtor.prototype;
    ctor.prototype = new TempCtor();
    ctor.prototype.constructor = ctor;
}
function BN(number, base, endian) {
    if (BN.isBN(number)) {
        return number;
    }
    this.negative = 0;
    this.words = null;
    this.length = 0;
    this.red = null;
    if (number !== null) {
        if (base === "le" || base === "be") {
            endian = base;
            base = 10;
        }
        this._init(number || 0, base || 10, endian || "be");
    }
}
BN.BN = BN;
BN.wordSize = 26;
BN.isBN = function isBN(num) {
    if (num instanceof BN) {
        return true;
    }
    return num !== null && typeof num === "object" && num.constructor.wordSize === BN.wordSize && Array.isArray(num.words);
};
BN.max = function max(left, right) {
    if (left.cmp(right) > 0) return left;
    return right;
};
BN.min = function min(left, right) {
    if (left.cmp(right) < 0) return left;
    return right;
};
BN.prototype._init = function init(number, base, endian) {
    if (typeof number === "number") {
        return this._initNumber(number, base, endian);
    }
    if (typeof number === "object") {
        return this._initArray(number, base, endian);
    }
    if (base === "hex") {
        base = 16;
    }
    assert3(base === (base | 0) && base >= 2 && base <= 36);
    number = number.toString().replace(/\s+/g, "");
    var start = 0;
    if (number[0] === "-") {
        start++;
        this.negative = 1;
    }
    if (start < number.length) {
        if (base === 16) {
            this._parseHex(number, start, endian);
        } else {
            this._parseBase(number, base, start);
            if (endian === "le") {
                this._initArray(this.toArray(), base, endian);
            }
        }
    }
};
BN.prototype._initNumber = function _initNumber(number, base, endian) {
    if (number < 0) {
        this.negative = 1;
        number = -number;
    }
    if (number < 0x4000000) {
        this.words = [
            number & 0x3ffffff
        ];
        this.length = 1;
    } else if (number < 0x10000000000000) {
        this.words = [
            number & 0x3ffffff,
            number / 0x4000000 & 0x3ffffff
        ];
        this.length = 2;
    } else {
        assert3(number < 0x20000000000000);
        this.words = [
            number & 0x3ffffff,
            number / 0x4000000 & 0x3ffffff,
            1
        ];
        this.length = 3;
    }
    if (endian !== "le") return;
    this._initArray(this.toArray(), base, endian);
};
BN.prototype._initArray = function _initArray(number, base, endian) {
    assert3(typeof number.length === "number");
    if (number.length <= 0) {
        this.words = [
            0
        ];
        this.length = 1;
        return this;
    }
    this.length = Math.ceil(number.length / 3);
    this.words = new Array(this.length);
    for(var i = 0; i < this.length; i++){
        this.words[i] = 0;
    }
    var j, w;
    var off = 0;
    if (endian === "be") {
        for(i = number.length - 1, j = 0; i >= 0; i -= 3){
            w = number[i] | number[i - 1] << 8 | number[i - 2] << 16;
            this.words[j] |= w << off & 0x3ffffff;
            this.words[j + 1] = w >>> 26 - off & 0x3ffffff;
            off += 24;
            if (off >= 26) {
                off -= 26;
                j++;
            }
        }
    } else if (endian === "le") {
        for(i = 0, j = 0; i < number.length; i += 3){
            w = number[i] | number[i + 1] << 8 | number[i + 2] << 16;
            this.words[j] |= w << off & 0x3ffffff;
            this.words[j + 1] = w >>> 26 - off & 0x3ffffff;
            off += 24;
            if (off >= 26) {
                off -= 26;
                j++;
            }
        }
    }
    return this._strip();
};
function parseHex4Bits(string, index) {
    var c = string.charCodeAt(index);
    if (c >= 48 && c <= 57) {
        return c - 48;
    } else if (c >= 65 && c <= 70) {
        return c - 55;
    } else if (c >= 97 && c <= 102) {
        return c - 87;
    } else {
        assert3(false, "Invalid character in " + string);
    }
}
function parseHexByte(string, lowerBound, index) {
    var r = parseHex4Bits(string, index);
    if (index - 1 >= lowerBound) {
        r |= parseHex4Bits(string, index - 1) << 4;
    }
    return r;
}
BN.prototype._parseHex = function _parseHex(number, start, endian) {
    this.length = Math.ceil((number.length - start) / 6);
    this.words = new Array(this.length);
    for(var i = 0; i < this.length; i++){
        this.words[i] = 0;
    }
    var off = 0;
    var j = 0;
    var w;
    if (endian === "be") {
        for(i = number.length - 1; i >= start; i -= 2){
            w = parseHexByte(number, start, i) << off;
            this.words[j] |= w & 0x3ffffff;
            if (off >= 18) {
                off -= 18;
                j += 1;
                this.words[j] |= w >>> 26;
            } else {
                off += 8;
            }
        }
    } else {
        var parseLength = number.length - start;
        for(i = parseLength % 2 === 0 ? start + 1 : start; i < number.length; i += 2){
            w = parseHexByte(number, start, i) << off;
            this.words[j] |= w & 0x3ffffff;
            if (off >= 18) {
                off -= 18;
                j += 1;
                this.words[j] |= w >>> 26;
            } else {
                off += 8;
            }
        }
    }
    this._strip();
};
function parseBase(str, start, end, mul) {
    var r = 0;
    var b = 0;
    var len = Math.min(str.length, end);
    for(var i = start; i < len; i++){
        var c = str.charCodeAt(i) - 48;
        r *= mul;
        if (c >= 49) {
            b = c - 49 + 0xa;
        } else if (c >= 17) {
            b = c - 17 + 0xa;
        } else {
            b = c;
        }
        assert3(c >= 0 && b < mul, "Invalid character");
        r += b;
    }
    return r;
}
BN.prototype._parseBase = function _parseBase(number, base, start) {
    this.words = [
        0
    ];
    this.length = 1;
    for(var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base){
        limbLen++;
    }
    limbLen--;
    limbPow = limbPow / base | 0;
    var total = number.length - start;
    var mod = total % limbLen;
    var end = Math.min(total, total - mod) + start;
    var word = 0;
    for(var i = start; i < end; i += limbLen){
        word = parseBase(number, i, i + limbLen, base);
        this.imuln(limbPow);
        if (this.words[0] + word < 0x4000000) {
            this.words[0] += word;
        } else {
            this._iaddn(word);
        }
    }
    if (mod !== 0) {
        var pow = 1;
        word = parseBase(number, i, number.length, base);
        for(i = 0; i < mod; i++){
            pow *= base;
        }
        this.imuln(pow);
        if (this.words[0] + word < 0x4000000) {
            this.words[0] += word;
        } else {
            this._iaddn(word);
        }
    }
    this._strip();
};
BN.prototype.copy = function copy(dest) {
    dest.words = new Array(this.length);
    for(var i = 0; i < this.length; i++){
        dest.words[i] = this.words[i];
    }
    dest.length = this.length;
    dest.negative = this.negative;
    dest.red = this.red;
};
function move(dest, src) {
    dest.words = src.words;
    dest.length = src.length;
    dest.negative = src.negative;
    dest.red = src.red;
}
BN.prototype._move = function _move(dest) {
    move(dest, this);
};
BN.prototype.clone = function clone() {
    var r = new BN(null);
    this.copy(r);
    return r;
};
BN.prototype._expand = function _expand(size) {
    while(this.length < size){
        this.words[this.length++] = 0;
    }
    return this;
};
BN.prototype._strip = function strip() {
    while(this.length > 1 && this.words[this.length - 1] === 0){
        this.length--;
    }
    return this._normSign();
};
BN.prototype._normSign = function _normSign() {
    if (this.length === 1 && this.words[0] === 0) {
        this.negative = 0;
    }
    return this;
};
if (typeof Symbol !== "undefined" && typeof Symbol.for === "function") {
    try {
        BN.prototype[Symbol.for("nodejs.util.inspect.custom")] = inspect1;
    } catch (e1) {
        BN.prototype.inspect = inspect1;
    }
} else {
    BN.prototype.inspect = inspect1;
}
function inspect1() {
    return (this.red ? "<BN-R: " : "<BN: ") + this.toString(16) + ">";
}
var zeros = [
    "",
    "0",
    "00",
    "000",
    "0000",
    "00000",
    "000000",
    "0000000",
    "00000000",
    "000000000",
    "0000000000",
    "00000000000",
    "000000000000",
    "0000000000000",
    "00000000000000",
    "000000000000000",
    "0000000000000000",
    "00000000000000000",
    "000000000000000000",
    "0000000000000000000",
    "00000000000000000000",
    "000000000000000000000",
    "0000000000000000000000",
    "00000000000000000000000",
    "000000000000000000000000",
    "0000000000000000000000000"
];
var groupSizes = [
    0,
    0,
    25,
    16,
    12,
    11,
    10,
    9,
    8,
    8,
    7,
    7,
    7,
    7,
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5
];
var groupBases = [
    0,
    0,
    33554432,
    43046721,
    16777216,
    48828125,
    60466176,
    40353607,
    16777216,
    43046721,
    10000000,
    19487171,
    35831808,
    62748517,
    7529536,
    11390625,
    16777216,
    24137569,
    34012224,
    47045881,
    64000000,
    4084101,
    5153632,
    6436343,
    7962624,
    9765625,
    11881376,
    14348907,
    17210368,
    20511149,
    24300000,
    28629151,
    33554432,
    39135393,
    45435424,
    52521875,
    60466176
];
BN.prototype.toString = function toString(base, padding) {
    base = base || 10;
    padding = padding | 0 || 1;
    var out;
    if (base === 16 || base === "hex") {
        out = "";
        var off = 0;
        var carry = 0;
        for(var i = 0; i < this.length; i++){
            var w = this.words[i];
            var word = ((w << off | carry) & 0xffffff).toString(16);
            carry = w >>> 24 - off & 0xffffff;
            if (carry !== 0 || i !== this.length - 1) {
                out = zeros[6 - word.length] + word + out;
            } else {
                out = word + out;
            }
            off += 2;
            if (off >= 26) {
                off -= 26;
                i--;
            }
        }
        if (carry !== 0) {
            out = carry.toString(16) + out;
        }
        while(out.length % padding !== 0){
            out = "0" + out;
        }
        if (this.negative !== 0) {
            out = "-" + out;
        }
        return out;
    }
    if (base === (base | 0) && base >= 2 && base <= 36) {
        var groupSize = groupSizes[base];
        var groupBase = groupBases[base];
        out = "";
        var c = this.clone();
        c.negative = 0;
        while(!c.isZero()){
            var r = c.modrn(groupBase).toString(base);
            c = c.idivn(groupBase);
            if (!c.isZero()) {
                out = zeros[groupSize - r.length] + r + out;
            } else {
                out = r + out;
            }
        }
        if (this.isZero()) {
            out = "0" + out;
        }
        while(out.length % padding !== 0){
            out = "0" + out;
        }
        if (this.negative !== 0) {
            out = "-" + out;
        }
        return out;
    }
    assert3(false, "Base should be between 2 and 36");
};
BN.prototype.toNumber = function toNumber() {
    var ret = this.words[0];
    if (this.length === 2) {
        ret += this.words[1] * 0x4000000;
    } else if (this.length === 3 && this.words[2] === 0x01) {
        ret += 0x10000000000000 + this.words[1] * 0x4000000;
    } else if (this.length > 2) {
        assert3(false, "Number can only safely store up to 53 bits");
    }
    return this.negative !== 0 ? -ret : ret;
};
BN.prototype.toJSON = function toJSON() {
    return this.toString(16, 2);
};
if (Buffer) {
    BN.prototype.toBuffer = function toBuffer(endian, length) {
        return this.toArrayLike(Buffer, endian, length);
    };
}
BN.prototype.toArray = function toArray(endian, length) {
    return this.toArrayLike(Array, endian, length);
};
var allocate = function allocate(ArrayType, size) {
    if (ArrayType.allocUnsafe) {
        return ArrayType.allocUnsafe(size);
    }
    return new ArrayType(size);
};
BN.prototype.toArrayLike = function toArrayLike(ArrayType, endian, length) {
    this._strip();
    var byteLength = this.byteLength();
    var reqLength = length || Math.max(1, byteLength);
    assert3(byteLength <= reqLength, "byte array longer than desired length");
    assert3(reqLength > 0, "Requested array length <= 0");
    var res = allocate(ArrayType, reqLength);
    var postfix = endian === "le" ? "LE" : "BE";
    this["_toArrayLike" + postfix](res, byteLength);
    return res;
};
BN.prototype._toArrayLikeLE = function _toArrayLikeLE(res, byteLength) {
    var position = 0;
    var carry = 0;
    for(var i = 0, shift = 0; i < this.length; i++){
        var word = this.words[i] << shift | carry;
        res[position++] = word & 0xff;
        if (position < res.length) {
            res[position++] = word >> 8 & 0xff;
        }
        if (position < res.length) {
            res[position++] = word >> 16 & 0xff;
        }
        if (shift === 6) {
            if (position < res.length) {
                res[position++] = word >> 24 & 0xff;
            }
            carry = 0;
            shift = 0;
        } else {
            carry = word >>> 24;
            shift += 2;
        }
    }
    if (position < res.length) {
        res[position++] = carry;
        while(position < res.length){
            res[position++] = 0;
        }
    }
};
BN.prototype._toArrayLikeBE = function _toArrayLikeBE(res, byteLength) {
    var position = res.length - 1;
    var carry = 0;
    for(var i = 0, shift = 0; i < this.length; i++){
        var word = this.words[i] << shift | carry;
        res[position--] = word & 0xff;
        if (position >= 0) {
            res[position--] = word >> 8 & 0xff;
        }
        if (position >= 0) {
            res[position--] = word >> 16 & 0xff;
        }
        if (shift === 6) {
            if (position >= 0) {
                res[position--] = word >> 24 & 0xff;
            }
            carry = 0;
            shift = 0;
        } else {
            carry = word >>> 24;
            shift += 2;
        }
    }
    if (position >= 0) {
        res[position--] = carry;
        while(position >= 0){
            res[position--] = 0;
        }
    }
};
if (Math.clz32) {
    BN.prototype._countBits = function _countBits(w) {
        return 32 - Math.clz32(w);
    };
} else {
    BN.prototype._countBits = function _countBits(w) {
        var t = w;
        var r = 0;
        if (t >= 0x1000) {
            r += 13;
            t >>>= 13;
        }
        if (t >= 0x40) {
            r += 7;
            t >>>= 7;
        }
        if (t >= 0x8) {
            r += 4;
            t >>>= 4;
        }
        if (t >= 0x02) {
            r += 2;
            t >>>= 2;
        }
        return r + t;
    };
}
BN.prototype._zeroBits = function _zeroBits(w) {
    if (w === 0) return 26;
    var t = w;
    var r = 0;
    if ((t & 0x1fff) === 0) {
        r += 13;
        t >>>= 13;
    }
    if ((t & 0x7f) === 0) {
        r += 7;
        t >>>= 7;
    }
    if ((t & 0xf) === 0) {
        r += 4;
        t >>>= 4;
    }
    if ((t & 0x3) === 0) {
        r += 2;
        t >>>= 2;
    }
    if ((t & 0x1) === 0) {
        r++;
    }
    return r;
};
BN.prototype.bitLength = function bitLength() {
    var w = this.words[this.length - 1];
    var hi = this._countBits(w);
    return (this.length - 1) * 26 + hi;
};
function toBitArray(num) {
    var w = new Array(num.bitLength());
    for(var bit = 0; bit < w.length; bit++){
        var off = bit / 26 | 0;
        var wbit = bit % 26;
        w[bit] = num.words[off] >>> wbit & 0x01;
    }
    return w;
}
BN.prototype.zeroBits = function zeroBits() {
    if (this.isZero()) return 0;
    var r = 0;
    for(var i = 0; i < this.length; i++){
        var b = this._zeroBits(this.words[i]);
        r += b;
        if (b !== 26) break;
    }
    return r;
};
BN.prototype.byteLength = function byteLength() {
    return Math.ceil(this.bitLength() / 8);
};
BN.prototype.toTwos = function toTwos(width) {
    if (this.negative !== 0) {
        return this.abs().inotn(width).iaddn(1);
    }
    return this.clone();
};
BN.prototype.fromTwos = function fromTwos(width) {
    if (this.testn(width - 1)) {
        return this.notn(width).iaddn(1).ineg();
    }
    return this.clone();
};
BN.prototype.isNeg = function isNeg() {
    return this.negative !== 0;
};
BN.prototype.neg = function neg() {
    return this.clone().ineg();
};
BN.prototype.ineg = function ineg() {
    if (!this.isZero()) {
        this.negative ^= 1;
    }
    return this;
};
BN.prototype.iuor = function iuor(num) {
    while(this.length < num.length){
        this.words[this.length++] = 0;
    }
    for(var i = 0; i < num.length; i++){
        this.words[i] = this.words[i] | num.words[i];
    }
    return this._strip();
};
BN.prototype.ior = function ior(num) {
    assert3((this.negative | num.negative) === 0);
    return this.iuor(num);
};
BN.prototype.or = function or(num) {
    if (this.length > num.length) return this.clone().ior(num);
    return num.clone().ior(this);
};
BN.prototype.uor = function uor(num) {
    if (this.length > num.length) return this.clone().iuor(num);
    return num.clone().iuor(this);
};
BN.prototype.iuand = function iuand(num) {
    var b;
    if (this.length > num.length) {
        b = num;
    } else {
        b = this;
    }
    for(var i = 0; i < b.length; i++){
        this.words[i] = this.words[i] & num.words[i];
    }
    this.length = b.length;
    return this._strip();
};
BN.prototype.iand = function iand(num) {
    assert3((this.negative | num.negative) === 0);
    return this.iuand(num);
};
BN.prototype.and = function and(num) {
    if (this.length > num.length) return this.clone().iand(num);
    return num.clone().iand(this);
};
BN.prototype.uand = function uand(num) {
    if (this.length > num.length) return this.clone().iuand(num);
    return num.clone().iuand(this);
};
BN.prototype.iuxor = function iuxor(num) {
    var a;
    var b;
    if (this.length > num.length) {
        a = this;
        b = num;
    } else {
        a = num;
        b = this;
    }
    for(var i = 0; i < b.length; i++){
        this.words[i] = a.words[i] ^ b.words[i];
    }
    if (this !== a) {
        for(; i < a.length; i++){
            this.words[i] = a.words[i];
        }
    }
    this.length = a.length;
    return this._strip();
};
BN.prototype.ixor = function ixor(num) {
    assert3((this.negative | num.negative) === 0);
    return this.iuxor(num);
};
BN.prototype.xor = function xor(num) {
    if (this.length > num.length) return this.clone().ixor(num);
    return num.clone().ixor(this);
};
BN.prototype.uxor = function uxor(num) {
    if (this.length > num.length) return this.clone().iuxor(num);
    return num.clone().iuxor(this);
};
BN.prototype.inotn = function inotn(width) {
    assert3(typeof width === "number" && width >= 0);
    var bytesNeeded = Math.ceil(width / 26) | 0;
    var bitsLeft = width % 26;
    this._expand(bytesNeeded);
    if (bitsLeft > 0) {
        bytesNeeded--;
    }
    for(var i = 0; i < bytesNeeded; i++){
        this.words[i] = ~this.words[i] & 0x3ffffff;
    }
    if (bitsLeft > 0) {
        this.words[i] = ~this.words[i] & 0x3ffffff >> 26 - bitsLeft;
    }
    return this._strip();
};
BN.prototype.notn = function notn(width) {
    return this.clone().inotn(width);
};
BN.prototype.setn = function setn(bit, val) {
    assert3(typeof bit === "number" && bit >= 0);
    var off = bit / 26 | 0;
    var wbit = bit % 26;
    this._expand(off + 1);
    if (val) {
        this.words[off] = this.words[off] | 1 << wbit;
    } else {
        this.words[off] = this.words[off] & ~(1 << wbit);
    }
    return this._strip();
};
BN.prototype.iadd = function iadd(num) {
    var r;
    if (this.negative !== 0 && num.negative === 0) {
        this.negative = 0;
        r = this.isub(num);
        this.negative ^= 1;
        return this._normSign();
    } else if (this.negative === 0 && num.negative !== 0) {
        num.negative = 0;
        r = this.isub(num);
        num.negative = 1;
        return r._normSign();
    }
    var a, b;
    if (this.length > num.length) {
        a = this;
        b = num;
    } else {
        a = num;
        b = this;
    }
    var carry = 0;
    for(var i = 0; i < b.length; i++){
        r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
        this.words[i] = r & 0x3ffffff;
        carry = r >>> 26;
    }
    for(; carry !== 0 && i < a.length; i++){
        r = (a.words[i] | 0) + carry;
        this.words[i] = r & 0x3ffffff;
        carry = r >>> 26;
    }
    this.length = a.length;
    if (carry !== 0) {
        this.words[this.length] = carry;
        this.length++;
    } else if (a !== this) {
        for(; i < a.length; i++){
            this.words[i] = a.words[i];
        }
    }
    return this;
};
BN.prototype.add = function add(num) {
    var res;
    if (num.negative !== 0 && this.negative === 0) {
        num.negative = 0;
        res = this.sub(num);
        num.negative ^= 1;
        return res;
    } else if (num.negative === 0 && this.negative !== 0) {
        this.negative = 0;
        res = num.sub(this);
        this.negative = 1;
        return res;
    }
    if (this.length > num.length) return this.clone().iadd(num);
    return num.clone().iadd(this);
};
BN.prototype.isub = function isub(num) {
    if (num.negative !== 0) {
        num.negative = 0;
        var r = this.iadd(num);
        num.negative = 1;
        return r._normSign();
    } else if (this.negative !== 0) {
        this.negative = 0;
        this.iadd(num);
        this.negative = 1;
        return this._normSign();
    }
    var cmp = this.cmp(num);
    if (cmp === 0) {
        this.negative = 0;
        this.length = 1;
        this.words[0] = 0;
        return this;
    }
    var a, b;
    if (cmp > 0) {
        a = this;
        b = num;
    } else {
        a = num;
        b = this;
    }
    var carry = 0;
    for(var i = 0; i < b.length; i++){
        r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
        carry = r >> 26;
        this.words[i] = r & 0x3ffffff;
    }
    for(; carry !== 0 && i < a.length; i++){
        r = (a.words[i] | 0) + carry;
        carry = r >> 26;
        this.words[i] = r & 0x3ffffff;
    }
    if (carry === 0 && i < a.length && a !== this) {
        for(; i < a.length; i++){
            this.words[i] = a.words[i];
        }
    }
    this.length = Math.max(this.length, i);
    if (a !== this) {
        this.negative = 1;
    }
    return this._strip();
};
BN.prototype.sub = function sub(num) {
    return this.clone().isub(num);
};
function smallMulTo(self1, num, out) {
    out.negative = num.negative ^ self1.negative;
    var len = self1.length + num.length | 0;
    out.length = len;
    len = len - 1 | 0;
    var a = self1.words[0] | 0;
    var b = num.words[0] | 0;
    var r = a * b;
    var lo = r & 0x3ffffff;
    var carry = r / 0x4000000 | 0;
    out.words[0] = lo;
    for(var k = 1; k < len; k++){
        var ncarry = carry >>> 26;
        var rword = carry & 0x3ffffff;
        var maxJ = Math.min(k, num.length - 1);
        for(var j = Math.max(0, k - self1.length + 1); j <= maxJ; j++){
            var i = k - j | 0;
            a = self1.words[i] | 0;
            b = num.words[j] | 0;
            r = a * b + rword;
            ncarry += r / 0x4000000 | 0;
            rword = r & 0x3ffffff;
        }
        out.words[k] = rword | 0;
        carry = ncarry | 0;
    }
    if (carry !== 0) {
        out.words[k] = carry | 0;
    } else {
        out.length--;
    }
    return out._strip();
}
var comb10MulTo = function comb10MulTo(self1, num, out) {
    var a = self1.words;
    var b = num.words;
    var o = out.words;
    var c = 0;
    var lo;
    var mid;
    var hi;
    var a0 = a[0] | 0;
    var al0 = a0 & 0x1fff;
    var ah0 = a0 >>> 13;
    var a1 = a[1] | 0;
    var al1 = a1 & 0x1fff;
    var ah1 = a1 >>> 13;
    var a2 = a[2] | 0;
    var al2 = a2 & 0x1fff;
    var ah2 = a2 >>> 13;
    var a3 = a[3] | 0;
    var al3 = a3 & 0x1fff;
    var ah3 = a3 >>> 13;
    var a4 = a[4] | 0;
    var al4 = a4 & 0x1fff;
    var ah4 = a4 >>> 13;
    var a5 = a[5] | 0;
    var al5 = a5 & 0x1fff;
    var ah5 = a5 >>> 13;
    var a6 = a[6] | 0;
    var al6 = a6 & 0x1fff;
    var ah6 = a6 >>> 13;
    var a7 = a[7] | 0;
    var al7 = a7 & 0x1fff;
    var ah7 = a7 >>> 13;
    var a8 = a[8] | 0;
    var al8 = a8 & 0x1fff;
    var ah8 = a8 >>> 13;
    var a9 = a[9] | 0;
    var al9 = a9 & 0x1fff;
    var ah9 = a9 >>> 13;
    var b0 = b[0] | 0;
    var bl0 = b0 & 0x1fff;
    var bh0 = b0 >>> 13;
    var b1 = b[1] | 0;
    var bl1 = b1 & 0x1fff;
    var bh1 = b1 >>> 13;
    var b2 = b[2] | 0;
    var bl2 = b2 & 0x1fff;
    var bh2 = b2 >>> 13;
    var b3 = b[3] | 0;
    var bl3 = b3 & 0x1fff;
    var bh3 = b3 >>> 13;
    var b4 = b[4] | 0;
    var bl4 = b4 & 0x1fff;
    var bh4 = b4 >>> 13;
    var b5 = b[5] | 0;
    var bl5 = b5 & 0x1fff;
    var bh5 = b5 >>> 13;
    var b6 = b[6] | 0;
    var bl6 = b6 & 0x1fff;
    var bh6 = b6 >>> 13;
    var b7 = b[7] | 0;
    var bl7 = b7 & 0x1fff;
    var bh7 = b7 >>> 13;
    var b8 = b[8] | 0;
    var bl8 = b8 & 0x1fff;
    var bh8 = b8 >>> 13;
    var b9 = b[9] | 0;
    var bl9 = b9 & 0x1fff;
    var bh9 = b9 >>> 13;
    out.negative = self1.negative ^ num.negative;
    out.length = 19;
    lo = Math.imul(al0, bl0);
    mid = Math.imul(al0, bh0);
    mid = mid + Math.imul(ah0, bl0) | 0;
    hi = Math.imul(ah0, bh0);
    var w0 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w0 >>> 26) | 0;
    w0 &= 0x3ffffff;
    lo = Math.imul(al1, bl0);
    mid = Math.imul(al1, bh0);
    mid = mid + Math.imul(ah1, bl0) | 0;
    hi = Math.imul(ah1, bh0);
    lo = lo + Math.imul(al0, bl1) | 0;
    mid = mid + Math.imul(al0, bh1) | 0;
    mid = mid + Math.imul(ah0, bl1) | 0;
    hi = hi + Math.imul(ah0, bh1) | 0;
    var w1 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w1 >>> 26) | 0;
    w1 &= 0x3ffffff;
    lo = Math.imul(al2, bl0);
    mid = Math.imul(al2, bh0);
    mid = mid + Math.imul(ah2, bl0) | 0;
    hi = Math.imul(ah2, bh0);
    lo = lo + Math.imul(al1, bl1) | 0;
    mid = mid + Math.imul(al1, bh1) | 0;
    mid = mid + Math.imul(ah1, bl1) | 0;
    hi = hi + Math.imul(ah1, bh1) | 0;
    lo = lo + Math.imul(al0, bl2) | 0;
    mid = mid + Math.imul(al0, bh2) | 0;
    mid = mid + Math.imul(ah0, bl2) | 0;
    hi = hi + Math.imul(ah0, bh2) | 0;
    var w2 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w2 >>> 26) | 0;
    w2 &= 0x3ffffff;
    lo = Math.imul(al3, bl0);
    mid = Math.imul(al3, bh0);
    mid = mid + Math.imul(ah3, bl0) | 0;
    hi = Math.imul(ah3, bh0);
    lo = lo + Math.imul(al2, bl1) | 0;
    mid = mid + Math.imul(al2, bh1) | 0;
    mid = mid + Math.imul(ah2, bl1) | 0;
    hi = hi + Math.imul(ah2, bh1) | 0;
    lo = lo + Math.imul(al1, bl2) | 0;
    mid = mid + Math.imul(al1, bh2) | 0;
    mid = mid + Math.imul(ah1, bl2) | 0;
    hi = hi + Math.imul(ah1, bh2) | 0;
    lo = lo + Math.imul(al0, bl3) | 0;
    mid = mid + Math.imul(al0, bh3) | 0;
    mid = mid + Math.imul(ah0, bl3) | 0;
    hi = hi + Math.imul(ah0, bh3) | 0;
    var w3 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w3 >>> 26) | 0;
    w3 &= 0x3ffffff;
    lo = Math.imul(al4, bl0);
    mid = Math.imul(al4, bh0);
    mid = mid + Math.imul(ah4, bl0) | 0;
    hi = Math.imul(ah4, bh0);
    lo = lo + Math.imul(al3, bl1) | 0;
    mid = mid + Math.imul(al3, bh1) | 0;
    mid = mid + Math.imul(ah3, bl1) | 0;
    hi = hi + Math.imul(ah3, bh1) | 0;
    lo = lo + Math.imul(al2, bl2) | 0;
    mid = mid + Math.imul(al2, bh2) | 0;
    mid = mid + Math.imul(ah2, bl2) | 0;
    hi = hi + Math.imul(ah2, bh2) | 0;
    lo = lo + Math.imul(al1, bl3) | 0;
    mid = mid + Math.imul(al1, bh3) | 0;
    mid = mid + Math.imul(ah1, bl3) | 0;
    hi = hi + Math.imul(ah1, bh3) | 0;
    lo = lo + Math.imul(al0, bl4) | 0;
    mid = mid + Math.imul(al0, bh4) | 0;
    mid = mid + Math.imul(ah0, bl4) | 0;
    hi = hi + Math.imul(ah0, bh4) | 0;
    var w4 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w4 >>> 26) | 0;
    w4 &= 0x3ffffff;
    lo = Math.imul(al5, bl0);
    mid = Math.imul(al5, bh0);
    mid = mid + Math.imul(ah5, bl0) | 0;
    hi = Math.imul(ah5, bh0);
    lo = lo + Math.imul(al4, bl1) | 0;
    mid = mid + Math.imul(al4, bh1) | 0;
    mid = mid + Math.imul(ah4, bl1) | 0;
    hi = hi + Math.imul(ah4, bh1) | 0;
    lo = lo + Math.imul(al3, bl2) | 0;
    mid = mid + Math.imul(al3, bh2) | 0;
    mid = mid + Math.imul(ah3, bl2) | 0;
    hi = hi + Math.imul(ah3, bh2) | 0;
    lo = lo + Math.imul(al2, bl3) | 0;
    mid = mid + Math.imul(al2, bh3) | 0;
    mid = mid + Math.imul(ah2, bl3) | 0;
    hi = hi + Math.imul(ah2, bh3) | 0;
    lo = lo + Math.imul(al1, bl4) | 0;
    mid = mid + Math.imul(al1, bh4) | 0;
    mid = mid + Math.imul(ah1, bl4) | 0;
    hi = hi + Math.imul(ah1, bh4) | 0;
    lo = lo + Math.imul(al0, bl5) | 0;
    mid = mid + Math.imul(al0, bh5) | 0;
    mid = mid + Math.imul(ah0, bl5) | 0;
    hi = hi + Math.imul(ah0, bh5) | 0;
    var w5 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w5 >>> 26) | 0;
    w5 &= 0x3ffffff;
    lo = Math.imul(al6, bl0);
    mid = Math.imul(al6, bh0);
    mid = mid + Math.imul(ah6, bl0) | 0;
    hi = Math.imul(ah6, bh0);
    lo = lo + Math.imul(al5, bl1) | 0;
    mid = mid + Math.imul(al5, bh1) | 0;
    mid = mid + Math.imul(ah5, bl1) | 0;
    hi = hi + Math.imul(ah5, bh1) | 0;
    lo = lo + Math.imul(al4, bl2) | 0;
    mid = mid + Math.imul(al4, bh2) | 0;
    mid = mid + Math.imul(ah4, bl2) | 0;
    hi = hi + Math.imul(ah4, bh2) | 0;
    lo = lo + Math.imul(al3, bl3) | 0;
    mid = mid + Math.imul(al3, bh3) | 0;
    mid = mid + Math.imul(ah3, bl3) | 0;
    hi = hi + Math.imul(ah3, bh3) | 0;
    lo = lo + Math.imul(al2, bl4) | 0;
    mid = mid + Math.imul(al2, bh4) | 0;
    mid = mid + Math.imul(ah2, bl4) | 0;
    hi = hi + Math.imul(ah2, bh4) | 0;
    lo = lo + Math.imul(al1, bl5) | 0;
    mid = mid + Math.imul(al1, bh5) | 0;
    mid = mid + Math.imul(ah1, bl5) | 0;
    hi = hi + Math.imul(ah1, bh5) | 0;
    lo = lo + Math.imul(al0, bl6) | 0;
    mid = mid + Math.imul(al0, bh6) | 0;
    mid = mid + Math.imul(ah0, bl6) | 0;
    hi = hi + Math.imul(ah0, bh6) | 0;
    var w6 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w6 >>> 26) | 0;
    w6 &= 0x3ffffff;
    lo = Math.imul(al7, bl0);
    mid = Math.imul(al7, bh0);
    mid = mid + Math.imul(ah7, bl0) | 0;
    hi = Math.imul(ah7, bh0);
    lo = lo + Math.imul(al6, bl1) | 0;
    mid = mid + Math.imul(al6, bh1) | 0;
    mid = mid + Math.imul(ah6, bl1) | 0;
    hi = hi + Math.imul(ah6, bh1) | 0;
    lo = lo + Math.imul(al5, bl2) | 0;
    mid = mid + Math.imul(al5, bh2) | 0;
    mid = mid + Math.imul(ah5, bl2) | 0;
    hi = hi + Math.imul(ah5, bh2) | 0;
    lo = lo + Math.imul(al4, bl3) | 0;
    mid = mid + Math.imul(al4, bh3) | 0;
    mid = mid + Math.imul(ah4, bl3) | 0;
    hi = hi + Math.imul(ah4, bh3) | 0;
    lo = lo + Math.imul(al3, bl4) | 0;
    mid = mid + Math.imul(al3, bh4) | 0;
    mid = mid + Math.imul(ah3, bl4) | 0;
    hi = hi + Math.imul(ah3, bh4) | 0;
    lo = lo + Math.imul(al2, bl5) | 0;
    mid = mid + Math.imul(al2, bh5) | 0;
    mid = mid + Math.imul(ah2, bl5) | 0;
    hi = hi + Math.imul(ah2, bh5) | 0;
    lo = lo + Math.imul(al1, bl6) | 0;
    mid = mid + Math.imul(al1, bh6) | 0;
    mid = mid + Math.imul(ah1, bl6) | 0;
    hi = hi + Math.imul(ah1, bh6) | 0;
    lo = lo + Math.imul(al0, bl7) | 0;
    mid = mid + Math.imul(al0, bh7) | 0;
    mid = mid + Math.imul(ah0, bl7) | 0;
    hi = hi + Math.imul(ah0, bh7) | 0;
    var w7 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w7 >>> 26) | 0;
    w7 &= 0x3ffffff;
    lo = Math.imul(al8, bl0);
    mid = Math.imul(al8, bh0);
    mid = mid + Math.imul(ah8, bl0) | 0;
    hi = Math.imul(ah8, bh0);
    lo = lo + Math.imul(al7, bl1) | 0;
    mid = mid + Math.imul(al7, bh1) | 0;
    mid = mid + Math.imul(ah7, bl1) | 0;
    hi = hi + Math.imul(ah7, bh1) | 0;
    lo = lo + Math.imul(al6, bl2) | 0;
    mid = mid + Math.imul(al6, bh2) | 0;
    mid = mid + Math.imul(ah6, bl2) | 0;
    hi = hi + Math.imul(ah6, bh2) | 0;
    lo = lo + Math.imul(al5, bl3) | 0;
    mid = mid + Math.imul(al5, bh3) | 0;
    mid = mid + Math.imul(ah5, bl3) | 0;
    hi = hi + Math.imul(ah5, bh3) | 0;
    lo = lo + Math.imul(al4, bl4) | 0;
    mid = mid + Math.imul(al4, bh4) | 0;
    mid = mid + Math.imul(ah4, bl4) | 0;
    hi = hi + Math.imul(ah4, bh4) | 0;
    lo = lo + Math.imul(al3, bl5) | 0;
    mid = mid + Math.imul(al3, bh5) | 0;
    mid = mid + Math.imul(ah3, bl5) | 0;
    hi = hi + Math.imul(ah3, bh5) | 0;
    lo = lo + Math.imul(al2, bl6) | 0;
    mid = mid + Math.imul(al2, bh6) | 0;
    mid = mid + Math.imul(ah2, bl6) | 0;
    hi = hi + Math.imul(ah2, bh6) | 0;
    lo = lo + Math.imul(al1, bl7) | 0;
    mid = mid + Math.imul(al1, bh7) | 0;
    mid = mid + Math.imul(ah1, bl7) | 0;
    hi = hi + Math.imul(ah1, bh7) | 0;
    lo = lo + Math.imul(al0, bl8) | 0;
    mid = mid + Math.imul(al0, bh8) | 0;
    mid = mid + Math.imul(ah0, bl8) | 0;
    hi = hi + Math.imul(ah0, bh8) | 0;
    var w8 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w8 >>> 26) | 0;
    w8 &= 0x3ffffff;
    lo = Math.imul(al9, bl0);
    mid = Math.imul(al9, bh0);
    mid = mid + Math.imul(ah9, bl0) | 0;
    hi = Math.imul(ah9, bh0);
    lo = lo + Math.imul(al8, bl1) | 0;
    mid = mid + Math.imul(al8, bh1) | 0;
    mid = mid + Math.imul(ah8, bl1) | 0;
    hi = hi + Math.imul(ah8, bh1) | 0;
    lo = lo + Math.imul(al7, bl2) | 0;
    mid = mid + Math.imul(al7, bh2) | 0;
    mid = mid + Math.imul(ah7, bl2) | 0;
    hi = hi + Math.imul(ah7, bh2) | 0;
    lo = lo + Math.imul(al6, bl3) | 0;
    mid = mid + Math.imul(al6, bh3) | 0;
    mid = mid + Math.imul(ah6, bl3) | 0;
    hi = hi + Math.imul(ah6, bh3) | 0;
    lo = lo + Math.imul(al5, bl4) | 0;
    mid = mid + Math.imul(al5, bh4) | 0;
    mid = mid + Math.imul(ah5, bl4) | 0;
    hi = hi + Math.imul(ah5, bh4) | 0;
    lo = lo + Math.imul(al4, bl5) | 0;
    mid = mid + Math.imul(al4, bh5) | 0;
    mid = mid + Math.imul(ah4, bl5) | 0;
    hi = hi + Math.imul(ah4, bh5) | 0;
    lo = lo + Math.imul(al3, bl6) | 0;
    mid = mid + Math.imul(al3, bh6) | 0;
    mid = mid + Math.imul(ah3, bl6) | 0;
    hi = hi + Math.imul(ah3, bh6) | 0;
    lo = lo + Math.imul(al2, bl7) | 0;
    mid = mid + Math.imul(al2, bh7) | 0;
    mid = mid + Math.imul(ah2, bl7) | 0;
    hi = hi + Math.imul(ah2, bh7) | 0;
    lo = lo + Math.imul(al1, bl8) | 0;
    mid = mid + Math.imul(al1, bh8) | 0;
    mid = mid + Math.imul(ah1, bl8) | 0;
    hi = hi + Math.imul(ah1, bh8) | 0;
    lo = lo + Math.imul(al0, bl9) | 0;
    mid = mid + Math.imul(al0, bh9) | 0;
    mid = mid + Math.imul(ah0, bl9) | 0;
    hi = hi + Math.imul(ah0, bh9) | 0;
    var w9 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w9 >>> 26) | 0;
    w9 &= 0x3ffffff;
    lo = Math.imul(al9, bl1);
    mid = Math.imul(al9, bh1);
    mid = mid + Math.imul(ah9, bl1) | 0;
    hi = Math.imul(ah9, bh1);
    lo = lo + Math.imul(al8, bl2) | 0;
    mid = mid + Math.imul(al8, bh2) | 0;
    mid = mid + Math.imul(ah8, bl2) | 0;
    hi = hi + Math.imul(ah8, bh2) | 0;
    lo = lo + Math.imul(al7, bl3) | 0;
    mid = mid + Math.imul(al7, bh3) | 0;
    mid = mid + Math.imul(ah7, bl3) | 0;
    hi = hi + Math.imul(ah7, bh3) | 0;
    lo = lo + Math.imul(al6, bl4) | 0;
    mid = mid + Math.imul(al6, bh4) | 0;
    mid = mid + Math.imul(ah6, bl4) | 0;
    hi = hi + Math.imul(ah6, bh4) | 0;
    lo = lo + Math.imul(al5, bl5) | 0;
    mid = mid + Math.imul(al5, bh5) | 0;
    mid = mid + Math.imul(ah5, bl5) | 0;
    hi = hi + Math.imul(ah5, bh5) | 0;
    lo = lo + Math.imul(al4, bl6) | 0;
    mid = mid + Math.imul(al4, bh6) | 0;
    mid = mid + Math.imul(ah4, bl6) | 0;
    hi = hi + Math.imul(ah4, bh6) | 0;
    lo = lo + Math.imul(al3, bl7) | 0;
    mid = mid + Math.imul(al3, bh7) | 0;
    mid = mid + Math.imul(ah3, bl7) | 0;
    hi = hi + Math.imul(ah3, bh7) | 0;
    lo = lo + Math.imul(al2, bl8) | 0;
    mid = mid + Math.imul(al2, bh8) | 0;
    mid = mid + Math.imul(ah2, bl8) | 0;
    hi = hi + Math.imul(ah2, bh8) | 0;
    lo = lo + Math.imul(al1, bl9) | 0;
    mid = mid + Math.imul(al1, bh9) | 0;
    mid = mid + Math.imul(ah1, bl9) | 0;
    hi = hi + Math.imul(ah1, bh9) | 0;
    var w10 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w10 >>> 26) | 0;
    w10 &= 0x3ffffff;
    lo = Math.imul(al9, bl2);
    mid = Math.imul(al9, bh2);
    mid = mid + Math.imul(ah9, bl2) | 0;
    hi = Math.imul(ah9, bh2);
    lo = lo + Math.imul(al8, bl3) | 0;
    mid = mid + Math.imul(al8, bh3) | 0;
    mid = mid + Math.imul(ah8, bl3) | 0;
    hi = hi + Math.imul(ah8, bh3) | 0;
    lo = lo + Math.imul(al7, bl4) | 0;
    mid = mid + Math.imul(al7, bh4) | 0;
    mid = mid + Math.imul(ah7, bl4) | 0;
    hi = hi + Math.imul(ah7, bh4) | 0;
    lo = lo + Math.imul(al6, bl5) | 0;
    mid = mid + Math.imul(al6, bh5) | 0;
    mid = mid + Math.imul(ah6, bl5) | 0;
    hi = hi + Math.imul(ah6, bh5) | 0;
    lo = lo + Math.imul(al5, bl6) | 0;
    mid = mid + Math.imul(al5, bh6) | 0;
    mid = mid + Math.imul(ah5, bl6) | 0;
    hi = hi + Math.imul(ah5, bh6) | 0;
    lo = lo + Math.imul(al4, bl7) | 0;
    mid = mid + Math.imul(al4, bh7) | 0;
    mid = mid + Math.imul(ah4, bl7) | 0;
    hi = hi + Math.imul(ah4, bh7) | 0;
    lo = lo + Math.imul(al3, bl8) | 0;
    mid = mid + Math.imul(al3, bh8) | 0;
    mid = mid + Math.imul(ah3, bl8) | 0;
    hi = hi + Math.imul(ah3, bh8) | 0;
    lo = lo + Math.imul(al2, bl9) | 0;
    mid = mid + Math.imul(al2, bh9) | 0;
    mid = mid + Math.imul(ah2, bl9) | 0;
    hi = hi + Math.imul(ah2, bh9) | 0;
    var w11 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w11 >>> 26) | 0;
    w11 &= 0x3ffffff;
    lo = Math.imul(al9, bl3);
    mid = Math.imul(al9, bh3);
    mid = mid + Math.imul(ah9, bl3) | 0;
    hi = Math.imul(ah9, bh3);
    lo = lo + Math.imul(al8, bl4) | 0;
    mid = mid + Math.imul(al8, bh4) | 0;
    mid = mid + Math.imul(ah8, bl4) | 0;
    hi = hi + Math.imul(ah8, bh4) | 0;
    lo = lo + Math.imul(al7, bl5) | 0;
    mid = mid + Math.imul(al7, bh5) | 0;
    mid = mid + Math.imul(ah7, bl5) | 0;
    hi = hi + Math.imul(ah7, bh5) | 0;
    lo = lo + Math.imul(al6, bl6) | 0;
    mid = mid + Math.imul(al6, bh6) | 0;
    mid = mid + Math.imul(ah6, bl6) | 0;
    hi = hi + Math.imul(ah6, bh6) | 0;
    lo = lo + Math.imul(al5, bl7) | 0;
    mid = mid + Math.imul(al5, bh7) | 0;
    mid = mid + Math.imul(ah5, bl7) | 0;
    hi = hi + Math.imul(ah5, bh7) | 0;
    lo = lo + Math.imul(al4, bl8) | 0;
    mid = mid + Math.imul(al4, bh8) | 0;
    mid = mid + Math.imul(ah4, bl8) | 0;
    hi = hi + Math.imul(ah4, bh8) | 0;
    lo = lo + Math.imul(al3, bl9) | 0;
    mid = mid + Math.imul(al3, bh9) | 0;
    mid = mid + Math.imul(ah3, bl9) | 0;
    hi = hi + Math.imul(ah3, bh9) | 0;
    var w12 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w12 >>> 26) | 0;
    w12 &= 0x3ffffff;
    lo = Math.imul(al9, bl4);
    mid = Math.imul(al9, bh4);
    mid = mid + Math.imul(ah9, bl4) | 0;
    hi = Math.imul(ah9, bh4);
    lo = lo + Math.imul(al8, bl5) | 0;
    mid = mid + Math.imul(al8, bh5) | 0;
    mid = mid + Math.imul(ah8, bl5) | 0;
    hi = hi + Math.imul(ah8, bh5) | 0;
    lo = lo + Math.imul(al7, bl6) | 0;
    mid = mid + Math.imul(al7, bh6) | 0;
    mid = mid + Math.imul(ah7, bl6) | 0;
    hi = hi + Math.imul(ah7, bh6) | 0;
    lo = lo + Math.imul(al6, bl7) | 0;
    mid = mid + Math.imul(al6, bh7) | 0;
    mid = mid + Math.imul(ah6, bl7) | 0;
    hi = hi + Math.imul(ah6, bh7) | 0;
    lo = lo + Math.imul(al5, bl8) | 0;
    mid = mid + Math.imul(al5, bh8) | 0;
    mid = mid + Math.imul(ah5, bl8) | 0;
    hi = hi + Math.imul(ah5, bh8) | 0;
    lo = lo + Math.imul(al4, bl9) | 0;
    mid = mid + Math.imul(al4, bh9) | 0;
    mid = mid + Math.imul(ah4, bl9) | 0;
    hi = hi + Math.imul(ah4, bh9) | 0;
    var w13 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w13 >>> 26) | 0;
    w13 &= 0x3ffffff;
    lo = Math.imul(al9, bl5);
    mid = Math.imul(al9, bh5);
    mid = mid + Math.imul(ah9, bl5) | 0;
    hi = Math.imul(ah9, bh5);
    lo = lo + Math.imul(al8, bl6) | 0;
    mid = mid + Math.imul(al8, bh6) | 0;
    mid = mid + Math.imul(ah8, bl6) | 0;
    hi = hi + Math.imul(ah8, bh6) | 0;
    lo = lo + Math.imul(al7, bl7) | 0;
    mid = mid + Math.imul(al7, bh7) | 0;
    mid = mid + Math.imul(ah7, bl7) | 0;
    hi = hi + Math.imul(ah7, bh7) | 0;
    lo = lo + Math.imul(al6, bl8) | 0;
    mid = mid + Math.imul(al6, bh8) | 0;
    mid = mid + Math.imul(ah6, bl8) | 0;
    hi = hi + Math.imul(ah6, bh8) | 0;
    lo = lo + Math.imul(al5, bl9) | 0;
    mid = mid + Math.imul(al5, bh9) | 0;
    mid = mid + Math.imul(ah5, bl9) | 0;
    hi = hi + Math.imul(ah5, bh9) | 0;
    var w14 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w14 >>> 26) | 0;
    w14 &= 0x3ffffff;
    lo = Math.imul(al9, bl6);
    mid = Math.imul(al9, bh6);
    mid = mid + Math.imul(ah9, bl6) | 0;
    hi = Math.imul(ah9, bh6);
    lo = lo + Math.imul(al8, bl7) | 0;
    mid = mid + Math.imul(al8, bh7) | 0;
    mid = mid + Math.imul(ah8, bl7) | 0;
    hi = hi + Math.imul(ah8, bh7) | 0;
    lo = lo + Math.imul(al7, bl8) | 0;
    mid = mid + Math.imul(al7, bh8) | 0;
    mid = mid + Math.imul(ah7, bl8) | 0;
    hi = hi + Math.imul(ah7, bh8) | 0;
    lo = lo + Math.imul(al6, bl9) | 0;
    mid = mid + Math.imul(al6, bh9) | 0;
    mid = mid + Math.imul(ah6, bl9) | 0;
    hi = hi + Math.imul(ah6, bh9) | 0;
    var w15 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w15 >>> 26) | 0;
    w15 &= 0x3ffffff;
    lo = Math.imul(al9, bl7);
    mid = Math.imul(al9, bh7);
    mid = mid + Math.imul(ah9, bl7) | 0;
    hi = Math.imul(ah9, bh7);
    lo = lo + Math.imul(al8, bl8) | 0;
    mid = mid + Math.imul(al8, bh8) | 0;
    mid = mid + Math.imul(ah8, bl8) | 0;
    hi = hi + Math.imul(ah8, bh8) | 0;
    lo = lo + Math.imul(al7, bl9) | 0;
    mid = mid + Math.imul(al7, bh9) | 0;
    mid = mid + Math.imul(ah7, bl9) | 0;
    hi = hi + Math.imul(ah7, bh9) | 0;
    var w16 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w16 >>> 26) | 0;
    w16 &= 0x3ffffff;
    lo = Math.imul(al9, bl8);
    mid = Math.imul(al9, bh8);
    mid = mid + Math.imul(ah9, bl8) | 0;
    hi = Math.imul(ah9, bh8);
    lo = lo + Math.imul(al8, bl9) | 0;
    mid = mid + Math.imul(al8, bh9) | 0;
    mid = mid + Math.imul(ah8, bl9) | 0;
    hi = hi + Math.imul(ah8, bh9) | 0;
    var w17 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w17 >>> 26) | 0;
    w17 &= 0x3ffffff;
    lo = Math.imul(al9, bl9);
    mid = Math.imul(al9, bh9);
    mid = mid + Math.imul(ah9, bl9) | 0;
    hi = Math.imul(ah9, bh9);
    var w18 = (c + lo | 0) + ((mid & 0x1fff) << 13) | 0;
    c = (hi + (mid >>> 13) | 0) + (w18 >>> 26) | 0;
    w18 &= 0x3ffffff;
    o[0] = w0;
    o[1] = w1;
    o[2] = w2;
    o[3] = w3;
    o[4] = w4;
    o[5] = w5;
    o[6] = w6;
    o[7] = w7;
    o[8] = w8;
    o[9] = w9;
    o[10] = w10;
    o[11] = w11;
    o[12] = w12;
    o[13] = w13;
    o[14] = w14;
    o[15] = w15;
    o[16] = w16;
    o[17] = w17;
    o[18] = w18;
    if (c !== 0) {
        o[19] = c;
        out.length++;
    }
    return out;
};
if (!Math.imul) {
    comb10MulTo = smallMulTo;
}
function bigMulTo(self1, num, out) {
    out.negative = num.negative ^ self1.negative;
    out.length = self1.length + num.length;
    var carry = 0;
    var hncarry = 0;
    for(var k = 0; k < out.length - 1; k++){
        var ncarry = hncarry;
        hncarry = 0;
        var rword = carry & 0x3ffffff;
        var maxJ = Math.min(k, num.length - 1);
        for(var j = Math.max(0, k - self1.length + 1); j <= maxJ; j++){
            var i = k - j;
            var a = self1.words[i] | 0;
            var b = num.words[j] | 0;
            var r = a * b;
            var lo = r & 0x3ffffff;
            ncarry = ncarry + (r / 0x4000000 | 0) | 0;
            lo = lo + rword | 0;
            rword = lo & 0x3ffffff;
            ncarry = ncarry + (lo >>> 26) | 0;
            hncarry += ncarry >>> 26;
            ncarry &= 0x3ffffff;
        }
        out.words[k] = rword;
        carry = ncarry;
        ncarry = hncarry;
    }
    if (carry !== 0) {
        out.words[k] = carry;
    } else {
        out.length--;
    }
    return out._strip();
}
function jumboMulTo(self1, num, out) {
    return bigMulTo(self1, num, out);
}
BN.prototype.mulTo = function mulTo(num, out) {
    var res;
    var len = this.length + num.length;
    if (this.length === 10 && num.length === 10) {
        res = comb10MulTo(this, num, out);
    } else if (len < 63) {
        res = smallMulTo(this, num, out);
    } else if (len < 1024) {
        res = bigMulTo(this, num, out);
    } else {
        res = jumboMulTo(this, num, out);
    }
    return res;
};
function FFTM(x, y) {
    this.x = x;
    this.y = y;
}
FFTM.prototype.makeRBT = function makeRBT(N) {
    var t = new Array(N);
    var l = BN.prototype._countBits(N) - 1;
    for(var i = 0; i < N; i++){
        t[i] = this.revBin(i, l, N);
    }
    return t;
};
FFTM.prototype.revBin = function revBin(x, l, N) {
    if (x === 0 || x === N - 1) return x;
    var rb = 0;
    for(var i = 0; i < l; i++){
        rb |= (x & 1) << l - i - 1;
        x >>= 1;
    }
    return rb;
};
FFTM.prototype.permute = function permute(rbt, rws, iws, rtws, itws, N) {
    for(var i = 0; i < N; i++){
        rtws[i] = rws[rbt[i]];
        itws[i] = iws[rbt[i]];
    }
};
FFTM.prototype.transform = function transform(rws, iws, rtws, itws, N, rbt) {
    this.permute(rbt, rws, iws, rtws, itws, N);
    for(var s = 1; s < N; s <<= 1){
        var l = s << 1;
        var rtwdf = Math.cos(2 * Math.PI / l);
        var itwdf = Math.sin(2 * Math.PI / l);
        for(var p = 0; p < N; p += l){
            var rtwdf_ = rtwdf;
            var itwdf_ = itwdf;
            for(var j = 0; j < s; j++){
                var re = rtws[p + j];
                var ie = itws[p + j];
                var ro = rtws[p + j + s];
                var io = itws[p + j + s];
                var rx = rtwdf_ * ro - itwdf_ * io;
                io = rtwdf_ * io + itwdf_ * ro;
                ro = rx;
                rtws[p + j] = re + ro;
                itws[p + j] = ie + io;
                rtws[p + j + s] = re - ro;
                itws[p + j + s] = ie - io;
                if (j !== l) {
                    rx = rtwdf * rtwdf_ - itwdf * itwdf_;
                    itwdf_ = rtwdf * itwdf_ + itwdf * rtwdf_;
                    rtwdf_ = rx;
                }
            }
        }
    }
};
FFTM.prototype.guessLen13b = function guessLen13b(n, m) {
    var N = Math.max(m, n) | 1;
    var odd = N & 1;
    var i = 0;
    for(N = N / 2 | 0; N; N = N >>> 1){
        i++;
    }
    return 1 << i + 1 + odd;
};
FFTM.prototype.conjugate = function conjugate(rws, iws, N) {
    if (N <= 1) return;
    for(var i = 0; i < N / 2; i++){
        var t = rws[i];
        rws[i] = rws[N - i - 1];
        rws[N - i - 1] = t;
        t = iws[i];
        iws[i] = -iws[N - i - 1];
        iws[N - i - 1] = -t;
    }
};
FFTM.prototype.normalize13b = function normalize13b(ws, N) {
    var carry = 0;
    for(var i = 0; i < N / 2; i++){
        var w = Math.round(ws[2 * i + 1] / N) * 0x2000 + Math.round(ws[2 * i] / N) + carry;
        ws[i] = w & 0x3ffffff;
        if (w < 0x4000000) {
            carry = 0;
        } else {
            carry = w / 0x4000000 | 0;
        }
    }
    return ws;
};
FFTM.prototype.convert13b = function convert13b(ws, len, rws, N) {
    var carry = 0;
    for(var i = 0; i < len; i++){
        carry = carry + (ws[i] | 0);
        rws[2 * i] = carry & 0x1fff;
        carry = carry >>> 13;
        rws[2 * i + 1] = carry & 0x1fff;
        carry = carry >>> 13;
    }
    for(i = 2 * len; i < N; ++i){
        rws[i] = 0;
    }
    assert3(carry === 0);
    assert3((carry & ~0x1fff) === 0);
};
FFTM.prototype.stub = function stub(N) {
    var ph = new Array(N);
    for(var i = 0; i < N; i++){
        ph[i] = 0;
    }
    return ph;
};
FFTM.prototype.mulp = function mulp(x, y, out) {
    var N = 2 * this.guessLen13b(x.length, y.length);
    var rbt = this.makeRBT(N);
    var _ = this.stub(N);
    var rws = new Array(N);
    var rwst = new Array(N);
    var iwst = new Array(N);
    var nrws = new Array(N);
    var nrwst = new Array(N);
    var niwst = new Array(N);
    var rmws = out.words;
    rmws.length = N;
    this.convert13b(x.words, x.length, rws, N);
    this.convert13b(y.words, y.length, nrws, N);
    this.transform(rws, _, rwst, iwst, N, rbt);
    this.transform(nrws, _, nrwst, niwst, N, rbt);
    for(var i = 0; i < N; i++){
        var rx = rwst[i] * nrwst[i] - iwst[i] * niwst[i];
        iwst[i] = rwst[i] * niwst[i] + iwst[i] * nrwst[i];
        rwst[i] = rx;
    }
    this.conjugate(rwst, iwst, N);
    this.transform(rwst, iwst, rmws, _, N, rbt);
    this.conjugate(rmws, _, N);
    this.normalize13b(rmws, N);
    out.negative = x.negative ^ y.negative;
    out.length = x.length + y.length;
    return out._strip();
};
BN.prototype.mul = function mul(num) {
    var out = new BN(null);
    out.words = new Array(this.length + num.length);
    return this.mulTo(num, out);
};
BN.prototype.mulf = function mulf(num) {
    var out = new BN(null);
    out.words = new Array(this.length + num.length);
    return jumboMulTo(this, num, out);
};
BN.prototype.imul = function imul(num) {
    return this.clone().mulTo(num, this);
};
BN.prototype.imuln = function imuln(num) {
    var isNegNum = num < 0;
    if (isNegNum) num = -num;
    assert3(typeof num === "number");
    assert3(num < 0x4000000);
    var carry = 0;
    for(var i = 0; i < this.length; i++){
        var w = (this.words[i] | 0) * num;
        var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
        carry >>= 26;
        carry += w / 0x4000000 | 0;
        carry += lo >>> 26;
        this.words[i] = lo & 0x3ffffff;
    }
    if (carry !== 0) {
        this.words[i] = carry;
        this.length++;
    }
    return isNegNum ? this.ineg() : this;
};
BN.prototype.muln = function muln(num) {
    return this.clone().imuln(num);
};
BN.prototype.sqr = function sqr() {
    return this.mul(this);
};
BN.prototype.isqr = function isqr() {
    return this.imul(this.clone());
};
BN.prototype.pow = function pow(num) {
    var w = toBitArray(num);
    if (w.length === 0) return new BN(1);
    var res = this;
    for(var i = 0; i < w.length; i++, res = res.sqr()){
        if (w[i] !== 0) break;
    }
    if (++i < w.length) {
        for(var q = res.sqr(); i < w.length; i++, q = q.sqr()){
            if (w[i] === 0) continue;
            res = res.mul(q);
        }
    }
    return res;
};
BN.prototype.iushln = function iushln(bits) {
    assert3(typeof bits === "number" && bits >= 0);
    var r = bits % 26;
    var s = (bits - r) / 26;
    var carryMask = 0x3ffffff >>> 26 - r << 26 - r;
    var i;
    if (r !== 0) {
        var carry = 0;
        for(i = 0; i < this.length; i++){
            var newCarry = this.words[i] & carryMask;
            var c = (this.words[i] | 0) - newCarry << r;
            this.words[i] = c | carry;
            carry = newCarry >>> 26 - r;
        }
        if (carry) {
            this.words[i] = carry;
            this.length++;
        }
    }
    if (s !== 0) {
        for(i = this.length - 1; i >= 0; i--){
            this.words[i + s] = this.words[i];
        }
        for(i = 0; i < s; i++){
            this.words[i] = 0;
        }
        this.length += s;
    }
    return this._strip();
};
BN.prototype.ishln = function ishln(bits) {
    assert3(this.negative === 0);
    return this.iushln(bits);
};
BN.prototype.iushrn = function iushrn(bits, hint, extended) {
    assert3(typeof bits === "number" && bits >= 0);
    var h;
    if (hint) {
        h = (hint - hint % 26) / 26;
    } else {
        h = 0;
    }
    var r = bits % 26;
    var s = Math.min((bits - r) / 26, this.length);
    var mask = 0x3ffffff ^ 0x3ffffff >>> r << r;
    var maskedWords = extended;
    h -= s;
    h = Math.max(0, h);
    if (maskedWords) {
        for(var i = 0; i < s; i++){
            maskedWords.words[i] = this.words[i];
        }
        maskedWords.length = s;
    }
    if (s === 0) {} else if (this.length > s) {
        this.length -= s;
        for(i = 0; i < this.length; i++){
            this.words[i] = this.words[i + s];
        }
    } else {
        this.words[0] = 0;
        this.length = 1;
    }
    var carry = 0;
    for(i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--){
        var word = this.words[i] | 0;
        this.words[i] = carry << 26 - r | word >>> r;
        carry = word & mask;
    }
    if (maskedWords && carry !== 0) {
        maskedWords.words[maskedWords.length++] = carry;
    }
    if (this.length === 0) {
        this.words[0] = 0;
        this.length = 1;
    }
    return this._strip();
};
BN.prototype.ishrn = function ishrn(bits, hint, extended) {
    assert3(this.negative === 0);
    return this.iushrn(bits, hint, extended);
};
BN.prototype.shln = function shln(bits) {
    return this.clone().ishln(bits);
};
BN.prototype.ushln = function ushln(bits) {
    return this.clone().iushln(bits);
};
BN.prototype.shrn = function shrn(bits) {
    return this.clone().ishrn(bits);
};
BN.prototype.ushrn = function ushrn(bits) {
    return this.clone().iushrn(bits);
};
BN.prototype.testn = function testn(bit) {
    assert3(typeof bit === "number" && bit >= 0);
    var r = bit % 26;
    var s = (bit - r) / 26;
    var q = 1 << r;
    if (this.length <= s) return false;
    var w = this.words[s];
    return !!(w & q);
};
BN.prototype.imaskn = function imaskn(bits) {
    assert3(typeof bits === "number" && bits >= 0);
    var r = bits % 26;
    var s = (bits - r) / 26;
    assert3(this.negative === 0, "imaskn works only with positive numbers");
    if (this.length <= s) {
        return this;
    }
    if (r !== 0) {
        s++;
    }
    this.length = Math.min(s, this.length);
    if (r !== 0) {
        var mask = 0x3ffffff ^ 0x3ffffff >>> r << r;
        this.words[this.length - 1] &= mask;
    }
    return this._strip();
};
BN.prototype.maskn = function maskn(bits) {
    return this.clone().imaskn(bits);
};
BN.prototype.iaddn = function iaddn(num) {
    assert3(typeof num === "number");
    assert3(num < 0x4000000);
    if (num < 0) return this.isubn(-num);
    if (this.negative !== 0) {
        if (this.length === 1 && (this.words[0] | 0) <= num) {
            this.words[0] = num - (this.words[0] | 0);
            this.negative = 0;
            return this;
        }
        this.negative = 0;
        this.isubn(num);
        this.negative = 1;
        return this;
    }
    return this._iaddn(num);
};
BN.prototype._iaddn = function _iaddn(num) {
    this.words[0] += num;
    for(var i = 0; i < this.length && this.words[i] >= 0x4000000; i++){
        this.words[i] -= 0x4000000;
        if (i === this.length - 1) {
            this.words[i + 1] = 1;
        } else {
            this.words[i + 1]++;
        }
    }
    this.length = Math.max(this.length, i + 1);
    return this;
};
BN.prototype.isubn = function isubn(num) {
    assert3(typeof num === "number");
    assert3(num < 0x4000000);
    if (num < 0) return this.iaddn(-num);
    if (this.negative !== 0) {
        this.negative = 0;
        this.iaddn(num);
        this.negative = 1;
        return this;
    }
    this.words[0] -= num;
    if (this.length === 1 && this.words[0] < 0) {
        this.words[0] = -this.words[0];
        this.negative = 1;
    } else {
        for(var i = 0; i < this.length && this.words[i] < 0; i++){
            this.words[i] += 0x4000000;
            this.words[i + 1] -= 1;
        }
    }
    return this._strip();
};
BN.prototype.addn = function addn(num) {
    return this.clone().iaddn(num);
};
BN.prototype.subn = function subn(num) {
    return this.clone().isubn(num);
};
BN.prototype.iabs = function iabs() {
    this.negative = 0;
    return this;
};
BN.prototype.abs = function abs() {
    return this.clone().iabs();
};
BN.prototype._ishlnsubmul = function _ishlnsubmul(num, mul, shift) {
    var len = num.length + shift;
    var i;
    this._expand(len);
    var w;
    var carry = 0;
    for(i = 0; i < num.length; i++){
        w = (this.words[i + shift] | 0) + carry;
        var right = (num.words[i] | 0) * mul;
        w -= right & 0x3ffffff;
        carry = (w >> 26) - (right / 0x4000000 | 0);
        this.words[i + shift] = w & 0x3ffffff;
    }
    for(; i < this.length - shift; i++){
        w = (this.words[i + shift] | 0) + carry;
        carry = w >> 26;
        this.words[i + shift] = w & 0x3ffffff;
    }
    if (carry === 0) return this._strip();
    assert3(carry === -1);
    carry = 0;
    for(i = 0; i < this.length; i++){
        w = -(this.words[i] | 0) + carry;
        carry = w >> 26;
        this.words[i] = w & 0x3ffffff;
    }
    this.negative = 1;
    return this._strip();
};
BN.prototype._wordDiv = function _wordDiv(num, mode) {
    var shift = this.length - num.length;
    var a = this.clone();
    var b = num;
    var bhi = b.words[b.length - 1] | 0;
    var bhiBits = this._countBits(bhi);
    shift = 26 - bhiBits;
    if (shift !== 0) {
        b = b.ushln(shift);
        a.iushln(shift);
        bhi = b.words[b.length - 1] | 0;
    }
    var m = a.length - b.length;
    var q;
    if (mode !== "mod") {
        q = new BN(null);
        q.length = m + 1;
        q.words = new Array(q.length);
        for(var i = 0; i < q.length; i++){
            q.words[i] = 0;
        }
    }
    var diff = a.clone()._ishlnsubmul(b, 1, m);
    if (diff.negative === 0) {
        a = diff;
        if (q) {
            q.words[m] = 1;
        }
    }
    for(var j = m - 1; j >= 0; j--){
        var qj = (a.words[b.length + j] | 0) * 0x4000000 + (a.words[b.length + j - 1] | 0);
        qj = Math.min(qj / bhi | 0, 0x3ffffff);
        a._ishlnsubmul(b, qj, j);
        while(a.negative !== 0){
            qj--;
            a.negative = 0;
            a._ishlnsubmul(b, 1, j);
            if (!a.isZero()) {
                a.negative ^= 1;
            }
        }
        if (q) {
            q.words[j] = qj;
        }
    }
    if (q) {
        q._strip();
    }
    a._strip();
    if (mode !== "div" && shift !== 0) {
        a.iushrn(shift);
    }
    return {
        div: q || null,
        mod: a
    };
};
BN.prototype.divmod = function divmod(num, mode, positive) {
    assert3(!num.isZero());
    if (this.isZero()) {
        return {
            div: new BN(0),
            mod: new BN(0)
        };
    }
    var div, mod, res;
    if (this.negative !== 0 && num.negative === 0) {
        res = this.neg().divmod(num, mode);
        if (mode !== "mod") {
            div = res.div.neg();
        }
        if (mode !== "div") {
            mod = res.mod.neg();
            if (positive && mod.negative !== 0) {
                mod.iadd(num);
            }
        }
        return {
            div: div,
            mod: mod
        };
    }
    if (this.negative === 0 && num.negative !== 0) {
        res = this.divmod(num.neg(), mode);
        if (mode !== "mod") {
            div = res.div.neg();
        }
        return {
            div: div,
            mod: res.mod
        };
    }
    if ((this.negative & num.negative) !== 0) {
        res = this.neg().divmod(num.neg(), mode);
        if (mode !== "div") {
            mod = res.mod.neg();
            if (positive && mod.negative !== 0) {
                mod.isub(num);
            }
        }
        return {
            div: res.div,
            mod: mod
        };
    }
    if (num.length > this.length || this.cmp(num) < 0) {
        return {
            div: new BN(0),
            mod: this
        };
    }
    if (num.length === 1) {
        if (mode === "div") {
            return {
                div: this.divn(num.words[0]),
                mod: null
            };
        }
        if (mode === "mod") {
            return {
                div: null,
                mod: new BN(this.modrn(num.words[0]))
            };
        }
        return {
            div: this.divn(num.words[0]),
            mod: new BN(this.modrn(num.words[0]))
        };
    }
    return this._wordDiv(num, mode);
};
BN.prototype.div = function div(num) {
    return this.divmod(num, "div", false).div;
};
BN.prototype.mod = function mod(num) {
    return this.divmod(num, "mod", false).mod;
};
BN.prototype.umod = function umod(num) {
    return this.divmod(num, "mod", true).mod;
};
BN.prototype.divRound = function divRound(num) {
    var dm = this.divmod(num);
    if (dm.mod.isZero()) return dm.div;
    var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;
    var half = num.ushrn(1);
    var r2 = num.andln(1);
    var cmp = mod.cmp(half);
    if (cmp < 0 || r2 === 1 && cmp === 0) return dm.div;
    return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
};
BN.prototype.modrn = function modrn(num) {
    var isNegNum = num < 0;
    if (isNegNum) num = -num;
    assert3(num <= 0x3ffffff);
    var p = (1 << 26) % num;
    var acc = 0;
    for(var i = this.length - 1; i >= 0; i--){
        acc = (p * acc + (this.words[i] | 0)) % num;
    }
    return isNegNum ? -acc : acc;
};
BN.prototype.modn = function modn(num) {
    return this.modrn(num);
};
BN.prototype.idivn = function idivn(num) {
    var isNegNum = num < 0;
    if (isNegNum) num = -num;
    assert3(num <= 0x3ffffff);
    var carry = 0;
    for(var i = this.length - 1; i >= 0; i--){
        var w = (this.words[i] | 0) + carry * 0x4000000;
        this.words[i] = w / num | 0;
        carry = w % num;
    }
    this._strip();
    return isNegNum ? this.ineg() : this;
};
BN.prototype.divn = function divn(num) {
    return this.clone().idivn(num);
};
BN.prototype.egcd = function egcd(p) {
    assert3(p.negative === 0);
    assert3(!p.isZero());
    var x = this;
    var y = p.clone();
    if (x.negative !== 0) {
        x = x.umod(p);
    } else {
        x = x.clone();
    }
    var A = new BN(1);
    var B = new BN(0);
    var C = new BN(0);
    var D = new BN(1);
    var g = 0;
    while(x.isEven() && y.isEven()){
        x.iushrn(1);
        y.iushrn(1);
        ++g;
    }
    var yp = y.clone();
    var xp = x.clone();
    while(!x.isZero()){
        for(var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
        if (i > 0) {
            x.iushrn(i);
            while(i-- > 0){
                if (A.isOdd() || B.isOdd()) {
                    A.iadd(yp);
                    B.isub(xp);
                }
                A.iushrn(1);
                B.iushrn(1);
            }
        }
        for(var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
        if (j > 0) {
            y.iushrn(j);
            while(j-- > 0){
                if (C.isOdd() || D.isOdd()) {
                    C.iadd(yp);
                    D.isub(xp);
                }
                C.iushrn(1);
                D.iushrn(1);
            }
        }
        if (x.cmp(y) >= 0) {
            x.isub(y);
            A.isub(C);
            B.isub(D);
        } else {
            y.isub(x);
            C.isub(A);
            D.isub(B);
        }
    }
    return {
        a: C,
        b: D,
        gcd: y.iushln(g)
    };
};
BN.prototype._invmp = function _invmp(p) {
    assert3(p.negative === 0);
    assert3(!p.isZero());
    var a = this;
    var b = p.clone();
    if (a.negative !== 0) {
        a = a.umod(p);
    } else {
        a = a.clone();
    }
    var x1 = new BN(1);
    var x2 = new BN(0);
    var delta = b.clone();
    while(a.cmpn(1) > 0 && b.cmpn(1) > 0){
        for(var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
        if (i > 0) {
            a.iushrn(i);
            while(i-- > 0){
                if (x1.isOdd()) {
                    x1.iadd(delta);
                }
                x1.iushrn(1);
            }
        }
        for(var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
        if (j > 0) {
            b.iushrn(j);
            while(j-- > 0){
                if (x2.isOdd()) {
                    x2.iadd(delta);
                }
                x2.iushrn(1);
            }
        }
        if (a.cmp(b) >= 0) {
            a.isub(b);
            x1.isub(x2);
        } else {
            b.isub(a);
            x2.isub(x1);
        }
    }
    var res;
    if (a.cmpn(1) === 0) {
        res = x1;
    } else {
        res = x2;
    }
    if (res.cmpn(0) < 0) {
        res.iadd(p);
    }
    return res;
};
BN.prototype.gcd = function gcd(num) {
    if (this.isZero()) return num.abs();
    if (num.isZero()) return this.abs();
    var a = this.clone();
    var b = num.clone();
    a.negative = 0;
    b.negative = 0;
    for(var shift = 0; a.isEven() && b.isEven(); shift++){
        a.iushrn(1);
        b.iushrn(1);
    }
    do {
        while(a.isEven()){
            a.iushrn(1);
        }
        while(b.isEven()){
            b.iushrn(1);
        }
        var r = a.cmp(b);
        if (r < 0) {
            var t = a;
            a = b;
            b = t;
        } else if (r === 0 || b.cmpn(1) === 0) {
            break;
        }
        a.isub(b);
    }while (true)
    return b.iushln(shift);
};
BN.prototype.invm = function invm(num) {
    return this.egcd(num).a.umod(num);
};
BN.prototype.isEven = function isEven() {
    return (this.words[0] & 1) === 0;
};
BN.prototype.isOdd = function isOdd() {
    return (this.words[0] & 1) === 1;
};
BN.prototype.andln = function andln(num) {
    return this.words[0] & num;
};
BN.prototype.bincn = function bincn(bit) {
    assert3(typeof bit === "number");
    var r = bit % 26;
    var s = (bit - r) / 26;
    var q = 1 << r;
    if (this.length <= s) {
        this._expand(s + 1);
        this.words[s] |= q;
        return this;
    }
    var carry = q;
    for(var i = s; carry !== 0 && i < this.length; i++){
        var w = this.words[i] | 0;
        w += carry;
        carry = w >>> 26;
        w &= 0x3ffffff;
        this.words[i] = w;
    }
    if (carry !== 0) {
        this.words[i] = carry;
        this.length++;
    }
    return this;
};
BN.prototype.isZero = function isZero() {
    return this.length === 1 && this.words[0] === 0;
};
BN.prototype.cmpn = function cmpn(num) {
    var negative = num < 0;
    if (this.negative !== 0 && !negative) return -1;
    if (this.negative === 0 && negative) return 1;
    this._strip();
    var res;
    if (this.length > 1) {
        res = 1;
    } else {
        if (negative) {
            num = -num;
        }
        assert3(num <= 0x3ffffff, "Number is too big");
        var w = this.words[0] | 0;
        res = w === num ? 0 : w < num ? -1 : 1;
    }
    if (this.negative !== 0) return -res | 0;
    return res;
};
BN.prototype.cmp = function cmp(num) {
    if (this.negative !== 0 && num.negative === 0) return -1;
    if (this.negative === 0 && num.negative !== 0) return 1;
    var res = this.ucmp(num);
    if (this.negative !== 0) return -res | 0;
    return res;
};
BN.prototype.ucmp = function ucmp(num) {
    if (this.length > num.length) return 1;
    if (this.length < num.length) return -1;
    var res = 0;
    for(var i = this.length - 1; i >= 0; i--){
        var a = this.words[i] | 0;
        var b = num.words[i] | 0;
        if (a === b) continue;
        if (a < b) {
            res = -1;
        } else if (a > b) {
            res = 1;
        }
        break;
    }
    return res;
};
BN.prototype.gtn = function gtn(num) {
    return this.cmpn(num) === 1;
};
BN.prototype.gt = function gt(num) {
    return this.cmp(num) === 1;
};
BN.prototype.gten = function gten(num) {
    return this.cmpn(num) >= 0;
};
BN.prototype.gte = function gte(num) {
    return this.cmp(num) >= 0;
};
BN.prototype.ltn = function ltn(num) {
    return this.cmpn(num) === -1;
};
BN.prototype.lt = function lt(num) {
    return this.cmp(num) === -1;
};
BN.prototype.lten = function lten(num) {
    return this.cmpn(num) <= 0;
};
BN.prototype.lte = function lte(num) {
    return this.cmp(num) <= 0;
};
BN.prototype.eqn = function eqn(num) {
    return this.cmpn(num) === 0;
};
BN.prototype.eq = function eq(num) {
    return this.cmp(num) === 0;
};
BN.red = function red(num) {
    return new Red(num);
};
BN.prototype.toRed = function toRed(ctx) {
    assert3(!this.red, "Already a number in reduction context");
    assert3(this.negative === 0, "red works only with positives");
    return ctx.convertTo(this)._forceRed(ctx);
};
BN.prototype.fromRed = function fromRed() {
    assert3(this.red, "fromRed works only with numbers in reduction context");
    return this.red.convertFrom(this);
};
BN.prototype._forceRed = function _forceRed(ctx) {
    this.red = ctx;
    return this;
};
BN.prototype.forceRed = function forceRed(ctx) {
    assert3(!this.red, "Already a number in reduction context");
    return this._forceRed(ctx);
};
BN.prototype.redAdd = function redAdd(num) {
    assert3(this.red, "redAdd works only with red numbers");
    return this.red.add(this, num);
};
BN.prototype.redIAdd = function redIAdd(num) {
    assert3(this.red, "redIAdd works only with red numbers");
    return this.red.iadd(this, num);
};
BN.prototype.redSub = function redSub(num) {
    assert3(this.red, "redSub works only with red numbers");
    return this.red.sub(this, num);
};
BN.prototype.redISub = function redISub(num) {
    assert3(this.red, "redISub works only with red numbers");
    return this.red.isub(this, num);
};
BN.prototype.redShl = function redShl(num) {
    assert3(this.red, "redShl works only with red numbers");
    return this.red.shl(this, num);
};
BN.prototype.redMul = function redMul(num) {
    assert3(this.red, "redMul works only with red numbers");
    this.red._verify2(this, num);
    return this.red.mul(this, num);
};
BN.prototype.redIMul = function redIMul(num) {
    assert3(this.red, "redMul works only with red numbers");
    this.red._verify2(this, num);
    return this.red.imul(this, num);
};
BN.prototype.redSqr = function redSqr() {
    assert3(this.red, "redSqr works only with red numbers");
    this.red._verify1(this);
    return this.red.sqr(this);
};
BN.prototype.redISqr = function redISqr() {
    assert3(this.red, "redISqr works only with red numbers");
    this.red._verify1(this);
    return this.red.isqr(this);
};
BN.prototype.redSqrt = function redSqrt() {
    assert3(this.red, "redSqrt works only with red numbers");
    this.red._verify1(this);
    return this.red.sqrt(this);
};
BN.prototype.redInvm = function redInvm() {
    assert3(this.red, "redInvm works only with red numbers");
    this.red._verify1(this);
    return this.red.invm(this);
};
BN.prototype.redNeg = function redNeg() {
    assert3(this.red, "redNeg works only with red numbers");
    this.red._verify1(this);
    return this.red.neg(this);
};
BN.prototype.redPow = function redPow(num) {
    assert3(this.red && !num.red, "redPow(normalNum)");
    this.red._verify1(this);
    return this.red.pow(this, num);
};
var primes = {
    k256: null,
    p224: null,
    p192: null,
    p25519: null
};
function MPrime(name, p) {
    this.name = name;
    this.p = new BN(p, 16);
    this.n = this.p.bitLength();
    this.k = new BN(1).iushln(this.n).isub(this.p);
    this.tmp = this._tmp();
}
MPrime.prototype._tmp = function _tmp() {
    var tmp = new BN(null);
    tmp.words = new Array(Math.ceil(this.n / 13));
    return tmp;
};
MPrime.prototype.ireduce = function ireduce(num) {
    var r = num;
    var rlen;
    do {
        this.split(r, this.tmp);
        r = this.imulK(r);
        r = r.iadd(this.tmp);
        rlen = r.bitLength();
    }while (rlen > this.n)
    var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
    if (cmp === 0) {
        r.words[0] = 0;
        r.length = 1;
    } else if (cmp > 0) {
        r.isub(this.p);
    } else {
        if (r.strip !== undefined) {
            r.strip();
        } else {
            r._strip();
        }
    }
    return r;
};
MPrime.prototype.split = function split(input, out) {
    input.iushrn(this.n, 0, out);
};
MPrime.prototype.imulK = function imulK(num) {
    return num.imul(this.k);
};
function K256() {
    MPrime.call(this, "k256", "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f");
}
inherits(K256, MPrime);
K256.prototype.split = function split(input, output) {
    var mask = 0x3fffff;
    var outLen = Math.min(input.length, 9);
    for(var i = 0; i < outLen; i++){
        output.words[i] = input.words[i];
    }
    output.length = outLen;
    if (input.length <= 9) {
        input.words[0] = 0;
        input.length = 1;
        return;
    }
    var prev = input.words[9];
    output.words[output.length++] = prev & mask;
    for(i = 10; i < input.length; i++){
        var next = input.words[i] | 0;
        input.words[i - 10] = (next & mask) << 4 | prev >>> 22;
        prev = next;
    }
    prev >>>= 22;
    input.words[i - 10] = prev;
    if (prev === 0 && input.length > 10) {
        input.length -= 10;
    } else {
        input.length -= 9;
    }
};
K256.prototype.imulK = function imulK(num) {
    num.words[num.length] = 0;
    num.words[num.length + 1] = 0;
    num.length += 2;
    var lo = 0;
    for(var i = 0; i < num.length; i++){
        var w = num.words[i] | 0;
        lo += w * 0x3d1;
        num.words[i] = lo & 0x3ffffff;
        lo = w * 0x40 + (lo / 0x4000000 | 0);
    }
    if (num.words[num.length - 1] === 0) {
        num.length--;
        if (num.words[num.length - 1] === 0) {
            num.length--;
        }
    }
    return num;
};
function P224() {
    MPrime.call(this, "p224", "ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001");
}
inherits(P224, MPrime);
function P192() {
    MPrime.call(this, "p192", "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff");
}
inherits(P192, MPrime);
function P25519() {
    MPrime.call(this, "25519", "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed");
}
inherits(P25519, MPrime);
P25519.prototype.imulK = function imulK(num) {
    var carry = 0;
    for(var i = 0; i < num.length; i++){
        var hi = (num.words[i] | 0) * 0x13 + carry;
        var lo = hi & 0x3ffffff;
        hi >>>= 26;
        num.words[i] = lo;
        carry = hi;
    }
    if (carry !== 0) {
        num.words[num.length++] = carry;
    }
    return num;
};
BN._prime = function prime(name) {
    if (primes[name]) return primes[name];
    var prime;
    if (name === "k256") {
        prime = new K256();
    } else if (name === "p224") {
        prime = new P224();
    } else if (name === "p192") {
        prime = new P192();
    } else if (name === "p25519") {
        prime = new P25519();
    } else {
        throw new Error("Unknown prime " + name);
    }
    primes[name] = prime;
    return prime;
};
function Red(m) {
    if (typeof m === "string") {
        var prime = BN._prime(m);
        this.m = prime.p;
        this.prime = prime;
    } else {
        assert3(m.gtn(1), "modulus must be greater than 1");
        this.m = m;
        this.prime = null;
    }
}
Red.prototype._verify1 = function _verify1(a) {
    assert3(a.negative === 0, "red works only with positives");
    assert3(a.red, "red works only with red numbers");
};
Red.prototype._verify2 = function _verify2(a, b) {
    assert3((a.negative | b.negative) === 0, "red works only with positives");
    assert3(a.red && a.red === b.red, "red works only with red numbers");
};
Red.prototype.imod = function imod(a) {
    if (this.prime) return this.prime.ireduce(a)._forceRed(this);
    move(a, a.umod(this.m)._forceRed(this));
    return a;
};
Red.prototype.neg = function neg(a) {
    if (a.isZero()) {
        return a.clone();
    }
    return this.m.sub(a)._forceRed(this);
};
Red.prototype.add = function add(a, b) {
    this._verify2(a, b);
    var res = a.add(b);
    if (res.cmp(this.m) >= 0) {
        res.isub(this.m);
    }
    return res._forceRed(this);
};
Red.prototype.iadd = function iadd(a, b) {
    this._verify2(a, b);
    var res = a.iadd(b);
    if (res.cmp(this.m) >= 0) {
        res.isub(this.m);
    }
    return res;
};
Red.prototype.sub = function sub(a, b) {
    this._verify2(a, b);
    var res = a.sub(b);
    if (res.cmpn(0) < 0) {
        res.iadd(this.m);
    }
    return res._forceRed(this);
};
Red.prototype.isub = function isub(a, b) {
    this._verify2(a, b);
    var res = a.isub(b);
    if (res.cmpn(0) < 0) {
        res.iadd(this.m);
    }
    return res;
};
Red.prototype.shl = function shl(a, num) {
    this._verify1(a);
    return this.imod(a.ushln(num));
};
Red.prototype.imul = function imul(a, b) {
    this._verify2(a, b);
    return this.imod(a.imul(b));
};
Red.prototype.mul = function mul(a, b) {
    this._verify2(a, b);
    return this.imod(a.mul(b));
};
Red.prototype.isqr = function isqr(a) {
    return this.imul(a, a.clone());
};
Red.prototype.sqr = function sqr(a) {
    return this.mul(a, a);
};
Red.prototype.sqrt = function sqrt(a) {
    if (a.isZero()) return a.clone();
    var mod3 = this.m.andln(3);
    assert3(mod3 % 2 === 1);
    if (mod3 === 3) {
        var pow = this.m.add(new BN(1)).iushrn(2);
        return this.pow(a, pow);
    }
    var q = this.m.subn(1);
    var s = 0;
    while(!q.isZero() && q.andln(1) === 0){
        s++;
        q.iushrn(1);
    }
    assert3(!q.isZero());
    var one = new BN(1).toRed(this);
    var nOne = one.redNeg();
    var lpow = this.m.subn(1).iushrn(1);
    var z = this.m.bitLength();
    z = new BN(2 * z * z).toRed(this);
    while(this.pow(z, lpow).cmp(nOne) !== 0){
        z.redIAdd(nOne);
    }
    var c = this.pow(z, q);
    var r = this.pow(a, q.addn(1).iushrn(1));
    var t = this.pow(a, q);
    var m = s;
    while(t.cmp(one) !== 0){
        var tmp = t;
        for(var i = 0; tmp.cmp(one) !== 0; i++){
            tmp = tmp.redSqr();
        }
        assert3(i < m);
        var b = this.pow(c, new BN(1).iushln(m - i - 1));
        r = r.redMul(b);
        c = b.redSqr();
        t = t.redMul(c);
        m = i;
    }
    return r;
};
Red.prototype.invm = function invm(a) {
    var inv = a._invmp(this.m);
    if (inv.negative !== 0) {
        inv.negative = 0;
        return this.imod(inv).redNeg();
    } else {
        return this.imod(inv);
    }
};
Red.prototype.pow = function pow(a, num) {
    if (num.isZero()) return new BN(1).toRed(this);
    if (num.cmpn(1) === 0) return a.clone();
    var windowSize = 4;
    var wnd = new Array(1 << windowSize);
    wnd[0] = new BN(1).toRed(this);
    wnd[1] = a;
    for(var i = 2; i < wnd.length; i++){
        wnd[i] = this.mul(wnd[i - 1], a);
    }
    var res = wnd[0];
    var current = 0;
    var currentLen = 0;
    var start = num.bitLength() % 26;
    if (start === 0) {
        start = 26;
    }
    for(i = num.length - 1; i >= 0; i--){
        var word = num.words[i];
        for(var j = start - 1; j >= 0; j--){
            var bit = word >> j & 1;
            if (res !== wnd[0]) {
                res = this.sqr(res);
            }
            if (bit === 0 && current === 0) {
                currentLen = 0;
                continue;
            }
            current <<= 1;
            current |= bit;
            currentLen++;
            if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;
            res = this.mul(res, wnd[current]);
            currentLen = 0;
            current = 0;
        }
        start = 26;
    }
    return res;
};
Red.prototype.convertTo = function convertTo(num) {
    var r = num.umod(this.m);
    return r === num ? r.clone() : r;
};
Red.prototype.convertFrom = function convertFrom(num) {
    var res = num.clone();
    res.red = null;
    return res;
};
BN.mont = function mont(num) {
    return new Mont(num);
};
function Mont(m) {
    Red.call(this, m);
    this.shift = this.m.bitLength();
    if (this.shift % 26 !== 0) {
        this.shift += 26 - this.shift % 26;
    }
    this.r = new BN(1).iushln(this.shift);
    this.r2 = this.imod(this.r.sqr());
    this.rinv = this.r._invmp(this.m);
    this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
    this.minv = this.minv.umod(this.r);
    this.minv = this.r.sub(this.minv);
}
inherits(Mont, Red);
Mont.prototype.convertTo = function convertTo(num) {
    return this.imod(num.ushln(this.shift));
};
Mont.prototype.convertFrom = function convertFrom(num) {
    var r = this.imod(num.mul(this.rinv));
    r.red = null;
    return r;
};
Mont.prototype.imul = function imul(a, b) {
    if (a.isZero() || b.isZero()) {
        a.words[0] = 0;
        a.length = 1;
        return a;
    }
    var t = a.imul(b);
    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
    var u = t.isub(c).iushrn(this.shift);
    var res = u;
    if (u.cmp(this.m) >= 0) {
        res = u.isub(this.m);
    } else if (u.cmpn(0) < 0) {
        res = u.iadd(this.m);
    }
    return res._forceRed(this);
};
Mont.prototype.mul = function mul(a, b) {
    if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);
    var t = a.mul(b);
    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
    var u = t.isub(c).iushrn(this.shift);
    var res = u;
    if (u.cmp(this.m) >= 0) {
        res = u.isub(this.m);
    } else if (u.cmpn(0) < 0) {
        res = u.iadd(this.m);
    }
    return res._forceRed(this);
};
Mont.prototype.invm = function invm(a) {
    var res = this.imod(a._invmp(this.m).mul(this.r2));
    return res._forceRed(this);
};
function Reporter(options) {
    this._reporterState = {
        obj: null,
        path: [],
        options: options || {},
        errors: []
    };
}
Reporter.prototype.isError = function isError(obj) {
    return obj instanceof ReporterError;
};
Reporter.prototype.save = function save() {
    const state = this._reporterState;
    return {
        obj: state.obj,
        pathLen: state.path.length
    };
};
Reporter.prototype.restore = function restore(data) {
    const state = this._reporterState;
    state.obj = data.obj;
    state.path = state.path.slice(0, data.pathLen);
};
Reporter.prototype.enterKey = function enterKey(key) {
    return this._reporterState.path.push(key);
};
Reporter.prototype.exitKey = function exitKey(index) {
    const state = this._reporterState;
    state.path = state.path.slice(0, index - 1);
};
Reporter.prototype.leaveKey = function leaveKey(index, key, value) {
    const state = this._reporterState;
    this.exitKey(index);
    if (state.obj !== null) {
        state.obj[key] = value;
    }
};
Reporter.prototype.path = function path() {
    return this._reporterState.path.join("/");
};
Reporter.prototype.enterObject = function enterObject() {
    const state = this._reporterState;
    const prev = state.obj;
    state.obj = {};
    return prev;
};
Reporter.prototype.leaveObject = function leaveObject(prev) {
    const state = this._reporterState;
    const now = state.obj;
    state.obj = prev;
    return now;
};
Reporter.prototype.error = function error(msg) {
    let err;
    const state = this._reporterState;
    const inherited = msg instanceof ReporterError;
    if (inherited) {
        err = msg;
    } else {
        err = new ReporterError(state.path.map(function(elem) {
            return "[" + JSON.stringify(elem) + "]";
        }).join(""), msg.message || msg, msg.stack);
    }
    if (!state.options.partial) {
        throw err;
    }
    if (!inherited) {
        state.errors.push(err);
    }
    return err;
};
Reporter.prototype.wrapResult = function wrapResult(result) {
    const state = this._reporterState;
    if (!state.options.partial) {
        return result;
    }
    return {
        result: this.isError(result) ? null : result,
        errors: state.errors
    };
};
function ReporterError(path, msg) {
    this.path = path;
    this.rethrow(msg);
}
ReporterError.prototype = Object.create(Error.prototype, {
    constructor: {
        value: ReporterError,
        enumerable: false,
        writable: true,
        configurable: true
    }
});
ReporterError.prototype.rethrow = function rethrow(msg) {
    this.message = msg + " at: " + (this.path || "(shallow)");
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, ReporterError);
    }
    if (!this.stack) {
        try {
            throw new Error(this.message);
        } catch (e) {
            this.stack = e.stack;
        }
    }
    return this;
};
function DecoderBuffer(base, options) {
    Reporter.call(this, options);
    if (!Buffer.isBuffer(base)) {
        this.error("Input not Buffer");
        return;
    }
    this.base = base;
    this.offset = 0;
    this.length = base.length;
}
DecoderBuffer.prototype = Object.create(Reporter.prototype, {
    constructor: {
        value: DecoderBuffer,
        enumerable: false,
        writable: true,
        configurable: true
    }
});
DecoderBuffer.isDecoderBuffer = function isDecoderBuffer(data) {
    if (data instanceof DecoderBuffer) {
        return true;
    }
    const isCompatible = typeof data === "object" && Buffer.isBuffer(data.base) && data.constructor.name === "DecoderBuffer" && typeof data.offset === "number" && typeof data.length === "number" && typeof data.save === "function" && typeof data.restore === "function" && typeof data.isEmpty === "function" && typeof data.readUInt8 === "function" && typeof data.skip === "function" && typeof data.raw === "function";
    return isCompatible;
};
DecoderBuffer.prototype.save = function save() {
    return {
        offset: this.offset,
        reporter: Reporter.prototype.save.call(this)
    };
};
DecoderBuffer.prototype.restore = function restore(save) {
    const res = new DecoderBuffer(this.base);
    res.offset = save.offset;
    res.length = this.offset;
    this.offset = save.offset;
    Reporter.prototype.restore.call(this, save.reporter);
    return res;
};
DecoderBuffer.prototype.isEmpty = function isEmpty() {
    return this.offset === this.length;
};
DecoderBuffer.prototype.readUInt8 = function readUInt8(fail) {
    if (this.offset + 1 <= this.length) {
        return this.base.readUInt8(this.offset++, true);
    } else {
        return this.error(fail || "DecoderBuffer overrun");
    }
};
DecoderBuffer.prototype.skip = function skip(bytes, fail) {
    if (!(this.offset + bytes <= this.length)) {
        return this.error(fail || "DecoderBuffer overrun");
    }
    const res = new DecoderBuffer(this.base);
    res._reporterState = this._reporterState;
    res.offset = this.offset;
    res.length = this.offset + bytes;
    this.offset += bytes;
    return res;
};
DecoderBuffer.prototype.raw = function raw(save) {
    return this.base.slice(save ? save.offset : this.offset, this.length);
};
function EncoderBuffer(value, reporter) {
    if (Array.isArray(value)) {
        this.length = 0;
        this.value = value.map(function(item) {
            if (!EncoderBuffer.isEncoderBuffer(item)) {
                item = new EncoderBuffer(item, reporter);
            }
            this.length += item.length;
            return item;
        }, this);
    } else if (typeof value === "number") {
        if (!(0 <= value && value <= 0xff)) {
            return reporter.error("non-byte EncoderBuffer value");
        }
        this.value = value;
        this.length = 1;
    } else if (typeof value === "string") {
        this.value = value;
        this.length = Buffer.byteLength(value);
    } else if (Buffer.isBuffer(value)) {
        this.value = value;
        this.length = value.length;
    } else {
        return reporter.error("Unsupported type: " + typeof value);
    }
}
EncoderBuffer.isEncoderBuffer = function isEncoderBuffer(data) {
    if (data instanceof EncoderBuffer) {
        return true;
    }
    const isCompatible = typeof data === "object" && data.constructor.name === "EncoderBuffer" && typeof data.length === "number" && typeof data.join === "function";
    return isCompatible;
};
EncoderBuffer.prototype.join = function join(out, offset) {
    if (!out) {
        out = Buffer.alloc(this.length);
    }
    if (!offset) {
        offset = 0;
    }
    if (this.length === 0) {
        return out;
    }
    if (Array.isArray(this.value)) {
        this.value.forEach(function(item) {
            item.join(out, offset);
            offset += item.length;
        });
    } else {
        if (typeof this.value === "number") {
            out[offset] = this.value;
        } else if (typeof this.value === "string") {
            out.write(this.value, offset);
        } else if (Buffer.isBuffer(this.value)) {
            this.value.copy(out, offset);
        }
        offset += this.length;
    }
    return out;
};
const tags = [
    "seq",
    "seqof",
    "set",
    "setof",
    "objid",
    "bool",
    "gentime",
    "utctime",
    "null_",
    "enum",
    "int",
    "objDesc",
    "bitstr",
    "bmpstr",
    "charstr",
    "genstr",
    "graphstr",
    "ia5str",
    "iso646str",
    "numstr",
    "octstr",
    "printstr",
    "t61str",
    "unistr",
    "utf8str",
    "videostr"
];
const methods = [
    "key",
    "obj",
    "use",
    "optional",
    "explicit",
    "implicit",
    "def",
    "choice",
    "any",
    "contains"
].concat(tags);
const overrided = [
    "_peekTag",
    "_decodeTag",
    "_use",
    "_decodeStr",
    "_decodeObjid",
    "_decodeTime",
    "_decodeNull",
    "_decodeInt",
    "_decodeBool",
    "_decodeList",
    "_encodeComposite",
    "_encodeStr",
    "_encodeObjid",
    "_encodeTime",
    "_encodeNull",
    "_encodeInt",
    "_encodeBool"
];
function Node(enc, parent, name) {
    const state = {};
    this._baseState = state;
    state.name = name;
    state.enc = enc;
    state.parent = parent || null;
    state.children = null;
    state.tag = null;
    state.args = null;
    state.reverseArgs = null;
    state.choice = null;
    state.optional = false;
    state.any = false;
    state.obj = false;
    state.use = null;
    state.useDecoder = null;
    state.key = null;
    state["default"] = null;
    state.explicit = null;
    state.implicit = null;
    state.contains = null;
    if (!state.parent) {
        state.children = [];
        this._wrap();
    }
}
const stateProps = [
    "enc",
    "parent",
    "children",
    "tag",
    "args",
    "reverseArgs",
    "choice",
    "optional",
    "any",
    "obj",
    "use",
    "alteredUse",
    "key",
    "default",
    "explicit",
    "implicit",
    "contains"
];
Node.prototype.clone = function clone() {
    const state = this._baseState;
    const cstate = {};
    stateProps.forEach(function(prop) {
        cstate[prop] = state[prop];
    });
    const res = new this.constructor(cstate.parent);
    res._baseState = cstate;
    return res;
};
Node.prototype._wrap = function wrap() {
    const state = this._baseState;
    methods.forEach(function(method) {
        this[method] = function _wrappedMethod() {
            const clone = new this.constructor(this);
            state.children.push(clone);
            return clone[method].apply(clone, arguments);
        };
    }, this);
};
Node.prototype._init = function init(body) {
    const state = this._baseState;
    assert1(state.parent === null);
    body.call(this);
    state.children = state.children.filter(function(child) {
        return child._baseState.parent === this;
    }, this);
    assertEquals(state.children.length, 1, "Root node can have only one child");
};
Node.prototype._useArgs = function useArgs(args) {
    const state = this._baseState;
    const children = args.filter(function(arg) {
        return arg instanceof this.constructor;
    }, this);
    args = args.filter(function(arg) {
        return !(arg instanceof this.constructor);
    }, this);
    if (children.length !== 0) {
        assert1(state.children === null);
        state.children = children;
        children.forEach(function(child) {
            child._baseState.parent = this;
        }, this);
    }
    if (args.length !== 0) {
        assert1(state.args === null);
        state.args = args;
        state.reverseArgs = args.map(function(arg) {
            if (typeof arg !== "object" || arg.constructor !== Object) {
                return arg;
            }
            const res = {};
            Object.keys(arg).forEach(function(key) {
                if (key == (key | 0)) {
                    key |= 0;
                }
                const value = arg[key];
                res[value] = key;
            });
            return res;
        });
    }
};
overrided.forEach(function(method) {
    Node.prototype[method] = function _overrided() {
        const state = this._baseState;
        throw new Error(method + " not implemented for encoding: " + state.enc);
    };
});
tags.forEach(function(tag) {
    Node.prototype[tag] = function _tagMethod() {
        const state = this._baseState;
        const args = Array.prototype.slice.call(arguments);
        assert1(state.tag === null);
        state.tag = tag;
        this._useArgs(args);
        return this;
    };
});
Node.prototype.use = function use(item) {
    assert1(item);
    const state = this._baseState;
    assert1(state.use === null);
    state.use = item;
    return this;
};
Node.prototype.optional = function optional() {
    const state = this._baseState;
    state.optional = true;
    return this;
};
Node.prototype.def = function def(val) {
    const state = this._baseState;
    assert1(state["default"] === null);
    state["default"] = val;
    state.optional = true;
    return this;
};
Node.prototype.explicit = function explicit(num) {
    const state = this._baseState;
    assert1(state.explicit === null && state.implicit === null);
    state.explicit = num;
    return this;
};
Node.prototype.implicit = function implicit(num) {
    const state = this._baseState;
    assert1(state.explicit === null && state.implicit === null);
    state.implicit = num;
    return this;
};
Node.prototype.obj = function obj() {
    const state = this._baseState;
    const args = Array.prototype.slice.call(arguments);
    state.obj = true;
    if (args.length !== 0) {
        this._useArgs(args);
    }
    return this;
};
Node.prototype.key = function key(newKey) {
    const state = this._baseState;
    assert1(state.key === null);
    state.key = newKey;
    return this;
};
Node.prototype.any = function any() {
    const state = this._baseState;
    state.any = true;
    return this;
};
Node.prototype.choice = function choice(obj) {
    const state = this._baseState;
    assert1(state.choice === null);
    state.choice = obj;
    this._useArgs(Object.keys(obj).map(function(key) {
        return obj[key];
    }));
    return this;
};
Node.prototype.contains = function contains(item) {
    const state = this._baseState;
    assert1(state.use === null);
    state.contains = item;
    return this;
};
Node.prototype._decode = function decode(input, options) {
    const state = this._baseState;
    if (state.parent === null) {
        return input.wrapResult(state.children[0]._decode(input, options));
    }
    let result = state["default"];
    let present = true;
    let prevKey = null;
    if (state.key !== null) {
        prevKey = input.enterKey(state.key);
    }
    if (state.optional) {
        let tag = null;
        if (state.explicit !== null) {
            tag = state.explicit;
        } else if (state.implicit !== null) {
            tag = state.implicit;
        } else if (state.tag !== null) {
            tag = state.tag;
        }
        if (tag === null && !state.any) {
            const save = input.save();
            try {
                if (state.choice === null) {
                    this._decodeGeneric(state.tag, input, options);
                } else {
                    this._decodeChoice(input, options);
                }
                present = true;
            } catch (_e) {
                present = false;
            }
            input.restore(save);
        } else {
            present = this._peekTag(input, tag, state.any);
            if (input.isError(present)) {
                return present;
            }
        }
    }
    let prevObj;
    if (state.obj && present) {
        prevObj = input.enterObject();
    }
    if (present) {
        if (state.explicit !== null) {
            const explicit = this._decodeTag(input, state.explicit);
            if (input.isError(explicit)) {
                return explicit;
            }
            input = explicit;
        }
        const start = input.offset;
        if (state.use === null && state.choice === null) {
            let save1;
            if (state.any) {
                save1 = input.save();
            }
            const body = this._decodeTag(input, state.implicit !== null ? state.implicit : state.tag, state.any);
            if (input.isError(body)) {
                return body;
            }
            if (state.any) {
                result = input.raw(save1);
            } else {
                input = body;
            }
        }
        if (options && options.track && state.tag !== null) {
            options.track(input.path(), start, input.length, "tagged");
        }
        if (options && options.track && state.tag !== null) {
            options.track(input.path(), input.offset, input.length, "content");
        }
        if (state.any) {} else if (state.choice === null) {
            result = this._decodeGeneric(state.tag, input, options);
        } else {
            result = this._decodeChoice(input, options);
        }
        if (input.isError(result)) {
            return result;
        }
        if (!state.any && state.choice === null && state.children !== null) {
            state.children.forEach(function decodeChildren(child) {
                child._decode(input, options);
            });
        }
        if (state.contains && (state.tag === "octstr" || state.tag === "bitstr")) {
            const data = new DecoderBuffer(result);
            result = this._getUse(state.contains, input._reporterState.obj)._decode(data, options);
        }
    }
    if (state.obj && present) {
        result = input.leaveObject(prevObj);
    }
    if (state.key !== null && (result !== null || present === true)) {
        input.leaveKey(prevKey, state.key, result);
    } else if (prevKey !== null) {
        input.exitKey(prevKey);
    }
    return result;
};
Node.prototype._decodeGeneric = function decodeGeneric(tag, input, options) {
    const state = this._baseState;
    if (tag === "seq" || tag === "set") {
        return null;
    }
    if (tag === "seqof" || tag === "setof") {
        return this._decodeList(input, tag, state.args[0], options);
    } else if (/str$/.test(tag)) {
        return this._decodeStr(input, tag, options);
    } else if (tag === "objid" && state.args) {
        return this._decodeObjid(input, state.args[0], state.args[1], options);
    } else if (tag === "objid") {
        return this._decodeObjid(input, null, null, options);
    } else if (tag === "gentime" || tag === "utctime") {
        return this._decodeTime(input, tag, options);
    } else if (tag === "null_") {
        return this._decodeNull(input, options);
    } else if (tag === "bool") {
        return this._decodeBool(input, options);
    } else if (tag === "objDesc") {
        return this._decodeStr(input, tag, options);
    } else if (tag === "int" || tag === "enum") {
        return this._decodeInt(input, state.args && state.args[0], options);
    }
    if (state.use !== null) {
        return this._getUse(state.use, input._reporterState.obj)._decode(input, options);
    } else {
        return input.error("unknown tag: " + tag);
    }
};
Node.prototype._getUse = function _getUse(entity, obj) {
    const state = this._baseState;
    state.useDecoder = this._use(entity, obj);
    assert1(state.useDecoder._baseState.parent === null);
    state.useDecoder = state.useDecoder._baseState.children[0];
    if (state.implicit !== state.useDecoder._baseState.implicit) {
        state.useDecoder = state.useDecoder.clone();
        state.useDecoder._baseState.implicit = state.implicit;
    }
    return state.useDecoder;
};
Node.prototype._decodeChoice = function decodeChoice(input, options) {
    const state = this._baseState;
    let result = null;
    let match = false;
    Object.keys(state.choice).some(function(key) {
        const save = input.save();
        const node = state.choice[key];
        try {
            const value = node._decode(input, options);
            if (input.isError(value)) {
                return false;
            }
            result = {
                type: key,
                value: value
            };
            match = true;
        } catch (_e) {
            input.restore(save);
            return false;
        }
        return true;
    }, this);
    if (!match) {
        return input.error("Choice not matched");
    }
    return result;
};
Node.prototype._createEncoderBuffer = function createEncoderBuffer(data) {
    return new EncoderBuffer(data, this.reporter);
};
Node.prototype._encode = function encode(data, reporter, parent) {
    const state = this._baseState;
    if (state["default"] !== null && state["default"] === data) {
        return;
    }
    const result = this._encodeValue(data, reporter, parent);
    if (result === undefined) {
        return;
    }
    if (this._skipDefault(result, reporter, parent)) {
        return;
    }
    return result;
};
Node.prototype._encodeValue = function encode(data, reporter, parent) {
    const state = this._baseState;
    if (state.parent === null) {
        return state.children[0]._encode(data, reporter || new Reporter());
    }
    let result = null;
    this.reporter = reporter;
    if (state.optional && data === undefined) {
        if (state["default"] !== null) {
            data = state["default"];
        } else {
            return;
        }
    }
    let content = null;
    let primitive = false;
    if (state.any) {
        result = this._createEncoderBuffer(data);
    } else if (state.choice) {
        result = this._encodeChoice(data, reporter);
    } else if (state.contains) {
        content = this._getUse(state.contains, parent)._encode(data, reporter);
        primitive = true;
    } else if (state.children) {
        content = state.children.map(function(child) {
            if (child._baseState.tag === "null_") {
                return child._encode(null, reporter, data);
            }
            if (child._baseState.key === null) {
                return reporter.error("Child should have a key");
            }
            const prevKey = reporter.enterKey(child._baseState.key);
            if (typeof data !== "object") {
                return reporter.error("Child expected, but input is not object");
            }
            const res = child._encode(data[child._baseState.key], reporter, data);
            reporter.leaveKey(prevKey);
            return res;
        }, this).filter(function(child) {
            return child;
        });
        content = this._createEncoderBuffer(content);
    } else {
        if (state.tag === "seqof" || state.tag === "setof") {
            if (!(state.args && state.args.length === 1)) {
                return reporter.error("Too many args for : " + state.tag);
            }
            if (!Array.isArray(data)) {
                return reporter.error("seqof/setof, but data is not Array");
            }
            const child = this.clone();
            child._baseState.implicit = null;
            content = this._createEncoderBuffer(data.map(function(item) {
                const state = this._baseState;
                return this._getUse(state.args[0], data)._encode(item, reporter);
            }, child));
        } else if (state.use !== null) {
            result = this._getUse(state.use, parent)._encode(data, reporter);
        } else {
            content = this._encodePrimitive(state.tag, data);
            primitive = true;
        }
    }
    if (!state.any && state.choice === null) {
        const tag = state.implicit !== null ? state.implicit : state.tag;
        const cls = state.implicit === null ? "universal" : "context";
        if (tag === null) {
            if (state.use === null) {
                reporter.error("Tag could be omitted only for .use()");
            }
        } else {
            if (state.use === null) {
                result = this._encodeComposite(tag, primitive, cls, content);
            }
        }
    }
    if (state.explicit !== null) {
        result = this._encodeComposite(state.explicit, false, "context", result);
    }
    return result;
};
Node.prototype._encodeChoice = function encodeChoice(data, reporter) {
    const state = this._baseState;
    const node = state.choice[data.type];
    if (!node) {
        assert1(false, data.type + " not found in " + JSON.stringify(Object.keys(state.choice)));
    }
    return node._encode(data.value, reporter);
};
Node.prototype._encodePrimitive = function encodePrimitive(tag, data) {
    const state = this._baseState;
    if (/str$/.test(tag)) {
        return this._encodeStr(data, tag);
    } else if (tag === "objid" && state.args) {
        return this._encodeObjid(data, state.reverseArgs[0], state.args[1]);
    } else if (tag === "objid") {
        return this._encodeObjid(data, null, null);
    } else if (tag === "gentime" || tag === "utctime") {
        return this._encodeTime(data, tag);
    } else if (tag === "null_") {
        return this._encodeNull();
    } else if (tag === "int" || tag === "enum") {
        return this._encodeInt(data, state.args && state.reverseArgs[0]);
    } else if (tag === "bool") {
        return this._encodeBool(data);
    } else if (tag === "objDesc") {
        return this._encodeStr(data, tag);
    } else {
        throw new Error("Unsupported tag: " + tag);
    }
};
Node.prototype._isNumstr = function isNumstr(str) {
    return /^[0-9 ]*$/.test(str);
};
Node.prototype._isPrintstr = function isPrintstr(str) {
    return /^[A-Za-z0-9 '()+,-./:=?]*$/.test(str);
};
function reverse(map) {
    const res = {};
    Object.keys(map).forEach(function(key) {
        if ((key | 0) == key) {
            key = key | 0;
        }
        const value = map[key];
        res[value] = key;
    });
    return res;
}
const tagClass = {
    0: "universal",
    1: "application",
    2: "context",
    3: "private"
};
const tagClassByName = reverse(tagClass);
const tag = {
    0x00: "end",
    0x01: "bool",
    0x02: "int",
    0x03: "bitstr",
    0x04: "octstr",
    0x05: "null_",
    0x06: "objid",
    0x07: "objDesc",
    0x08: "external",
    0x09: "real",
    0x0a: "enum",
    0x0b: "embed",
    0x0c: "utf8str",
    0x0d: "relativeOid",
    0x10: "seq",
    0x11: "set",
    0x12: "numstr",
    0x13: "printstr",
    0x14: "t61str",
    0x15: "videostr",
    0x16: "ia5str",
    0x17: "utctime",
    0x18: "gentime",
    0x19: "graphstr",
    0x1a: "iso646str",
    0x1b: "genstr",
    0x1c: "unistr",
    0x1d: "charstr",
    0x1e: "bmpstr"
};
const tagByName = reverse(tag);
const mod9 = {
    tagClass: tagClass,
    tagClassByName: tagClassByName,
    tag: tag,
    tagByName: tagByName
};
function DEREncoder(entity) {
    this.enc = "der";
    this.name = entity.name;
    this.entity = entity;
    this.tree = new DERNode();
    this.tree._init(entity.body);
}
DEREncoder.prototype.encode = function encode(data, reporter) {
    return this.tree._encode(data, reporter).join();
};
function DERNode(parent) {
    Node.call(this, "der", parent);
}
DERNode.prototype = Object.create(Node.prototype, {
    constructor: {
        value: DERNode,
        enumerable: false,
        writable: true,
        configurable: true
    }
});
DERNode.prototype._encodeComposite = function encodeComposite(tag, primitive, cls, content) {
    const encodedTag = encodeTag(tag, primitive, cls, this.reporter);
    if (content.length < 0x80) {
        const header = Buffer.alloc(2);
        header[0] = encodedTag;
        header[1] = content.length;
        return this._createEncoderBuffer([
            header,
            content
        ]);
    }
    let lenOctets = 1;
    for(let i = content.length; i >= 0x100; i >>= 8){
        lenOctets++;
    }
    const header1 = Buffer.alloc(1 + 1 + lenOctets);
    header1[0] = encodedTag;
    header1[1] = 0x80 | lenOctets;
    for(let i1 = 1 + lenOctets, j = content.length; j > 0; i1--, j >>= 8){
        header1[i1] = j & 0xff;
    }
    return this._createEncoderBuffer([
        header1,
        content
    ]);
};
DERNode.prototype._encodeStr = function encodeStr(str, tag) {
    if (tag === "bitstr") {
        return this._createEncoderBuffer([
            str.unused | 0,
            str.data
        ]);
    } else if (tag === "bmpstr") {
        const buf = Buffer.alloc(str.length * 2);
        for(let i = 0; i < str.length; i++){
            buf.writeUInt16BE(str.charCodeAt(i), i * 2);
        }
        return this._createEncoderBuffer(buf);
    } else if (tag === "numstr") {
        if (!this._isNumstr(str)) {
            return this.reporter.error("Encoding of string type: numstr supports " + "only digits and space");
        }
        return this._createEncoderBuffer(str);
    } else if (tag === "printstr") {
        if (!this._isPrintstr(str)) {
            return this.reporter.error("Encoding of string type: printstr supports " + "only latin upper and lower case letters, " + "digits, space, apostrophe, left and rigth " + "parenthesis, plus sign, comma, hyphen, " + "dot, slash, colon, equal sign, " + "question mark");
        }
        return this._createEncoderBuffer(str);
    } else if (/str$/.test(tag)) {
        return this._createEncoderBuffer(str);
    } else if (tag === "objDesc") {
        return this._createEncoderBuffer(str);
    } else {
        return this.reporter.error("Encoding of string type: " + tag + " unsupported");
    }
};
DERNode.prototype._encodeObjid = function encodeObjid(id, values, relative) {
    if (typeof id === "string") {
        if (!values) {
            return this.reporter.error("string objid given, but no values map found");
        }
        if (!values.hasOwnProperty(id)) {
            return this.reporter.error("objid not found in values map");
        }
        id = values[id].split(/[\s.]+/g);
        for(let i = 0; i < id.length; i++){
            id[i] |= 0;
        }
    } else if (Array.isArray(id)) {
        id = id.slice();
        for(let i1 = 0; i1 < id.length; i1++){
            id[i1] |= 0;
        }
    }
    if (!Array.isArray(id)) {
        return this.reporter.error("objid() should be either array or string, " + "got: " + JSON.stringify(id));
    }
    if (!relative) {
        if (id[1] >= 40) {
            return this.reporter.error("Second objid identifier OOB");
        }
        id.splice(0, 2, id[0] * 40 + id[1]);
    }
    let size = 0;
    for(let i2 = 0; i2 < id.length; i2++){
        let ident = id[i2];
        for(size++; ident >= 0x80; ident >>= 7){
            size++;
        }
    }
    const objid = Buffer.alloc(size);
    let offset = objid.length - 1;
    for(let i3 = id.length - 1; i3 >= 0; i3--){
        let ident1 = id[i3];
        objid[offset--] = ident1 & 0x7f;
        while((ident1 >>= 7) > 0){
            objid[offset--] = 0x80 | ident1 & 0x7f;
        }
    }
    return this._createEncoderBuffer(objid);
};
function two(num) {
    if (num < 10) {
        return "0" + num;
    } else {
        return num;
    }
}
DERNode.prototype._encodeTime = function encodeTime(time, tag) {
    let str;
    const date = new Date(time);
    if (tag === "gentime") {
        str = [
            two(date.getUTCFullYear()),
            two(date.getUTCMonth() + 1),
            two(date.getUTCDate()),
            two(date.getUTCHours()),
            two(date.getUTCMinutes()),
            two(date.getUTCSeconds()),
            "Z"
        ].join("");
    } else if (tag === "utctime") {
        str = [
            two(date.getUTCFullYear() % 100),
            two(date.getUTCMonth() + 1),
            two(date.getUTCDate()),
            two(date.getUTCHours()),
            two(date.getUTCMinutes()),
            two(date.getUTCSeconds()),
            "Z"
        ].join("");
    } else {
        this.reporter.error("Encoding " + tag + " time is not supported yet");
    }
    return this._encodeStr(str, "octstr");
};
DERNode.prototype._encodeNull = function encodeNull() {
    return this._createEncoderBuffer("");
};
DERNode.prototype._encodeInt = function encodeInt(num, values) {
    if (typeof num === "string") {
        if (!values) {
            return this.reporter.error("String int or enum given, but no values map");
        }
        if (!values.hasOwnProperty(num)) {
            return this.reporter.error("Values map doesn't contain: " + JSON.stringify(num));
        }
        num = values[num];
    }
    if (typeof num !== "number" && !Buffer.isBuffer(num)) {
        const numArray = num.toArray();
        if (!num.sign && numArray[0] & 0x80) {
            numArray.unshift(0);
        }
        num = Buffer.from(numArray);
    }
    if (Buffer.isBuffer(num)) {
        let size = num.length;
        if (num.length === 0) {
            size++;
        }
        const out = Buffer.alloc(size);
        num.copy(out);
        if (num.length === 0) {
            out[0] = 0;
        }
        return this._createEncoderBuffer(out);
    }
    if (num < 0x80) {
        return this._createEncoderBuffer(num);
    }
    if (num < 0x100) {
        return this._createEncoderBuffer([
            0,
            num
        ]);
    }
    let size1 = 1;
    for(let i = num; i >= 0x100; i >>= 8){
        size1++;
    }
    const out1 = new Array(size1);
    for(let i1 = out1.length - 1; i1 >= 0; i1--){
        out1[i1] = num & 0xff;
        num >>= 8;
    }
    if (out1[0] & 0x80) {
        out1.unshift(0);
    }
    return this._createEncoderBuffer(Buffer.from(out1));
};
DERNode.prototype._encodeBool = function encodeBool(value) {
    return this._createEncoderBuffer(value ? 0xff : 0);
};
DERNode.prototype._use = function use(entity, obj) {
    if (typeof entity === "function") {
        entity = entity(obj);
    }
    return entity._getEncoder("der").tree;
};
DERNode.prototype._skipDefault = function skipDefault(dataBuffer, reporter, parent) {
    const state = this._baseState;
    let i;
    if (state["default"] === null) {
        return false;
    }
    const data = dataBuffer.join();
    if (state.defaultBuffer === undefined) {
        state.defaultBuffer = this._encodeValue(state["default"], reporter, parent).join();
    }
    if (data.length !== state.defaultBuffer.length) {
        return false;
    }
    for(i = 0; i < data.length; i++){
        if (data[i] !== state.defaultBuffer[i]) {
            return false;
        }
    }
    return true;
};
function encodeTag(tag, primitive, cls, reporter) {
    let res;
    if (tag === "seqof") {
        tag = "seq";
    } else if (tag === "setof") {
        tag = "set";
    }
    if (tagByName.hasOwnProperty(tag)) {
        res = tagByName[tag];
    } else if (typeof tag === "number" && (tag | 0) === tag) {
        res = tag;
    } else {
        return reporter.error("Unknown tag: " + tag);
    }
    if (res >= 0x1f) {
        return reporter.error("Multi-octet tag encoding unsupported");
    }
    if (!primitive) {
        res |= 0x20;
    }
    res |= tagClassByName[cls || "universal"] << 6;
    return res;
}
function PEMEncoder(entity) {
    DEREncoder.call(this, entity);
    this.enc = "pem";
}
PEMEncoder.prototype = Object.create(DEREncoder.prototype, {
    constructor: {
        value: PEMEncoder,
        enumerable: false,
        writable: true,
        configurable: true
    }
});
PEMEncoder.prototype.encode = function encode(data, options) {
    const buf = DEREncoder.prototype.encode.call(this, data);
    const p = buf.toString("base64");
    const out = [
        "-----BEGIN " + options.label + "-----"
    ];
    for(let i = 0; i < p.length; i += 64){
        out.push(p.slice(i, i + 64));
    }
    out.push("-----END " + options.label + "-----");
    return out.join("\n");
};
function DERDecoder(entity) {
    this.enc = "der";
    this.name = entity.name;
    this.entity = entity;
    this.tree = new DERNode1();
    this.tree._init(entity.body);
}
DERDecoder.prototype.decode = function decode(data, options) {
    if (!DecoderBuffer.isDecoderBuffer(data)) {
        data = new DecoderBuffer(data, options);
    }
    return this.tree._decode(data, options);
};
function DERNode1(parent) {
    Node.call(this, "der", parent);
}
DERNode1.prototype = Object.create(Node.prototype, {
    constructor: {
        value: DERNode1,
        enumerable: false,
        writable: true,
        configurable: true
    }
});
DERNode1.prototype._peekTag = function peekTag(buffer, tag, any) {
    if (buffer.isEmpty()) {
        return false;
    }
    const state = buffer.save();
    const decodedTag = derDecodeTag(buffer, 'Failed to peek tag: "' + tag + '"');
    if (buffer.isError(decodedTag)) {
        return decodedTag;
    }
    buffer.restore(state);
    return decodedTag.tag === tag || decodedTag.tagStr === tag || decodedTag.tagStr + "of" === tag || any;
};
DERNode1.prototype._decodeTag = function decodeTag(buffer, tag, any) {
    const decodedTag = derDecodeTag(buffer, 'Failed to decode tag of "' + tag + '"');
    if (buffer.isError(decodedTag)) {
        return decodedTag;
    }
    let len = derDecodeLen(buffer, decodedTag.primitive, 'Failed to get length of "' + tag + '"');
    if (buffer.isError(len)) {
        return len;
    }
    if (!any && decodedTag.tag !== tag && decodedTag.tagStr !== tag && decodedTag.tagStr + "of" !== tag) {
        return buffer.error('Failed to match tag: "' + tag + '"');
    }
    if (decodedTag.primitive || len !== null) {
        return buffer.skip(len, 'Failed to match body of: "' + tag + '"');
    }
    const state = buffer.save();
    const res = this._skipUntilEnd(buffer, 'Failed to skip indefinite length body: "' + this.tag + '"');
    if (buffer.isError(res)) {
        return res;
    }
    len = buffer.offset - state.offset;
    buffer.restore(state);
    return buffer.skip(len, 'Failed to match body of: "' + tag + '"');
};
DERNode1.prototype._skipUntilEnd = function skipUntilEnd(buffer, fail) {
    for(;;){
        const tag = derDecodeTag(buffer, fail);
        if (buffer.isError(tag)) {
            return tag;
        }
        const len = derDecodeLen(buffer, tag.primitive, fail);
        if (buffer.isError(len)) {
            return len;
        }
        let res;
        if (tag.primitive || len !== null) {
            res = buffer.skip(len);
        } else {
            res = this._skipUntilEnd(buffer, fail);
        }
        if (buffer.isError(res)) {
            return res;
        }
        if (tag.tagStr === "end") {
            break;
        }
    }
};
DERNode1.prototype._decodeList = function decodeList(buffer, _tag, decoder, options) {
    const result = [];
    while(!buffer.isEmpty()){
        const possibleEnd = this._peekTag(buffer, "end");
        if (buffer.isError(possibleEnd)) {
            return possibleEnd;
        }
        const res = decoder.decode(buffer, "der", options);
        if (buffer.isError(res) && possibleEnd) {
            break;
        }
        result.push(res);
    }
    return result;
};
DERNode1.prototype._decodeStr = function decodeStr(buffer, tag) {
    if (tag === "bitstr") {
        const unused = buffer.readUInt8();
        if (buffer.isError(unused)) {
            return unused;
        }
        return {
            unused: unused,
            data: buffer.raw()
        };
    } else if (tag === "bmpstr") {
        const raw = buffer.raw();
        if (raw.length % 2 === 1) {
            return buffer.error("Decoding of string type: bmpstr length mismatch");
        }
        let str = "";
        for(let i = 0; i < raw.length / 2; i++){
            str += String.fromCharCode(raw.readUInt16BE(i * 2));
        }
        return str;
    } else if (tag === "numstr") {
        const numstr = buffer.raw().toString("ascii");
        if (!this._isNumstr(numstr)) {
            return buffer.error("Decoding of string type: " + "numstr unsupported characters");
        }
        return numstr;
    } else if (tag === "octstr") {
        return buffer.raw();
    } else if (tag === "objDesc") {
        return buffer.raw();
    } else if (tag === "printstr") {
        const printstr = buffer.raw().toString("ascii");
        if (!this._isPrintstr(printstr)) {
            return buffer.error("Decoding of string type: " + "printstr unsupported characters");
        }
        return printstr;
    } else if (/str$/.test(tag)) {
        return buffer.raw().toString();
    } else {
        return buffer.error("Decoding of string type: " + tag + " unsupported");
    }
};
DERNode1.prototype._decodeObjid = function decodeObjid(buffer, values, relative) {
    let result;
    const identifiers = [];
    let ident = 0;
    let subident = 0;
    while(!buffer.isEmpty()){
        subident = buffer.readUInt8();
        ident <<= 7;
        ident |= subident & 0x7f;
        if ((subident & 0x80) === 0) {
            identifiers.push(ident);
            ident = 0;
        }
    }
    if (subident & 0x80) {
        identifiers.push(ident);
    }
    const first = identifiers[0] / 40 | 0;
    const second = identifiers[0] % 40;
    if (relative) {
        result = identifiers;
    } else {
        result = [
            first,
            second
        ].concat(identifiers.slice(1));
    }
    if (values) {
        let tmp = values[result.join(" ")];
        if (tmp === undefined) {
            tmp = values[result.join(".")];
        }
        if (tmp !== undefined) {
            result = tmp;
        }
    }
    return result;
};
DERNode1.prototype._decodeTime = function decodeTime(buffer, tag) {
    const str = buffer.raw().toString();
    let year;
    let mon;
    let day;
    let hour;
    let min;
    let sec;
    if (tag === "gentime") {
        year = str.slice(0, 4) | 0;
        mon = str.slice(4, 6) | 0;
        day = str.slice(6, 8) | 0;
        hour = str.slice(8, 10) | 0;
        min = str.slice(10, 12) | 0;
        sec = str.slice(12, 14) | 0;
    } else if (tag === "utctime") {
        year = str.slice(0, 2) | 0;
        mon = str.slice(2, 4) | 0;
        day = str.slice(4, 6) | 0;
        hour = str.slice(6, 8) | 0;
        min = str.slice(8, 10) | 0;
        sec = str.slice(10, 12) | 0;
        if (year < 70) {
            year = 2000 + year;
        } else {
            year = 1900 + year;
        }
    } else {
        return buffer.error("Decoding " + tag + " time is not supported yet");
    }
    return Date.UTC(year, mon - 1, day, hour, min, sec, 0);
};
DERNode1.prototype._decodeNull = function decodeNull() {
    return null;
};
DERNode1.prototype._decodeBool = function decodeBool(buffer) {
    const res = buffer.readUInt8();
    if (buffer.isError(res)) {
        return res;
    } else {
        return res !== 0;
    }
};
DERNode1.prototype._decodeInt = function decodeInt(buffer, values) {
    const raw = buffer.raw();
    let res = new BN(raw);
    if (values) {
        res = values[res.toString(10)] || res;
    }
    return res;
};
DERNode1.prototype._use = function use(entity, obj) {
    if (typeof entity === "function") {
        entity = entity(obj);
    }
    return entity._getDecoder("der").tree;
};
function derDecodeTag(buf, fail) {
    let tag1 = buf.readUInt8(fail);
    if (buf.isError(tag1)) {
        return tag1;
    }
    const cls = tagClass[tag1 >> 6];
    const primitive = (tag1 & 0x20) === 0;
    if ((tag1 & 0x1f) === 0x1f) {
        let oct = tag1;
        tag1 = 0;
        while((oct & 0x80) === 0x80){
            oct = buf.readUInt8(fail);
            if (buf.isError(oct)) {
                return oct;
            }
            tag1 <<= 7;
            tag1 |= oct & 0x7f;
        }
    } else {
        tag1 &= 0x1f;
    }
    const tagStr = tag[tag1];
    return {
        cls: cls,
        primitive: primitive,
        tag: tag1,
        tagStr: tagStr
    };
}
function derDecodeLen(buf, primitive, fail) {
    let len = buf.readUInt8(fail);
    if (buf.isError(len)) {
        return len;
    }
    if (!primitive && len === 0x80) {
        return null;
    }
    if ((len & 0x80) === 0) {
        return len;
    }
    const num = len & 0x7f;
    if (num > 4) {
        return buf.error("length octect is too long");
    }
    len = 0;
    for(let i = 0; i < num; i++){
        len <<= 8;
        const j = buf.readUInt8(fail);
        if (buf.isError(j)) {
            return j;
        }
        len |= j;
    }
    return len;
}
function PEMDecoder(entity) {
    DERDecoder.call(this, entity);
    this.enc = "pem";
}
PEMDecoder.prototype = Object.create(DERDecoder.prototype, {
    constructor: {
        value: PEMDecoder,
        enumerable: false,
        writable: true,
        configurable: true
    }
});
PEMDecoder.prototype.decode = function decode(data, options) {
    const lines = data.toString().split(/[\r\n]+/g);
    const label = options.label.toUpperCase();
    const re = /^-----(BEGIN|END) ([^-]+)-----$/;
    let start = -1;
    let end = -1;
    for(let i = 0; i < lines.length; i++){
        const match = lines[i].match(re);
        if (match === null) {
            continue;
        }
        if (match[2] !== label) {
            continue;
        }
        if (start === -1) {
            if (match[1] !== "BEGIN") {
                break;
            }
            start = i;
        } else {
            if (match[1] !== "END") {
                break;
            }
            end = i;
            break;
        }
    }
    if (start === -1 || end === -1) {
        throw new Error("PEM section not found for: " + label);
    }
    const base64 = lines.slice(start + 1, end).join("");
    base64.replace(/[^a-z0-9+/=]+/gi, "");
    const input = Buffer.from(base64, "base64");
    return DERDecoder.prototype.decode.call(this, input, options);
};
const base = {
    DecoderBuffer,
    EncoderBuffer,
    Node,
    Reporter
};
const encoders = {
    der: DEREncoder,
    pem: PEMEncoder
};
const decoders = {
    der: DERDecoder,
    pem: PEMDecoder
};
const constants = {
    der: mod9
};
function define(name, body) {
    return new Entity(name, body);
}
function Entity(name, body) {
    this.name = name;
    this.body = body;
    this.decoders = {};
    this.encoders = {};
}
Entity.prototype._createNamed = function createNamed(Base) {
    const name = this.name;
    function Generated(entity) {
        this._initNamed(entity, name);
    }
    Generated.prototype = Object.create(Base.prototype, {
        constructor: {
            value: Generated,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });
    Generated.prototype._initNamed = function _initNamed(entity, name) {
        Base.call(this, entity, name);
    };
    return new Generated(this);
};
Entity.prototype._getDecoder = function _getDecoder(enc) {
    enc = enc || "der";
    if (!this.decoders.hasOwnProperty(enc)) {
        this.decoders[enc] = this._createNamed(decoders[enc]);
    }
    return this.decoders[enc];
};
Entity.prototype.decode = function decode(data, enc, options) {
    return this._getDecoder(enc).decode(data, options);
};
Entity.prototype._getEncoder = function _getEncoder(enc) {
    enc = enc || "der";
    if (!this.encoders.hasOwnProperty(enc)) {
        this.encoders[enc] = this._createNamed(encoders[enc]);
    }
    return this.encoders[enc];
};
Entity.prototype.encode = function encode(data, enc, reporter) {
    return this._getEncoder(enc).encode(data, reporter);
};
const __default3 = {
    base,
    bignum: BN,
    constants,
    decoders,
    define,
    encoders
};
const Time = define("Time", function() {
    this.choice({
        utcTime: this.utctime(),
        generalTime: this.gentime()
    });
});
const AttributeTypeValue = define("AttributeTypeValue", function() {
    this.seq().obj(this.key("type").objid(), this.key("value").any());
});
const AlgorithmIdentifier = define("AlgorithmIdentifier", function() {
    this.seq().obj(this.key("algorithm").objid(), this.key("parameters").optional(), this.key("curve").objid().optional());
});
const SubjectPublicKeyInfo = define("SubjectPublicKeyInfo", function() {
    this.seq().obj(this.key("algorithm").use(AlgorithmIdentifier), this.key("subjectPublicKey").bitstr());
});
const RelativeDistinguishedName = define("RelativeDistinguishedName", function() {
    this.setof(AttributeTypeValue);
});
const RDNSequence = define("RDNSequence", function() {
    this.seqof(RelativeDistinguishedName);
});
const Name = define("Name", function() {
    this.choice({
        rdnSequence: this.use(RDNSequence)
    });
});
const Validity = define("Validity", function() {
    this.seq().obj(this.key("notBefore").use(Time), this.key("notAfter").use(Time));
});
const Extension = define("Extension", function() {
    this.seq().obj(this.key("extnID").objid(), this.key("critical").bool().def(false), this.key("extnValue").octstr());
});
const TBSCertificate = define("TBSCertificate", function() {
    this.seq().obj(this.key("version").explicit(0).int().optional(), this.key("serialNumber").int(), this.key("signature").use(AlgorithmIdentifier), this.key("issuer").use(Name), this.key("validity").use(Validity), this.key("subject").use(Name), this.key("subjectPublicKeyInfo").use(SubjectPublicKeyInfo), this.key("issuerUniqueID").implicit(1).bitstr().optional(), this.key("subjectUniqueID").implicit(2).bitstr().optional(), this.key("extensions").explicit(3).seqof(Extension).optional());
});
const X509Certificate = define("X509Certificate", function() {
    this.seq().obj(this.key("tbsCertificate").use(TBSCertificate), this.key("signatureAlgorithm").use(AlgorithmIdentifier), this.key("signatureValue").bitstr());
});
const RSAPrivateKey = __default3.define("RSAPrivateKey", function() {
    this.seq().obj(this.key("version").int(), this.key("modulus").int(), this.key("publicExponent").int(), this.key("privateExponent").int(), this.key("prime1").int(), this.key("prime2").int(), this.key("exponent1").int(), this.key("exponent2").int(), this.key("coefficient").int());
});
const RSAPublicKey = __default3.define("RSAPublicKey", function() {
    this.seq().obj(this.key("modulus").int(), this.key("publicExponent").int());
});
const PublicKey = __default3.define("SubjectPublicKeyInfo", function() {
    this.seq().obj(this.key("algorithm").use(AlgorithmIdentifier1), this.key("subjectPublicKey").bitstr());
});
const AlgorithmIdentifier1 = __default3.define("AlgorithmIdentifier", function() {
    this.seq().obj(this.key("algorithm").objid(), this.key("none").null_().optional(), this.key("curve").objid().optional(), this.key("params").seq().obj(this.key("p").int(), this.key("q").int(), this.key("g").int()).optional());
});
const PrivateKey = __default3.define("PrivateKeyInfo", function() {
    this.seq().obj(this.key("version").int(), this.key("algorithm").use(AlgorithmIdentifier1), this.key("subjectPrivateKey").octstr());
});
const EncryptedPrivateKey = __default3.define("EncryptedPrivateKeyInfo", function() {
    this.seq().obj(this.key("algorithm").seq().obj(this.key("id").objid(), this.key("decrypt").seq().obj(this.key("kde").seq().obj(this.key("id").objid(), this.key("kdeparams").seq().obj(this.key("salt").octstr(), this.key("iters").int())), this.key("cipher").seq().obj(this.key("algo").objid(), this.key("iv").octstr()))), this.key("subjectPrivateKey").octstr());
});
const DSAPrivateKey = __default3.define("DSAPrivateKey", function() {
    this.seq().obj(this.key("version").int(), this.key("p").int(), this.key("q").int(), this.key("g").int(), this.key("pub_key").int(), this.key("priv_key").int());
});
const DSAparam = __default3.define("DSAparam", function() {
    this.int();
});
const ECPrivateKey = __default3.define("ECPrivateKey", function() {
    this.seq().obj(this.key("version").int(), this.key("privateKey").octstr(), this.key("parameters").optional().explicit(0).use(ECParameters), this.key("publicKey").optional().explicit(1).bitstr());
});
const ECParameters = __default3.define("ECParameters", function() {
    this.choice({
        namedCurve: this.objid()
    });
});
const signature = __default3.define("signature", function() {
    this.seq().obj(this.key("r").int(), this.key("s").int());
});
const findProc = /Proc-Type: 4,ENCRYPTED[\n\r]+DEK-Info: AES-((?:128)|(?:192)|(?:256))-CBC,([0-9A-H]+)[\n\r]+([0-9A-z\n\r+/=]+)[\n\r]+/m;
const startRegex = /^-----BEGIN ((?:.*? KEY)|CERTIFICATE)-----/m;
const fullRegex = /^-----BEGIN ((?:.*? KEY)|CERTIFICATE)-----([0-9A-z\n\r+/=]+)-----END \1-----$/m;
function __default4(okey, password) {
    const key = okey.toString();
    const match = key.match(findProc);
    let decrypted;
    if (!match) {
        const match2 = key.match(fullRegex);
        decrypted = Buffer.from(match2[2].replace(/[\r\n]/g, ""), "base64");
    } else {
        const suite = "aes" + match[1];
        const iv = Buffer.from(match[2], "hex");
        const cipherText = Buffer.from(match[3].replace(/[\r\n]/g, ""), "base64");
        const cipherKey = EVP_BytesToKey(password, iv.slice(0, 8), parseInt(match[1], 10)).key;
        const out = [];
        const cipher = createDecipheriv(suite, cipherKey, iv);
        out.push(cipher.update(cipherText));
        out.push(cipher.final());
        decrypted = Buffer.concat(out);
    }
    const tag = key.match(startRegex)[1];
    return {
        tag: tag,
        data: decrypted
    };
}
const aesid = {
    "2.16.840.1.101.3.4.1.1": "aes-128-ecb",
    "2.16.840.1.101.3.4.1.2": "aes-128-cbc",
    "2.16.840.1.101.3.4.1.3": "aes-128-ofb",
    "2.16.840.1.101.3.4.1.4": "aes-128-cfb",
    "2.16.840.1.101.3.4.1.21": "aes-192-ecb",
    "2.16.840.1.101.3.4.1.22": "aes-192-cbc",
    "2.16.840.1.101.3.4.1.23": "aes-192-ofb",
    "2.16.840.1.101.3.4.1.24": "aes-192-cfb",
    "2.16.840.1.101.3.4.1.41": "aes-256-ecb",
    "2.16.840.1.101.3.4.1.42": "aes-256-cbc",
    "2.16.840.1.101.3.4.1.43": "aes-256-ofb",
    "2.16.840.1.101.3.4.1.44": "aes-256-cfb"
};
function parseKeys(buffer) {
    let password;
    if (typeof buffer === "object" && !Buffer.isBuffer(buffer)) {
        password = buffer.passphrase;
        buffer = buffer.key;
    }
    if (typeof buffer === "string") {
        buffer = Buffer.from(buffer);
    }
    const stripped = __default4(buffer, password);
    const type = stripped.tag;
    let data = stripped.data;
    let subtype, ndata;
    switch(type){
        case "CERTIFICATE":
            ndata = X509Certificate.decode(data, "der").tbsCertificate.subjectPublicKeyInfo;
        case "PUBLIC KEY":
            if (!ndata) {
                ndata = PublicKey.decode(data, "der");
            }
            subtype = ndata.algorithm.algorithm.join(".");
            switch(subtype){
                case "1.2.840.113549.1.1.1":
                    return RSAPublicKey.decode(ndata.subjectPublicKey.data, "der");
                case "1.2.840.10045.2.1":
                    ndata.subjectPrivateKey = ndata.subjectPublicKey;
                    return {
                        type: "ec",
                        data: ndata
                    };
                case "1.2.840.10040.4.1":
                    ndata.algorithm.params.pub_key = DSAparam.decode(ndata.subjectPublicKey.data, "der");
                    return {
                        type: "dsa",
                        data: ndata.algorithm.params
                    };
                default:
                    throw new Error("unknown key id " + subtype);
            }
        case "ENCRYPTED PRIVATE KEY":
            data = EncryptedPrivateKey.decode(data, "der");
            data = decrypt2(data, password);
        case "PRIVATE KEY":
            ndata = PrivateKey.decode(data, "der");
            subtype = ndata.algorithm.algorithm.join(".");
            switch(subtype){
                case "1.2.840.113549.1.1.1":
                    return RSAPrivateKey.decode(ndata.subjectPrivateKey, "der");
                case "1.2.840.10045.2.1":
                    return {
                        curve: ndata.algorithm.curve,
                        privateKey: ECPrivateKey.decode(ndata.subjectPrivateKey, "der").privateKey
                    };
                case "1.2.840.10040.4.1":
                    ndata.algorithm.params.priv_key = DSAparam.decode(ndata.subjectPrivateKey, "der");
                    return {
                        type: "dsa",
                        params: ndata.algorithm.params
                    };
                default:
                    throw new Error("unknown key id " + subtype);
            }
        case "RSA PUBLIC KEY":
            return RSAPublicKey.decode(data, "der");
        case "RSA PRIVATE KEY":
            return RSAPrivateKey.decode(data, "der");
        case "DSA PRIVATE KEY":
            return {
                type: "dsa",
                params: DSAPrivateKey.decode(data, "der")
            };
        case "EC PRIVATE KEY":
            data = ECPrivateKey.decode(data, "der");
            return {
                curve: data.parameters.value,
                privateKey: data.privateKey
            };
        default:
            throw new Error("unknown key type " + type);
    }
}
parseKeys.signature = signature;
function decrypt2(data, password) {
    const salt = data.algorithm.decrypt.kde.kdeparams.salt;
    const iters = parseInt(data.algorithm.decrypt.kde.kdeparams.iters.toString(), 10);
    const algo = aesid[data.algorithm.decrypt.cipher.algo.join(".")];
    const iv = data.algorithm.decrypt.cipher.iv;
    const cipherText = data.subjectPrivateKey;
    const keylen = parseInt(algo.split("-")[1], 10) / 8;
    const key = pbkdf2Sync(password, salt, iters, keylen, "sha1");
    const cipher = createDecipheriv(algo, key, iv);
    const out = [];
    out.push(cipher.update(cipherText));
    out.push(cipher.final());
    return Buffer.concat(out);
}
const MAX_BYTES = 65536;
function randomBytes1(size, cb) {
    if (size > 4294967295) {
        throw new RangeError("requested too many random bytes");
    }
    const bytes = Buffer.allocUnsafe(size);
    if (size > 0) {
        if (size > 65536) {
            for(let generated = 0; generated < size; generated += MAX_BYTES){
                globalThis.crypto.getRandomValues(bytes.slice(generated, generated + 65536));
            }
        } else {
            globalThis.crypto.getRandomValues(bytes);
        }
    }
    if (typeof cb === "function") {
        return nextTick(function() {
            cb(null, bytes);
        });
    }
    return bytes;
}
function __default5(seed, len) {
    let t = Buffer.alloc(0);
    let i = 0;
    let c;
    while(t.length < len){
        c = i2ops(i++);
        t = Buffer.concat([
            t,
            createHash("sha1").update(seed).update(c).digest()
        ]);
    }
    return t.slice(0, len);
}
function i2ops(c) {
    const out = Buffer.allocUnsafe(4);
    out.writeUInt32BE(c, 0);
    return out;
}
function xor1(a, b) {
    const len = a.length;
    let i = -1;
    while(++i < len){
        a[i] ^= b[i];
    }
    return a;
}
function withPublic(paddedMsg, key) {
    return Buffer.from(paddedMsg.toRed(BN.mont(key.modulus)).redPow(new BN(key.publicExponent)).fromRed().toArray());
}
function blind(priv) {
    const r = getr(priv);
    const blinder = r.toRed(BN.mont(priv.modulus)).redPow(new BN(priv.publicExponent)).fromRed();
    return {
        blinder: blinder,
        unblinder: r.invm(priv.modulus)
    };
}
function getr(priv) {
    const len = priv.modulus.byteLength();
    let r;
    do {
        r = new BN(randomBytes1(len));
    }while (r.cmp(priv.modulus) >= 0 || !r.umod(priv.prime1) || !r.umod(priv.prime2))
    return r;
}
function crt(msg, priv) {
    const blinds = blind(priv);
    const len = priv.modulus.byteLength();
    const blinded = new BN(msg).mul(blinds.blinder).umod(priv.modulus);
    const c1 = blinded.toRed(BN.mont(priv.prime1));
    const c2 = blinded.toRed(BN.mont(priv.prime2));
    const qinv = priv.coefficient;
    const p = priv.prime1;
    const q = priv.prime2;
    const m1 = c1.redPow(priv.exponent1).fromRed();
    const m2 = c2.redPow(priv.exponent2).fromRed();
    const h = m1.isub(m2).imul(qinv).umod(p).imul(q);
    return m2.iadd(h).imul(blinds.unblinder).umod(priv.modulus).toArrayLike(Buffer, "be", len);
}
crt.getr = getr;
function publicEncrypt(publicKey, msg, reverse) {
    let padding;
    if (publicKey.padding) {
        padding = publicKey.padding;
    } else if (reverse) {
        padding = 1;
    } else {
        padding = 4;
    }
    const key = parseKeys(publicKey);
    let paddedMsg;
    if (padding === 4) {
        paddedMsg = oaep(key, msg);
    } else if (padding === 1) {
        paddedMsg = pkcs1(key, msg, reverse);
    } else if (padding === 3) {
        paddedMsg = new BN(msg);
        if (paddedMsg.cmp(key.modulus) >= 0) {
            throw new Error("data too long for modulus");
        }
    } else {
        throw new Error("unknown padding");
    }
    if (reverse) {
        return crt(paddedMsg, key);
    } else {
        return withPublic(paddedMsg, key);
    }
}
function oaep(key, msg) {
    const k = key.modulus.byteLength();
    const mLen = msg.length;
    const iHash = createHash("sha1").update(Buffer.alloc(0)).digest();
    const hLen = iHash.length;
    const hLen2 = 2 * hLen;
    if (mLen > k - hLen2 - 2) {
        throw new Error("message too long");
    }
    const ps = Buffer.alloc(k - mLen - hLen2 - 2);
    const dblen = k - hLen - 1;
    const seed = randomBytes1(hLen);
    const maskedDb = xor1(Buffer.concat([
        iHash,
        ps,
        Buffer.alloc(1, 1),
        msg
    ], dblen), __default5(seed, dblen));
    const maskedSeed = xor1(seed, __default5(maskedDb, hLen));
    return new BN(Buffer.concat([
        Buffer.alloc(1),
        maskedSeed,
        maskedDb
    ], k));
}
function pkcs1(key, msg, reverse) {
    const mLen = msg.length;
    const k = key.modulus.byteLength();
    if (mLen > k - 11) {
        throw new Error("message too long");
    }
    let ps;
    if (reverse) {
        ps = Buffer.alloc(k - mLen - 3, 0xff);
    } else {
        ps = nonZero(k - mLen - 3);
    }
    return new BN(Buffer.concat([
        Buffer.from([
            0,
            reverse ? 1 : 2
        ]),
        ps,
        Buffer.alloc(1),
        msg
    ], k));
}
function nonZero(len) {
    const out = Buffer.allocUnsafe(len);
    let i = 0;
    let cache = randomBytes1(len * 2);
    let cur = 0;
    let num;
    while(i < len){
        if (cur === cache.length) {
            cache = randomBytes1(len * 2);
            cur = 0;
        }
        num = cache[cur++];
        if (num) {
            out[i++] = num;
        }
    }
    return out;
}
function privateDecrypt(privateKey, enc, reverse) {
    let padding;
    if (privateKey.padding) {
        padding = privateKey.padding;
    } else if (reverse) {
        padding = 1;
    } else {
        padding = 4;
    }
    const key = parseKeys(privateKey);
    const k = key.modulus.byteLength();
    if (enc.length > k || new BN(enc).cmp(key.modulus) >= 0) {
        throw new Error("decryption error");
    }
    let msg;
    if (reverse) {
        msg = withPublic(new BN(enc), key);
    } else {
        msg = crt(enc, key);
    }
    const zBuffer = Buffer.alloc(k - msg.length);
    msg = Buffer.concat([
        zBuffer,
        msg
    ], k);
    if (padding === 4) {
        return oaep1(key, msg);
    } else if (padding === 1) {
        return pkcs11(key, msg, reverse);
    } else if (padding === 3) {
        return msg;
    } else {
        throw new Error("unknown padding");
    }
}
function oaep1(key, msg) {
    const k = key.modulus.byteLength();
    const iHash = createHash("sha1").update(Buffer.alloc(0)).digest();
    const hLen = iHash.length;
    if (msg[0] !== 0) {
        throw new Error("decryption error");
    }
    const maskedSeed = msg.slice(1, hLen + 1);
    const maskedDb = msg.slice(hLen + 1);
    const seed = xor1(maskedSeed, __default5(maskedDb, hLen));
    const db = xor1(maskedDb, __default5(seed, k - hLen - 1));
    if (compare(iHash, db.slice(0, hLen))) {
        throw new Error("decryption error");
    }
    let i = hLen;
    while(db[i] === 0){
        i++;
    }
    if (db[i++] !== 1) {
        throw new Error("decryption error");
    }
    return db.slice(i);
}
function pkcs11(_key, msg, reverse) {
    const p1 = msg.slice(0, 2);
    let i = 2;
    let status = 0;
    while(msg[i++] !== 0){
        if (i >= msg.length) {
            status++;
            break;
        }
    }
    const ps = msg.slice(2, i - 1);
    if (p1.toString("hex") !== "0002" && !reverse || p1.toString("hex") !== "0001" && reverse) {
        status++;
    }
    if (ps.length < 8) {
        status++;
    }
    if (status) {
        throw new Error("decryption error");
    }
    return msg.slice(i);
}
function compare(a, b) {
    a = Buffer.from(a);
    b = Buffer.from(b);
    let dif = 0;
    let len = a.length;
    if (a.length !== b.length) {
        dif++;
        len = Math.min(a.length, b.length);
    }
    let i = -1;
    while(++i < len){
        dif += a[i] ^ b[i];
    }
    return dif;
}
function privateEncrypt(key, buf) {
    return publicEncrypt(key, buf, true);
}
function publicDecrypt(key, buf) {
    return privateDecrypt(key, buf, true);
}
class Cipheriv extends Transform {
    constructor(_cipher, _key, _iv, _options){
        super();
        notImplemented("crypto.Cipheriv");
    }
    final(_outputEncoding) {
        notImplemented("crypto.Cipheriv.prototype.final");
    }
    getAuthTag() {
        notImplemented("crypto.Cipheriv.prototype.getAuthTag");
    }
    setAAD(_buffer, _options) {
        notImplemented("crypto.Cipheriv.prototype.setAAD");
    }
    setAutoPadding(_autoPadding) {
        notImplemented("crypto.Cipheriv.prototype.setAutoPadding");
    }
    update(_data, _inputEncoding, _outputEncoding) {
        notImplemented("crypto.Cipheriv.prototype.update");
    }
}
class Decipheriv extends Transform {
    constructor(_cipher, _key, _iv, _options){
        super();
        notImplemented("crypto.Decipheriv");
    }
    final(_outputEncoding) {
        notImplemented("crypto.Decipheriv.prototype.final");
    }
    setAAD(_buffer, _options) {
        notImplemented("crypto.Decipheriv.prototype.setAAD");
    }
    setAuthTag(_buffer, _encoding) {
        notImplemented("crypto.Decipheriv.prototype.setAuthTag");
    }
    setAutoPadding(_autoPadding) {
        notImplemented("crypto.Decipheriv.prototype.setAutoPadding");
    }
    update(_data, _inputEncoding, _outputEncoding) {
        notImplemented("crypto.Decipheriv.prototype.update");
    }
}
function getCipherInfo(nameOrNid, options) {
    if (typeof nameOrNid !== "string" && typeof nameOrNid !== "number") {
        throw new ERR_INVALID_ARG_TYPE("nameOrNid", [
            "string",
            "number"
        ], nameOrNid);
    }
    if (typeof nameOrNid === "number") {
        validateInt32(nameOrNid, "nameOrNid");
    }
    let keyLength, ivLength;
    if (options !== undefined) {
        validateObject(options, "options");
        ({ keyLength , ivLength  } = options);
        if (keyLength !== undefined) {
            validateInt32(keyLength, "options.keyLength");
        }
        if (ivLength !== undefined) {
            validateInt32(ivLength, "options.ivLength");
        }
    }
    notImplemented("crypto.getCipherInfo");
}
class Sign extends Writable {
    constructor(algorithm, _options){
        validateString(algorithm, "algorithm");
        super();
        notImplemented("crypto.Sign");
    }
    sign(_privateKey, _outputEncoding) {
        notImplemented("crypto.Sign.prototype.sign");
    }
    update(_data, _inputEncoding) {
        notImplemented("crypto.Sign.prototype.update");
    }
}
class Verify extends Writable {
    constructor(algorithm, _options){
        validateString(algorithm, "algorithm");
        super();
        notImplemented("crypto.Verify");
    }
    update(_data, _inputEncoding) {
        notImplemented("crypto.Sign.prototype.update");
    }
    verify(_object, _signature, _signatureEncoding) {
        notImplemented("crypto.Sign.prototype.sign");
    }
}
function signOneShot(_algorithm, _data, _key, _callback) {
    notImplemented("crypto.sign");
}
function verifyOneShot(_algorithm, _data, _key, _signature, _callback) {
    notImplemented("crypto.verify");
}
class X509Certificate1 {
    constructor(buffer){
        if (typeof buffer === "string") {
            buffer = Buffer.from(buffer);
        }
        if (!isArrayBufferView(buffer)) {
            throw new ERR_INVALID_ARG_TYPE("buffer", [
                "string",
                "Buffer",
                "TypedArray",
                "DataView"
            ], buffer);
        }
        notImplemented("crypto.X509Certificate");
    }
    get ca() {
        notImplemented("crypto.X509Certificate.prototype.ca");
        return false;
    }
    checkEmail(_email, _options) {
        notImplemented("crypto.X509Certificate.prototype.checkEmail");
    }
    checkHost(_name, _options) {
        notImplemented("crypto.X509Certificate.prototype.checkHost");
    }
    checkIP(_ip) {
        notImplemented("crypto.X509Certificate.prototype.checkIP");
    }
    checkIssued(_otherCert) {
        notImplemented("crypto.X509Certificate.prototype.checkIssued");
    }
    checkPrivateKey(_privateKey) {
        notImplemented("crypto.X509Certificate.prototype.checkPrivateKey");
    }
    get fingerprint() {
        notImplemented("crypto.X509Certificate.prototype.fingerprint");
        return "";
    }
    get fingerprint256() {
        notImplemented("crypto.X509Certificate.prototype.fingerprint256");
        return "";
    }
    get fingerprint512() {
        notImplemented("crypto.X509Certificate.prototype.fingerprint512");
        return "";
    }
    get infoAccess() {
        notImplemented("crypto.X509Certificate.prototype.infoAccess");
        return "";
    }
    get issuer() {
        notImplemented("crypto.X509Certificate.prototype.issuer");
        return "";
    }
    get issuerCertificate() {
        notImplemented("crypto.X509Certificate.prototype.issuerCertificate");
        return {};
    }
    get keyUsage() {
        notImplemented("crypto.X509Certificate.prototype.keyUsage");
        return [];
    }
    get publicKey() {
        notImplemented("crypto.X509Certificate.prototype.publicKey");
        return {};
    }
    get raw() {
        notImplemented("crypto.X509Certificate.prototype.raw");
        return {};
    }
    get serialNumber() {
        notImplemented("crypto.X509Certificate.prototype.serialNumber");
        return "";
    }
    get subject() {
        notImplemented("crypto.X509Certificate.prototype.subject");
        return "";
    }
    get subjectAltName() {
        notImplemented("crypto.X509Certificate.prototype.subjectAltName");
        return "";
    }
    toJSON() {
        return this.toString();
    }
    toLegacyObject() {
        notImplemented("crypto.X509Certificate.prototype.toLegacyObject");
    }
    toString() {
        notImplemented("crypto.X509Certificate.prototype.toString");
    }
    get validFrom() {
        notImplemented("crypto.X509Certificate.prototype.validFrom");
        return "";
    }
    get validTo() {
        notImplemented("crypto.X509Certificate.prototype.validTo");
        return "";
    }
    verify(_publicKey) {
        notImplemented("crypto.X509Certificate.prototype.verify");
    }
}
class Certificate {
    static Certificate = Certificate;
    static exportChallenge(_spkac, _encoding) {
        notImplemented("crypto.Certificate.exportChallenge");
    }
    static exportPublicKey(_spkac, _encoding) {
        notImplemented("crypto.Certificate.exportPublicKey");
    }
    static verifySpkac(_spkac, _encoding) {
        notImplemented("crypto.Certificate.verifySpkac");
    }
}
const webcrypto = globalThis.crypto;
const fipsForced = getOptionValue("--force-fips");
function createCipheriv(cipher, key, iv, options) {
    return new Cipheriv(cipher, key, iv, options);
}
function createDecipheriv1(algorithm, key, iv, options) {
    return new Decipheriv(algorithm, key, iv, options);
}
function createDiffieHellman(sizeOrKey, keyEncoding, generator, generatorEncoding) {
    return new DiffieHellman(sizeOrKey, keyEncoding, generator, generatorEncoding);
}
function createDiffieHellmanGroup(name) {
    return new DiffieHellmanGroup(name);
}
function createECDH(curve) {
    return new ECDH(curve);
}
function createHmac(hmac, key, options) {
    return new Hmac(hmac, key, options);
}
function createSign1(algorithm, options) {
    return new Sign(algorithm, options);
}
function createVerify(algorithm, options) {
    return new Verify(algorithm, options);
}
function setFipsForced(val) {
    if (val) {
        return;
    }
    throw new ERR_CRYPTO_FIPS_FORCED();
}
function getFipsForced() {
    return 1;
}
Object.defineProperty(crypto1, "defaultCipherList", {
    value: getOptionValue("--tls-cipher-list")
});
const getDiffieHellman = createDiffieHellmanGroup;
const getFips = fipsForced ? getFipsForced : getFipsCrypto;
const setFips = fipsForced ? setFipsForced : setFipsCrypto;
const __default6 = {
    Certificate,
    checkPrime,
    checkPrimeSync,
    Cipheriv,
    constants: crypto1,
    createCipheriv,
    createDecipheriv: createDecipheriv1,
    createDiffieHellman,
    createDiffieHellmanGroup,
    createECDH,
    createHash,
    createHmac,
    createPrivateKey,
    createPublicKey,
    createSecretKey,
    createSign: createSign1,
    createVerify,
    Decipheriv,
    DiffieHellman,
    diffieHellman,
    DiffieHellmanGroup,
    ECDH,
    generateKey,
    generateKeyPair,
    generateKeyPairSync,
    generateKeySync,
    generatePrime,
    generatePrimeSync,
    getCipherInfo,
    getCiphers,
    getCurves,
    getDiffieHellman,
    getFips,
    getHashes,
    Hash,
    hkdf,
    hkdfSync,
    Hmac,
    KeyObject,
    pbkdf2,
    pbkdf2Sync,
    privateDecrypt,
    privateEncrypt,
    publicDecrypt,
    publicEncrypt,
    randomBytes,
    randomFill,
    randomFillSync,
    randomInt,
    randomUUID,
    scrypt,
    scryptSync,
    secureHeapUsed,
    setEngine,
    setFips,
    Sign,
    sign: signOneShot,
    timingSafeEqual: timingSafeEqual1,
    Verify,
    verify: verifyOneShot,
    webcrypto,
    X509Certificate: X509Certificate1
};
const mod10 = {
    Certificate: Certificate,
    checkPrime: checkPrime,
    checkPrimeSync: checkPrimeSync,
    Cipheriv: Cipheriv,
    constants: crypto1,
    createCipheriv: createCipheriv,
    createDecipheriv: createDecipheriv1,
    createDiffieHellman: createDiffieHellman,
    createDiffieHellmanGroup: createDiffieHellmanGroup,
    createECDH: createECDH,
    createHash: createHash,
    createHmac: createHmac,
    createPrivateKey: createPrivateKey,
    createPublicKey: createPublicKey,
    createSecretKey: createSecretKey,
    createSign: createSign1,
    createVerify: createVerify,
    Decipheriv: Decipheriv,
    DiffieHellman: DiffieHellman,
    diffieHellman: diffieHellman,
    DiffieHellmanGroup: DiffieHellmanGroup,
    ECDH: ECDH,
    generateKey: generateKey,
    generateKeyPair: generateKeyPair,
    generateKeyPairSync: generateKeyPairSync,
    generateKeySync: generateKeySync,
    generatePrime: generatePrime,
    generatePrimeSync: generatePrimeSync,
    getCipherInfo: getCipherInfo,
    getCiphers: getCiphers,
    getCurves: getCurves,
    getDiffieHellman: getDiffieHellman,
    getFips: getFips,
    getHashes: getHashes,
    Hash: Hash,
    hkdf: hkdf,
    hkdfSync: hkdfSync,
    Hmac: Hmac,
    KeyObject: KeyObject,
    pbkdf2: pbkdf2,
    pbkdf2Sync: pbkdf2Sync,
    privateDecrypt: privateDecrypt,
    privateEncrypt: privateEncrypt,
    publicDecrypt: publicDecrypt,
    publicEncrypt: publicEncrypt,
    randomBytes: randomBytes,
    randomFill: randomFill,
    randomFillSync: randomFillSync,
    randomInt: randomInt,
    randomUUID: randomUUID,
    scrypt: scrypt,
    scryptSync: scryptSync,
    secureHeapUsed: secureHeapUsed,
    setEngine: setEngine,
    setFips: setFips,
    Sign: Sign,
    sign: signOneShot,
    timingSafeEqual: timingSafeEqual1,
    Verify: Verify,
    verify: verifyOneShot,
    webcrypto: webcrypto,
    X509Certificate: X509Certificate1,
    default: __default6
};
const _0n = BigInt(0);
const _1n = BigInt(1);
const _2n = BigInt(2);
const _3n = BigInt(3);
const _8n = BigInt(8);
const CURVE = Object.freeze({
    a: _0n,
    b: BigInt(7),
    P: BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f'),
    n: BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'),
    h: _1n,
    Gx: BigInt('55066263022277343669578718895168534326250603453777594175500187360389116729240'),
    Gy: BigInt('32670510020758816978083085130507043184471273380659243275938904335757337482424'),
    beta: BigInt('0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee')
});
function weistrass(x) {
    const { a , b  } = CURVE;
    const x2 = mod11(x * x);
    const x3 = mod11(x2 * x);
    return mod11(x3 + a * x + b);
}
const USE_ENDOMORPHISM = CURVE.a === _0n;
class ShaError extends Error {
    constructor(message){
        super(message);
    }
}
class JacobianPoint {
    constructor(x, y, z){
        this.x = x;
        this.y = y;
        this.z = z;
    }
    static BASE = new JacobianPoint(CURVE.Gx, CURVE.Gy, _1n);
    static ZERO = new JacobianPoint(_0n, _1n, _0n);
    static fromAffine(p) {
        if (!(p instanceof Point)) {
            throw new TypeError('JacobianPoint#fromAffine: expected Point');
        }
        return new JacobianPoint(p.x, p.y, _1n);
    }
    static toAffineBatch(points) {
        const toInv = invertBatch(points.map((p)=>p.z));
        return points.map((p, i)=>p.toAffine(toInv[i]));
    }
    static normalizeZ(points) {
        return JacobianPoint.toAffineBatch(points).map(JacobianPoint.fromAffine);
    }
    equals(other) {
        if (!(other instanceof JacobianPoint)) throw new TypeError('JacobianPoint expected');
        const { x: X1 , y: Y1 , z: Z1  } = this;
        const { x: X2 , y: Y2 , z: Z2  } = other;
        const Z1Z1 = mod11(Z1 * Z1);
        const Z2Z2 = mod11(Z2 * Z2);
        const U1 = mod11(X1 * Z2Z2);
        const U2 = mod11(X2 * Z1Z1);
        const S1 = mod11(mod11(Y1 * Z2) * Z2Z2);
        const S2 = mod11(mod11(Y2 * Z1) * Z1Z1);
        return U1 === U2 && S1 === S2;
    }
    negate() {
        return new JacobianPoint(this.x, mod11(-this.y), this.z);
    }
    double() {
        const { x: X1 , y: Y1 , z: Z1  } = this;
        const A = mod11(X1 * X1);
        const B = mod11(Y1 * Y1);
        const C = mod11(B * B);
        const x1b = X1 + B;
        const D = mod11(_2n * (mod11(x1b * x1b) - A - C));
        const E = mod11(_3n * A);
        const F = mod11(E * E);
        const X3 = mod11(F - _2n * D);
        const Y3 = mod11(E * (D - X3) - _8n * C);
        const Z3 = mod11(_2n * Y1 * Z1);
        return new JacobianPoint(X3, Y3, Z3);
    }
    add(other) {
        if (!(other instanceof JacobianPoint)) throw new TypeError('JacobianPoint expected');
        const { x: X1 , y: Y1 , z: Z1  } = this;
        const { x: X2 , y: Y2 , z: Z2  } = other;
        if (X2 === _0n || Y2 === _0n) return this;
        if (X1 === _0n || Y1 === _0n) return other;
        const Z1Z1 = mod11(Z1 * Z1);
        const Z2Z2 = mod11(Z2 * Z2);
        const U1 = mod11(X1 * Z2Z2);
        const U2 = mod11(X2 * Z1Z1);
        const S1 = mod11(mod11(Y1 * Z2) * Z2Z2);
        const S2 = mod11(mod11(Y2 * Z1) * Z1Z1);
        const H = mod11(U2 - U1);
        const r = mod11(S2 - S1);
        if (H === _0n) {
            if (r === _0n) {
                return this.double();
            } else {
                return JacobianPoint.ZERO;
            }
        }
        const HH = mod11(H * H);
        const HHH = mod11(H * HH);
        const V = mod11(U1 * HH);
        const X3 = mod11(r * r - HHH - _2n * V);
        const Y3 = mod11(r * (V - X3) - S1 * HHH);
        const Z3 = mod11(Z1 * Z2 * H);
        return new JacobianPoint(X3, Y3, Z3);
    }
    subtract(other) {
        return this.add(other.negate());
    }
    multiplyUnsafe(scalar) {
        const P0 = JacobianPoint.ZERO;
        if (typeof scalar === 'bigint' && scalar === _0n) return P0;
        let n = normalizeScalar(scalar);
        if (n === _1n) return this;
        if (!USE_ENDOMORPHISM) {
            let p = P0;
            let d = this;
            while(n > _0n){
                if (n & _1n) p = p.add(d);
                d = d.double();
                n >>= _1n;
            }
            return p;
        }
        let { k1neg , k1 , k2neg , k2  } = splitScalarEndo(n);
        let k1p = P0;
        let k2p = P0;
        let d1 = this;
        while(k1 > _0n || k2 > _0n){
            if (k1 & _1n) k1p = k1p.add(d1);
            if (k2 & _1n) k2p = k2p.add(d1);
            d1 = d1.double();
            k1 >>= _1n;
            k2 >>= _1n;
        }
        if (k1neg) k1p = k1p.negate();
        if (k2neg) k2p = k2p.negate();
        k2p = new JacobianPoint(mod11(k2p.x * CURVE.beta), k2p.y, k2p.z);
        return k1p.add(k2p);
    }
    precomputeWindow(W) {
        const windows = USE_ENDOMORPHISM ? 128 / W + 1 : 256 / W + 1;
        const points = [];
        let p = this;
        let base = p;
        for(let window = 0; window < windows; window++){
            base = p;
            points.push(base);
            for(let i = 1; i < 2 ** (W - 1); i++){
                base = base.add(p);
                points.push(base);
            }
            p = base.double();
        }
        return points;
    }
    wNAF(n, affinePoint) {
        if (!affinePoint && this.equals(JacobianPoint.BASE)) affinePoint = Point.BASE;
        const W = affinePoint && affinePoint._WINDOW_SIZE || 1;
        if (256 % W) {
            throw new Error('Point#wNAF: Invalid precomputation window, must be power of 2');
        }
        let precomputes = affinePoint && pointPrecomputes.get(affinePoint);
        if (!precomputes) {
            precomputes = this.precomputeWindow(W);
            if (affinePoint && W !== 1) {
                precomputes = JacobianPoint.normalizeZ(precomputes);
                pointPrecomputes.set(affinePoint, precomputes);
            }
        }
        let p = JacobianPoint.ZERO;
        let f = JacobianPoint.ZERO;
        const windows = 1 + (USE_ENDOMORPHISM ? 128 / W : 256 / W);
        const windowSize = 2 ** (W - 1);
        const mask = BigInt(2 ** W - 1);
        const maxNumber = 2 ** W;
        const shiftBy = BigInt(W);
        for(let window = 0; window < windows; window++){
            const offset = window * windowSize;
            let wbits = Number(n & mask);
            n >>= shiftBy;
            if (wbits > windowSize) {
                wbits -= maxNumber;
                n += _1n;
            }
            if (wbits === 0) {
                let pr = precomputes[offset];
                if (window % 2) pr = pr.negate();
                f = f.add(pr);
            } else {
                let cached = precomputes[offset + Math.abs(wbits) - 1];
                if (wbits < 0) cached = cached.negate();
                p = p.add(cached);
            }
        }
        return {
            p,
            f
        };
    }
    multiply(scalar, affinePoint) {
        let n = normalizeScalar(scalar);
        let point;
        let fake;
        if (USE_ENDOMORPHISM) {
            const { k1neg , k1 , k2neg , k2  } = splitScalarEndo(n);
            let { p: k1p , f: f1p  } = this.wNAF(k1, affinePoint);
            let { p: k2p , f: f2p  } = this.wNAF(k2, affinePoint);
            if (k1neg) k1p = k1p.negate();
            if (k2neg) k2p = k2p.negate();
            k2p = new JacobianPoint(mod11(k2p.x * CURVE.beta), k2p.y, k2p.z);
            point = k1p.add(k2p);
            fake = f1p.add(f2p);
        } else {
            const { p , f  } = this.wNAF(n, affinePoint);
            point = p;
            fake = f;
        }
        return JacobianPoint.normalizeZ([
            point,
            fake
        ])[0];
    }
    toAffine(invZ = invert(this.z)) {
        const { x , y , z  } = this;
        const iz1 = invZ;
        const iz2 = mod11(iz1 * iz1);
        const iz3 = mod11(iz2 * iz1);
        const ax = mod11(x * iz2);
        const ay = mod11(y * iz3);
        const zz = mod11(z * iz1);
        if (zz !== _1n) throw new Error('invZ was invalid');
        return new Point(ax, ay);
    }
    x;
    y;
    z;
}
const pointPrecomputes = new WeakMap();
class Point {
    static BASE = new Point(CURVE.Gx, CURVE.Gy);
    static ZERO = new Point(_0n, _0n);
    _WINDOW_SIZE;
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
    _setWindowSize(windowSize) {
        this._WINDOW_SIZE = windowSize;
        pointPrecomputes.delete(this);
    }
    hasEvenY() {
        return this.y % _2n === _0n;
    }
    static fromCompressedHex(bytes) {
        const isShort = bytes.length === 32;
        const x = bytesToNumber(isShort ? bytes : bytes.subarray(1));
        if (!isValidFieldElement(x)) throw new Error('Point is not on curve');
        const y2 = weistrass(x);
        let y = sqrtMod(y2);
        const isYOdd = (y & _1n) === _1n;
        if (isShort) {
            if (isYOdd) y = mod11(-y);
        } else {
            const isFirstByteOdd = (bytes[0] & 1) === 1;
            if (isFirstByteOdd !== isYOdd) y = mod11(-y);
        }
        const point = new Point(x, y);
        point.assertValidity();
        return point;
    }
    static fromUncompressedHex(bytes) {
        const x = bytesToNumber(bytes.subarray(1, 33));
        const y = bytesToNumber(bytes.subarray(33, 65));
        const point = new Point(x, y);
        point.assertValidity();
        return point;
    }
    static fromHex(hex) {
        const bytes = ensureBytes(hex);
        const len = bytes.length;
        const header = bytes[0];
        if (len === 32 || len === 33 && (header === 0x02 || header === 0x03)) {
            return this.fromCompressedHex(bytes);
        }
        if (len === 65 && header === 0x04) return this.fromUncompressedHex(bytes);
        throw new Error(`Point.fromHex: received invalid point. Expected 32-33 compressed bytes or 65 uncompressed bytes, not ${len}`);
    }
    static fromPrivateKey(privateKey) {
        return Point.BASE.multiply(normalizePrivateKey(privateKey));
    }
    static fromSignature(msgHash, signature, recovery) {
        msgHash = ensureBytes(msgHash);
        const h = truncateHash(msgHash);
        const { r , s  } = normalizeSignature(signature);
        if (recovery !== 0 && recovery !== 1) {
            throw new Error('Cannot recover signature: invalid recovery bit');
        }
        const prefix = recovery & 1 ? '03' : '02';
        const R = Point.fromHex(prefix + numTo32bStr(r));
        const { n  } = CURVE;
        const rinv = invert(r, n);
        const u1 = mod11(-h * rinv, n);
        const u2 = mod11(s * rinv, n);
        const Q = Point.BASE.multiplyAndAddUnsafe(R, u1, u2);
        if (!Q) throw new Error('Cannot recover signature: point at infinify');
        Q.assertValidity();
        return Q;
    }
    toRawBytes(isCompressed = false) {
        return hexToBytes1(this.toHex(isCompressed));
    }
    toHex(isCompressed = false) {
        const x = numTo32bStr(this.x);
        if (isCompressed) {
            const prefix = this.hasEvenY() ? '02' : '03';
            return `${prefix}${x}`;
        } else {
            return `04${x}${numTo32bStr(this.y)}`;
        }
    }
    toHexX() {
        return this.toHex(true).slice(2);
    }
    toRawX() {
        return this.toRawBytes(true).slice(1);
    }
    assertValidity() {
        const msg = 'Point is not on elliptic curve';
        const { x , y  } = this;
        if (!isValidFieldElement(x) || !isValidFieldElement(y)) throw new Error(msg);
        const left = mod11(y * y);
        const right = weistrass(x);
        if (mod11(left - right) !== _0n) throw new Error(msg);
    }
    equals(other) {
        return this.x === other.x && this.y === other.y;
    }
    negate() {
        return new Point(this.x, mod11(-this.y));
    }
    double() {
        return JacobianPoint.fromAffine(this).double().toAffine();
    }
    add(other) {
        return JacobianPoint.fromAffine(this).add(JacobianPoint.fromAffine(other)).toAffine();
    }
    subtract(other) {
        return this.add(other.negate());
    }
    multiply(scalar) {
        return JacobianPoint.fromAffine(this).multiply(scalar, this).toAffine();
    }
    multiplyAndAddUnsafe(Q, a, b) {
        const P = JacobianPoint.fromAffine(this);
        const aP = a === _0n || a === _1n || this !== Point.BASE ? P.multiplyUnsafe(a) : P.multiply(a);
        const bQ = JacobianPoint.fromAffine(Q).multiplyUnsafe(b);
        const sum = aP.add(bQ);
        return sum.equals(JacobianPoint.ZERO) ? undefined : sum.toAffine();
    }
    x;
    y;
}
function sliceDER(s) {
    return Number.parseInt(s[0], 16) >= 8 ? '00' + s : s;
}
function parseDERInt(data) {
    if (data.length < 2 || data[0] !== 0x02) {
        throw new Error(`Invalid signature integer tag: ${bytesToHex(data)}`);
    }
    const len = data[1];
    const res = data.subarray(2, len + 2);
    if (!len || res.length !== len) {
        throw new Error(`Invalid signature integer: wrong length`);
    }
    if (res[0] === 0x00 && res[1] <= 0x7f) {
        throw new Error('Invalid signature integer: trailing length');
    }
    return {
        data: bytesToNumber(res),
        left: data.subarray(len + 2)
    };
}
function parseDERSignature(data) {
    if (data.length < 2 || data[0] != 0x30) {
        throw new Error(`Invalid signature tag: ${bytesToHex(data)}`);
    }
    if (data[1] !== data.length - 2) {
        throw new Error('Invalid signature: incorrect length');
    }
    const { data: r , left: sBytes  } = parseDERInt(data.subarray(2));
    const { data: s , left: rBytesLeft  } = parseDERInt(sBytes);
    if (rBytesLeft.length) {
        throw new Error(`Invalid signature: left bytes after parsing: ${bytesToHex(rBytesLeft)}`);
    }
    return {
        r,
        s
    };
}
class Signature {
    constructor(r, s){
        this.r = r;
        this.s = s;
        this.assertValidity();
    }
    static fromCompact(hex) {
        const arr = hex instanceof Uint8Array;
        const name = 'Signature.fromCompact';
        if (typeof hex !== 'string' && !arr) throw new TypeError(`${name}: Expected string or Uint8Array`);
        const str = arr ? bytesToHex(hex) : hex;
        if (str.length !== 128) throw new Error(`${name}: Expected 64-byte hex`);
        return new Signature(hexToNumber(str.slice(0, 64)), hexToNumber(str.slice(64, 128)));
    }
    static fromDER(hex) {
        const arr = hex instanceof Uint8Array;
        if (typeof hex !== 'string' && !arr) throw new TypeError(`Signature.fromDER: Expected string or Uint8Array`);
        const { r , s  } = parseDERSignature(arr ? hex : hexToBytes1(hex));
        return new Signature(r, s);
    }
    static fromHex(hex) {
        return this.fromDER(hex);
    }
    assertValidity() {
        const { r , s  } = this;
        if (!isWithinCurveOrder(r)) throw new Error('Invalid Signature: r must be 0 < r < n');
        if (!isWithinCurveOrder(s)) throw new Error('Invalid Signature: s must be 0 < s < n');
    }
    hasHighS() {
        const HALF = CURVE.n >> _1n;
        return this.s > HALF;
    }
    normalizeS() {
        return this.hasHighS() ? new Signature(this.r, CURVE.n - this.s) : this;
    }
    toDERRawBytes(isCompressed = false) {
        return hexToBytes1(this.toDERHex(isCompressed));
    }
    toDERHex(isCompressed = false) {
        const sHex = sliceDER(numberToHexUnpadded(this.s));
        if (isCompressed) return sHex;
        const rHex = sliceDER(numberToHexUnpadded(this.r));
        const rLen = numberToHexUnpadded(rHex.length / 2);
        const sLen = numberToHexUnpadded(sHex.length / 2);
        const length = numberToHexUnpadded(rHex.length / 2 + sHex.length / 2 + 4);
        return `30${length}02${rLen}${rHex}02${sLen}${sHex}`;
    }
    toRawBytes() {
        return this.toDERRawBytes();
    }
    toHex() {
        return this.toDERHex();
    }
    toCompactRawBytes() {
        return hexToBytes1(this.toCompactHex());
    }
    toCompactHex() {
        return numTo32bStr(this.r) + numTo32bStr(this.s);
    }
    r;
    s;
}
function concatBytes(...arrays) {
    if (!arrays.every((b)=>b instanceof Uint8Array)) throw new Error('Uint8Array list expected');
    if (arrays.length === 1) return arrays[0];
    const length = arrays.reduce((a, arr)=>a + arr.length, 0);
    const result = new Uint8Array(length);
    for(let i = 0, pad = 0; i < arrays.length; i++){
        const arr = arrays[i];
        result.set(arr, pad);
        pad += arr.length;
    }
    return result;
}
const hexes = Array.from({
    length: 256
}, (v, i)=>i.toString(16).padStart(2, '0'));
function bytesToHex(uint8a) {
    if (!(uint8a instanceof Uint8Array)) throw new Error('Expected Uint8Array');
    let hex = '';
    for(let i = 0; i < uint8a.length; i++){
        hex += hexes[uint8a[i]];
    }
    return hex;
}
const POW_2_256 = BigInt('0x10000000000000000000000000000000000000000000000000000000000000000');
function numTo32bStr(num) {
    if (typeof num !== 'bigint') throw new Error('Expected bigint');
    if (!(_0n <= num && num < POW_2_256)) throw new Error('Expected number < 2^256');
    return num.toString(16).padStart(64, '0');
}
function numTo32b(num) {
    const b = hexToBytes1(numTo32bStr(num));
    if (b.length !== 32) throw new Error('Error: expected 32 bytes');
    return b;
}
function numberToHexUnpadded(num) {
    const hex = num.toString(16);
    return hex.length & 1 ? `0${hex}` : hex;
}
function hexToNumber(hex) {
    if (typeof hex !== 'string') {
        throw new TypeError('hexToNumber: expected string, got ' + typeof hex);
    }
    return BigInt(`0x${hex}`);
}
function hexToBytes1(hex) {
    if (typeof hex !== 'string') {
        throw new TypeError('hexToBytes: expected string, got ' + typeof hex);
    }
    if (hex.length % 2) throw new Error('hexToBytes: received invalid unpadded hex' + hex.length);
    const array = new Uint8Array(hex.length / 2);
    for(let i = 0; i < array.length; i++){
        const j = i * 2;
        const hexByte = hex.slice(j, j + 2);
        const __byte = Number.parseInt(hexByte, 16);
        if (Number.isNaN(__byte) || __byte < 0) throw new Error('Invalid byte sequence');
        array[i] = __byte;
    }
    return array;
}
function bytesToNumber(bytes) {
    return hexToNumber(bytesToHex(bytes));
}
function ensureBytes(hex) {
    return hex instanceof Uint8Array ? Uint8Array.from(hex) : hexToBytes1(hex);
}
function normalizeScalar(num) {
    if (typeof num === 'number' && Number.isSafeInteger(num) && num > 0) return BigInt(num);
    if (typeof num === 'bigint' && isWithinCurveOrder(num)) return num;
    throw new TypeError('Expected valid private scalar: 0 < scalar < curve.n');
}
function mod11(a, b = CURVE.P) {
    const result = a % b;
    return result >= _0n ? result : b + result;
}
function pow2(x, power) {
    const { P  } = CURVE;
    let res = x;
    while(power-- > _0n){
        res *= res;
        res %= P;
    }
    return res;
}
function sqrtMod(x) {
    const { P  } = CURVE;
    const _6n = BigInt(6);
    const _11n = BigInt(11);
    const _22n = BigInt(22);
    const _23n = BigInt(23);
    const _44n = BigInt(44);
    const _88n = BigInt(88);
    const b2 = x * x * x % P;
    const b3 = b2 * b2 * x % P;
    const b6 = pow2(b3, _3n) * b3 % P;
    const b9 = pow2(b6, _3n) * b3 % P;
    const b11 = pow2(b9, _2n) * b2 % P;
    const b22 = pow2(b11, _11n) * b11 % P;
    const b44 = pow2(b22, _22n) * b22 % P;
    const b88 = pow2(b44, _44n) * b44 % P;
    const b176 = pow2(b88, _88n) * b88 % P;
    const b220 = pow2(b176, _44n) * b44 % P;
    const b223 = pow2(b220, _3n) * b3 % P;
    const t1 = pow2(b223, _23n) * b22 % P;
    const t2 = pow2(t1, _6n) * b2 % P;
    return pow2(t2, _2n);
}
function invert(number, modulo = CURVE.P) {
    if (number === _0n || modulo <= _0n) {
        throw new Error(`invert: expected positive integers, got n=${number} mod=${modulo}`);
    }
    let a = mod11(number, modulo);
    let b = modulo;
    let x = _0n, y = _1n, u = _1n, v = _0n;
    while(a !== _0n){
        const q = b / a;
        const r = b % a;
        const m = x - u * q;
        const n = y - v * q;
        b = a, a = r, x = u, y = v, u = m, v = n;
    }
    const gcd = b;
    if (gcd !== _1n) throw new Error('invert: does not exist');
    return mod11(x, modulo);
}
function invertBatch(nums, p = CURVE.P) {
    const scratch = new Array(nums.length);
    const lastMultiplied = nums.reduce((acc, num, i)=>{
        if (num === _0n) return acc;
        scratch[i] = acc;
        return mod11(acc * num, p);
    }, _1n);
    const inverted = invert(lastMultiplied, p);
    nums.reduceRight((acc, num, i)=>{
        if (num === _0n) return acc;
        scratch[i] = mod11(acc * scratch[i], p);
        return mod11(acc * num, p);
    }, inverted);
    return scratch;
}
const divNearest = (a, b)=>(a + b / _2n) / b;
const ENDO = {
    a1: BigInt('0x3086d221a7d46bcde86c90e49284eb15'),
    b1: -_1n * BigInt('0xe4437ed6010e88286f547fa90abfe4c3'),
    a2: BigInt('0x114ca50f7a8e2f3f657c1108d9d44cfd8'),
    b2: BigInt('0x3086d221a7d46bcde86c90e49284eb15'),
    POW_2_128: BigInt('0x100000000000000000000000000000000')
};
function splitScalarEndo(k) {
    const { n  } = CURVE;
    const { a1 , b1 , a2 , b2 , POW_2_128  } = ENDO;
    const c1 = divNearest(b2 * k, n);
    const c2 = divNearest(-b1 * k, n);
    let k1 = mod11(k - c1 * a1 - c2 * a2, n);
    let k2 = mod11(-c1 * b1 - c2 * b2, n);
    const k1neg = k1 > POW_2_128;
    const k2neg = k2 > POW_2_128;
    if (k1neg) k1 = n - k1;
    if (k2neg) k2 = n - k2;
    if (k1 > POW_2_128 || k2 > POW_2_128) {
        throw new Error('splitScalarEndo: Endomorphism failed, k=' + k);
    }
    return {
        k1neg,
        k1,
        k2neg,
        k2
    };
}
function truncateHash(hash) {
    const { n  } = CURVE;
    const byteLength = hash.length;
    const delta = byteLength * 8 - 256;
    let h = bytesToNumber(hash);
    if (delta > 0) h = h >> BigInt(delta);
    if (h >= n) h -= n;
    return h;
}
let _sha256Sync;
let _hmacSha256Sync;
function isWithinCurveOrder(num) {
    return _0n < num && num < CURVE.n;
}
function isValidFieldElement(num) {
    return _0n < num && num < CURVE.P;
}
function normalizePrivateKey(key) {
    let num;
    if (typeof key === 'bigint') {
        num = key;
    } else if (typeof key === 'number' && Number.isSafeInteger(key) && key > 0) {
        num = BigInt(key);
    } else if (typeof key === 'string') {
        if (key.length !== 64) throw new Error('Expected 32 bytes of private key');
        num = hexToNumber(key);
    } else if (key instanceof Uint8Array) {
        if (key.length !== 32) throw new Error('Expected 32 bytes of private key');
        num = bytesToNumber(key);
    } else {
        throw new TypeError('Expected valid private key');
    }
    if (!isWithinCurveOrder(num)) throw new Error('Expected private key: 0 < key < n');
    return num;
}
function normalizePublicKey(publicKey) {
    if (publicKey instanceof Point) {
        publicKey.assertValidity();
        return publicKey;
    } else {
        return Point.fromHex(publicKey);
    }
}
function normalizeSignature(signature) {
    if (signature instanceof Signature) {
        signature.assertValidity();
        return signature;
    }
    try {
        return Signature.fromDER(signature);
    } catch (error) {
        return Signature.fromCompact(signature);
    }
}
function schnorrChallengeFinalize(ch) {
    return mod11(bytesToNumber(ch), CURVE.n);
}
class SchnorrSignature {
    constructor(r, s){
        this.r = r;
        this.s = s;
        this.assertValidity();
    }
    static fromHex(hex) {
        const bytes = ensureBytes(hex);
        if (bytes.length !== 64) throw new TypeError(`SchnorrSignature.fromHex: expected 64 bytes, not ${bytes.length}`);
        const r = bytesToNumber(bytes.subarray(0, 32));
        const s = bytesToNumber(bytes.subarray(32, 64));
        return new SchnorrSignature(r, s);
    }
    assertValidity() {
        const { r , s  } = this;
        if (!isValidFieldElement(r) || !isWithinCurveOrder(s)) throw new Error('Invalid signature');
    }
    toHex() {
        return numTo32bStr(this.r) + numTo32bStr(this.s);
    }
    toRawBytes() {
        return hexToBytes1(this.toHex());
    }
    r;
    s;
}
function schnorrGetPublicKey(privateKey) {
    return Point.fromPrivateKey(privateKey).toRawX();
}
class InternalSchnorrSignature {
    m;
    px;
    d;
    rand;
    constructor(message, privateKey, auxRand = utils.randomBytes()){
        if (message == null) throw new TypeError(`sign: Expected valid message, not "${message}"`);
        this.m = ensureBytes(message);
        const { x , scalar  } = this.getScalar(normalizePrivateKey(privateKey));
        this.px = x;
        this.d = scalar;
        this.rand = ensureBytes(auxRand);
        if (this.rand.length !== 32) throw new TypeError('sign: Expected 32 bytes of aux randomness');
    }
    getScalar(priv) {
        const point = Point.fromPrivateKey(priv);
        const scalar = point.hasEvenY() ? priv : CURVE.n - priv;
        return {
            point,
            scalar,
            x: point.toRawX()
        };
    }
    initNonce(d, t0h) {
        return numTo32b(d ^ bytesToNumber(t0h));
    }
    finalizeNonce(k0h) {
        const k0 = mod11(bytesToNumber(k0h), CURVE.n);
        if (k0 === _0n) throw new Error('sign: Creation of signature failed. k is zero');
        const { point: R , x: rx , scalar: k  } = this.getScalar(k0);
        return {
            R,
            rx,
            k
        };
    }
    finalizeSig(R, k, e, d) {
        return new SchnorrSignature(R.x, mod11(k + e * d, CURVE.n)).toRawBytes();
    }
    error() {
        throw new Error('sign: Invalid signature produced');
    }
    async calc() {
        const { m , d , px , rand  } = this;
        const tag = utils.taggedHash;
        const t = this.initNonce(d, await tag(TAGS.aux, rand));
        const { R , rx , k  } = this.finalizeNonce(await tag(TAGS.nonce, t, px, m));
        const e = schnorrChallengeFinalize(await tag(TAGS.challenge, rx, px, m));
        const sig = this.finalizeSig(R, k, e, d);
        if (!await schnorrVerify(sig, m, px)) this.error();
        return sig;
    }
    calcSync() {
        const { m , d , px , rand  } = this;
        const tag = utils.taggedHashSync;
        const t = this.initNonce(d, tag(TAGS.aux, rand));
        const { R , rx , k  } = this.finalizeNonce(tag(TAGS.nonce, t, px, m));
        const e = schnorrChallengeFinalize(tag(TAGS.challenge, rx, px, m));
        const sig = this.finalizeSig(R, k, e, d);
        if (!schnorrVerifySync(sig, m, px)) this.error();
        return sig;
    }
}
async function schnorrSign(msg, privKey, auxRand) {
    return new InternalSchnorrSignature(msg, privKey, auxRand).calc();
}
function schnorrSignSync(msg, privKey, auxRand) {
    return new InternalSchnorrSignature(msg, privKey, auxRand).calcSync();
}
function initSchnorrVerify(signature, message, publicKey) {
    const raw = signature instanceof SchnorrSignature;
    const sig = raw ? signature : SchnorrSignature.fromHex(signature);
    if (raw) sig.assertValidity();
    return {
        ...sig,
        m: ensureBytes(message),
        P: normalizePublicKey(publicKey)
    };
}
function finalizeSchnorrVerify(r, P, s, e) {
    const R = Point.BASE.multiplyAndAddUnsafe(P, normalizePrivateKey(s), mod11(-e, CURVE.n));
    if (!R || !R.hasEvenY() || R.x !== r) return false;
    return true;
}
async function schnorrVerify(signature, message, publicKey) {
    try {
        const { r , s , m , P  } = initSchnorrVerify(signature, message, publicKey);
        const e = schnorrChallengeFinalize(await utils.taggedHash(TAGS.challenge, numTo32b(r), P.toRawX(), m));
        return finalizeSchnorrVerify(r, P, s, e);
    } catch (error) {
        return false;
    }
}
function schnorrVerifySync(signature, message, publicKey) {
    try {
        const { r , s , m , P  } = initSchnorrVerify(signature, message, publicKey);
        const e = schnorrChallengeFinalize(utils.taggedHashSync(TAGS.challenge, numTo32b(r), P.toRawX(), m));
        return finalizeSchnorrVerify(r, P, s, e);
    } catch (error) {
        if (error instanceof ShaError) throw error;
        return false;
    }
}
const schnorr = {
    Signature: SchnorrSignature,
    getPublicKey: schnorrGetPublicKey,
    sign: schnorrSign,
    verify: schnorrVerify,
    signSync: schnorrSignSync,
    verifySync: schnorrVerifySync
};
Point.BASE._setWindowSize(8);
const crypto2 = {
    node: mod10,
    web: typeof self === 'object' && 'crypto' in self ? self.crypto : undefined
};
const TAGS = {
    challenge: 'BIP0340/challenge',
    aux: 'BIP0340/aux',
    nonce: 'BIP0340/nonce'
};
const TAGGED_HASH_PREFIXES = {};
const utils = {
    bytesToHex,
    hexToBytes: hexToBytes1,
    concatBytes,
    mod: mod11,
    invert,
    isValidPrivateKey (privateKey) {
        try {
            normalizePrivateKey(privateKey);
            return true;
        } catch (error) {
            return false;
        }
    },
    _bigintTo32Bytes: numTo32b,
    _normalizePrivateKey: normalizePrivateKey,
    hashToPrivateKey: (hash)=>{
        hash = ensureBytes(hash);
        if (hash.length < 40 || hash.length > 1024) throw new Error('Expected 40-1024 bytes of private key as per FIPS 186');
        const num = mod11(bytesToNumber(hash), CURVE.n - _1n) + _1n;
        return numTo32b(num);
    },
    randomBytes: (bytesLength = 32)=>{
        if (crypto2.web) {
            return crypto2.web.getRandomValues(new Uint8Array(bytesLength));
        } else if (crypto2.node) {
            const { randomBytes  } = crypto2.node;
            return Uint8Array.from(randomBytes(bytesLength));
        } else {
            throw new Error("The environment doesn't have randomBytes function");
        }
    },
    randomPrivateKey: ()=>{
        return utils.hashToPrivateKey(utils.randomBytes(40));
    },
    sha256: async (...messages)=>{
        if (crypto2.web) {
            const buffer = await crypto2.web.subtle.digest('SHA-256', concatBytes(...messages));
            return new Uint8Array(buffer);
        } else if (crypto2.node) {
            const { createHash  } = crypto2.node;
            const hash = createHash('sha256');
            messages.forEach((m)=>hash.update(m));
            return Uint8Array.from(hash.digest());
        } else {
            throw new Error("The environment doesn't have sha256 function");
        }
    },
    hmacSha256: async (key, ...messages)=>{
        if (crypto2.web) {
            const ckey = await crypto2.web.subtle.importKey('raw', key, {
                name: 'HMAC',
                hash: {
                    name: 'SHA-256'
                }
            }, false, [
                'sign'
            ]);
            const message = concatBytes(...messages);
            const buffer = await crypto2.web.subtle.sign('HMAC', ckey, message);
            return new Uint8Array(buffer);
        } else if (crypto2.node) {
            const { createHmac  } = crypto2.node;
            const hash = createHmac('sha256', key);
            messages.forEach((m)=>hash.update(m));
            return Uint8Array.from(hash.digest());
        } else {
            throw new Error("The environment doesn't have hmac-sha256 function");
        }
    },
    sha256Sync: undefined,
    hmacSha256Sync: undefined,
    taggedHash: async (tag, ...messages)=>{
        let tagP = TAGGED_HASH_PREFIXES[tag];
        if (tagP === undefined) {
            const tagH = await utils.sha256(Uint8Array.from(tag, (c)=>c.charCodeAt(0)));
            tagP = concatBytes(tagH, tagH);
            TAGGED_HASH_PREFIXES[tag] = tagP;
        }
        return utils.sha256(tagP, ...messages);
    },
    taggedHashSync: (tag, ...messages)=>{
        if (typeof _sha256Sync !== 'function') throw new ShaError('sha256Sync is undefined, you need to set it');
        let tagP = TAGGED_HASH_PREFIXES[tag];
        if (tagP === undefined) {
            const tagH = _sha256Sync(Uint8Array.from(tag, (c)=>c.charCodeAt(0)));
            tagP = concatBytes(tagH, tagH);
            TAGGED_HASH_PREFIXES[tag] = tagP;
        }
        return _sha256Sync(tagP, ...messages);
    },
    precompute (windowSize = 8, point = Point.BASE) {
        const cached = point === Point.BASE ? point : new Point(point.x, point.y);
        cached._setWindowSize(windowSize);
        cached.multiply(_3n);
        return cached;
    }
};
Object.defineProperties(utils, {
    sha256Sync: {
        configurable: false,
        get () {
            return _sha256Sync;
        },
        set (val) {
            if (!_sha256Sync) _sha256Sync = val;
        }
    },
    hmacSha256Sync: {
        configurable: false,
        get () {
            return _hmacSha256Sync;
        },
        set (val) {
            if (!_hmacSha256Sync) _hmacSha256Sync = val;
        }
    }
});
const HEX_CHARS = "0123456789abcdef".split("");
const EXTRA = [
    -2147483648,
    8388608,
    32768,
    128
];
const SHIFT = [
    24,
    16,
    8,
    0
];
const K = [
    0x428a2f98,
    0x71374491,
    0xb5c0fbcf,
    0xe9b5dba5,
    0x3956c25b,
    0x59f111f1,
    0x923f82a4,
    0xab1c5ed5,
    0xd807aa98,
    0x12835b01,
    0x243185be,
    0x550c7dc3,
    0x72be5d74,
    0x80deb1fe,
    0x9bdc06a7,
    0xc19bf174,
    0xe49b69c1,
    0xefbe4786,
    0x0fc19dc6,
    0x240ca1cc,
    0x2de92c6f,
    0x4a7484aa,
    0x5cb0a9dc,
    0x76f988da,
    0x983e5152,
    0xa831c66d,
    0xb00327c8,
    0xbf597fc7,
    0xc6e00bf3,
    0xd5a79147,
    0x06ca6351,
    0x14292967,
    0x27b70a85,
    0x2e1b2138,
    0x4d2c6dfc,
    0x53380d13,
    0x650a7354,
    0x766a0abb,
    0x81c2c92e,
    0x92722c85,
    0xa2bfe8a1,
    0xa81a664b,
    0xc24b8b70,
    0xc76c51a3,
    0xd192e819,
    0xd6990624,
    0xf40e3585,
    0x106aa070,
    0x19a4c116,
    0x1e376c08,
    0x2748774c,
    0x34b0bcb5,
    0x391c0cb3,
    0x4ed8aa4a,
    0x5b9cca4f,
    0x682e6ff3,
    0x748f82ee,
    0x78a5636f,
    0x84c87814,
    0x8cc70208,
    0x90befffa,
    0xa4506ceb,
    0xbef9a3f7,
    0xc67178f2
];
const blocks = [];
class Sha256 {
    #block;
    #blocks;
    #bytes;
    #finalized;
    #first;
    #h0;
    #h1;
    #h2;
    #h3;
    #h4;
    #h5;
    #h6;
    #h7;
    #hashed;
    #hBytes;
    #is224;
    #lastByteIndex = 0;
    #start;
    constructor(is224 = false, sharedMemory = false){
        this.init(is224, sharedMemory);
    }
    init(is224, sharedMemory) {
        if (sharedMemory) {
            blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
            this.#blocks = blocks;
        } else {
            this.#blocks = [
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
            ];
        }
        if (is224) {
            this.#h0 = 0xc1059ed8;
            this.#h1 = 0x367cd507;
            this.#h2 = 0x3070dd17;
            this.#h3 = 0xf70e5939;
            this.#h4 = 0xffc00b31;
            this.#h5 = 0x68581511;
            this.#h6 = 0x64f98fa7;
            this.#h7 = 0xbefa4fa4;
        } else {
            this.#h0 = 0x6a09e667;
            this.#h1 = 0xbb67ae85;
            this.#h2 = 0x3c6ef372;
            this.#h3 = 0xa54ff53a;
            this.#h4 = 0x510e527f;
            this.#h5 = 0x9b05688c;
            this.#h6 = 0x1f83d9ab;
            this.#h7 = 0x5be0cd19;
        }
        this.#block = this.#start = this.#bytes = this.#hBytes = 0;
        this.#finalized = this.#hashed = false;
        this.#first = true;
        this.#is224 = is224;
    }
    update(message) {
        if (this.#finalized) {
            return this;
        }
        let msg;
        if (message instanceof ArrayBuffer) {
            msg = new Uint8Array(message);
        } else {
            msg = message;
        }
        let index = 0;
        const length = msg.length;
        const blocks = this.#blocks;
        while(index < length){
            let i;
            if (this.#hashed) {
                this.#hashed = false;
                blocks[0] = this.#block;
                blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
            }
            if (typeof msg !== "string") {
                for(i = this.#start; index < length && i < 64; ++index){
                    blocks[i >> 2] |= msg[index] << SHIFT[i++ & 3];
                }
            } else {
                for(i = this.#start; index < length && i < 64; ++index){
                    let code = msg.charCodeAt(index);
                    if (code < 0x80) {
                        blocks[i >> 2] |= code << SHIFT[i++ & 3];
                    } else if (code < 0x800) {
                        blocks[i >> 2] |= (0xc0 | code >> 6) << SHIFT[i++ & 3];
                        blocks[i >> 2] |= (0x80 | code & 0x3f) << SHIFT[i++ & 3];
                    } else if (code < 0xd800 || code >= 0xe000) {
                        blocks[i >> 2] |= (0xe0 | code >> 12) << SHIFT[i++ & 3];
                        blocks[i >> 2] |= (0x80 | code >> 6 & 0x3f) << SHIFT[i++ & 3];
                        blocks[i >> 2] |= (0x80 | code & 0x3f) << SHIFT[i++ & 3];
                    } else {
                        code = 0x10000 + ((code & 0x3ff) << 10 | msg.charCodeAt(++index) & 0x3ff);
                        blocks[i >> 2] |= (0xf0 | code >> 18) << SHIFT[i++ & 3];
                        blocks[i >> 2] |= (0x80 | code >> 12 & 0x3f) << SHIFT[i++ & 3];
                        blocks[i >> 2] |= (0x80 | code >> 6 & 0x3f) << SHIFT[i++ & 3];
                        blocks[i >> 2] |= (0x80 | code & 0x3f) << SHIFT[i++ & 3];
                    }
                }
            }
            this.#lastByteIndex = i;
            this.#bytes += i - this.#start;
            if (i >= 64) {
                this.#block = blocks[16];
                this.#start = i - 64;
                this.hash();
                this.#hashed = true;
            } else {
                this.#start = i;
            }
        }
        if (this.#bytes > 4294967295) {
            this.#hBytes += this.#bytes / 4294967296 << 0;
            this.#bytes = this.#bytes % 4294967296;
        }
        return this;
    }
    finalize() {
        if (this.#finalized) {
            return;
        }
        this.#finalized = true;
        const blocks = this.#blocks;
        const i = this.#lastByteIndex;
        blocks[16] = this.#block;
        blocks[i >> 2] |= EXTRA[i & 3];
        this.#block = blocks[16];
        if (i >= 56) {
            if (!this.#hashed) {
                this.hash();
            }
            blocks[0] = this.#block;
            blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
        }
        blocks[14] = this.#hBytes << 3 | this.#bytes >>> 29;
        blocks[15] = this.#bytes << 3;
        this.hash();
    }
    hash() {
        let a = this.#h0;
        let b = this.#h1;
        let c = this.#h2;
        let d = this.#h3;
        let e = this.#h4;
        let f = this.#h5;
        let g = this.#h6;
        let h = this.#h7;
        const blocks = this.#blocks;
        let s0;
        let s1;
        let maj;
        let t1;
        let t2;
        let ch;
        let ab;
        let da;
        let cd;
        let bc;
        for(let j = 16; j < 64; ++j){
            t1 = blocks[j - 15];
            s0 = (t1 >>> 7 | t1 << 25) ^ (t1 >>> 18 | t1 << 14) ^ t1 >>> 3;
            t1 = blocks[j - 2];
            s1 = (t1 >>> 17 | t1 << 15) ^ (t1 >>> 19 | t1 << 13) ^ t1 >>> 10;
            blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1 << 0;
        }
        bc = b & c;
        for(let j1 = 0; j1 < 64; j1 += 4){
            if (this.#first) {
                if (this.#is224) {
                    ab = 300032;
                    t1 = blocks[0] - 1413257819;
                    h = t1 - 150054599 << 0;
                    d = t1 + 24177077 << 0;
                } else {
                    ab = 704751109;
                    t1 = blocks[0] - 210244248;
                    h = t1 - 1521486534 << 0;
                    d = t1 + 143694565 << 0;
                }
                this.#first = false;
            } else {
                s0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
                s1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
                ab = a & b;
                maj = ab ^ a & c ^ bc;
                ch = e & f ^ ~e & g;
                t1 = h + s1 + ch + K[j1] + blocks[j1];
                t2 = s0 + maj;
                h = d + t1 << 0;
                d = t1 + t2 << 0;
            }
            s0 = (d >>> 2 | d << 30) ^ (d >>> 13 | d << 19) ^ (d >>> 22 | d << 10);
            s1 = (h >>> 6 | h << 26) ^ (h >>> 11 | h << 21) ^ (h >>> 25 | h << 7);
            da = d & a;
            maj = da ^ d & b ^ ab;
            ch = h & e ^ ~h & f;
            t1 = g + s1 + ch + K[j1 + 1] + blocks[j1 + 1];
            t2 = s0 + maj;
            g = c + t1 << 0;
            c = t1 + t2 << 0;
            s0 = (c >>> 2 | c << 30) ^ (c >>> 13 | c << 19) ^ (c >>> 22 | c << 10);
            s1 = (g >>> 6 | g << 26) ^ (g >>> 11 | g << 21) ^ (g >>> 25 | g << 7);
            cd = c & d;
            maj = cd ^ c & a ^ da;
            ch = g & h ^ ~g & e;
            t1 = f + s1 + ch + K[j1 + 2] + blocks[j1 + 2];
            t2 = s0 + maj;
            f = b + t1 << 0;
            b = t1 + t2 << 0;
            s0 = (b >>> 2 | b << 30) ^ (b >>> 13 | b << 19) ^ (b >>> 22 | b << 10);
            s1 = (f >>> 6 | f << 26) ^ (f >>> 11 | f << 21) ^ (f >>> 25 | f << 7);
            bc = b & c;
            maj = bc ^ b & d ^ cd;
            ch = f & g ^ ~f & h;
            t1 = e + s1 + ch + K[j1 + 3] + blocks[j1 + 3];
            t2 = s0 + maj;
            e = a + t1 << 0;
            a = t1 + t2 << 0;
        }
        this.#h0 = this.#h0 + a << 0;
        this.#h1 = this.#h1 + b << 0;
        this.#h2 = this.#h2 + c << 0;
        this.#h3 = this.#h3 + d << 0;
        this.#h4 = this.#h4 + e << 0;
        this.#h5 = this.#h5 + f << 0;
        this.#h6 = this.#h6 + g << 0;
        this.#h7 = this.#h7 + h << 0;
    }
    hex() {
        this.finalize();
        const h0 = this.#h0;
        const h1 = this.#h1;
        const h2 = this.#h2;
        const h3 = this.#h3;
        const h4 = this.#h4;
        const h5 = this.#h5;
        const h6 = this.#h6;
        const h7 = this.#h7;
        let hex = HEX_CHARS[h0 >> 28 & 0x0f] + HEX_CHARS[h0 >> 24 & 0x0f] + HEX_CHARS[h0 >> 20 & 0x0f] + HEX_CHARS[h0 >> 16 & 0x0f] + HEX_CHARS[h0 >> 12 & 0x0f] + HEX_CHARS[h0 >> 8 & 0x0f] + HEX_CHARS[h0 >> 4 & 0x0f] + HEX_CHARS[h0 & 0x0f] + HEX_CHARS[h1 >> 28 & 0x0f] + HEX_CHARS[h1 >> 24 & 0x0f] + HEX_CHARS[h1 >> 20 & 0x0f] + HEX_CHARS[h1 >> 16 & 0x0f] + HEX_CHARS[h1 >> 12 & 0x0f] + HEX_CHARS[h1 >> 8 & 0x0f] + HEX_CHARS[h1 >> 4 & 0x0f] + HEX_CHARS[h1 & 0x0f] + HEX_CHARS[h2 >> 28 & 0x0f] + HEX_CHARS[h2 >> 24 & 0x0f] + HEX_CHARS[h2 >> 20 & 0x0f] + HEX_CHARS[h2 >> 16 & 0x0f] + HEX_CHARS[h2 >> 12 & 0x0f] + HEX_CHARS[h2 >> 8 & 0x0f] + HEX_CHARS[h2 >> 4 & 0x0f] + HEX_CHARS[h2 & 0x0f] + HEX_CHARS[h3 >> 28 & 0x0f] + HEX_CHARS[h3 >> 24 & 0x0f] + HEX_CHARS[h3 >> 20 & 0x0f] + HEX_CHARS[h3 >> 16 & 0x0f] + HEX_CHARS[h3 >> 12 & 0x0f] + HEX_CHARS[h3 >> 8 & 0x0f] + HEX_CHARS[h3 >> 4 & 0x0f] + HEX_CHARS[h3 & 0x0f] + HEX_CHARS[h4 >> 28 & 0x0f] + HEX_CHARS[h4 >> 24 & 0x0f] + HEX_CHARS[h4 >> 20 & 0x0f] + HEX_CHARS[h4 >> 16 & 0x0f] + HEX_CHARS[h4 >> 12 & 0x0f] + HEX_CHARS[h4 >> 8 & 0x0f] + HEX_CHARS[h4 >> 4 & 0x0f] + HEX_CHARS[h4 & 0x0f] + HEX_CHARS[h5 >> 28 & 0x0f] + HEX_CHARS[h5 >> 24 & 0x0f] + HEX_CHARS[h5 >> 20 & 0x0f] + HEX_CHARS[h5 >> 16 & 0x0f] + HEX_CHARS[h5 >> 12 & 0x0f] + HEX_CHARS[h5 >> 8 & 0x0f] + HEX_CHARS[h5 >> 4 & 0x0f] + HEX_CHARS[h5 & 0x0f] + HEX_CHARS[h6 >> 28 & 0x0f] + HEX_CHARS[h6 >> 24 & 0x0f] + HEX_CHARS[h6 >> 20 & 0x0f] + HEX_CHARS[h6 >> 16 & 0x0f] + HEX_CHARS[h6 >> 12 & 0x0f] + HEX_CHARS[h6 >> 8 & 0x0f] + HEX_CHARS[h6 >> 4 & 0x0f] + HEX_CHARS[h6 & 0x0f];
        if (!this.#is224) {
            hex += HEX_CHARS[h7 >> 28 & 0x0f] + HEX_CHARS[h7 >> 24 & 0x0f] + HEX_CHARS[h7 >> 20 & 0x0f] + HEX_CHARS[h7 >> 16 & 0x0f] + HEX_CHARS[h7 >> 12 & 0x0f] + HEX_CHARS[h7 >> 8 & 0x0f] + HEX_CHARS[h7 >> 4 & 0x0f] + HEX_CHARS[h7 & 0x0f];
        }
        return hex;
    }
    toString() {
        return this.hex();
    }
    digest() {
        this.finalize();
        const h0 = this.#h0;
        const h1 = this.#h1;
        const h2 = this.#h2;
        const h3 = this.#h3;
        const h4 = this.#h4;
        const h5 = this.#h5;
        const h6 = this.#h6;
        const h7 = this.#h7;
        const arr = [
            h0 >> 24 & 0xff,
            h0 >> 16 & 0xff,
            h0 >> 8 & 0xff,
            h0 & 0xff,
            h1 >> 24 & 0xff,
            h1 >> 16 & 0xff,
            h1 >> 8 & 0xff,
            h1 & 0xff,
            h2 >> 24 & 0xff,
            h2 >> 16 & 0xff,
            h2 >> 8 & 0xff,
            h2 & 0xff,
            h3 >> 24 & 0xff,
            h3 >> 16 & 0xff,
            h3 >> 8 & 0xff,
            h3 & 0xff,
            h4 >> 24 & 0xff,
            h4 >> 16 & 0xff,
            h4 >> 8 & 0xff,
            h4 & 0xff,
            h5 >> 24 & 0xff,
            h5 >> 16 & 0xff,
            h5 >> 8 & 0xff,
            h5 & 0xff,
            h6 >> 24 & 0xff,
            h6 >> 16 & 0xff,
            h6 >> 8 & 0xff,
            h6 & 0xff
        ];
        if (!this.#is224) {
            arr.push(h7 >> 24 & 0xff, h7 >> 16 & 0xff, h7 >> 8 & 0xff, h7 & 0xff);
        }
        return arr;
    }
    array() {
        return this.digest();
    }
    arrayBuffer() {
        this.finalize();
        const buffer = new ArrayBuffer(this.#is224 ? 28 : 32);
        const dataView = new DataView(buffer);
        dataView.setUint32(0, this.#h0);
        dataView.setUint32(4, this.#h1);
        dataView.setUint32(8, this.#h2);
        dataView.setUint32(12, this.#h3);
        dataView.setUint32(16, this.#h4);
        dataView.setUint32(20, this.#h5);
        dataView.setUint32(24, this.#h6);
        if (!this.#is224) {
            dataView.setUint32(28, this.#h7);
        }
        return buffer;
    }
}
class HmacSha256 extends Sha256 {
    #inner;
    #is224;
    #oKeyPad;
    #sharedMemory;
    constructor(secretKey, is224 = false, sharedMemory = false){
        super(is224, sharedMemory);
        let key;
        if (typeof secretKey === "string") {
            const bytes = [];
            const length = secretKey.length;
            let index = 0;
            for(let i = 0; i < length; ++i){
                let code = secretKey.charCodeAt(i);
                if (code < 0x80) {
                    bytes[index++] = code;
                } else if (code < 0x800) {
                    bytes[index++] = 0xc0 | code >> 6;
                    bytes[index++] = 0x80 | code & 0x3f;
                } else if (code < 0xd800 || code >= 0xe000) {
                    bytes[index++] = 0xe0 | code >> 12;
                    bytes[index++] = 0x80 | code >> 6 & 0x3f;
                    bytes[index++] = 0x80 | code & 0x3f;
                } else {
                    code = 0x10000 + ((code & 0x3ff) << 10 | secretKey.charCodeAt(++i) & 0x3ff);
                    bytes[index++] = 0xf0 | code >> 18;
                    bytes[index++] = 0x80 | code >> 12 & 0x3f;
                    bytes[index++] = 0x80 | code >> 6 & 0x3f;
                    bytes[index++] = 0x80 | code & 0x3f;
                }
            }
            key = bytes;
        } else {
            if (secretKey instanceof ArrayBuffer) {
                key = new Uint8Array(secretKey);
            } else {
                key = secretKey;
            }
        }
        if (key.length > 64) {
            key = new Sha256(is224, true).update(key).array();
        }
        const oKeyPad = [];
        const iKeyPad = [];
        for(let i1 = 0; i1 < 64; ++i1){
            const b = key[i1] || 0;
            oKeyPad[i1] = 0x5c ^ b;
            iKeyPad[i1] = 0x36 ^ b;
        }
        this.update(iKeyPad);
        this.#oKeyPad = oKeyPad;
        this.#inner = true;
        this.#is224 = is224;
        this.#sharedMemory = sharedMemory;
    }
    finalize() {
        super.finalize();
        if (this.#inner) {
            this.#inner = false;
            const innerHash = this.array();
            super.init(this.#is224, this.#sharedMemory);
            this.update(this.#oKeyPad);
            this.update(innerHash);
            super.finalize();
        }
    }
}
function swap32(val) {
    return (val & 0xff) << 24 | (val & 0xff00) << 8 | val >> 8 & 0xff00 | val >> 24 & 0xff;
}
function n16(n) {
    return n & 0xffff;
}
function n32(n) {
    return n >>> 0;
}
function add32WithCarry(a, b) {
    const added = n32(a) + n32(b);
    return [
        n32(added),
        added > 0xffffffff ? 1 : 0
    ];
}
function mul32WithCarry(a, b) {
    const al = n16(a);
    const ah = n16(a >>> 16);
    const bl = n16(b);
    const bh = n16(b >>> 16);
    const [t, tc] = add32WithCarry(al * bh, ah * bl);
    const [n, nc] = add32WithCarry(al * bl, n32(t << 16));
    const carry = nc + (tc << 16) + n16(t >>> 16) + ah * bh;
    return [
        n,
        carry
    ];
}
function mul32(a, b) {
    const al = n16(a);
    const ah = a - al;
    return n32(n32(ah * b) + al * b);
}
function mul64([ah, al], [bh, bl]) {
    const [n, c] = mul32WithCarry(al, bl);
    return [
        n32(mul32(al, bh) + mul32(ah, bl) + c),
        n
    ];
}
const prime32 = 16777619;
const fnv32 = (data)=>{
    let hash = 2166136261;
    data.forEach((c)=>{
        hash = mul32(hash, prime32);
        hash ^= c;
    });
    return Uint32Array.from([
        swap32(hash)
    ]).buffer;
};
const fnv32a = (data)=>{
    let hash = 2166136261;
    data.forEach((c)=>{
        hash ^= c;
        hash = mul32(hash, prime32);
    });
    return Uint32Array.from([
        swap32(hash)
    ]).buffer;
};
const prime64Lo = 435;
const prime64Hi = 256;
const fnv64 = (data)=>{
    let hashLo = 2216829733;
    let hashHi = 3421674724;
    data.forEach((c)=>{
        [hashHi, hashLo] = mul64([
            hashHi,
            hashLo
        ], [
            prime64Hi,
            prime64Lo
        ]);
        hashLo ^= c;
    });
    return new Uint32Array([
        swap32(hashHi >>> 0),
        swap32(hashLo >>> 0)
    ]).buffer;
};
const fnv64a = (data)=>{
    let hashLo = 2216829733;
    let hashHi = 3421674724;
    data.forEach((c)=>{
        hashLo ^= c;
        [hashHi, hashLo] = mul64([
            hashHi,
            hashLo
        ], [
            prime64Hi,
            prime64Lo
        ]);
    });
    return new Uint32Array([
        swap32(hashHi >>> 0),
        swap32(hashLo >>> 0)
    ]).buffer;
};
const fnv = (name, buf)=>{
    if (!buf) {
        throw new TypeError("no data provided for hashing");
    }
    switch(name){
        case "FNV32":
            return fnv32(buf);
        case "FNV64":
            return fnv64(buf);
        case "FNV32A":
            return fnv32a(buf);
        case "FNV64A":
            return fnv64a(buf);
        default:
            throw new TypeError(`unsupported fnv digest: ${name}`);
    }
};
const encoder1 = new TextEncoder();
function importKey(key) {
    if (typeof key === "string") {
        key = encoder1.encode(key);
    } else if (Array.isArray(key)) {
        key = new Uint8Array(key);
    }
    return crypto.subtle.importKey("raw", key, {
        name: "HMAC",
        hash: {
            name: "SHA-256"
        }
    }, true, [
        "sign",
        "verify"
    ]);
}
function sign(data, key) {
    if (typeof data === "string") {
        data = encoder1.encode(data);
    } else if (Array.isArray(data)) {
        data = Uint8Array.from(data);
    }
    return crypto.subtle.sign("HMAC", key, data);
}
async function compare1(a, b) {
    const key = new Uint8Array(32);
    globalThis.crypto.getRandomValues(key);
    const cryptoKey = await importKey(key);
    const ah = await sign(a, cryptoKey);
    const bh = await sign(b, cryptoKey);
    return timingSafeEqual(ah, bh);
}
class KeyStack {
    #cryptoKeys = new Map();
    #keys;
    async #toCryptoKey(key) {
        if (!this.#cryptoKeys.has(key)) {
            this.#cryptoKeys.set(key, await importKey(key));
        }
        return this.#cryptoKeys.get(key);
    }
    get length() {
        return this.#keys.length;
    }
    constructor(keys){
        const values = Array.isArray(keys) ? keys : [
            ...keys
        ];
        if (!values.length) {
            throw new TypeError("keys must contain at least one value");
        }
        this.#keys = values;
    }
    async sign(data) {
        const key = await this.#toCryptoKey(this.#keys[0]);
        return encode1(await sign(data, key));
    }
    async verify(data, digest) {
        return await this.indexOf(data, digest) > -1;
    }
    async indexOf(data, digest) {
        for(let i = 0; i < this.#keys.length; i++){
            const cryptoKey = await this.#toCryptoKey(this.#keys[i]);
            if (await compare1(digest, encode1(await sign(data, cryptoKey)))) {
                return i;
            }
        }
        return -1;
    }
    [Symbol.for("Deno.customInspect")](inspect) {
        const { length  } = this;
        return `${this.constructor.name} ${inspect({
            length
        })}`;
    }
    [Symbol.for("nodejs.util.inspect.custom")](depth, options, inspect) {
        if (depth < 0) {
            return options.stylize(`[${this.constructor.name}]`, "special");
        }
        const newOptions = Object.assign({}, options, {
            depth: options.depth === null ? null : options.depth - 1
        });
        const { length  } = this;
        return `${options.stylize(this.constructor.name, "special")} ${inspect({
            length
        }, newOptions)}`;
    }
}
const webCrypto = ((crypto1)=>({
        getRandomValues: crypto1.getRandomValues?.bind(crypto1),
        randomUUID: crypto1.randomUUID?.bind(crypto1),
        subtle: {
            decrypt: crypto1.subtle?.decrypt?.bind(crypto1.subtle),
            deriveBits: crypto1.subtle?.deriveBits?.bind(crypto1.subtle),
            deriveKey: crypto1.subtle?.deriveKey?.bind(crypto1.subtle),
            digest: crypto1.subtle?.digest?.bind(crypto1.subtle),
            encrypt: crypto1.subtle?.encrypt?.bind(crypto1.subtle),
            exportKey: crypto1.subtle?.exportKey?.bind(crypto1.subtle),
            generateKey: crypto1.subtle?.generateKey?.bind(crypto1.subtle),
            importKey: crypto1.subtle?.importKey?.bind(crypto1.subtle),
            sign: crypto1.subtle?.sign?.bind(crypto1.subtle),
            unwrapKey: crypto1.subtle?.unwrapKey?.bind(crypto1.subtle),
            verify: crypto1.subtle?.verify?.bind(crypto1.subtle),
            wrapKey: crypto1.subtle?.wrapKey?.bind(crypto1.subtle)
        }
    }))(globalThis.crypto);
const bufferSourceBytes = (data)=>{
    let bytes;
    if (data instanceof Uint8Array) {
        bytes = data;
    } else if (ArrayBuffer.isView(data)) {
        bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } else if (data instanceof ArrayBuffer) {
        bytes = new Uint8Array(data);
    }
    return bytes;
};
const stdCrypto = ((x)=>x)({
    ...webCrypto,
    subtle: {
        ...webCrypto.subtle,
        async digest (algorithm, data) {
            const { name , length  } = normalizeAlgorithm(algorithm);
            const bytes = bufferSourceBytes(data);
            if (FNVAlgorithms.includes(name)) {
                return fnv(name, bytes);
            }
            if (webCryptoDigestAlgorithms.includes(name) && bytes) {
                return webCrypto.subtle.digest(algorithm, bytes);
            } else if (digestAlgorithms.includes(name)) {
                if (bytes) {
                    return stdCrypto.subtle.digestSync(algorithm, bytes);
                } else if (data[Symbol.iterator]) {
                    return stdCrypto.subtle.digestSync(algorithm, data);
                } else if (data[Symbol.asyncIterator]) {
                    const wasmCrypto = instantiate();
                    const context = new wasmCrypto.DigestContext(name);
                    for await (const chunk of data){
                        const chunkBytes = bufferSourceBytes(chunk);
                        if (!chunkBytes) {
                            throw new TypeError("data contained chunk of the wrong type");
                        }
                        context.update(chunkBytes);
                    }
                    return context.digestAndDrop(length).buffer;
                } else {
                    throw new TypeError("data must be a BufferSource or [Async]Iterable<BufferSource>");
                }
            } else if (webCrypto.subtle?.digest) {
                return webCrypto.subtle.digest(algorithm, data);
            } else {
                throw new TypeError(`unsupported digest algorithm: ${algorithm}`);
            }
        },
        digestSync (algorithm, data) {
            algorithm = normalizeAlgorithm(algorithm);
            const bytes = bufferSourceBytes(data);
            if (FNVAlgorithms.includes(algorithm.name)) {
                return fnv(algorithm.name, bytes);
            }
            const wasmCrypto = instantiate();
            if (bytes) {
                return wasmCrypto.digest(algorithm.name, bytes, algorithm.length).buffer;
            } else if (data[Symbol.iterator]) {
                const context = new wasmCrypto.DigestContext(algorithm.name);
                for (const chunk of data){
                    const chunkBytes = bufferSourceBytes(chunk);
                    if (!chunkBytes) {
                        throw new TypeError("data contained chunk of the wrong type");
                    }
                    context.update(chunkBytes);
                }
                return context.digestAndDrop(algorithm.length).buffer;
            } else {
                throw new TypeError("data must be a BufferSource or Iterable<BufferSource>");
            }
        },
        timingSafeEqual
    }
});
const FNVAlgorithms = [
    "FNV32",
    "FNV32A",
    "FNV64",
    "FNV64A"
];
const webCryptoDigestAlgorithms = [
    "SHA-384",
    "SHA-256",
    "SHA-512",
    "SHA-1"
];
const normalizeAlgorithm = (algorithm)=>typeof algorithm === "string" ? {
        name: algorithm.toUpperCase()
    } : {
        ...algorithm,
        name: algorithm.name.toUpperCase()
    };
utils.sha256 = async (...msgs)=>{
    return new Uint8Array(await stdCrypto.subtle.digest('SHA-256', utils.concatBytes(...msgs)));
};
utils.sha256Sync = (...msgs)=>{
    return new Uint8Array(stdCrypto.subtle.digestSync('SHA-256', utils.concatBytes(...msgs)));
};
function hmac(key, ...messages) {
    const sha = new HmacSha256(key);
    for (let msg of messages)sha.update(msg);
    return new Uint8Array(sha.arrayBuffer());
}
utils.hmacSha256 = async (key, ...messages)=>Promise.resolve(hmac(key, ...messages));
utils.hmacSha256Sync = (key, ...messages)=>hmac(key, ...messages);
const hexTable1 = new TextEncoder().encode("0123456789abcdef");
function encode3(src) {
    const dst = new Uint8Array(src.length * 2);
    for(let i = 0; i < dst.length; i++){
        const v = src[i];
        dst[i * 2] = hexTable1[v >> 4];
        dst[i * 2 + 1] = hexTable1[v & 0x0f];
    }
    return dst;
}
var NostrKind;
(function(NostrKind) {
    NostrKind[NostrKind["META_DATA"] = 0] = "META_DATA";
    NostrKind[NostrKind["TEXT_NOTE"] = 1] = "TEXT_NOTE";
    NostrKind[NostrKind["RECOMMED_SERVER"] = 2] = "RECOMMED_SERVER";
    NostrKind[NostrKind["CONTACTS"] = 3] = "CONTACTS";
})(NostrKind || (NostrKind = {}));
class Nostr extends EventEmitter {
    relayList = [];
    relayInstances = [];
    _privateKey;
    publicKey;
    debugMode = false;
    constructor(){
        super();
    }
    set privateKey(value) {
        const decoder = new TextDecoder();
        if (value) {
            this._privateKey = value;
            this.publicKey = decoder.decode(encode3(schnorr.getPublicKey(this._privateKey)));
        }
    }
    async connect() {
        if (this.relayList.length === 0) {
            throw new Error('Please add any relay in relayList property.');
        }
        for (const relayItem of this.relayList){
            try {
                const relay = new Relay(this);
                relay.name = relayItem.name;
                relay.url = relayItem.url;
                await relay.connect();
                this.relayInstances.push(relay);
            } catch (err) {
                this.emit('relayError', err, null);
            }
        }
    }
    async isValidEvent(event) {
        return await schnorr.verify(event.sig, event.id, event.pubkey);
    }
    async getProfileEvents(filters) {
        const events = [];
        for (const relay of this.relayInstances){
            const data = await relay.subscribePromise(filters);
            if (data.length > 0 && await this.isValidEvent(data[0])) {
                events.push(data[0]);
            }
        }
        return events;
    }
    async getEvents(filters) {
        const events = [];
        for (const relay of this.relayInstances){
            const _events = await relay.subscribePromise(filters);
            for (const _evnt of _events){
                if (!events.find((evnt)=>evnt.id === _evnt.id) && await this.isValidEvent(_evnt)) {
                    events.push(_evnt);
                }
            }
        }
        return events;
    }
    async *nostrEvents(filters, unique = false) {
        function indexPromise(p, i) {
            return new Promise((resolve, reject)=>p.then((r)=>resolve({
                        value: r,
                        i
                    })).catch((reason)=>reject({
                        reason,
                        i
                    })));
        }
        const relayIterators = this.relayInstances.map((r)=>r.events(filters));
        const nextPromises = relayIterators.map((i)=>i.next());
        const indexedPromises = nextPromises.map((p, i)=>indexPromise(p, i));
        const yieldedEventIds = [];
        while(relayIterators.length > 0){
            const indexResult = await Promise.race(indexedPromises);
            if (indexResult.value.done) {
                relayIterators.splice(indexResult.i, 1);
                indexedPromises.splice(indexResult.i, 1);
                for(let i = indexResult.i; i < indexedPromises.length; i++){
                    indexedPromises[i] = indexedPromises[i].then((r)=>{
                        r.i--;
                        return r;
                    });
                }
            } else {
                if (!unique || yieldedEventIds.indexOf(indexResult.value.value.id) === -1) {
                    yield indexResult.value.value;
                    if (unique) {
                        yieldedEventIds.push(indexResult.value.value.id);
                    }
                }
                indexedPromises[indexResult.i] = indexPromise(relayIterators[indexResult.i].next(), indexResult.i);
            }
        }
    }
    async getMyProfile() {
        return await this.getProfile(this.publicKey);
    }
    async getOtherProfile(publicKey) {
        return await this.getProfile(publicKey);
    }
    disconnect() {
        return Promise.all(this.relayInstances.map((relay)=>relay.disconnect()));
    }
    async getProfile(publicKey) {
        const filters = {
            kinds: [
                NostrKind.META_DATA
            ],
            authors: [
                publicKey
            ],
            limit: 1
        };
        const events = await this.getProfileEvents(filters);
        const profileInfo = {};
        let createdAt = 0;
        for (const event of events){
            if (event.created_at > createdAt) {
                const data = JSON.parse(event.content);
                profileInfo.name = data.name;
                profileInfo.about = data.about;
                profileInfo.picture = data.picture;
                createdAt = event.created_at;
            }
        }
        const followingInfo = await this.getFollowingInfo(publicKey);
        if (followingInfo) {
            const relayData = JSON.parse(followingInfo.content);
            profileInfo.relays = [];
            for(const key in relayData){
                profileInfo.relays.push({
                    url: key,
                    read: relayData[key].read,
                    write: relayData[key].write
                });
            }
            profileInfo.following = [];
            const tags = followingInfo.tags;
            for (const tag of tags){
                if (tag.length > 0 && tag[0] === 'p') {
                    profileInfo.following.push({
                        name: '',
                        publicKey: tag[1]
                    });
                }
            }
        }
        const followerInfo = await this.getFollowerInfo(publicKey);
        if (followerInfo) {
            profileInfo.follower = [];
            for (const follower of followerInfo){
                profileInfo.follower.push({
                    name: '',
                    publicKey: follower
                });
            }
        }
        return profileInfo;
    }
    eventToPost(event) {
        const post = {
            id: event.id,
            author: event.pubkey,
            content: event.content,
            createdAt: event.created_at
        };
        const root = event.tags.find((tag)=>tag.length > 0 && tag[0] === 'e' && tag[tag.length - 1] === 'root');
        if (root) {
            post.rootReference = root[1];
        }
        const reference = event.tags.find((tag)=>tag.length > 0 && tag[0] === 'e' && tag[tag.length - 1] === 'reply');
        if (reference) {
            post.reference = root[1];
        }
        const mention = event.tags.find((tag)=>tag.length > 0 && tag[0] === 'p');
        if (mention) {
            post.mentionTo = mention[1];
        }
        return post;
    }
    async globalFeed({ limit , since , authors  }) {
        const filters = {
            kinds: [
                NostrKind.TEXT_NOTE
            ],
            limit,
            since,
            authors
        };
        const events = await this.getEvents(filters);
        const posts = [];
        for (const event of events){
            posts.push(this.eventToPost(event));
        }
        return posts;
    }
    async getPosts() {
        if (!this.publicKey) {
            throw new Error('You must set a public key for getting your posts.');
        }
        const filters = {
            kinds: [
                NostrKind.TEXT_NOTE
            ],
            authors: [
                this.publicKey
            ]
        };
        const events = await this.getEvents(filters);
        const posts = [];
        for (const event of events){
            posts.push(this.eventToPost(event));
        }
        return posts;
    }
    async getFollowerInfo(publicKey) {
        const filters = {
            kinds: [
                NostrKind.CONTACTS
            ],
            "#p": [
                publicKey
            ]
        };
        const events = await this.getEvents(filters);
        const res = [];
        for (const _event of events){
            res.push(_event.pubkey);
        }
        return res;
    }
    async getFollowingInfo(publicKey) {
        const filters = {
            kinds: [
                NostrKind.CONTACTS
            ],
            authors: [
                publicKey
            ]
        };
        const events = await this.getEvents(filters);
        let createdAt = 0;
        let event;
        for (const _event of events){
            if (_event.created_at > createdAt) {
                createdAt = _event.created_at;
                event = _event;
            }
        }
        return event;
    }
    eventCommitment(event) {
        const { pubkey , created_at , kind , tags , content  } = event;
        return JSON.stringify([
            0,
            pubkey,
            created_at,
            kind,
            tags,
            content
        ]);
    }
    utf8Encode(txt) {
        const encoder = new TextEncoder();
        return encoder.encode(txt);
    }
    hexChar(val) {
        if (val < 10) return String.fromCharCode(48 + val);
        if (val < 16) return String.fromCharCode(97 + val - 10);
    }
    hexEncode(buf) {
        let str = "";
        for(let i = 0; i < buf.length; i++){
            const c = buf[i];
            str += this.hexChar(c >> 4);
            str += this.hexChar(c & 0xF);
        }
        return str;
    }
    async calculateId(event) {
        const commit = this.eventCommitment(event);
        const sha256 = utils.sha256;
        const buf = this.utf8Encode(commit);
        return this.hexEncode(await sha256(buf));
    }
    async signId(id) {
        return await await schnorr.sign(id, this._privateKey);
    }
    async sendPost(content, rootReference, reference, mention) {
        const event = {
            content,
            created_at: Math.floor(Date.now() / 1000),
            id: '',
            kind: NostrKind.TEXT_NOTE,
            pubkey: this.publicKey,
            sig: '',
            tags: []
        };
        if (rootReference) {
            event.tags.push([
                'e',
                rootReference,
                '',
                'root'
            ]);
            if (reference) {
                event.tags.push([
                    'e',
                    reference,
                    '',
                    'reply'
                ]);
            }
        }
        for (const relay of this.relayInstances){
            try {
                event.tags = event.tags.map((tags)=>tags[0] === 'e' ? [
                        tags[0],
                        tags[1],
                        relay.url,
                        tags[3]
                    ] : tags);
                event.id = await this.calculateId(event);
                event.sig = new TextDecoder().decode(encode3(await this.signId(event.id)));
                this.log('Send event;', event);
                await relay.sendEvent(event);
            } catch (err) {
                console.error(`Send event error; ${err.message} Relay name; ${relay.name}`);
            }
        }
    }
    async sendTextPost(content) {
        await this.sendPost(content);
    }
    async sendReplyPost(content, post) {
        await this.sendPost(content, post.rootReference, post.reference);
    }
    log(...args) {
        if (this.debugMode) {
            console.log('Debug:', ...args);
        }
    }
}
export { Nostr as Nostr, Relay as Relay, NostrKind as NostrKind };
