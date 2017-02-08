const async = require('async')
const fs = require('fs')
const parse = require('csv-parse')
const lib = require('./lib.js')

const metaConcelhos = fs.readFileSync('./data/concelhos.csv')
const dataTaxis = fs.readFileSync('./data/taxis.csv')

async.parallel([
  function (cb) {
    // Parse meta-data about the concelhos
    // Returns an array with all admin areas and their meta-data
    parse(metaConcelhos, {columns: true}, function (err, output) {
      let areas = lib.generateAreas(output)
      cb(err, areas)
    })
  },
  function (cb) {
    // Parse source data with taxis by concelho
    // Returns an array of records for a unique concelho, year, indicator
    parse(dataTaxis, {columns: true}, function (err, output) {
      let data = lib.prepRawData(output)
      cb(err, data)
    })
  }
],
function (err, results) {
  if (err) { console.log(err.message) }

  // Combine the area meta-data with the taxi data
  var areaData = results[0]
  var taxiData = results[1]
  var processedData = areaData.map(area => lib.addData(area, taxiData))

  // Generate a JSON file for each admin area type
  const tasks = lib.uniqueValues(areaData, 'type').map(type => {
    return function (cb) {
      fs.writeFileSync(`./export/${type}.json`, JSON.stringify(processedData.filter(o => o.type === type)))
      cb()
    }
  })
  async.parallel(tasks, function (err) {
    if (err) { console.log(err.message) }
    console.log('Done!')
  })
})
