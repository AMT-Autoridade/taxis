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
  const processedDataFull = areaMeta.map(area => lib.addData(area, backfilledData))
  const processedDataRecent = areaMeta.map(area => lib.addData(area, backfilledData.filter(d => d.year >= 2006)))

  // Generate a JSON file for each admin area type
  var tasks = lib.uniqueValues(areaMeta, 'type').map(type => {
    return function (cb) {
      const data = processedDataFull.filter(o => o.type === type)
      lib.storeResponse(
        data,
        `${type}-full.json`,
        `Data about taxis in Portugal from 1998 on, aggregated by ${type}`
      )
      cb()
    }
  })

  // Generate a JSON file with data for all districts and concelhos
  tasks.push(
    function (cb) {
      const data = processedDataRecent
        .filter(o => o.type === 'distrito')
        .map(d => {
          d.concelhos = d.concelhos.map(c => processedDataRecent.find(p => p.id === c))
          return d
        })
      lib.storeResponse(
        data,
        'national.json',
        'Data about taxis in Portugal from 2006 on, aggregated by distrito and concelho'
      )
      cb()
    })

  // Generate a JSON file with highlighted NUT3 areas, to be used on homepage
  tasks.push(
    function (cb) {
      // AM Lisboa, AM Porto, RA Açores, RA Madeira
      const nutOfInterest = ['PT11A', 'PT17', 'PT200', 'PT300']
      const data = processedDataRecent.filter(o => nutOfInterest.indexOf(o.id) !== -1)
      lib.storeResponse(
        data,
        'nut3-featured.json',
        'Data about taxis in Portugal from 2006 on, for a selected number of NUT3.'
      )
      cb()
    })

  // Generate a TopoJSON file with only geometries, and another one with data for all areas
  const topo = JSON.parse(fs.readFileSync('./data/admin-areas.topojson'))
  tasks.push(
    function (cb) {
      fs.copy('./data/admin-areas.topojson', './export/admin-areas.topojson')
      fs.writeFileSync('./export/admin-areas-data.topojson', JSON.stringify(lib.joinTopo(topo, processedDataRecent, 'id')))
      cb()
    }
  )

  async.parallel(tasks, function (err) {
    if (err) { console.log(err.message) }
    console.log('Done!')
  })
})
