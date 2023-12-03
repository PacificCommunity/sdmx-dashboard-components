import { text } from "stream/consumers";

/**
 * Process the "Title" expression provided in yaml.
 * Example: 'Status in employment {$TIME_PERIOD}, [DIN, 14, Bold, Italics, LEFT]',
 * 
 * @todo Review style parsing method as it is not limited to 5 params only:
 *   Font type, size, emphasis (bold, italics, etc.) and location (LEFT, CENTER, RIGHT)
 *   can be specified in square-brackets ([]) following any text, title, note or label specification. 
 * @todo What is DIN param ? (can not find info in requirements, just ignore for now)
 * @todo fix variable params e.g. {$TIME_PERIOD}
 * 
 * @param {String} titleExpr
 * @param {Object} dimensions
 * @returns {Object}
 */
export const parseTextExpr = (titleExpr: string, dimensions: any[]) => {

  // define return object
  let result : {
    text: string,           // cleaned up and parsed text
    bootstrapcss: string[], // bootstrap classname used in title component
    inlinecss: {            // inline css used in title component (font-size)
      fontSize?: string
    },
    align: string,          // alignment for highcharts
    hcStyle: {              // highcharts style
      fontWeight?: string,
      fontSize?: string,
      fontStyle?: string
    }
  } = {
    text: '',
    align: 'center',
    bootstrapcss: [],
    hcStyle: {},
    inlinecss: {}
  }

  if (!titleExpr || !titleExpr.trim()) {
    return result;
  }

  // clean up title
  const text = titleExpr.replace(/,[\s]?\[(.*?)\]$/, '').trim()
  //const textWithValues = text.replace(/\{\$(.*?)\}/g, (match, p1) => {
  const textWithValues = text.replace(/\{(.*?)\}/g, (match, p1) => {
    let valueAttribute = 'name'
    // replace {$VARIABLE} with actual value
    if (p1.startsWith('$')) {
      p1 = p1.substring(1);
    } else {
      // replace {VARIABLE} with id
      valueAttribute = 'id'
    }
    const dimension = dimensions.find((item : any) => item.id === p1);
    if (!dimension) {
      console.warn(`Dimension with id ${p1} not found`);
      return match;
    } else {
      if (dimension.values.length > 1) {
        if (dimension.id === 'TIME_PERIOD') {
          // if concept is TIME_PERIOD, we use the first and last value
          const date1Str = dimension.values[0][valueAttribute];
          const date2Str = dimension.values[dimension.values.length - 1][valueAttribute];
          const date1 = new Date(date1Str);
          const date2 = new Date(date2Str);
          let date1Text = `${date1.getFullYear()}`;
          let date2Text = `${date2.getFullYear()}`;
          if (date1Str.split('-').length >= 2) {
            // if year and month is provided
            date1Text = `${date1.toLocaleString('default', { month: 'short' })} ${date1Text}`;
            date2Text = `${date2.toLocaleString('default', { month: 'short' })} ${date2Text}`;
          }
          if (date1Str.split('-').length >= 3) {
            // if year, month and day is provided
            date1Text = `${date1.getDay()} ${date1Text}`;
            date2Text = `${date2.getDay()} ${date2Text}`;
          }
          if (date1 < date2) {
            // if date1 is before date2
            return `${date1Text} - ${date2Text}`;
          } else {
            // if date2 is before date1
            return `${date2Text} - ${date1Text}`;
          }
        } else {
          // we return a comma separated list of values
          return dimension.values.map((item : any) => item[valueAttribute]).join(', ');
        }
      } else {
        // we return the value
        return dimension.values[0][valueAttribute];
      }
    }
  });


  result.text = textWithValues;

  // Get style options
  // Match coma separated values in square brackets from a string
  const match = titleExpr.match(/,[\s]?\[(.*?)\]$/);
  const style = match ? match[0].replace(/\[|\]/g, '').split(',') : [];

  // fill in result object
  style.forEach((item: any) => {
    switch (item.trim().toLowerCase()) {
      case 'bold':
        result.bootstrapcss.push('fw-bold');
        result.hcStyle.fontWeight = 'bold';
        break;
      case 'italics':
        result.bootstrapcss.push('fst-italic');
        result.hcStyle.fontStyle = 'italic';
        break;
      case 'left':
        result.align = 'left';
        break;
      case 'center':
        result.align = 'center';
        break;
      case 'right':
        result.align = 'right';
        break;
      default:
        // if number, then it is font size
        if (parseInt(item)) {
          result.inlinecss.fontSize = `${parseInt(item)}px`;
          result.hcStyle.fontSize = `${parseInt(item)}px`;
        } else {
          // ignore other params
        }
        break;
    }
  });

  // add CSS text alignment classes to bootstrapcss
  switch (result.align) {
    case 'left':
      result.bootstrapcss.push('text-start');
      break;
    case 'right':
      result.bootstrapcss.push('text-end');
      break;
    default:
      // default is centered text
      result.bootstrapcss.push('text-center');
      break;
  }

  return result;

}

export const parseOperandTextExpr = (operandExpr: string, data : any, attributes: any[]) => {

  const textWithValues = String(operandExpr).replace(/\{(.*?)\}/g, (match, p1) => {
    let valueAttribute = 'name';
    // replace {$VARIABLE} with actual value
    if (p1.startsWith('$')) {
      p1 = p1.substring(1);
    } else {
      // replace {VARIABLE} with id
      valueAttribute = 'id'
    }
    const attribute = attributes.find((item : any) => item.id === p1);
    if (!attribute) {
      throw new Error(`Attribute with id ${p1} not found`);
    } else {
      const value = attribute.values.find((item : any) => item.name === data[attribute.id]);
      if (value) {
        if (attribute.id === 'UNIT_MULT') {
          return Math.pow(10, parseInt(value[valueAttribute]));
        }
        return value[valueAttribute];
      } else {
        return '';
      }
    }

  });

  return textWithValues;

}
