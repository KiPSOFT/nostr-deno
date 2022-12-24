import { Nostr, Relay } from 'https://deno.land/x/nostr_deno_client@v0.1.2/nostr.ts';

const nostr = new Nostr('<Private key>');

nostr.relayList.push({
    name: 'Semisol',
    url: 'wss://nostr-pub.semisol.dev'
});

nostr.relayList.push({
    name: 'Wellorder',
    url: 'wss://nostr-pub.wellorder.net'
});

nostr.on('relayConnected', (relay: Relay) => console.log('Relay connected.', relay.name));
nostr.on('relayError', (err: Error) => console.log('Relay error;', err));
nostr.on('relayNotice', (notice: string[]) => console.log('Notice', notice));

nostr.debugMode = true;

await nostr.connect();

await nostr.sendTextPost('Hello nostr deno client library.');

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

console.log('Finish');