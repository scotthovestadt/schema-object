const gulp = require('gulp');
const _gulp = require('load-plugins')('gulp-*');
const argv = require('minimist')(process.argv.slice(2));

gulp.task('test', ['build'], () => {
  return gulp.src('test/tests.js', { read: false })
    .pipe(_gulp.mocha({
      reporter: 'spec',
      grep: argv.grep
    }));
});

gulp.task('build', () => {
  return gulp.src('lib/*.js')
    .pipe(_gulp.babel())
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['build']);