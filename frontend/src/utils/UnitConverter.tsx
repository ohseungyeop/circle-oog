export const lengthUnits = { mm: 1, cm: 10, m: 1000 };
export const weightUnits = { kg: 1, lbs: 2.20462 };

export const convertLength = (value: number, toUnit: keyof typeof lengthUnits) => {
    return (value * lengthUnits['mm']) / lengthUnits[toUnit];
};

export const convertWeight = (value: number, toUnit: keyof typeof weightUnits) => {
    return (value * weightUnits['kg']) / weightUnits[toUnit];
};
