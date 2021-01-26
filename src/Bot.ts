import { app, BrowserWindow } from 'electron';
import * as mongoose from 'mongoose';
import { FarmInstance } from './instances/FarmInstance';
import { Instance } from './instances/Instance';
import { VoteInstance } from './instances/VoteInstance';
import { AccountManager } from './managers/AccountManager';
import { VersionManager } from './managers/VersionManager';
import { envConfig } from './utils/EnvConfiguration';
import { BlockInstance } from './instances/BlockInstance';

export class Bot {

    private instances: Instance[] = [];
    private persistendInstances: Instance[] = [];

    constructor() {
        this.startNewInstance(VoteInstance, 'VoteInstance1');
        this.startNewInstance(VoteInstance, 'VoteInstance2');
        this.startNewInstance(VoteInstance, 'VoteInstance3');
        this.startNewInstance(VoteInstance, 'VoteInstance4');
        this.startNewInstance(VoteInstance, 'VoteInstance5');
        this.startNewInstance(FarmInstance, 'FarmInstance1');
        this.startNewInstance(FarmInstance, 'FarmInstance2');
    }

    public startNewInstance<T extends Instance>(
        type: new (bot: Bot, name: string, gameId: string, maxClients: number) => T,
        name: string,
        gameId: string = '',
        persistend: boolean = true,
        maxClients: number = 4
    ): void {
        const instance = new type(this, name, gameId, maxClients);
        console.log(`Started new instance '${instance.name}'`);

        if (persistend) {
            this.persistendInstances.push(instance);
        } else {
            this.instances.push(instance);
        }
    }

    public onInstnaceEnd(instance: Instance): void {
        console.log(`Instance '${instance.name}' has stopped`);

        if (this.instances.includes(instance)) {
            this.instances.splice(this.instances.indexOf(instance), 1);
            return;
        }

        this.persistendInstances.splice(this.persistendInstances.indexOf(instance), 1);

        let type: new (bot: Bot, name: string, gameId: string, maxClients: number) => Instance = FarmInstance;
        if (instance instanceof VoteInstance) {
            type = VoteInstance;
        } else if (instance instanceof BlockInstance) {
            type = BlockInstance;
        }
        setTimeout(() => this.startNewInstance(type, instance.name, instance.gameId, true, instance.maxClients), 2500);
    }

}

app.once('ready', () => {
    // Hidden window to keep the process running when no other window is open
    new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } });

    mongoose.connect(envConfig.dbUri, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false
    })
        .then(() => {
            console.log('Connected to database');
            return Promise.all([VersionManager.init(), AccountManager.init()]);
        })
        .then(() => new Bot())
        .catch(console.error);
});
