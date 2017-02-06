/**
 * Prepare the raw data parsed from the CSV
 *
 * @name prepRawData
 * @param {Array} data
 * @example
 * // returns [{ year: 2015, value: 61, dico: 1401, indicator: '1' }, { year: 2016, value: 66, dico: 1401, indicator: '1' }]
 * prepRawData([{ '2015': '61', '2016': '66', dico: '1401', indicator: '1' }])
 * @returns {Array} An array of objects. Each contains a unique record with data for one year, indicator, concelho
 */
module.exports.prepRawData = function (data) {
  let finalData = []
  data.map(o => {
    Object.keys(o).map(k => {
      // Check if the property key is a year we would be interested in
      if (parseInt(k) > 1995 && parseInt(k) < 2050) {
        finalData.push({
          'id': parseInt(o.dico),
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
 * Generate an array of unique values from an array of objects
 *
 * @name uniqueValues
 * @param {Array} array - An array of objects
 * @param {String} key - The key in the objects to generate the array from
 * @example
 * // returns ['Abrantes', 'Santarem']
 * uniqueValues([{ id: 1, district: 'Abrantes' }, { id: 2, district: 'Abrantes' }, { id: 3, district: 'Santarem' }], 'district')
 * @returns An array of unique values
 */
function uniqueValues (array, key) {
  return array
    .map(o => o[key])
    .filter((o, i, a) => a.indexOf(o) === i)
}

/**
 * Generate base data for the different admin areas
 *
 * @name generateAreas
 * @param {Array} concelhos
 * @returns {Array} An array of objects with meta-data for each administrative area
 */
module.exports.generateAreas = function (concelhos) {
  let finalAreas = []

  // Generate meta-data for other areas types as well
  let areaTypes = ['concelho', 'distrito', 'nut1', 'nut2', 'nut3']
  areaTypes.forEach(type => {
    // Generate the unique array of areas of this type
    let uniqueAreas = uniqueValues(concelhos, type)

    uniqueAreas.map(area => {
      // Generate an array with all the concelhos that are part of this area
      let childConcelhos = concelhos
        .filter(c => c[type] === area)

      finalAreas.push({
        'id': parseInt(area) || area,
        'name': childConcelhos[0][`${type}_name`],
        'type': type,
        'concelhos': childConcelhos.map(o => o.concelho),
        'data': []
      })
    })
  })
  return finalAreas
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
    .filter(o => c.id === o.id)
    .forEach(d => {
      delete d.id
      c.data.push(d)
    })
  return c
}
