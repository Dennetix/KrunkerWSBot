import { Bot } from '../Bot';
import { Client } from '../client/Client';
import { mapFromName, Match, modeFromName } from '../client/Match';
import config from '../config.json';
import { AccountManager } from '../managers/AccountManager';
import maps from '../maps.json';
import { setImmediateInterval, when } from '../utils/Utils';
import { Instance } from './Instance';

export class FarmInstance extends Instance {

    private haveClientsMet = false;
    private intervals: [Client, NodeJS.Timeout][] = [];

    constructor(bot: Bot, name: string, gameId: string, maxClients: number) {
        super(bot, name, gameId, maxClients, maps.available.map(m => mapFromName(m)), [modeFromName('point')]);
    }

    public onGameStarted(): void {
        this.loadMap()
            .then(() => when(() => !!this.time, () => this.isReady = true))
            .catch(console.error);
    }

    public onGameEnded(matches: Match[]): void {
        this.reset();
        this.haveClientsMet = false;
        this.intervals.forEach(i => clearInterval(i[1]));
        this.intervals = [];

        const match = matches.find(m => (
            maps.available.includes(m.map.name) &&
            m.mode.name === 'point'
        ));

        if (match) {
            this.clients.forEach(c => c.voteMatch(match));
        } else {
            setTimeout(this.stop.bind(this), 500);
        }
    }

    public onClientSpawned(client: Client): void {
        this.moveToPoint(client);
    }

    public onClientDied(client: Client): void {
        const interval = this.intervals.find(i => i[0] === client);
        if (interval) {
            clearInterval(interval[1]);
        }
    }

    public onClientDisconnect(client: Client): void {
        if (client.name) {
            AccountManager.releaseAccount(client.name);
        }
        this.stop();
    }

    protected begin(): void {
        this.lobby?.generateSocketURIs(this.maxClients > 1 ? 2 : 1)
            .then((uris) => {
                this.clients.push(new Client(this, uris[0], true, AccountManager.findAccount()));
                if (this.maxClients > 1) {
                    this.clients.push(new Client(this, uris[1], false, AccountManager.findAccount()));
                }
            })
            .catch((e) => {
                console.error('Error while initializing clients: ', e);
                this.stop();
            });
    }

    protected end(): void {
        this.intervals.forEach(i => clearInterval(i[1]));
    }

    private moveToPoint(client: Client): void {
        const minutes = Math.floor(this.time!);
        const point = this.map!.points[3 - minutes];
        client.findPathAndMove(point)
            .then(() => {
                const interval = setImmediateInterval(() => {
                    if (
                        !this.haveClientsMet &&
                        this.clients.every((c, i) => {
                            return c.distanceTo(this.clients[(i + 1) >= this.clients.length ? 0 : i + 1].position) <= config.clientsMeetDistance;
                        })
                    ) {
                        this.haveClientsMet = true;
                        setTimeout(this.shootAtOther.bind(this), 1100);
                    }

                    if (Math.floor(this.time!) < minutes) {
                        this.intervals.splice(this.intervals.findIndex(i => i[1] === interval), 1);
                        clearInterval(interval);
                        this.moveToPoint(client);
                    }
                }, 1000);
                this.intervals.push([client, interval]);
            })
            .catch((e) => {
                console.error('Error while moving to point: ', e);
                this.stop();
            });
    }

    private shootAtOther(): void {
        this.clients.forEach((c, i) => {
            c.lookAt(this.clients[(i + 1) >= this.clients.length ? 0 : i + 1].position);
            setTimeout(() => {
                c.shoot(true);
                c.shoot(false);
            }, 200);
        });
    }

}
