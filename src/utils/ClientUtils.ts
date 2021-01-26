import { MapData } from '../instances/Instance';

export const cellToPos = (map: MapData, cell: { x: number, y: number }): { x: number, z: number } => {
    return {
        x: map.offset.x + (cell.x * 10) + 5,
        z: map.offset.z + (cell.y * 10) + 5
    };
};

export const posToCell = (map: MapData, pos: { x: number, z: number }): { x: number, y: number } => {
    return {
        x: Math.floor((pos.x - map.offset.x) / 10),
        y: Math.floor((pos.z - map.offset.z) / 10)
    };
};
