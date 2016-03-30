import gulp from 'gulp'
import babel from 'gulp-babel'
import del from 'del'

export default options => {
    gulp.task('clean', () => del([options.dist + '/']))

    gulp.task('build', () => gulp.src(`${options.src}/**/*.js`)
        .pipe(babel())
        .pipe(gulp.dest(options.dist)))
}
