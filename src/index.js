import through from 'through2'
import gutil from 'gulp-util'
import Launcher from '@wdio/cli/build/launcher'

module.exports = (options) => {
    return through.obj(function (file, encoding, callback) {
        let stream = this
        let wdio = new Launcher(file.path, options)

        wdio.run().then(code => {
            process.stdin.pause()

            if (code !== 0) {
                process.nextTick(() => stream.emit('error', new gutil.PluginError('gulp-webdriver', `wdio exited with code ${code}`, {
                    showStack: false
                })))
            }

            callback()
            process.nextTick(() => stream.emit('end'))
        }, e => {
            process.stdin.pause()
            process.nextTick(() => stream.emit('error', new gutil.PluginError('gulp-webdriver', e, { showStack: true })))
        })

        return stream
    })
}
