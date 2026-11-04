/* eslint-disable @typescript-eslint/no-explicit-any */
import { isISO3Code, isoCountryCode3To2 } from './isoCountryCode';

export type GeoLookup = {
    byCode: { [code: string]: any }, // geo dimension code -> observation row
    byLabel: { [label: string]: any }, // geo dimension label -> observation row
    min: number,
    max: number,
    hasValues: boolean, // at least one numeric observation joined
};

// a value the map can colour: numeric, zero included
export const isMapValue = (value: unknown): boolean =>
    value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

/**
 * Observation rows of the geo dimension, keyed by code and by label. Rows
 * carry the label of each dimension value (that is what the parser
 * exposes); the dimension structure gives the code.
 * @param data rows from SDMXParser.getData()
 * @param dimensions dimension structures from SDMXParser.getDimensions()
 * @param geoConcept the dimension joined to the map features
 */
export const buildGeoLookup = (data: any[], dimensions: any[], geoConcept: string): GeoLookup => {
    const geoDimension = dimensions.find((dimension: any) => dimension.id === geoConcept);
    const lookup: GeoLookup = { byCode: {}, byLabel: {}, min: 0, max: 0, hasValues: false };
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    geoDimension?.values?.forEach((geoValue: any) => {
        const row = data.find((item: any) => item[geoConcept] === geoValue.name);
        if (!row) {
            return;
        }
        const joined = { ...row, name: row[geoConcept] };
        lookup.byCode[String(geoValue.id)] = joined;
        if (geoValue.name !== undefined && lookup.byLabel[String(geoValue.name)] === undefined) {
            lookup.byLabel[String(geoValue.name)] = joined;
        }
        if (isMapValue(row.value)) {
            const value = Number(row.value);
            min = Math.min(min, value);
            max = Math.max(max, value);
        }
    });

    if (min !== Number.POSITIVE_INFINITY) {
        lookup.min = min;
        lookup.max = max;
        lookup.hasValues = true;
    }
    return lookup;
};

/**
 * The observation row for a map feature: by code first (as given, then an
 * ISO 3166 alpha-3 key as its alpha-2 code), then by label.
 * @param lookup the geo lookup of the rendered data
 * @param featureKey the feature's value of the configured geojson key
 */
export const findGeoRow = (lookup: Pick<GeoLookup, 'byCode' | 'byLabel'>, featureKey: unknown): any | null => {
    if (featureKey === undefined || featureKey === null || featureKey === '') {
        return null;
    }
    const key = String(featureKey);
    const alpha2 = isISO3Code(key) ? isoCountryCode3To2(key) : null;
    const byCode = lookup.byCode[key] ?? (alpha2 ? lookup.byCode[alpha2] : undefined);
    return byCode ?? lookup.byLabel[key] ?? null;
};

/**
 * Position of a value on the colour scale, in [0, 1]: (v - min) / (max - min).
 * When every value is the same the range is empty and the value takes the
 * top of the scale.
 */
export const normaliseMapValue = (value: number, min: number, max: number): number => {
    if (max <= min) {
        return 1;
    }
    return Math.min(1, Math.max(0, (value - min) / (max - min)));
};
