import logger from '@wdio/logger'
const log = logger('gulp-webdriver')
const colors = require('ansi-colors')
const { series } = require('gulp')

const options = {
    src: 'src',
    dist: 'lib',
    test: 'test',
    errorHandler: (title) => {
        return (err) => {
            if (err) {
                log.error(`${colors.red([title]) + err.toString()}`)
            } else {
                log.info(`${colors.redBright([title])}`)
            }
        }
    }
}

const { eslint } = require('./gulp/eslint')(options)
const { test } = require('./gulp/test')(options)

exports.eslint = eslint
exports.test = test
exports.default = series(eslint, test)
