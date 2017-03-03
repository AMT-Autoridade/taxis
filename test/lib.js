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
  t.deepEqual(lib.prepRawData(input), expected)
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
  t.deepEqual(lib.prepRawData(input), expected)
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
  t.deepEqual(lib.prepRawData(input), expected)
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
  t.deepEqual(lib.prepRawData(input), expected)
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
  t.deepEqual(lib.addData(inputArea, inputData), expected)
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
  t.deepEqual(lib.addData(inputArea, inputData), expected)
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
  lib.addData(inputArea1, inputData)
  t.deepEqual(lib.addData(inputArea2, inputData), expected2)
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
  t.deepEqual(lib.addData(inputArea, inputData), expected)
})
