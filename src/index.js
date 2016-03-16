import through from 'through2'
import resolve from 'resolve'
import path from 'path'

export default (options) => {
    return through.obj((file, encoding, callback) => {
        let Launcher = require(path.join(path.dirname(resolve.sync('webdriverio')), 'lib/launcher'))

        let launcher = new Launcher(file.path, options)

        launcher.run()
            .then(code => {
                process.exit(code)
                callback(null)
            }, e => {
                process.nextTick(() => {
                    throw e
                })
            })
    })
}
