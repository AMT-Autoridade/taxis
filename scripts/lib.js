/**
 * Prepare the raw data parsed from the CSV
 *
 * @name prepRawData
 * @param {Array} data
 * @example
 * // returns [{ year: 2015, value: 61, dico: 1401, indicator: '1' }, { year: 2016, value: 66, dico: 1401, indicator: '1' }]
 * prepRawData([{ '2015': '61', '2016': '66', dico: '1401', indicator: '1' }])
 * @returns {Array} An array of objects. Each object containing data for one year, indicator, concelho
 */
module.exports.prepRawData = function (data) {
  let finalData = []
  data.map(o => {
    Object.keys(o).map(k => {
      // Check if the property key is a year we would be interested in
      if (parseInt(k) > 1995 && parseInt(k) < 2050) {
        finalData.push({
          'dico': parseInt(o.dico),
          'indicator': o.indicator,
          'year': parseInt(k),
          'value': parseInt(o[k]) || null
        })
      }
    })
  })
  return finalData
}

/**
 * Generate base data for the concelhos
 *
 * @name processConcelhos
 * @param {Array} concelhos
 * @returns {Array} An array of objects with meta-data for each concelho
 */
module.exports.processConcelhos = function (concelhos) {
  return concelhos.map(c => {
    return {
      'id': parseInt(c.dico),
      'name': c.municipio,
      'type': 'concelho',
      'district': c.distrito,
      'nut1': c.nut1,
      'nut2': c.nut2,
      'nut3': c.nut3,
      'data': []
    }
  })
}

/**
 * Add data to a concelho
 *
 * @name addData
 * @param {Object} c - The concelho object
 * @param {Array} data - [{ dico: 1401, indicator: '1', year: 2011, value: 61 }]
 */
module.exports.addData = function (c, data) {
  data
    .filter(o => c.id === o.dico)
    .forEach(d => {
      delete d.dico
      c.data.push(d)
    })
  return c
}
