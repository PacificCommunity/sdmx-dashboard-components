/* eslint-disable @typescript-eslint/no-explicit-any */
export const sortByDimension = (data: any[], dimensionId: string) => {
  return data.sort((a: any, b: any) => {
    if (dimensionId === 'TIME_PERIOD') {
      return parseInt(a[dimensionId]) - parseInt(b[dimensionId]);
    }
    return a[dimensionId].localeCompare(b[dimensionId]);
  });
};

export const sortByValue = (data: any[], order: string) => {
  data.sort((a: any, b: any) => (order === 'asc' ? a.value - b.value : b.value - a.value));
  return data;
};

export const getLatestValue = (data: any[], dimension: string) => {
  let values: any[] = [];
  values = data
    .map((dataPoint: any) => dataPoint[dimension])
    .map((e: any, i: number, final: any) => final.indexOf(e) === i && i)
    .filter((e: any) => data[e])
    .map((e: any) => data[e]);
  return values;
};
