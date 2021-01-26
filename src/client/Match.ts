export type MapName = 'burg'
    | 'littletown'
    | 'sandstorm'
    | 'subzero'
    | 'undergrowth'
    | 'freight'
    | 'lostworld'
    | 'citadel'
    | 'oasis'
    | 'kanji'
    | 'industry'
    | 'evacuation'
    | 'site';

export type ModeName = 'ffa' | 'tdm' | 'point' | 'ctf' | 'kc';

export interface Map {
    id: number;
    name: MapName | '';
}

export interface Mode {
    id: number;
    name: ModeName | '';
}

export interface Match {
    map: Map;
    mode: Mode;
    text: string;
}

export const mapFromId = (id: number): Map => {
    switch (id) {
    case 0:
        return { id, name: 'burg' };
    case 1:
        return { id, name: 'littletown' };
    case 2:
        return { id, name: 'sandstorm' };
    case 3:
        return { id, name: 'subzero' };
    case 4:
        return { id, name: 'undergrowth' };
    case 6:
        return { id, name: 'freight' };
    case 7:
        return { id, name: 'lostworld' };
    case 8:
        return { id, name: 'citadel' };
    case 9:
        return { id, name: 'oasis' };
    case 10:
        return { id, name: 'kanji' };
    case 11:
        return { id, name: 'industry' };
    case 13:
        return { id, name: 'evacuation' };
    case 14:
        return { id, name: 'site' };
    default:
        return { id: -1, name: '' };
    }
};

export const mapFromName = (name: string): Map => {
    switch (name) {
    case 'burg':
        return { id: 0, name };
    case 'littletown':
        return { id: 1, name };
    case 'sandstorm':
        return { id: 2, name };
    case 'subzero':
        return { id: 3, name };
    case 'undergrowth':
        return { id: 4, name };
    case 'freight':
        return { id: 5, name };
    case 'lostworld':
        return { id: 6, name };
    case 'citadel':
        return { id: 7, name };
    case 'oasis':
        return { id: 8, name };
    case 'kanji':
        return { id: 9, name };
    case 'industry':
        return { id: 10, name };
    case 'evacuation':
        return { id: 11, name };
    case 'site':
        return { id: 12, name };
    default:
        return { id: -1, name: '' };
    }
};

export const modeFromId = (id: number): Mode => {
    switch (id) {
    case 0:
        return { id, name: 'ffa' };
    case 1:
        return { id, name: 'tdm' };
    case 2:
        return { id, name: 'point' };
    case 3:
        return { id, name: 'ctf' };
    case 4:
        return { id, name: 'kc' };
    default:
        return { id: -1, name: '' };
    }
};

export const modeFromName = (name: string): Mode => {
    switch (name) {
    case 'ffa':
        return { id: 0, name };
    case 'tdm':
        return { id: 1, name };
    case 'point':
        return { id: 2, name };
    case 'ctf':
        return { id: 3, name };
    case 'kc':
        return { id: 4, name };
    default:
        return { id: -1, name: '' };
    }
};

export const toMatch = (text: string): Match => {
    const parts = text.split(',');
    return {
        map: mapFromId(parseInt(parts[1], 10)),
        mode: modeFromId(parseInt(parts[0], 10)),
        text
    };
};
