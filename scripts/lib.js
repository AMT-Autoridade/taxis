const fs = require('fs-extra')
const kebab = require('lodash.kebabcase')
const omit = require('lodash.omit')
const path = require('path')

/**
 * Parse objects parsed from CSV with data for multiple years and generate
 * granular records for each year, indicator, concelho combination.
 *
 * @name prepTsData
 * @param {Array} data
 * @example
 * // returns [{ year: 2015, value: 61, dico: 1401, indicator: '1' }, { year: 2016, value: 66, dico: 1401, indicator: '1' }]
 * prepTsData([{ '2015': '61', '2016': '66', dico: '1401', indicator: '1' }])
 * @returns {Array} An array of objects.
 */
module.exports.prepTsData = function (data) {
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
 * The parsed CSV may contain fields with multiple values (separated by ';')
 * Check which of them should be parsed as such, returning their key.
 *
 * @name getMultiValueFields
 * @param {Array} data
 * @example
 * // returns [ 'bar' ]
 * getMultiValueFields([{ 'foo': 'cha', 'bar': 'cafe' }, { 'foo': 'cha', 'bar': 'cafe;laranjada' }])
 * @returns {Array} Return keys that should be parsed as array
 */
module.exports.getMultiValueFields = function (data) {
  let multiValueFields = []
  Object.keys(data[0]).map(k => {
    if (data.findIndex(o => o[k].includes(';')) > -1) {
      multiValueFields.push(k)
    }
  })
  return multiValueFields
}

/**
 * Parse multi value fields into proper arrays
 *
 * @name parseMultiValueField
 * @param {Array} data
 * @param {Array} keys - The keys of the properties that should be parsed as arrays
 * @example
 * // returns [{ 'foo': 'cha', 'bar': ['cafe'] }, { 'foo': 'cha', 'bar': ['cafe','laranjada'] }]
 * parseMultiValueField([{ 'foo': 'cha', 'bar': 'cafe' }, { 'foo': 'cha', 'bar': 'cafe;laranjada' }])
 * @returns {Array}
 */
module.exports.parseMultiValueField = function (data, cols) {
  return data.map(o => {
    for (let c of cols) {
      o[c] = o[c].split(';')
    }
    return o
  })
}

/**
 * Backfill null data with data from the next year that has
 *
 * @name backfillData
 * @param {Array} data
 * @example
 * // returns [{ year: 2015, value: null, dico: 1401, indicator: '1' }, { year: 2016, value: 66, dico: 1401, indicator: '1' }]
 * prepRawData([{ year: 2015, value: 66, dico: 1401, indicator: '1', backfill: 2016 }, { year: 2016, value: 66, dico: 1401, indicator: '1' }])
 * @returns {Array} An array of objects. Each contains a unique record with data for one year, indicator, concelho
 */
module.exports.backfillData = function (data) {
  return data.map(o => {
    if (o.value === null) {
      // Find the first available year with data
      let firstAvailable = data
        .filter(d => d.indicator === o.indicator && d.id === o.id && d.value !== null && d.year > o.year)
        .find((e, i, a) => e.year === Math.min(...a.map(o => o.year)))
      // In case there is no first available, the value will remain null
      if (firstAvailable) {
        o.value = firstAvailable.value
        o.backfill = firstAvailable.year
      }
    }
    return o
  })
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
 * @param {Array} concelhos - An array with concelhos and their parent areas
 * @param {Array} abbreviations - An array with abbreviations for the admin areas
 * @returns {Array} An array of objects with meta-data for each administrative area
 */
module.exports.generateAreas = function (concelhos, abbreviations, files) {
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

      let name = childConcelhos[0][`${type}_name`]
      let abbr = abbreviations.find(o => o.id.toString() === area.toString())
      let file = files.find(o => o.id.toString() === area.toString())

      finalAreas.push({
        'id': parseInt(area) || area,
        'name': name,
        'type': type,
        'slug': kebab(childConcelhos[0][`${type}_name`]),
        'display': abbr ? abbr.abbreviation : name,
        'concelhos': childConcelhos.map(o => parseInt(o.concelho) || o.concelho),
        'files': file ? file.files : [],
        'data': {}
      })
    })
  })
  return finalAreas
}

/**
 * Parse the contents of the /files folder and return an array with file paths
 * per admin area
 *
 * @name parseFileFolder
 * @param {String} folder - path to the folder to be parsed in relation to
 *                          the root of the project. Default: './files'
 * @example
 * // returns [{ 'id': '1604', 'files': [ 'files/1604/regulamento.pdf' ] }, { 'id': '102', 'files": [ 'files/102/regulamento.pdf' ] }]
 * parseFileFolder()
 * @returns {Object}
 */
module.exports.parseFileFolder = function (folder = './files') {
  let adminFiles = []
  fs.readdirSync(folder).map(o => {
    let p = path.join(folder, o)

    // only interested if p is a directory
    if (fs.lstatSync(p).isDirectory()) {
      let files = fs.readdirSync(p).map(f => {
        let fp = path.join(p, f)
        // only interested if content of p is a file
        if (fs.lstatSync(fp).isFile()) return fp
      })
      // don't return anything if the folder is empty
      if (files.length > 0) {
        adminFiles.push({
          'id': o.split('-')[0],
          'files': files
        })
      }
    }
  })
  return adminFiles
}

/**
 * Add meta-data to an administrative area.
 *
 * @name addMetaData
 * @param {Object} area - An object with the admin area.
 *    { id:1, data: {} }
 * @param {Array} data - [{ id: 1401, estacionamento: 'livre' }]
 */
module.exports.addMetaData = function (area, data) {
  // check if there is any meta-data for this area
  let match = data
    .find(o => o.id.toString() === area.id.toString())
  if (match) {
    // add all the meta-data of the match, except for the area id
    Object.keys(omit(match, 'id')).map(k => {
      area.data[k] = match[k]
    })
  }
  return area
}

/**
 * Add Time Series data to an administrative area.
 * This function aggregates the data for all concelhos that belong to the area.
 *
 * @name addTsData
 * @param {Object} area - An object with meta-data for the admin area.
 *    {'id':1,'name':'Aveiro','type':'distrito','concelhos':[101,102,103,104]}
 * @param {Array} data - [{ id: 1401, indicator: '1', year: 2011, value: 61 }]
 */
module.exports.addTsData = function (area, data) {
  let areaWithData = Object.assign({}, area)
  let aggregatedData = data
    .filter(o => area.concelhos.indexOf(o.id) !== -1)
    .reduce((a, b) => {
      let ind = b.indicator
      if (!a[ind]) a[ind] = []
      // Check if the accumulator already has an object for that year+indicator
      const match = a[ind].findIndex(o => o.year === b.year)
      if (match === -1) {
        a[ind].push(omit(b, ['id', 'indicator']))
      } else {
        a[ind][match].value += b.value
      }
      return a
    }, {})
  // combine existing metadata with the newly aggregated data
  areaWithData.data = Object.assign({}, areaWithData.data, aggregatedData)
  return areaWithData
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

/**
 * Prepare and store the response
 *
 * @name storeResponse
 * @param {Array} data
 * @param {String} fn - Filename to store the data as
 * @param {String} description
 * @returns {Object} The final response with meta and results
 */
module.exports.storeResponse = function (data, fn, description) {
  const finalRes = {
    'meta': {
      'name': 'observatorio-taxis-data',
      'description': description,
      'source': {
        'name': 'Autoridade da Mobilidade e dos Transportes',
        'web': 'http://www.amt-autoridade.pt'
      },
      'license': 'CC-BY-4.0'
    },
    'results': data
  }
  fs.writeFileSync(`./export/${fn}`, JSON.stringify(finalRes))
}
