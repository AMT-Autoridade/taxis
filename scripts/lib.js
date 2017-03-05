const omit = require('lodash.omit')

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
          'value': isNaN(parseInt(o[k])) ? null : parseInt(o[k])
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
module.exports.uniqueValues = function (array, key) {
  return array
    .map(o => o[key])
    .filter((o, i, a) => a.indexOf(o) === i)
}

/**
 * Generate base meta-data for the different admin areas
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
    let uniqueAreas = module.exports.uniqueValues(concelhos, type)

    uniqueAreas.map(area => {
      // Generate an array with all the concelhos that are part of this area
      let childConcelhos = concelhos
        .filter(c => c[type] === area)

      finalAreas.push({
        'id': parseInt(area) || area,
        'name': childConcelhos[0][`${type}_name`],
        'type': type,
        'concelhos': childConcelhos.map(o => parseInt(o.concelho) || o.concelho),
        'data': []
      })
    })
  })
  return finalAreas
}

/**
 * Add data to an administrative area.
 * This function aggregates the data for all concelhos that belong to the area.
 *
 * @name addData
 * @param {Object} area - An object with meta-data for the admin area.
 *    {"id":1,"name":"Aveiro","type":"distrito","concelhos":[101,102,103,104]}
 * @param {Array} data - [{ id: 1401, indicator: '1', year: 2011, value: 61 }]
 */
module.exports.addData = function (area, data) {
  area.data = data
    .filter(o => area.concelhos.indexOf(o.id) !== -1)
    .reduce((a, b) => {
      // Check if the accumulator already has an object for that year+indicator
      const match = a.findIndex(o => o.indicator === b.indicator && o.year === b.year)
      if (match === -1) {
        a.push(omit(b, ['id']))
      } else {
        a[match].value += b.value
      }
      return a
    }, [])
  return area
}

/**
 * Join a TopoJSON with an array of data on a common id
 *
 * @name joinTopo
 * @param {Object} topo - A TopoJSON object.
 * @param {Array} data - [{ id: 1001, name: 'Alcobaça', data: [ indicator: 'lic-geral', 'value': null ]}]
 * @param {String} topoKey - the key in the TopoJSON properties object to join on.
 * @param {String} [dataKey=topoKey] - the key in the data array to join on.
 * @returns {Object} The TopoJSON object with joined data.
 */
module.exports.joinTopo = function (topo, data, topoKey, dataKey = topoKey) {
  Object.keys(topo.objects).map(k => {
    topo.objects[k].geometries = topo.objects[k].geometries.map(g => {
      g.properties.data = data.find(d => g.properties[topoKey].toString() === d[dataKey].toString()).data
      return g
    })
  })
  return topo
}
