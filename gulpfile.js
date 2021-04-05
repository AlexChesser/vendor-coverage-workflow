const { src, dest, series, parallel, watch } = require('gulp');
const DotnetWatch = require('gulp-dotnet-watch');
const penthouse = require('penthouse');
const puppeteer = require('puppeteer');
const util = require('util');
const fs = require('fs');
const del = require('del');
const dotnet_ready_text = "Now listening on";

const wwwroot = "src/wwwroot/";
const paths = {
    "coverage_base": "http://localhost:5000/",
    "watch": {
        "views": [
            "src/views/home",
            "src/views/shared"
        ]
    },
    "out": {
        "js": wwwroot + "coverage/js/",
        "css": wwwroot + "coverage/css/",
    }
}

let watcher;
function dotnet_start (callback) {
    watcher = new DotnetWatch({
        project: './src',
        observe: dotnet_ready_text,
        options: [ 'no-launch-profile' ]
    })
    .watch('run', callback);
}

function dotnet_shutdown (callback) {
    watcher.kill();
    callback();
}

function clean(callback) {
    Object.keys(paths.out)
    .forEach(function _delete(path){
        del(paths.out[path] + '/**');
    });
    callback();
}

function get_filename_fullpath(output_root, page_path, entry){
    let filename = entry.url.split('/').pop();
    filename = filename.split('?')[0];
    return output_root + page_path + filename;
}

function write_extracted_coverage(coverage, output, page_path){
    let final_bytes = '';
    for (const entry of coverage) {
        final_bytes = "";
        for (const range of entry.ranges) {
            final_bytes += entry.text.slice(range.start, range.end) + '\n';
        }
        const fullpath = get_filename_fullpath(output, page_path, entry);
        fs.writeFile(fullpath, final_bytes, error => {
            if (error) {
                console.error('Error creating file:', error);
            } else {
                console.log("wrote file", fullpath);
            }
        });
    }
}

async function get_browser_coverage(coverage_type, page_path){
    const browser = await puppeteer.launch({
        ignoreHTTPSErrors: true,
        headless: true
    });
    const page = await browser.newPage();
    await page.coverage['start'+coverage_type+'Coverage']();
    await page.goto(paths.coverage_base + page_path + "?generatecoverage=true");
    const coverage = await page.coverage['stop'+coverage_type+'Coverage']();
    await browser.close();
    return coverage;
}

async function extract_coverage (coverage_type, page_path, output_path, callback){
    console.log("extracting coverage");
    const coverage = await get_browser_coverage(coverage_type, page_path);
    write_extracted_coverage(coverage, output_path, page_path);
    Promise.resolve()
    .then(callback);
}

exports.clean = clean;
exports.dotnet = dotnet_start;
exports.default = this.coverage;
exports.coverage = series(
    clean,
    dotnet_start,
    parallel(
        extract_coverage.bind(null, "CSS", "", paths.out.css)
        // create as many unique paths as needed
        // note that layout.cshtml would need to be modified
        // in order to pull per-page CSS rules
        //
        //,extract_coverage.bind(null, "my-other-path")
    ),
    dotnet_shutdown);