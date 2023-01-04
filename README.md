## Nostr Deno Client Library
Nostr protocol client library for deno runtime.

Nostr - https://github.com/nostr-protocol/nostr
Deno - https://deno.land/

### Features
---
 - [x] Multiple relay support
 - [x] Profile information
 - [x] Global feed
 - [x] User's posts
 - [x] Follows
 - [x] Followers
 - [x] Reply post.
 - [x] Debug mode.
 - [x] Promise-based simple and easy to use.

### Usage
---

```javascript
import { Nostr, Relay } from 'https://deno.land/x/nostr_deno_client/mod.ts';

const nostr = new Nostr();

nostr.privateKey = '';  // A private key is optional. Only used for sending posts.

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

await nostr.disconnect();
console.log('Finish');
```

### Supported NIPs
---

NIP-01, NIP-02, NIP-05, NIP-08, NIP-10, NIP-20

### Roadmap
---

 - [ ] Encrypted DMs.
 - [ ] NIP-05 DNS-based internet identifier checking.
 - [ ] Add user for follow.
 - [ ] Public chat (channels).
 - [ ] Hashtag list. NIP-12
 - [ ] Filter posts with hashtag.
 - [ ] CI for deno build.
 - [ ] Split examples.
 
