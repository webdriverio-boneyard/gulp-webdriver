import gulp from 'gulp'
import selenium from 'selenium-standalone'
import webdriver from '../lib/index'

module.exports = options => {
    let module = {}
    let errorLog = options.errorHandler('Selenium start')

    function seleniumStart(done) {
        selenium.install({
            logger (message) {
                process.stdout.write(`${message} \n`)
            },
            progressCb: (totalLength, progressLength) => {
                process.stdout.write(`Downloading drivers ${Math.round(progressLength / totalLength * 100)}% \r`)
            }
        }, err => {
            if (err) return done(err)

            selenium.start({
                spawnOptions: {
                    stdio: 'ignore'
                }
            }, (err, child) => {
                selenium.child = child
                errorLog(err)
                done()
            })
        })
    }

    function seleniumWebdriver(done) {
        return gulp.src(`${options.test}/wdio.*`)
          .pipe(webdriver({
              logLevel: 'verbose',
              waitforTimeout: 12345,
              framework: 'mocha',
              // only for testing purposes
              cucumberOpts: {
                  require: 'nothing'
              }
          })).once('end', () => {
              selenium.child.kill()
          })
    }

    const { series } = require('gulp')
    module.test = series(seleniumStart,seleniumWebdriver)
    module.default = module.test
    return module
}
