import gulp from 'gulp'
import gutil from 'gulp-util'

import eslint from './gulp/eslint'
import build from './gulp/build'
import test from './gulp/test'

const options = {
    src: 'src',
    dist: 'l',
    test: 'test',
    errorHandler: (title) => {
        return (err) => {
            gutil.log(gutil.colors.red(`[${title}]`), err ? err.toString() : err)
        }
    }
}

eslint(options)
build(options)
test(options)

gulp.task('default', ['clean'], () => {
    gulp.start('build')
})
