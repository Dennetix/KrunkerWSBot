import { Bot } from '../Bot';
import { Client } from '../client/Client';
import { Match, modeFromName } from '../client/Match';
import maps from '../maps.json';
import { when } from '../utils/Utils';
import { Instance } from './Instance';

export class VoteInstance extends Instance {

    constructor(bot: Bot, name: string, gameId: string, maxClients: number) {
        super(bot, name, gameId, maxClients, [], [modeFromName('ffa'), modeFromName('tdm'), modeFromName('ctf'), modeFromName('kc')]);
    }

    public onGameStarted(): void {
        when(() => !!this.time, () => {
            if (this.time! > 1.5) {
                return this.stop();
            }

            when(() => this.time! < 0.05, () => this.clients[0].enterGame());
        });
    }

    public onGameEnded(matches: Match[]): void {
        const match = matches.find(m => (
            maps.available.includes(m.map.name) &&
            m.mode.name === 'point'
        ));

        if (!match) {
            return this.stop();
        }

        this.clients[0].voteMatch(match);
    }

    protected begin(): void {
        this.lobby?.generateSocketURI()
            .then((uri) => {
                this.clients.push(new Client(this, uri, true, undefined, false));
            })
            .catch((e) => {
                console.error('Error while initializing clients: ', e);
                this.stop();
            });
    }

    /* eslint-disable @typescript-eslint/no-empty-function */
    public onClientSpawned(): void { }
    public onClientDied(): void { }
    public onClientDisconnect(): void { }
    protected end(): void { }
    /* eslint-enable @typescript-eslint/no-empty-function */

}
