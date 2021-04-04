const { src, dest, series, parallel, watch } = require('gulp');
const DotnetWatch = require('gulp-dotnet-watch');
const penthouse = require('penthouse');
const puppeteer = require('puppeteer');
const util = require('util');
const fs = require('fs');
const del = require('del');
const dotnet_ready_text = "Now listening on";

const paths = {
    coverage_base: "http://localhost:5000/",
    out: {
        coverage: "src/wwwroot/coverage/css/"
    }
}

let watcher;
function dotnet_start (callback) {
    watcher = new DotnetWatch({
        project: './src',
        observe: dotnet_ready_text
    })
    .watch('run', callback);
}
function dotnet_shutdown (callback) {
    watcher.kill();
    callback();
}

function clean(callback) {
    console.log("deleting", paths.out.coverage);
    del(paths.out.coverage + '/**');
    callback();
}

async function extract_css_coverage (page_path, callback){
    const browser = await puppeteer.launch({
        ignoreHTTPSErrors: true,
        headless: true
    });
    const page = await browser.newPage();
    await page.coverage.startCSSCoverage();
    await page.goto(paths.coverage_base + page_path + "?generatecoverage=true");
    const css_coverage = await page.coverage.stopCSSCoverage();
    await browser.close();
    let final_css_bytes = '';
    let total_bytes = 0;
    let used_bytes = 0;
    for (const entry of css_coverage) {
        final_css_bytes = "";
        total_bytes += entry.text.length;
        for (const range of entry.ranges) {
            used_bytes += range.end - range.start - 1;
            final_css_bytes += entry.text.slice(range.start, range.end) + '\n';
        }
        filename = entry.url.split('/').pop();
        filename = filename.split('?')[0];
        let fullpath = paths.out.coverage + page_path + filename;
        fs.writeFile(fullpath, final_css_bytes, error => {
            if (error) {
                console.error('Error creating file:', error);
            } else {
                console.log("wrote file", fullpath);
            }
        });
    }
    Promise.resolve()
    .then(callback);
}

exports.clean = clean;
exports.dotnet = dotnet_start;
exports.default = dotnet_start;
exports.coverage = series(
    clean, // delete all previously generated files
    dotnet_start,
    parallel(
        extract_css_coverage.bind(null, "")
        // create as many unique paths as needed
        // note that layout.cshtml would need to be modified
        // in order to pull per-page CSS rules
        //
        //,extract_css_coverage.bind(null, "my-other-path")   
    ), 
    dotnet_shutdown
);