import through from 'through2'
import resolve from 'resolve'
import path from 'path'
import PluginError from 'plugin-error'

module.exports = (options) => {
    return through.obj(function (file, encoding, callback) {
        const stream = this
        const Launcher = require(path.join(path.dirname(resolve.sync('@wdio/cli')), 'launcher')).default
        const wdio = new Launcher(file.path, options)

        wdio.run().then(code => {
            process.stdin.pause()

            if (code !== 0) {
                process.nextTick(
                    () => stream.emit(
                        'error',
                        new PluginError(
                            'gulp-webdriver',
                            `wdio exited with code ${code}`,
                            { showStack: false }
                        )
                    )
                )
            }

            callback()
            process.nextTick(
                () => stream.emit('end'))
        }, e => {
            process.stdin.pause()
            process.nextTick(
                () => stream.emit(
                    'error',
                    new PluginError(
                        'gulp-webdriver',
                        e,
                        { showStack: true }
                    )
                )
            )
        })

        return stream
    })
}
