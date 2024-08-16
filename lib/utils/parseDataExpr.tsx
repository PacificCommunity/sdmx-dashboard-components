/**
 * Process the "DATA" expression provided in yaml.
 * Example: 'https://www.ilo.org/sdmx/rest/data/ILO,DF_EES_TEES_SEX_MJH_NB,1.0/CHL.A..SEX_T.MJH_AGGREGATE_MULTI?endPeriod=2022&lastNObservations=1 * {UNIT_MULT}',
 * 
 * @todo Review style parsing method as it is not limited to 5 params only:
 *   Font type, size, emphasis (bold, italics, etc.) and location (LEFT, CENTER, RIGHT)
 *   can be specified in square-brackets ([]) following any text, title, note or label specification. 
 * @todo What is DIN param ? (can not find info in requirements, just ignore for now)
 * @todo fix variable params e.g. {$TIME_PERIOD}
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
      parsedExpr['dataFlowUrl'].push(tokens[0].trim());
      parsedExpr['operator'] = dataExpr.match(/ [/*+-] /g)![0].trim()
      parsedExpr['operand'] = tokens[1];
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
    // syntax is 'count($EXPRESSION)'
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
