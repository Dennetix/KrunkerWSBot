import * as mongoose from 'mongoose';

export interface Version extends mongoose.Document {
    number: string,
    msgIndexSequence: [number, number][]
}

export const VersionSchema = new mongoose.Schema<Version>({
    number: {
        type: String,
        required: true,
        index: {
            unique: true,
            collation: { locale: 'en', strength: 2 }
        }
    },
    msgIndexSequence: {
        type: [[Number]],
        required: true
    }
});

export const VersionModel = mongoose.model<Version>('version', VersionSchema);
