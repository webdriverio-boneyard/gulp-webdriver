import gulp from 'gulp'
import selenium from 'selenium-standalone'
import webdriver from '../src/index'

export default options => {
    let errorLog = options.errorHandler('Selenium start')

    gulp.task('selenium:start', done => {
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
    })

    gulp.task('test-run', ['selenium:start'], () => {
        return gulp.src(`${options.test}/wdio.*`)
            .pipe(webdriver({
                logLevel: 'command',
                updateJob: true,
                waitforTimeout: 12345,
                framework: 'mocha',
                // only for testing purposes
                cucumberOpts: {
                    require: 'nothing'
                }
            }))
    })

    gulp.task('test', ['test-run'], (done) => {
        selenium.child.kill()
        done()
    })
}

