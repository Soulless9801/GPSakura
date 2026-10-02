// all in one JSON stringify and parse for:
// - Map

type Serializable = string | number | boolean | null | Serializable[] | { [key: string]: Serializable } | Map<Serializable, Serializable>;

interface MapPayload {
    dataType: 'Map';
    value: Array<[Serializable, Serializable]>;
}

function isMapPayload(value: object): value is MapPayload {
    if (!('dataType' in value) || !('value' in value)) {return false;}
    return value.dataType === 'Map' && Array.isArray(value.value);
}

function replacer(_key: string, value: Serializable): Serializable {
    if (value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()),
        };
    } else {
        return value;
    }
}
        
function reviver(_key: string, value: Serializable): Serializable {
    if (typeof value === "object" && value !== null && isMapPayload(value)) {
        return new Map(value.value);
    } else {
        return value;
    }
}

export function serialize(data: object): string {
    return JSON.stringify(data, replacer);
}

export function deserialize<T>(data: string, _defaultValue?: T): T {
    return JSON.parse(data, reviver) as T;
}
