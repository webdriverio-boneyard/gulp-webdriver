import through from 'through2';
import Launcher from '../node_modules/webdriverio/lib/launcher';

export default function(options) {

    return through.obj(function(file, encoding, callback) {

        let configFile = file.path;

        let launcher = new Launcher(configFile, options);

        launcher.run()
            .then(function(code) {
                process.exit(code);
                callback(null);
            }, function(e) {
                process.nextTick(function() {
                    throw e;
                });
            });
    });

}