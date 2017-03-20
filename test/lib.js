const test = require('ava')
const lib = require('../scripts/lib.js')

test('Generate separate objects for unique concelho, year, indicator combinations', t => {
  let input = [
    {
      dico: '1401',
      indicator: '1',
      '1999': '66',
      '1998': '60'
    }
  ]
  let expected = [
    {
      id: 1401,
      indicator: '1',
      year: 1998,
      value: 60
    },
    {
      id: 1401,
      indicator: '1',
      year: 1999,
      value: 66
    }
  ]
  t.deepEqual(lib.prepTsData(input), expected)
})

test('Return 0 as 0', t => {
  let input = [
    {
      dico: '1401',
      indicator: '1',
      '1999': '0'
    }
  ]
  let expected = [
    {
      id: 1401,
      indicator: '1',
      year: 1999,
      value: 0
    }
  ]
  t.deepEqual(lib.prepTsData(input), expected)
})

test('Return empty strings as null', t => {
  let input = [
    {
      dico: '1401',
      indicator: '1',
      '1999': ''
    }
  ]
  let expected = [
    {
      id: 1401,
      indicator: '1',
      year: 1999,
      value: null
    }
  ]
  t.deepEqual(lib.prepTsData(input), expected)
})

test('Return non-numeric as null', t => {
  let input = [
    {
      dico: '1401',
      indicator: '1',
      '1999': 'nd'
    }
  ]
  let expected = [
    {
      id: 1401,
      indicator: '1',
      year: 1999,
      value: null
    }
  ]
  t.deepEqual(lib.prepTsData(input), expected)
})

test('Don\'t return anything if there is no year', t => {
  let input = [
    {
      dico: '1401',
      indicator: '1',
      blabla: '66'
    }
  ]
  let expected = []
  t.deepEqual(lib.prepTsData(input), expected)
})

test('Detect Multi Value fields', t => {
  let input = [
    { 'foo': 'cha', 'bar': 'cafe' },
    { 'foo': 'cha', 'bar': 'cafe;laranjada' }
  ]
  let expected = [ 'bar' ]
  t.deepEqual(lib.getMultiValueFields(input), expected)
})

test('Parse values that should be an array', t => {
  let input = [
    { 'foo': 'cha', 'bar': 'cafe' },
    { 'foo': 'cha', 'bar': 'cafe;laranjada' }
  ]
  let cols = [ 'bar' ]
  let expected = [
    { 'foo': 'cha', 'bar': ['cafe'] },
    { 'foo': 'cha', 'bar': ['cafe', 'laranjada'] }
  ]
  t.deepEqual(lib.parseMultiValueField(input, cols), expected)
})

test('Don\'t parse values if no col is specified', t => {
  let input = [
    { 'foo': 'cha', 'bar': 'cafe' },
    { 'foo': 'cha', 'bar': 'cafe;laranjada' }
  ]
  let cols = [ ]
  let expected = [
    { 'foo': 'cha', 'bar': 'cafe' },
    { 'foo': 'cha', 'bar': 'cafe;laranjada' }
  ]
  t.deepEqual(lib.parseMultiValueField(input, cols), expected)
})

test('Backfill null values', t => {
  let input = [
    {
      id: 1401,
      indicator: '1',
      year: 1999,
      value: null
    },
    {
      id: 1401,
      indicator: '1',
      year: 2001,
      value: 160
    },
    {
      id: 1401,
      indicator: '1',
      year: 2000,
      value: 130
    }
  ]
  let expected = [
    {
      id: 1401,
      indicator: '1',
      year: 1999,
      value: 130,
      backfill: 2000
    },
    {
      id: 1401,
      indicator: '1',
      year: 2001,
      value: 160
    },
    {
      id: 1401,
      indicator: '1',
      year: 2000,
      value: 130
    }
  ]
  t.deepEqual(lib.backfillData(input), expected)
})

test('Don\'t fill null values forward', t => {
  let input = [
    {
      id: 1401,
      indicator: '1',
      year: 2001,
      value: null
    },
    {
      id: 1401,
      indicator: '1',
      year: 1999,
      value: null
    },
    {
      id: 1401,
      indicator: '1',
      year: 2000,
      value: 130
    }
  ]
  let expected = [
    {
      id: 1401,
      indicator: '1',
      year: 2001,
      value: null
    },
    {
      id: 1401,
      indicator: '1',
      year: 1999,
      value: 130,
      backfill: 2000
    },
    {
      id: 1401,
      indicator: '1',
      year: 2000,
      value: 130
    }
  ]
  t.deepEqual(lib.backfillData(input), expected)
})

test('Return null if backfill is not possible', t => {
  let input = [
    {
      id: 1401,
      indicator: '1',
      year: 1999,
      value: null
    },
    {
      id: 1401,
      indicator: '1',
      year: 2000,
      value: null
    }
  ]
  let expected = [
    {
      id: 1401,
      indicator: '1',
      year: 1999,
      value: null
    },
    {
      id: 1401,
      indicator: '1',
      year: 2000,
      value: null
    }
  ]
  t.deepEqual(lib.backfillData(input), expected)
})

test('Don\'t return anything if there is no year', t => {
  let input = [
    {
      dico: '1401',
      name: 'Braga'
    },
    {
      dico: '1402',
      name: 'Priscos'
    },
    {
      dico: '1403',
      name: 'Priscos'
    }
  ]
  let expected = ['Braga', 'Priscos']
  t.deepEqual(lib.uniqueValues(input, 'name'), expected)
})

test('Add meta data to an admin area', t => {
  let inputArea = {
    'id': 1401,
    'data': {}
  }
  let inputMeta = [
    { id: 1400, contingente: 'total', estacionamento: [ 'livre' ] },
    { id: 1401, contingente: 'total', estacionamento: [ 'meio' ] }
  ]
  let expected = {
    'id': 1401,
    'data': {
      'contingente': 'total',
      'estacionamento': ['meio']
    }
  }
  t.deepEqual(lib.addMetaData(inputArea, inputMeta), expected)
})

test('Add data to a single area', t => {
  let inputArea = {
    'id': 1401,
    'concelhos': [1401],
    'data': []
  }
  let inputData = [
    { id: 1401, indicator: 'total', year: 2015, value: 61 },
    { id: 1401, indicator: 'total', year: 2016, value: 13 }
  ]
  let expected = {
    'id': 1401,
    'concelhos': [1401],
    'data': {
      'total': [
        { year: 2015, value: 61 },
        { year: 2016, value: 13 }
      ]
    }
  }
  t.deepEqual(lib.addTsData(inputArea, inputData), expected)
})

test('Add data to an area and aggregate properly', t => {
  let inputArea = {
    'id': 14,
    'concelhos': [1401, 1402],
    'data': []
  }
  let inputData = [
    { id: 1401, indicator: 'total', year: 2015, value: 61 },
    { id: 1402, indicator: 'total', year: 2015, value: 4 },
    { id: 1401, indicator: 'total', year: 2016, value: 87 },
    { id: 1501, indicator: 'total', year: 2016, value: 87 }
  ]
  let expected = {
    'id': 14,
    'concelhos': [1401, 1402],
    'data': {
      'total': [
        { year: 2015, value: 65 },
        { year: 2016, value: 87 }
      ]
    }
  }
  t.deepEqual(lib.addTsData(inputArea, inputData), expected)
})

test('Aggregate properly on successive attempts', t => {
  let inputArea1 = {
    'id': 1401,
    'concelhos': [1401],
    'data': []
  }
  let inputArea2 = {
    'id': 14,
    'concelhos': [1401, 1402],
    'data': []
  }
  let inputData = [
    { id: 1401, indicator: 'total', year: 2015, value: 61 },
    { id: 1402, indicator: 'total', year: 2015, value: 4 },
    { id: 1401, indicator: 'total', year: 2016, value: 87 }
  ]
  let expected2 = {
    'id': 14,
    'concelhos': [1401, 1402],
    'data': {
      'total': [
        { year: 2015, value: 65 },
        { year: 2016, value: 87 }
      ]
    }
  }
  lib.addTsData(inputArea1, inputData)
  t.deepEqual(lib.addTsData(inputArea2, inputData), expected2)
})

test('Add data to an area and aggregate properly with nulls', t => {
  let inputArea = {
    'id': 14,
    'concelhos': [1401, 1402],
    'data': []
  }
  let inputData = [
    { id: 1401, indicator: 'total', year: 2015, value: 61 },
    { id: 1402, indicator: 'total', year: 2015, value: null },
    { id: 1401, indicator: 'total', year: 2016, value: 87 }
  ]
  let expected = {
    'id': 14,
    'concelhos': [1401, 1402],
    'data': {
      'total': [
        { year: 2015, value: 61 },
        { year: 2016, value: 87 }
      ]
    }
  }
  t.deepEqual(lib.addTsData(inputArea, inputData), expected)
})

test('Join a TopoJSON with data', t => {
  let inputTopo = {
    'type': 'Topology',
    'objects': {
      'all_areas': {
        'type': 'GeometryCollection',
        'geometries': [
          {
            'type': 'Polygon',
            'properties': {
              'id': '1401',
              'type': 'concelho'
            }
          }
        ]
      }
    }
  }
  let inputData = [
    {
      'id': 1401,
      'data': [
        {
          'indicator': 'lic-geral',
          'year': 1998,
          'value': 39
        }
      ]
    },
    {
      'id': 1402,
      'data': [
        {
          'indicator': 'lic-geral',
          'year': 2000,
          'value': 32
        }
      ]
    }
  ]
  let expected = {
    'type': 'Topology',
    'objects': {
      'all_areas': {
        'type': 'GeometryCollection',
        'geometries': [
          {
            'type': 'Polygon',
            'properties': {
              'id': '1401',
              'type': 'concelho',
              'data': [
                { indicator: 'lic-geral', year: 1998, value: 39 }
              ]
            }
          }
        ]
      }
    }
  }
  t.deepEqual(lib.joinTopo(inputTopo, inputData, 'id'), expected)
})
