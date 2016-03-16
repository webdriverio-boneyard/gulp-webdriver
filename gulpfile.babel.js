import gulp from 'gulp'
import gutil from 'gulp-util'

import eslint from './gulp/eslint'
import build from './gulp/build'
import test from './gulp/test'

const options = {
    src: 'src',
    dist: 'build',
    test: 'test',
    errorHandler: (title) => {
        return (err) => {
            gutil.log(gutil.colors.red(`[${title}]`), err.toString())
        }
    }
}

eslint(options)
build(options)
test(options)

gulp.task('default', ['clean'], () => {
    gulp.start('build')
})
