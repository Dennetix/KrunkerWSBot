import axios from 'axios';
import { Version, VersionModel } from '../models/VersionModel';

export class VersionManager {

    private static initialized = false;

    private static version: Version | null;

    private constructor() { }

    public static async init(): Promise<void> {
        const versionsTxt = (await axios.get<string>('https://krunker.io/docs/versions.txt', { responseType: 'text' })).data;
        const newVersionNumber = new RegExp(/==\supdate\s((\d+\.?)+)\s==/i).exec(versionsTxt)![1];

        if (this.version && this.version.number === newVersionNumber) {
            return;
        }

        this.version = await VersionModel.findOne({ number: newVersionNumber });
        if (!this.version) {
            // TODO query version informatino automatically
            throw Error(`No version information available for version ${newVersionNumber}`);
        }

        if (!this.initialized) {
            setInterval(() => {
                this.init()
                    .catch(console.error);
            }, 900000);
        }

        this.initialized = true;
    }

    public static get msgIndexSequence(): [number, number][] {
        if (!this.version) {
            throw Error('No version information available');
        }
        return this.version.msgIndexSequence;
    }

}
