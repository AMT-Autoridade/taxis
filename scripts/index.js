const async = require('async')
const fs = require('fs')
const parse = require('csv-parse')

const metaConcelhos = fs.readFileSync('./data/concelhos.csv')
const dataTaxis = fs.readFileSync('./data/taxis.csv')

// Process the base data with concelhos
var processConcelhos = function(concelhos) {
  return concelhos.map(c => {
    return {
      'id': parseInt(c.dico),
      'name': c.municipio,
      'type': 'concelho',
      'district': c.distrito,
      'nut1': c.nut1,
      'nut2': c.nut2,
      'nut3': c.nut3,
      'data': {}
    }
  })
}

// Add taxi data to a concelho
// each concelho has taxi data about a number of different indicators
var addTaxiData = function(c, taxiData) {
  taxiData
    .filter(o => c.id === parseInt(o.dico))
    .map(o => {
      // Make sure all values are int
      // Also turns all "" into null
      Object.keys(o).map(k => {
        o[k] = parseInt(o[k])
      })
      // Clean up
      let ind = o.indicator
      delete o.dico
      delete o.indicator
      c.data[ind] = o
    })
  return c
}

async.parallel([
  function(callback) {
    // Parse metadata about the concelhos
    parse(metaConcelhos, {columns: true}, function(err, output) {
      let areas = processConcelhos(output)
      callback(err, areas)
    })
  },
  function(callback) {
    // Parse source data with taxis by concelho
    parse(dataTaxis, {columns: true}, function(err, output) {
      callback(err, output)
    })
  }
],
function(err, results) {
  if (err) { console.log(err.message) }

  var concelhoData = results[0]
  var taxiData = results[1]

  async.waterfall([
    function(callback) {
      // Add taxi data for each concelho
      concelhoData.map(c => addTaxiData(c, taxiData))
      callback(null, concelhoData)
    },
    function(data, callback) {
      // aggregate data for each district + nut
      callback(null, data)
    }
  ], function(err, data) {
    if (err) { console.log(err.message) }
    
    fs.writeFileSync('./data.json', JSON.stringify(data))
    console.log('Done!')
  })
});
