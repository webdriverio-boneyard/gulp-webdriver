import gulp from 'gulp';
import gutil from 'gulp-util';

import build from './gulp/build';
import test from './gulp/test';

const options = {
    src: 'src',
    dist: 'build',
    test: 'test',
    tmp: '.tmp',
    errorHandler(title) {
        return function(err) {
            gutil.log(gutil.colors.red(`[${title}]`), err.toString());
            this.emit('end');
        };
    }
};

new build(options);
new test(options);

gulp.task('default', ['clean'], () => {
    gulp.start('build');
});
