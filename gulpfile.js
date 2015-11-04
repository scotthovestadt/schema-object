var gulp = require('gulp');
var _gulp = require('load-plugins')('gulp-*');
var argv = require('minimist')(process.argv.slice(2));

gulp.task('test', ['build'], function() {
  return gulp.src('test/tests.js', { read: false })
    .pipe(_gulp.mocha({
      reporter: 'spec',
      grep: argv.grep
    }));
});

gulp.task('build', function() {
  return gulp.src('lib/*.js')
    .pipe(_gulp.babel())
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['build']);