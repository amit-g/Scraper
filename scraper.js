//var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
//var app = express();
var async = require('async');

console.log('Starting...');

var contacts = [];

function scrapePage(url, contacts, cb) {
    console.log("Calling request for url: " + url);

    request(url, function (error, response, html) {
        if (!error) {
            //console.log(html);

            var $ = cheerio.load(html);

            //console.log($);

            var $contactsTable = $('div[id=simpletable]').filter(function () {
                return $(this).children().length > 5;
            });

            $contactsTable.children('div[id=row]').each(function(){
                var $directoryTitle = $('div[id=directory_title]', $(this));
                var $directoryTitleBolds = $directoryTitle.find('b');
                var $directoryTitleLinks = $directoryTitle.find('a');
                var $directoryTitleFonts = $directoryTitle.children('font');

                var $directoryAddresses = $('div[id=directory_address]', $(this)); // 2 entries
                var addressLines = $directoryAddresses.first().html().split('<br>');
                
                //console.log(addressLines);

                var address = "";
                var cityStateZip = [];

                if (addressLines.length === 4) {
                    address = addressLines[0] + ' ' + addressLines[1];
                    cityStateZip = addressLines[2].replace(/\s+/g, ' ').split(' ');
                    // console.log('addressLines[0]: ' + addressLines[0] + ' |' + addressLines[0].replace(/\s+/g, ' '));
                    // console.log('addressLines[1]: ' + addressLines[1] + ' |' + addressLines[1].replace(/\s+/g, ' '));
                    // console.log('addressLines[2]: ' + addressLines[2] + ' |' + addressLines[2].replace(/\s+/g, ' '));
                    // console.log('addressLines[3]: ' + addressLines[3] + ' |' + addressLines[3].replace(/\s+/g, ' '));
                }
                else if (addressLines.length === 3) {
                    address = addressLines[0];
                    cityStateZip = addressLines[1].replace(/\s+/g, ' ').split(' ');
                    //console.log('addressLines[1]: ' + addressLines[1] + ' |' + addressLines[1].replace(/\s+/g, ' '));
                }
                else {
                    cityStateZip = addressLines[0].replace(/\s+/g, ' ').split(' ');
                    //console.log('addressLines[0]: ' + addressLines[0] + ' |' + addressLines[0].replace(/\s+/g, ' '));
                }

                while (cityStateZip.length < 3) {
                    cityStateZip.push("");
                }

                //console.log(cityStateZip);

                var stateZip = cityStateZip.splice(cityStateZip.length - 2);
                var city = cityStateZip.join(" ");
                var state = stateZip[0];
                var zip = stateZip[1];

                var phoneFax = $directoryAddresses.last().html().replace('<div id=\"space4\"></div>', '').split('<br>');

                var contact = {
                    companyName: $directoryTitleBolds.first().text().trim(),
                    category: $directoryTitleLinks.last().text().trim(),
                    contactName: $directoryTitleFonts.first().text().trim(),
                    address: address.trim(),
                    city: city.trim(),
                    state: state.trim(),
                    zip: zip.trim(),
                    website: $directoryAddresses.last().children('a').text().trim(),
                    firstDirectoryAddress: $directoryAddresses.first().html(),
                    lastDirectoryAddress: $directoryAddresses.last().html()
                };

                for (var i = 0 ; i < phoneFax.length ; i++) {
                    if (phoneFax[i].indexOf("Phone:") == 0) {
                        contact.phone = phoneFax[i].replace("Phone:", "").trim();
                    }
                    else if (phoneFax[i].indexOf("Fax:") == 0) {
                        contact.fax = phoneFax[i].replace("Fax:", "").trim();
                    }
                }

                //console.log(contact);

                contacts.push(contact);
                //console.log("Number of contacts: " + contacts.length);
            });

            //console.log("Number of contacts: " + contacts.length);
        }

        if (cb) {
            cb(error);
        }
    });

    //console.log("Number of contacts: " + contacts.length);
}

function writeToFile(fileName, contacts) {
    fs.writeFile(fileName, JSON.stringify(contacts, null, 4), function (err) {
        console.log('File successfully written! - Check your project directory for the output.json file');
    });
}

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

var millisecondsBetweenCalls = 5000;
var fileName = 'output.json';
var urlTemplate = 'https://www.SomeDomain.com/SomePath?start=';
var url = 'https://www.SomeDomain.com/SomePath?start=300';
//var startPage = 1;
//var numberOfPages = 64;
var startPage = 32;
var numberOfPages = 5;
var endPage = startPage + numberOfPages - 1;
var urls = [];

for (var i = startPage - 1 ; i < endPage ; i++){
    urls.push(urlTemplate + i * 15);
}

async.forEachSeries(urls,
    function(url, callback){
        scrapePage(url, contacts, function (err) {
            console.log("Processing: " + url);
    
            sleep(millisecondsBetweenCalls).then(function() {
                callback(err);
            
                console.log("Number of contacts: " + contacts.length);
            });
        });
    },
    function(err){
        if (err){
            console.log("Could not process everything.");
            console.log(err);
        }
        else {
            writeToFile(fileName, contacts);
        }
    });


console.log('Completed');