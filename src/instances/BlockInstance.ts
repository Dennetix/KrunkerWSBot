import { Bot } from '../Bot';
import { Client } from '../client/Client';
import { Instance } from './Instance';

export class BlockInstance extends Instance {

    constructor(bot: Bot, name: string, gameId: string, maxClients: number) {
        super(bot, name, gameId, maxClients);
    }

    protected begin(): void {
        this.lobby?.generateSocketURIs(this.maxClients)
            .then((uris) => {
                this.clients.push(new Client(this, uris.shift()!, true, undefined, false));
                uris.forEach(uri => this.clients.push(new Client(this, uri, false, undefined, false)));
            })
            .catch((e) => {
                console.error('Error while initializing clients: ', e);
                this.stop();
            });
    }

    public onClientDisconnect(client: Client): void {
        this.lobby?.generateSocketURI()
            .then((uri) => {
                this.clients.push(new Client(this, uri, client.mainClient, undefined, false));
            })
            .catch((e) => {
                console.error('Error while initializing client: ', e);
                this.stop();
            });
    }

    /* eslint-disable @typescript-eslint/no-empty-function */
    public onGameStarted(): void { }
    public onGameEnded(): void { }
    public onClientSpawned(): void { }
    public onClientDied(): void { }
    protected end(): void { }
    /* eslint-enable @typescript-eslint/no-empty-function */

}
