const express = require('express');
const router = express.Router();

router.use(express.static('./public'));
const path = require('path');

const pug = require('pug');
const { response } = require('express');
const pug_loggedinmenu = pug.compileFile('./masterframe/loggedinmenu.html');

// --------------------- Läs in Masterframen --------------------------------
const readHTML = require('../readHTML.js');
const fs = require('fs');

var htmlHead = readHTML('./masterframe/head.html');
var htmlHeader = readHTML('./masterframe/header.html');
var htmlMenu = readHTML('./masterframe/menu.html');
var htmlInfoStart = readHTML('./masterframe/infoStart.html');
var htmlInfoStop = readHTML('./masterframe/infoStop.html');
var htmlFooter = readHTML('./masterframe/footer.html');
var htmlBottom = readHTML('./masterframe/bottom.html');

// ---------------------- Lista all personal, Metod 4: Databas -------------------------------
router.get('/', (request, response) => {
    // Öppna databasen
    const ADODB = require('node-adodb');
    const connection = ADODB.open('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=./data/mdb/researchdata.mdb;');

    async function sqlQuery() {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.write(htmlHead);
        if (request.session.loggedin) {
            htmlLoggedinMenuCSS = readHTML('./masterframe/loggedinmenu_css.html');
            response.write(htmlLoggedinMenuCSS);
            htmlLoggedinMenuJS = readHTML('./masterframe/loggedinmenu_js.html');
            response.write(htmlLoggedinMenuJS);
            //htmlLoggedinMenu = readHTML('./masterframe/loggedinmenu.html');
            //response.write(htmlLoggedinMenu);
            response.write(pug_loggedinmenu({
                employeecode: request.cookies.employeecode,
                name: request.cookies.name,
                logintimes: request.cookies.logintimes,
                lastlogin: request.cookies.lastlogin,
            }));
        }
        response.write(htmlHeader);
        response.write(htmlMenu);
        response.write(htmlInfoStart);

        // Skapa HTML-textsträng för tabellen för utskrift av XML-data
        let htmlOutput = "" +
            "<link rel=\"stylesheet\" href=\"css/personnel_registry.css\" \/>";

        if (request.session.loggedin) {
            htmlOutput += "<table border=\"0\">";
            htmlOutput += "<tr><td width=\"350\" align=\"left\">";
            htmlOutput += "<h2>Personnel Registry:</h2>\n";
            htmlOutput += "</td><td width=\"350\" align=\"right\">";
            htmlOutput += "<a href=\"http://localhost:3000/api/newvirus\" style=\"color:#336699;text-decoration:none;\">Add Research Object</a>";
            htmlOutput += "</td></tr></table>";

            htmlOutput += "<div id=\"table-resp\">" +
                "<div id=\"table-header\">\n" +
                "<div class=\"table-header-cell-light\">Number</div>\n" +
                "<div class=\"table-header-cell-dark\">Name</div>\n" +
                "<div class=\"table-header-cell-light\">Created</div>\n" +
                "<div class=\"table-header-cell-light\">By</div>\n" +
                "<div class=\"table-header-cell-light\">Entries</div>\n" +
                "<div class=\"table-header-cell-light\">Last entry</div>\n";
            if (request.session.loggedin) {
                htmlOutput += "<div class=\"table-header-cell-light\">Edit</div>\n" +
                    "<div class=\"table-header-cell-light\">Delete</div>\n";
            }
            htmlOutput += "</div>\n\n" +
                "<div id=\"table-body\">\n";
            "";

            // Skicka SQL-query till databasen och läs in variabler
            const result = await connection.query('SELECT ID, objectNumber, objectName, objectCreator, objectCreatedDate FROM ResearchObjects');

            // Ta reda på antalet employees
            var count = result.length;

            // Loopa genom och skriv ut varje person
            let i;
            for (i = 0; i < count; i++) {

                // Skicka SQL-query till databasen och läs in variabler
                const result2 = await connection.query('SELECT entryDate FROM ResearchEntries WHERE researchObjectID = "' + result[i]['ID'] + '"');

                // Calculate number of entries and last entry date
                var entryCount = result2.length;
                function parseDate(str) {
                    const [day, month, year] = str.split('.');
                    return new Date(year, month - 1, day);
                }
                let lastEntryDate;
                if (entryCount === 0) {
                    lastEntryDate = "N/A";
                } else {
                    lastEntryDate = result2.reduce((latest, current) => {
                        return parseDate(current.entryDate) > parseDate(latest.entryDate)
                            ? current
                            : latest;
                    }).entryDate;
                }
                str_id = result[i]['ID'];
                str_objectNumber = result[i]['objectNumber'];
                str_objectName = result[i]['objectName'];
                str_objectCreator = result[i]['objectCreator'];
                str_objectCreateDate = result[i]['objectCreatedDate'];


                // Lägg till respektive employee till utskrift-variabeln
                htmlOutput += "<div class=\"resp-table-row\">\n";
                htmlOutput += "<div class=\"table-body-cell\">" + str_objectNumber + "</div>\n";
                htmlOutput += "<div class=\"table-body-cell-bigger\"><a href=\"http://localhost:3000/api/virusdatabase/" + str_id + "\">" + str_objectName + "</a></div>\n";
                htmlOutput += "<div class=\"table-body-cell\"> " + str_objectCreateDate + "</div>\n";
                htmlOutput += "<div class=\"table-body-cell\"> " + str_objectCreator + "</div>\n";
                htmlOutput += "<div class=\"table-body-cell\"> " + entryCount + "</div>\n";
                htmlOutput += "<div class=\"table-body-cell\"> " + lastEntryDate + "</div>\n";
                if (request.session.loggedin) {
                    htmlOutput += "<div class=\"table-body-cell\"><a href=\"http://localhost:3000/api/editvirus/" + str_id + "\" style=\"color:#336699;text-decoration:none;\">E</a></div>\n";
                    htmlOutput += "<div class=\"table-body-cell\"><a href=\"http://localhost:3000/api/deletevirus/" + str_id + "\" style=\"color:#336699;text-decoration:none;\">D</a></div>\n";
                }
                htmlOutput += "</div>\n";
            }

            htmlOutput += "</div></div>\n\n";
            response.write(htmlOutput); // Skriv ut XML-datat
        }
        else {
            response.write("<h2>You are not logged in</h2>\n");
        }

        response.write(htmlInfoStop);
        response.write(htmlFooter);
        response.write(htmlBottom);
        response.end();
    }
    sqlQuery();
});


// --------------------- Läs en specifik person, Metod 4: Databas -----------------------------
router.get('/:id', function (request, response) {
    var virusID = request.params.id;

    // Öppna databasen
    const ADODB = require('node-adodb');
    const connection = ADODB.open('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=./data/mdb/researchdata.mdb;');

    async function sqlQuery() {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.write(htmlHead);
        if (request.session.loggedin) {
            htmlLoggedinMenuCSS = readHTML('./masterframe/loggedinmenu_css.html');
            response.write(htmlLoggedinMenuCSS);
            htmlLoggedinMenuJS = readHTML('./masterframe/loggedinmenu_js.html');
            response.write(htmlLoggedinMenuJS);
            //htmlLoggedinMenu = readHTML('./masterframe/loggedinmenu.html');
            //response.write(htmlLoggedinMenu);
            response.write(pug_loggedinmenu({
                employeecode: request.cookies.employeecode,
                name: request.cookies.name,
                logintimes: request.cookies.logintimes,
                lastlogin: request.cookies.lastlogin,
            }));
        }
        response.write(htmlHeader);
        response.write(htmlMenu);
        response.write(htmlInfoStart);

        // Skicka SQL-query till databasen och läs in variabler
        const result = await connection.query("SELECT * FROM ResearchObjects WHERE ID = " + virusID + "");
        str_virusID = result[0]['ID'];
        str_objectNumber = result[0]['objectNumber'];
        str_objectName = result[0]['objectName'];
        str_objectCreator = result[0]['objectCreator'];
        str_objectCreateDate = result[0]['objectCreatedDate'];
        str_objectCreateTime = result[0]['objectCreatedTime'];
        str_objectText = result[0]['objectText'];
        str_objectStatus = result[0]['objectStatus'];
        var str_presentationVideoLink = "";
        var str_securityVideoLink = "";
        if (result[0]['presentationVideoLink']) {
            str_presentationVideoLink = result[0]['presentationVideoLink'];
        }
        if (result[0]['securityVideoLink']) {
            str_securityVideoLink = result[0]['securityVideoLink'];
        }

        // Security file
        const filePath = path.resolve(__dirname, "../data/safetydatasheets/" + str_objectNumber + ".pdf");

        var virusFileName = "";
        var virusLastModified = "";
        var virusFileSizeKB = "";

        // Skapa HTML-textsträng för tabellen för utskrift av XML-data
        let htmlOutput = `
            <link rel="stylesheet" href="css/personnel_registry_employee.css">
            <div style="display: flex; justify-content: space-between; align-items: baseline; padding: 5px 0;">
                <div style="flex: 1;">
                    <h1>` + str_objectNumber + `</h1>
                </div>
                <div style="flex: 2;">
                    <span>` + str_objectName + `</span>
                </div>
                <div style="flex: 1; text-align: right; font-size: 0.9em; color: #666;">
                    Created ` + str_objectCreateDate + `<br/> By ` + str_objectCreator + `
                </div>
            </div>
            `;
        htmlOutput += `
             <div style="background-color: #b0dfef; border: 1px solid blue; width: 650px; padding: 10px; margin: 10px 0;">
                <p>` + str_objectText + `</p>
            </div>
            <div style="border: 1px solid black; width: 650px; padding: 10px; margin: 10px 0;">
            <div style="display:flex; gap:30px; align-items: center;">
            <h1>Security data sheet:</h1>
            `;
        if (fs.existsSync(filePath)) {
            try {
                const stats = fs.statSync(filePath);
                const virusFileName = path.basename(filePath);
                const virusFileSizeKB = Math.round(stats.size / 1024) + 'kb';
                const mtime = stats.mtime;
                const day = String(mtime.getDate()).padStart(2, '0');
                const month = String(mtime.getMonth() + 1).padStart(2, '0');
                const year = mtime.getFullYear();
                const virusLastModified = `${day}.${month}.${year}`;

                htmlOutput += `
            <span>${virusFileName}</span>
            <span>${virusFileSizeKB}</span>
            <span>${virusLastModified}</span>
        `;
            } catch (err) {
                console.error(err);
            }
        }
        htmlOutput = htmlOutput + `
            </div>
            <p />
            <div style="display:flex; gap:20px; align-items: center;"> <h1>Security Presentation Video</h1>` + str_presentationVideoLink + ` </div>
            <p />
            <div style="display:flex; gap:20px; align-items: center;"> <h1>Security Handling Video</h1> ` + str_securityVideoLink + ` </div>
            <p />
            </div>
            <div style="display:flex; align-items: center; justify-content: right; width: 650px;">
            <a href="http://localhost:3000/api/editvirus/${str_virusID}" style="color:#336699;text-decoration:none;"> 
                <button" style="margin-top:10px; padding:6px 14px; background:#4682B4;
                 color:#000;
                               border:1px solid #000; border-radius:0;
                               font-size:12px; font-weight:bold; cursor:pointer;">
                    Edit info
                </button></a>
            </div>
            `;

        response.write(htmlOutput); // Skriv ut 

        response.write(htmlInfoStop);
        response.write(htmlFooter);
        response.write(htmlBottom);
        response.end();
    }
    sqlQuery();
});

module.exports = router;