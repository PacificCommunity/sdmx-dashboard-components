import { parseOperandTextExpr } from "./parseTextExpr";
// @ts-ignore
import { SDMXParser } from 'sdmx-json-parser';

/**
 * Process the data expression
 * Example: 'https://www.ilo.org/sdmx/rest/data/ILO,DF_EES_TEES_SEX_MJH_NB,1.0/CHL.A..SEX_T.MJH_AGGREGATE_MULTI?endPeriod=2022&lastNObservations=1 * {UNIT_MULT}',
 * 
 * @param {String} dataExpr
 * @returns {Object}
 */
export const parseDataExpr = (dataExprs: string | Array<string>) => {

  if(typeof dataExprs === 'string') {
    dataExprs = [dataExprs];
  }

  // define return object
  let results : any[] = [];

  dataExprs.forEach((dataExpr: string) => {
    let parsedExpr : any = {
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
      parsedExpr['dataFlowUrl'].push(tokens[0].trim());
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
 * @param {Array<any>} data
 * @param {Object} scope
 * @param {Object} attributes
 * @param {string} language
 * @returns {Promise<Array<any>>}
 */
export const fetchDataExprOperand = (exprOperands: Array<string>, data: any, scope: any, attributes: any, language: string) => {

  return exprOperands.map((exprOperand: string, index: number) => {
    if (exprOperand.startsWith('{')) {
        // operand is an attribute
        scope[`x${index+1}`] = []
        data.forEach((item: any) => {
            scope[`x${index+1}`].push(parseOperandTextExpr(exprOperand, item, attributes));
        })
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
            scope[`x${index+1}`] = extraData.map((item: any) => item.value);
        })
    }
  })
}
