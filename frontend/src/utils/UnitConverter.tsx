export const lengthUnits = { mm: 1, cm: 10, m: 1000, inch: 25.4, feet: 304.8, yard: 914.4, mile: 1609344 };
export const weightUnits = { kg: 1, lbs: 2.20462, g: 0.001, mg: 0.000001, ton: 1000, oz: 35.274 };

export const convertLength = (value: number, toUnit: keyof typeof lengthUnits) => {
    return (value * lengthUnits['mm']) / lengthUnits[toUnit];
};

export const convertWeight = (value: number, toUnit: keyof typeof weightUnits) => {
    return (value * weightUnits['kg']) / weightUnits[toUnit];
};
