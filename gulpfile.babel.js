import gutil from 'gulp-util'
const { series } = require('gulp')

const options = {
    src: 'src',
    dist: 'lib',
    test: 'test',
    errorHandler: (title) => {
        return (err) => {
            gutil.log(gutil.colors.red(`[${title}]`), err ? err.toString() : err)
        }
    }
}

const { eslint } = require('./gulp/eslint')(options)
const { test } = require('./gulp/test')(options)

exports.eslint = eslint
exports.test = test
exports.default = series(eslint, test)
