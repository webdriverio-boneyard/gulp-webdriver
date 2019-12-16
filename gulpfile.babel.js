const log = require('fancy-log')
const colors = require('ansi-colors')
const { series } = require('gulp')

const options = {
    src: 'src',
    dist: 'lib',
    test: 'test',
    errorHandler: (title) => {
        return (err) => {
            log.error(colors.red(`[${title}]`), err ? err.toString() : '')
        }
    }
}

const { eslint } = require('./gulp/eslint')(options)
const { test } = require('./gulp/test')(options)

exports.eslint = eslint
exports.test = test
exports.default = series(eslint, test)
