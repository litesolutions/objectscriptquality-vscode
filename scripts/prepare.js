'use strict';
const fs = require('fs');
const crypto = require('crypto');
const request = require('request');

const languageServerVersion = '3.9.0.1892';
const sonarJsVersion = '4.2.0.6476';

if (!fs.existsSync('server')) {
  fs.mkdirSync('server');
}

if (!fs.existsSync('analyzers')) {
  fs.mkdirSync('analyzers');
}

downloadIfNeeded(
  `http://repo.maven.apache.org/maven2/org/sonarsource/javascript/sonar-javascript-plugin/${sonarJsVersion}/sonar-javascript-plugin-${sonarJsVersion}.jar`,
  'analyzers/sonarjs.jar'
);

function downloadIfNeeded(url, dest) {
  if (url.startsWith('file:')) {
    fs.createReadStream(url.substring('file:'.length)).pipe(fs.createWriteStream(dest));
  } else {
    request(url + '.sha1', function(error, response, body) {
      if (error) {
        throw error;
      } else if (response.statusCode != 200) {
        throw `Unable to get file ${url}: ${response.statusCode} ${body}`;
      } else {
        downloadIfChecksumMismatch(body, url, dest);
      }
    });
  }
}

function downloadIfChecksumMismatch(expectedChecksum, url, dest) {
  if (!fs.existsSync(dest)) {
    request(url).pipe(fs.createWriteStream(dest));
  } else {
    fs.createReadStream(dest)
      .pipe(crypto.createHash('sha1').setEncoding('hex'))
      .on('finish', function() {
        let sha1 = this.read();
        if (expectedChecksum != sha1) {
          console.info(`Checksum mismatch for '${dest}'. Will download it!`);
          request(url)
            .on('error', function(err) {
              throw error;
            })
            .on('response', function(response) {
              if (response.statusCode != 200) {
                throw `Unable to get file ${url}: ${response.statusCode}`;
              }
            })
            .pipe(fs.createWriteStream(dest));
        }
      });
  }
}
