const async = require('async')
const fs = require('fs-extra')
const parse = require('csv-parse')
const lib = require('./lib.js')

async.parallel([
  function (cb) {
    // Parse meta-data about the concelhos
    // Returns an array with all admin areas and their meta-data
    parse(fs.readFileSync('./data/concelhos.csv'), {columns: true}, function (err, output) {
      let areas = lib.generateAreas(output)
      cb(err, areas)
    })
  },
  function (cb) {
    // Parse source data with taxis by concelho
    // Returns an array of records for a unique concelho, year, indicator
    parse(fs.readFileSync('./data/taxis.csv'), {columns: true}, function (err, output) {
      let data = lib.prepRawData(output)
      cb(err, data)
    })
  },
  function (cb) {
    // Parse population estimates by concelho
    // Returns an array of records for each concelho + year
    parse(fs.readFileSync('./data/population.csv'), {columns: true}, function (err, output) {
      let data = lib.prepRawData(output)
      cb(err, data)
    })
  }
],
function (err, results) {
  if (err) { console.log(err.message) }

  const areaMeta = results[0]
  // Merge the raw taxi data (results[1]) and the population estimates (results[2])
  const rawData = [].concat(results[1], results[2])

  // Back-fill those nulls
  const backfilledData = lib.backfillData(rawData)

  // Combine the area meta-data with the raw data
  const processedData = areaMeta.map(area => lib.addData(area, backfilledData))

  // Generate a JSON file for each admin area type
  var tasks = lib.uniqueValues(areaMeta, 'type').map(type => {
    return function (cb) {
      fs.writeFileSync(`./export/${type}.json`, JSON.stringify(processedData.filter(o => o.type === type)))
      cb()
    }
  })

  // Generate a JSON file with data for all districts and concelhos
  tasks.push(
    function (cb) {
      const data = processedData
        .filter(o => o.type === 'distrito')
        .map(d => {
          d.concelhos = d.concelhos.map(c => processedData.find(p => p.id === c))
          return d
        })
      fs.writeFileSync('./export/national.json', JSON.stringify(data))
    })

  // Generate a JSON file with highlighted NUT3 areas, to be used on homepage
  // AM Lisboa, AM Porto, RA Açores, RA Madeira
  const nutOfInterest = ['PT11A', 'PT17', 'PT200', 'PT300']
  tasks.push(
    function (cb) {
      fs.writeFileSync('./export/nut3-featured.json', JSON.stringify(processedData.filter(o => nutOfInterest.indexOf(o.id) !== -1)))
      cb()
    })

  // Generate a TopoJSON file with only geometries, and another one with data for all areas
  const topo = JSON.parse(fs.readFileSync('./data/admin-areas.topojson'))
  tasks.push(
    function (cb) {
      fs.copy('./data/admin-areas.topojson', './export/admin-areas.topojson')
      fs.writeFileSync('./export/admin-areas-data.topojson', JSON.stringify(lib.joinTopo(topo, processedData, 'id')))
      cb()
    }
  )

  async.parallel(tasks, function (err) {
    if (err) { console.log(err.message) }
    console.log('Done!')
  })
})
