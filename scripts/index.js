const async = require('async')
const fs = require('fs')
const parse = require('csv-parse')
const lib = require('./lib.js')

const metaConcelhos = fs.readFileSync('./data/concelhos.csv')
const dataTaxis = fs.readFileSync('./data/taxis.csv')

async.parallel([
  function (cb) {
    // Parse metadata about the concelhos
    parse(metaConcelhos, {columns: true}, function (err, output) {
      let areas = lib.processConcelhos(output)
      cb(err, areas)
    })
  },
  function (cb) {
    // Parse source data with taxis by concelho
    parse(dataTaxis, {columns: true}, function (err, output) {
      cb(err, output)
    })
  }
],
function (err, results) {
  if (err) { console.log(err.message) }

  var concelhoData = results[0]
  var taxiData = results[1]

  async.waterfall([
    function (cb) {
      cb(null, lib.prepRawData(taxiData))
    },
    function (data, cb) {
      concelhoData.map(c => lib.addData(c, data))
      cb(null, concelhoData)
    },
    function (data, cb) {
      // aggregate data for each district + nut
      cb(null, data)
    }
  ], function (err, data) {
    if (err) { console.log(err.message) }

    fs.writeFileSync('./data.json', JSON.stringify(data))
    console.log('Done!')
  })
})
