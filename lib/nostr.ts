// deno-lint-ignore-file no-explicit-any
import EventEmitter from "https://deno.land/x/events@v1.0.0/mod.ts";
import Relay, { NostrEvent } from "./relay.ts";
import * as secp from "https://deno.land/x/secp256k1@1.7.0/mod.ts";
import * as mod from "https://deno.land/std@0.170.0/encoding/hex.ts";
import Message from "./message.ts";
import { bech32 } from 'https://raw.githubusercontent.com/paulmillr/scure-base/main/mod.ts';

export enum NostrKind {
    META_DATA = 0,
    TEXT_NOTE = 1,
    RECOMMED_SERVER = 2,
    CONTACTS = 3,
    DIRECT_MESSAGE = 4
}

export interface RelayList {
    name: string;
    url: string;
}

export interface NostrFilters {
    ids?: Array<string>;
    authors?: Array<string>;
    kinds?: Array<NostrKind>;
    "#e"?: Array<string>;
    "#p"?: Array<string>;
    since?: number;
    until?: number;
    limit?: number;
}

export interface ProfileInfo {
    name?: string;
    picture?: string;
    about?: string;
    relays?: Array<{url: string; read: boolean; write: boolean}>;
    following?: Array<{publicKey: string; name: string}>;
    follower?: Array<{publicKey: string; name: string}>;
}

export interface NostrPost {
    id: string;
    content: string;
    author: string;
    createdAt: number;
    reference?: string;
    rootReference?: string;
    mentionTo?: string;
}

interface NostrEvents {
    'relayConnected': (relay: Relay) => void;
    'relayError': (error: Error, relay: Relay|null) => void;
    'relayNotice': (notice: Array<string>) => void;
    'relayPost': (id: string, status: boolean, errorMessage: string, relay: Relay) => void;
}

export interface NostrMessage {
    content: string;
    sender: string;
    receiver: string;
    createdAt: number;
}

declare interface Nostr {
    on<U extends keyof NostrEvents>(
      event: U, listener: NostrEvents[U]
    ): this;
  
    emit<U extends keyof NostrEvents>(
      event: U, ...args: Parameters<NostrEvents[U]>
    ): boolean;
}

class Nostr extends EventEmitter {
    public relayList: Array<RelayList> = [];
    private relayInstances: Array<Relay> = [];
    private _privateKey: any;
    private _publicKey: any;
    public debugMode = false;

    constructor() {
        super();
    }

    private getKeyFromNip19(key: string) {
        const code = bech32.decode(key, 1500);
        const data = new Uint8Array(bech32.fromWords(code.words));
        return secp.utils.bytesToHex(data);
    }

    public set privateKey(value: string) {
        if (value.substring(0, 4) === 'nsec') {
            value = this.getKeyFromNip19(value);
        }
        const decoder = new TextDecoder();
        if (value) {
            this._privateKey = value;
            this._publicKey = decoder.decode(mod.encode(secp.schnorr.getPublicKey(this._privateKey)));
        }
    }

    public set publicKey(value: string) {
        if (value.substring(0, 4) === 'npub') {
            value = this.getKeyFromNip19(value);
        }
        this._publicKey = value;
    }

    async connect() {
        if (this.relayList.length === 0) {
            throw new Error('Please add any relay in relayList property.');
        }
        for (const relayItem of this.relayList) {
            try {
                const relay = new Relay(this);
                relay.name = relayItem.name;
                relay.url = relayItem.url;
                await relay.connect();
                this.relayInstances.push(relay);
            } catch (err: any) {
                this.emit('relayError', err, null);
            }
        }
    }

    async isValidEvent(event: NostrEvent): Promise<boolean> {
        return await secp.schnorr.verify(event.sig, event.id, event.pubkey);
    }

    async getProfileEvents(filters: NostrFilters) {
        const events: Array<NostrEvent> = [];
        for (const relay of this.relayInstances) {
            const data = await relay.subscribePromise(filters);
            if (data.length > 0 && await this.isValidEvent(data[0])) {
                events.push(data[0]);
            }
        }
        return events;
    }

    /**
     * Usage example:
     * for await (const event of nostr.filter({
     *       kinds: [NostrKind.META_DATA],
     *       authors: [publicKey],
     *       limit: 1
     *   })) {
     *       console.log(event)
     *   } 
     * 
     * @param filters the filters the events must match
     * @param unique set to true to avoid duplicate results
     * @returns an async iterable over the matching events
     */
    filter(filters: NostrFilters, unique = true) {
        const relayIterators = this.relayInstances.map(r => r.events(filters));
        return {

            async collect(): Promise<Array<NostrEvent>> {
                const events: Array<NostrEvent> = [];
                for await (const event of this) {
                    events.push(event);
                }
                return events;
            },

            async each(cb: ((event: NostrEvent) => void)): Promise<void> {
                for await (const event of this) {
                    cb(event);
                }
            },

            async * [Symbol.asyncIterator]() {
                function indexPromise<T>(p: Promise<T>, i: number): Promise<{value: T, i: number}> {
                    return new Promise((resolve, reject) => p.then(r => resolve({value: r, i})).catch(reason => reject({reason, i})))
                }

                const nextPromises = relayIterators.map(i => i.next());
                const indexedPromises: Array<Promise<{value: IteratorResult<NostrEvent>, i: number}>> = nextPromises.map((p, i) => indexPromise(p,i));
                const yieldedEventIds = []
                while (relayIterators.length > 0) {
                    const indexResult = await Promise.race(indexedPromises);
                    if (indexResult.value.done) {
                        relayIterators.splice(indexResult.i,1);
                        indexedPromises.splice(indexResult.i,1);
                        for (let i = indexResult.i; i < indexedPromises.length; i++) {
                            indexedPromises[i] = indexedPromises[i].then(r => {r.i--; return r});
                        }
                    } else {
                        if (!unique || (yieldedEventIds.indexOf(indexResult.value.value.id) === -1)) {
                            yield indexResult.value.value;
                            if (unique) {
                                yieldedEventIds.push(indexResult.value.value.id)
                            }
                        }
                        indexedPromises[indexResult.i] = indexPromise(relayIterators[indexResult.i].next(), indexResult.i);
                    }
                }
            }
        }

    }

    async getMyProfile(): Promise<ProfileInfo> {
        return await this.getProfile(this._publicKey);
    }

    async getOtherProfile(publicKey: string): Promise<ProfileInfo> {
        return await this.getProfile(publicKey);
    }

    disconnect() {
        return Promise.all(this.relayInstances.map(relay => relay.disconnect()));
    }

    private async getProfile(publicKey: string): Promise<ProfileInfo> {
        const filters = {
            kinds: [NostrKind.META_DATA],
            authors: [publicKey],
            limit: 1
        } as NostrFilters;
        const events = await this.getProfileEvents(filters);
        const profileInfo: ProfileInfo = {};
        let createdAt = 0;
        for (const event of events) {
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
            for (const key in relayData) {
                profileInfo.relays.push({
                    url: key,
                    read: relayData[key].read,
                    write: relayData[key].write
                });
            }
            profileInfo.following = [];
            const tags = followingInfo.tags;
            for (const tag of tags) {
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
            for (const follower of followerInfo) {
                profileInfo.follower.push({
                    name: '',
                    publicKey: follower
                });
            }
        }
        return profileInfo;
    }
    
    private eventToPost(event: NostrEvent): NostrPost {
        const post: NostrPost = {
            id: event.id,
            author: event.pubkey,
            content: event.content,
            createdAt: event.created_at
        };
        const root = event.tags.find((tag: Array<string>) => (tag.length > 0 && tag[0] === 'e' && tag[tag.length - 1] === 'root'));
        if (root) {
            post.rootReference = root[1];
        }
        const reference = event.tags.find((tag: Array<string>) => (tag.length > 0 && tag[0] === 'e' && tag[tag.length - 1] === 'reply'));
        if (reference) {
            post.reference = root[1];
        }
        const mention = event.tags.find((tag: Array<string>) => (tag.length > 0 && tag[0] === 'p'));
        if (mention) {
            post.mentionTo = mention[1];
        }
        return post;
    }

    async globalFeed({
        limit,
        since,
        authors
    }: { limit?: number, since?: number, authors?: Array<string>}): Promise<Array<NostrPost>> {
        const filters = {
            kinds: [NostrKind.TEXT_NOTE],
            limit,
            since,
            authors
        } as NostrFilters;
        const events = await this.filter(filters).collect();
        const posts = [] as Array<NostrPost>;
        for (const event of events) {
            posts.push(this.eventToPost(event));
        }
        return posts;
    }

    async getPosts() {
        if (!this._publicKey) {
            throw new Error('You must set a public key for getting your posts.');
        }
        const filters = {
            kinds: [NostrKind.TEXT_NOTE],
            authors: [this._publicKey]
        } as NostrFilters;
        const events = await this.filter(filters).collect();
        const posts = [] as Array<NostrPost>;
        for (const event of events) {
            posts.push(this.eventToPost(event));
        }
        return posts;
    }

    private async getFollowerInfo(publicKey: string) {
        const filters = {
            kinds: [NostrKind.CONTACTS],
            "#p": [publicKey]
        } as NostrFilters;
        const events = await this.filter(filters).collect();
        const res: Array<string> = [];
        for (const _event of events) {
            res.push(_event.pubkey);
        }
        return res;
    }


    private async getFollowingInfo(publicKey: string) {
        const filters = {
            kinds: [NostrKind.CONTACTS],
            authors: [publicKey]
        } as NostrFilters;
        const events = await this.filter(filters).collect();
        let createdAt = 0;
        let event;
        for (const _event of events) {
            if (_event.created_at > createdAt) {
                createdAt = _event.created_at;
                event = _event;
            }
        }
        return event;
    }

    private eventCommitment(event: NostrEvent): string {
        const {pubkey,created_at,kind,tags,content} = event;
	    return JSON.stringify([0, pubkey, created_at, kind, tags, content]);
    }

    private utf8Encode(txt: string) {
        const encoder = new TextEncoder()
        return encoder.encode(txt);
    }

    private hexChar(val: number) {
        if (val < 10)
            return String.fromCharCode(48 + val)
        if (val < 16)
            return String.fromCharCode(97 + val - 10)
    }
    
    private hexEncode(buf: any) {
        let str = ""
        for (let i = 0; i < buf.length; i++) {
            const c = buf[i]
            str += this.hexChar(c >> 4)
            str += this.hexChar(c & 0xF)
        }
        return str
    }

    private async calculateId(event: NostrEvent) {
        const commit = this.eventCommitment(event);
        const sha256 = secp.utils.sha256;
        const buf = this.utf8Encode(commit);
        return this.hexEncode(await sha256(buf))
    }

    private async signId(id: string) {
        return await (await secp.schnorr.sign(id, this._privateKey));
    }

    private async sendPost(content: string, rootReference?: string, reference?: string, mention?: string) {
        const event: NostrEvent = {
            content,
            created_at: Math.floor(Date.now() / 1000),
            id: '',
            kind: NostrKind.TEXT_NOTE,
            pubkey: this._publicKey,
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
        for (const relay of this.relayInstances) {
            try {
                event.tags = event.tags.map((tags: Array<string>) => tags[0] === 'e' ? [tags[0], tags[1], relay.url, tags[3]] : tags);
                event.id = await this.calculateId(event);
                event.sig = new TextDecoder().decode(mod.encode(await this.signId(event.id)));
                this.log('Send event;', event);
                await relay.sendEvent(event);
            } catch (err: any) {
                console.error(`Send event error; ${err.message} Relay name; ${relay.name}`);
            }
        }
    }

    async sendTextPost(content: string) {
        await this.sendPost(content);
    }

    async sendReplyPost(content: string, post: NostrPost) {
        await this.sendPost(content, post.rootReference, post.reference);
    }

    public log(...args: any) {
        if (this.debugMode) {
            console.log('Debug:', ...args);
        }
    }

    public async sendMessage(to: string, message: any) {
        if (!this._privateKey) {
            throw new Error('You must set a private key send to the message.');
        }
        if (to.substring(0, 4) === 'npub') {
            to = this.getKeyFromNip19(to);
        }
        const encrypted = await Message.encryptMessage(to, message, this._privateKey);
        const event: NostrEvent = {
            id: '',
            created_at: Math.floor(Date.now() / 1000),
            kind: NostrKind.DIRECT_MESSAGE,
            pubkey: this._publicKey,
            tags: [['p', to]],
            content: encrypted,
            sig: ''
        };
        event.id = await this.calculateId(event);
        event.sig = new TextDecoder().decode(mod.encode(await this.signId(event.id)));
        for (const relay of this.relayInstances) {
            try {
                await relay.sendEvent(event);
            } catch (err) {
                console.error(`Send direct message event error; ${err.message} Relay name; ${relay.name}`);
            }
        }
    }

    public async getMessages(): Promise<NostrMessage[]> {
        if (!this._privateKey) {
            throw new Error('You must set a private key send to the message.');
        }
        const events = await this.filter({
            kinds: [NostrKind.DIRECT_MESSAGE],
            "#p": this._publicKey
        }).collect();
        const messages: NostrMessage[] = [];
        for (const event of events) {
            const sender= event.tags.find(([k, v]) => k === 'p' && v && v !== '')[1];
            try {
                const pubKey = sender === this._publicKey ? event.pubkey : sender;
                const msg = await Message.decrypt(this._privateKey, pubKey, event.content);
                messages.push({
                    content: msg,
                    sender,
                    receiver: event.pubkey,
                    createdAt: event.created_at
                });
            } catch (err) {
                this.log('Decrypt error;', err.message);
            }
        }
        return messages;
    }
    
}

export {
   Nostr
};
