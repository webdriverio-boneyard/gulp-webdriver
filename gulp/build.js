import gulp from "gulp";
import babel from "gulp-babel";

export default options => {
    gulp.task("build", () => gulp.src(`${options.src}/**/*.js`)
        .pipe(babel())
        .pipe(gulp.dest(options.dist)));
};