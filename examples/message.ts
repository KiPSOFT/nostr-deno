import { Nostr, Relay } from "../nostr.ts";

const nostr = new Nostr();

nostr.relayList.push({
    name: 'Nostrprotocol',
    url: 'wss://relay.nostrprotocol.net'
});

nostr.on('relayConnected', (relay: Relay) => console.log('Relay connected.', relay.name));
nostr.on('relayError', (err: Error) => console.log('Relay error;', err));
nostr.on('relayNotice', (notice: string[]) => console.log('Notice', notice));

await nostr.connect();

nostr.privateKey = 'nsec***********************';

await nostr.sendMessage('npub*******************', 'Nostr Deno');
console.log(await nostr.getMessages());