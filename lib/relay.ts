// deno-lint-ignore-file no-explicit-any
import { WebSocketClient, StandardWebSocketClient } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { Nostr, NostrFilters, NostrKind } from "./nostr.ts";

interface Listener {
    subscribeId: string;
    func: any;
}

export interface NostrEvent {
    id: string;
    pubkey: string;
    created_at: number;
    kind: NostrKind;
    tags: Array<any>;
    content: string;
    sig: string;
}

class Relay {
    public url: string|undefined;
    public name: string|undefined;
    private ws: WebSocketClient|undefined;
    private nostr: Nostr;
    public relayConnectionTimeout = 15000;
    public connected = false;
    public reconnect = false;
    private manualClose = false;
    private listeners: Array<Listener> = [];

    constructor(_nostr: Nostr) {
        this.nostr = _nostr;
    }

    connect() {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Relay connection timeout.')), this.relayConnectionTimeout);
            this.ws = new StandardWebSocketClient(this.url);
            this.ws.on('open', () => {
                 this.nostr.emit('relayConnected', this);
                 clearTimeout(timer);
                 this.connected = true;
                 resolve(true);
            });
            this.ws.on('error', (err: any) => {
                if (!this.connected) {
                    reject(new Error('Relay connection error.'));
                    return;
                }
                this.sendErrorEvent(err);
                if (this.reconnect && !this.manualClose) {
                    this.connect();
                }
            });
            this.ws.on('close', () => {
                if (this.reconnect && !this.manualClose) {
                    this.connect();
                }
            });
            this.ws.on('message', (message: any) => this.handleMessage(message));
        });
    }

    async disconnect() {
        this.manualClose = true;
        await this.ws?.close(0);
    }

    sendErrorEvent(err: Error) {
        this.nostr.emit('relayError', err, this);
    }

    public subscribe(filters: NostrFilters, listenerFunc: any) {
        const subscribeId = crypto.randomUUID();
        let data: string;
        if (Array.isArray(filters)) {
            data = JSON.stringify([ 'REQ', subscribeId, ...filters ]);
        } else {
            data = JSON.stringify([ 'REQ', subscribeId, filters ]);
        }
        this.listeners.push({
            subscribeId,
            func: listenerFunc
        });
        this.ws?.send(data);
    }

    public subscribePromise(filters: NostrFilters): Promise<Array<NostrEvent>> {
        return new Promise((resolve, reject) => {
            const subscribeId = crypto.randomUUID();
            let data: string;
            if (Array.isArray(filters)) {
                data = JSON.stringify([ 'REQ', subscribeId, ...filters ]);
            } else {
                data = JSON.stringify([ 'REQ', subscribeId, filters ]);
            }
            const events: Array<NostrEvent> = [];
            const listener = {
                subscribeId,
                func: (event:NostrEvent, eose: boolean) => {
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

    getListener(subscribeId: string) {
        return this.listeners.find((listener: Listener) => listener.subscribeId === subscribeId);
    }

    triggerListenerFunc(subscribeId: string, data: any){
        const event = data as NostrEvent;
        const listener = this.getListener(subscribeId);
        if (listener) {
            listener.func(event, false);
        }
    }

    deleteListener(subscribeId: string) {
        const listener = this.getListener(subscribeId);
        if (listener) {
            listener.func(null, true);
        }
        this.listeners = this.listeners.filter((listener: Listener) => listener.subscribeId !== subscribeId);
    }

    handleMessage(message: any) {
        let data: Array<string>;
        try {
            data = JSON.parse(message.data);
            this.nostr.log(data);
        } catch (err: any) {
            this.sendErrorEvent(err);
            return;
        }
        if (data.length >= 2) {
            switch (data[0]) {
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

    sendEvent(event: NostrEvent) {
        return new Promise((resolve, reject) => {
            const message = JSON.stringify(['EVENT', event]);
            this.nostr.once('relayPost', (id: string, status: boolean, errorMessage: string, relay: Relay) => {
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

export default Relay;