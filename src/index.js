import through from 'through2'
import Launcher from '../node_modules/webdriverio/build/lib/launcher'

export default (options) => {
    return through.obj((file, encoding, callback) => {
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
