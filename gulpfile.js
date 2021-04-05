const { src, dest, series, parallel, watch } = require('gulp');
const DotnetWatch = require('gulp-dotnet-watch');
const puppeteer = require('puppeteer');
const util = require('util');
const fs = require('fs');
const del = require('del');
const Interpreter = require('js-interpreter');
const dotnet_ready_text = "Now listening on";

const wwwroot = "src/wwwroot/";
const paths = {
    "coverage_base": "http://localhost:5000/",
    "watch": {
        "views": [
            "src/views"
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

function get_filename_fullpath(output_root, page_path, url){
    let filename = url.split('/').pop();
    filename = filename.split('?')[0];
    return output_root + page_path + filename;
}

function write_file(fullpath, final_bytes){
    fs.writeFile(fullpath, final_bytes, error => {
        if (error) {
            console.error('Error creating file:', error);
        } else {
            console.log("wrote file", fullpath);
        }
    });
}

function strip_coverage_css(coverage, output, page_path){
    let final_bytes = '';
    for (const entry of coverage) {
        final_bytes = "";
        for (const range of entry.ranges) {
            final_bytes += entry.text.slice(range.start, range.end) + '\n';
        }
        const fullpath = get_filename_fullpath(output, page_path, entry.url);
        write_file(fullpath, final_bytes);
    }
}

function build_inverse_ranges(entry){
    const end_of_range = entry.text.length;
    const last_entry_index = entry.ranges.length - 1;
    let inverse = [];
    for(let i = 0; i < last_entry_index; i++){
        let current_range = entry.ranges[i];
        if(i === 0 && current_range.start !== 0){
            inverse.push({
                start: 0,
                end: current_range.start - 1
            });
        }
        inverse.push({
            start: current_range.end + 1, 
            end: entry.ranges[i + 1].start - 1
        });
    }
    if(entry.ranges[last_entry_index].end !== end_of_range){
        inverse.push({
            start: entry.ranges[last_entry_index].end + 1, 
            end: end_of_range
        });
    }
    let fullpath = get_filename_fullpath(paths.out.js, "", entry.url);
    return inverse;
}

function strip_coverage_js(coverage, output, page_path){
    for (const entry of coverage) {
        let inverse = build_inverse_ranges(entry);
        let last_good_js = entry.text;
        let this_attempt_js = entry.text;
        let try_removing;
        for (const range of inverse) {
            try_removing = entry.text.slice(range.start - 1, range.end + 1);
            if(/^function\(.+\}$/.test(try_removing)){
                this_attempt_js = last_good_js.replace(try_removing, "function(){}"); 
            }
            try {
                let interpret = new Interpreter(this_attempt_js);
                last_good_js = this_attempt_js;
            } catch (e) {
                // last_good_js will not update it the eval throws an error
            }
        }
        const fullpath = get_filename_fullpath(output, page_path, entry.url);
        write_file(fullpath, last_good_js);
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
    const coverage = await get_browser_coverage(coverage_type, page_path);
    switch (coverage_type){
        case "CSS":
            strip_coverage_css(coverage, output_path, page_path);
            break;
        case "JS":
            strip_coverage_js(coverage, output_path, page_path);
            break;
        default:
            throw "unsupported coverage_type please use JS or CSS"
    }
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
        extract_coverage.bind(null, "JS", "", paths.out.js),
        extract_coverage.bind(null, "CSS", "", paths.out.css)
    ),
    dotnet_shutdown);