// all in one JSON stringify and parse for:
// - Map

function replacer(key: string, value: any) {
    if (value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()),
        };
    } else {
        return value;
    }
}
        
function reviver(key: string, value: any) {
    if (value && value.dataType === 'Map') {
        return new Map(value.value);
    } else {
        return value;
    }
}

export function serialize(data: any): string {
    return JSON.stringify(data, replacer);
}

export function deserialize<T>(data: string): T {
    return JSON.parse(data, reviver);
}
