// import { Nostr, Relay, NostrKind } from 'https://deno.land/x/nostr_deno_client@v0.2.1/mod.ts';
import { Nostr, Relay, NostrKind } from "../nostr.ts";

const nostr = new Nostr();

nostr.relayList.push({
    name: 'Nostrprotocol',
    url: 'wss://relay.nostrprotocol.net'
});

nostr.on('relayConnected', (relay: Relay) => console.log('Relay connected.', relay.name));
nostr.on('relayError', (err: Error) => console.log('Relay error;', err));
nostr.on('relayNotice', (notice: string[]) => console.log('Notice', notice));

nostr.debugMode = true;

await nostr.connect();

const filter = { kinds: [NostrKind.TEXT_NOTE], limit: 10 };

//method 1: for await
console.log('iterable return');
for await (const note of nostr.filter(filter) ) {
    console.log(note);
}

//method 2: collect
console.log('promise return');
const allNotes = await nostr.filter(filter).collect();
console.log(allNotes);

//method 3: callback
console.log('callback return');
await nostr.filter(filter).each(note => {
    console.log(note);
});


nostr.privateKey = ''; // A private key is optional. Only used for sending posts.
await nostr.sendTextPost('Hello nostr deno client library.');

nostr.publicKey = ''; // You need a public key for get posts.
const posts = await nostr.getPosts();
console.log('Posts', posts);

const post = posts[posts.length - 1];
await nostr.sendReplyPost('Test reply.', post);

const profile = await nostr.getMyProfile();
console.log('Profile', profile);

const feeds = await nostr.globalFeed({
    limit: 10
});
console.log('Feeds', feeds);

console.log(nostr.getNip19FromKey('public key'));

Deno.exit();


console.log('Finish');
