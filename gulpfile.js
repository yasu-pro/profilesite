const { src, dest, watch, parallel, series } = require("gulp");

const ejs = require("gulp-ejs");
const rename = require("gulp-rename");
const sass = require("gulp-sass")(require("sass"));
const plumber = require("gulp-plumber");
const notify = require("gulp-notify");
const uglify = require("gulp-uglify");
const browserSync = require("browser-sync");
const reload = browserSync.reload;
const fs = require("fs");

const copyHtml = () => {
  return src("./src/html/**/*.html").pipe(dest("./dest"));
};

const compileEjs = () => {
  return src("./src/ejs/**/*.ejs")
    .pipe(
      plumber({ errorHandler: notify.onError("Error: <%= error.message %>") })
    )
    .pipe(ejs())
    .pipe(rename({ extname: ".html" }))
    .pipe(dest("./dest"));
};

const compileSass = () => {
  return src("./src/sass/**/*.scss", { sourcemaps: true })
    .pipe(
      plumber({ errorHandler: notify.onError("Error: <%= error.message %>") })
    )
    .pipe(sass({ outputStyle: "compressed" }))
    .pipe(dest("./dest/css", { sourcemaps: "." }));
};

const minifyJs = () => {
  return src("./src/js/*.js", { sourcemaps: true })
    .pipe(uglify())
    .pipe(dest("./dest/js", { sourcemaps: "." }));
};

const watchFiles = () => {
  watch("./src/ejs/**/*.ejs", { ignoreInitial: false }, compileEjs).on(
    "change",
    reload
  );
  watch("./src/sass/**/*.scss", { ignoreInitial: false }, compileSass).on(
    "change",
    reload
  );
  watch("./src/js/*.js", { ignoreInitial: false }, minifyJs).on(
    "change",
    reload
  );
  watch("./src/html/**/*.html", { ignoreInitial: false }, copyHtml).on(
    "change",
    reload
  );

  browserSync.init({
    server: {
      baseDir: "./dest",
    },
  });
};

const buildEjs = () => {
  return src("./src/ejs/**/*.ejs")
    .pipe(sass({ outputStyle: "compressed" }))
    .pipe(dest("./dest/"));
};

const buildSass = () => {
  return src("./src/sass/**/*.scss")
    .pipe(sass({ outputStyle: "compressed" }))
    .pipe(dest("./dest/css"));
};

const buildJs = () => {
  return src("./src/js/*.js").pipe(uglify()).pipe(dest("./dest/js"));
};

const deletFiles = async (cb) => {
  const filesToDelete = ["./dest/css/style.css.map", "./dest/js/script.js.map"];

  let deletedCount = 0;

  filesToDelete.forEach((filePath) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log(`Deleted file: ${filePath}`);
        deletedCount++;
        if (deletedCount === filesToDelete.length) {
          console.log("All files deleted successfully");
          cb();
        }
      }
    });
  });
};

exports.default = watchFiles;
exports.build = parallel(buildSass, buildJs, deletFiles);
