import type { SDMXAttribute, SDMXObservation } from "../components/types";
import { parseOperandTextExpr } from "./parseTextExpr";
// @ts-ignore sdmx-json-parser ships no type declarations
import { SDMXParser } from 'sdmx-json-parser';

/**
 * A parsed data expression, as produced by `parseDataExpr`.
 *
 * The fields are populated by whichever syntax the expression used, so most are
 * optional and `dataFlowUrl` is a string for a plain URL but a one-element array
 * for `expr` expressions.
 */
export type ParsedDataExpr = {
  dataFlowUrl: string | string[],
  alternateLabel?: string, // label override, from the `, {LABEL}` suffix
  exprOperand?: string | string[], // operand(s) of an expr/count operation
  operator?: 'expr' | 'hist' | 'count',
  expression?: string, // full expression, with operands replaced by x0, x1, ...
  exprOperator?: string, // comparison operator of a count expression
  index?: string | number, // histogram bucket index
  dataFlowKey?: string, // map join key on the SDMX side
  geojsonUrl?: string,
  geojsonProjection?: string,
  geojsonKey?: string, // map join key on the GeoJSON side
}

/**
 * Process the data expression
 * Example: 'https://www.ilo.org/sdmx/rest/data/ILO,DF_EES_TEES_SEX_MJH_NB,1.0/CHL.A..SEX_T.MJH_AGGREGATE_MULTI?endPeriod=2022&lastNObservations=1 * {UNIT_MULT}',
 * 
 * @param {String} dataExpr
 * @returns {Object}
 */
export const parseDataExpr = (dataExprs: string | Array<string>): ParsedDataExpr[] => {

  if(typeof dataExprs === 'string') {
    dataExprs = [dataExprs];
  }

  // define return object
  const results : ParsedDataExpr[] = [];

  dataExprs.forEach((dataExpr: string) => {
    const parsedExpr : ParsedDataExpr = {
      'dataFlowUrl': [],
    };

    const tokens1 = dataExpr.split(', ');
    if (tokens1.length === 2) {
      const alternateLabel = tokens1[1].trim().replace(/[{}']+/g, '');
      // TODO handle the case when alternateLabel is a concept
      dataExpr = tokens1[0].trim();
      parsedExpr['alternateLabel'] = alternateLabel;
    }

    // when we have an operation
    const tokens = dataExpr.split(/ [/*+-] /g);
    if (tokens.length === 1) {
      parsedExpr['dataFlowUrl'] = tokens[0].trim();
    } else {
      // when we have an operation
      // we extract each operand and store exprOperand
      // note that the first operand must be a dataFlowUrl
      if (Array.isArray(parsedExpr.dataFlowUrl)) parsedExpr.dataFlowUrl.push(tokens[0].trim());
      parsedExpr['exprOperand'] = tokens.slice(1).map((token: string) => token.trim());
      parsedExpr['operator'] = "expr"
      parsedExpr['expression'] = dataExpr;
      // we replace in the expression string each operand with x0, x1, x2, etc.
      tokens.forEach((token: string, index: number) => {
        parsedExpr['expression'] = parsedExpr['expression'].replace(token, `x${index}`)
      });
    }

    // when we have a map with joined urls
    const tokensMap = dataExpr.split(' | ')
    // syntax for map DATA is like "SDMX_URL, {JOIN_KEY_SDMX} | GEOJSON_URL, {JOIN_KEY_GEOJSON}"
    if (tokensMap.length === 2) {
      parsedExpr['dataFlowUrl'] = tokensMap[0].split(', ')[0]
      parsedExpr['dataFlowKey'] = tokensMap[0].split(', ')[1].trim().replace(/[{}]+/g, '')
      parsedExpr['geojsonUrl'] = tokensMap[1].split(', ')[0]
      parsedExpr['geojsonProjection'] = tokensMap[1].split(', ')[1]
      parsedExpr['geojsonKey'] = tokensMap[1].split(', ')[2].trim().replace(/[{}]+/g, '')
    }

    // when we want a visual based on the histogram of the observations
    // syntax is `hist($DATA_URL)`
    if (dataExpr.startsWith('hist')) {
      parsedExpr['dataFlowUrl'] = dataExpr.split('(')[1].split(')')[0]
      parsedExpr['operator'] = 'hist'
      parsedExpr['index'] = dataExpr.split(')')[1]?.split('[')[1]?.split(']')[0]
    }

    // when we want a visual with the number of observations matching a criteria
    // syntax is 'count($EXPRESSION)' where $EXPRESSION is a string like 'https://www.ilo.org/sdmx/rest/data/ILO,DF_EES_TEES !== 0'
    if (dataExpr.startsWith('count')) {
      const expression = dataExpr.split('(')[1].split(')')[0]
      const tokens = expression.split(/ [/[=!]== /g);
      parsedExpr['dataFlowUrl'] = tokens[0].trim();
      parsedExpr['operator'] = 'count'
      parsedExpr['exprOperator'] = expression.match(/ [/[=!]== /g)![0].trim()
      parsedExpr['exprOperand'] = tokens[1].trim();
    }
    
    results.push(parsedExpr);
  });

  return results;

}

/**
 * Fetch the data for the expression operands, populating the scope with the data to be used in the expression evaluation
 *
 * @param {Array<string>} exprOperands
 * @param {Array<SDMXObservation>} data
 * @param {Record<string, unknown>} scope
 * @param {Array<SDMXAttribute>} attributes
 * @param {string} language
 * @returns {Promise<Array<unknown>>}
 */
export const fetchDataExprOperand = (exprOperands: Array<string>, data: SDMXObservation[], scope: Record<string, unknown>, attributes: SDMXAttribute[], language: string) => {

  return exprOperands.map((exprOperand: string, index: number) => {
    if (exprOperand.startsWith('{')) {
        // operand is an attribute: one value per observation
        const key = `x${index + 1}`;
        const values: unknown[] = [];
        data.forEach((item: SDMXObservation) => {
            values.push(parseOperandTextExpr(exprOperand, item, attributes));
        })
        scope[key] = values;
    } else {
        // operand is another SDMX request
        const parser = new SDMXParser();
        return parser.getDatasets(exprOperand, {
            headers: new Headers({
                Accept: "application/vnd.sdmx.data+json;version=2.0.0",
                "Accept-Language": language
            })
        }).then(() => {
            const extraData = parser.getData();
            if (extraData.length !== data.length) {
                throw new Error('Data length mismatch, cannot evaluate expression');
            }
            scope[`x${index+1}`] = extraData.map((item: SDMXObservation) => item.value);
        })
    }
  })
}
