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
      dico: 1401,
      indicator: '1',
      year: 1998,
      value: 60
    },
    {
      dico: 1401,
      indicator: '1',
      year: 1999,
      value: 66
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
      dico: 1401,
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

test('Add data to a concelho', t => {
  let inputConcelho = {
    'id': 1401,
    'data': []
  }
  let inputData = [
    { dico: 1401, indicator: '1', year: 2015, value: 61 },
    { dico: 1402, indicator: '1', year: 2016, value: 61 }
  ]
  let expected = {
    'id': 1401,
    'data': [
      { indicator: '1', year: 2015, value: 61 }
    ]
  }
  t.deepEqual(lib.addData(inputConcelho, inputData), expected)
})
