import gulp from 'gulp'
import eslint from 'gulp-eslint'

export default options => {
    gulp.task('eslint', () => gulp.src(['**/*.js', '!node_modules/**', '!build/**'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError()))
}
