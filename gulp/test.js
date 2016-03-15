import gulp from "gulp";

export default options => {

    gulp.task('test', () => {
        const webdriver = require('../build/index');

        return gulp.src(`${options.test}/wdio.*`).pipe(webdriver({
            logLevel: 'command',
            updateJob: true,
            waitforTimeout: 12345,
            framework: 'mocha',
            // only for testing purposes
            cucumberOpts: {
                require: 'nothing'
            }
        }));
    });

};

