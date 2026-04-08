const express = require('express');
const globalConfig = require('../config/globals.json');
const router = express.Router();

router.use(express.static('./public'));
const path = require('path');

const pug = require('pug');
const { response } = require('express');
const pug_loggedinmenu = pug.compileFile('./masterframe/loggedinmenu.pug');

// --------------------- Läs in Masterframen --------------------------------
const readHTML = require('../readHTML.js');
const backupVirus = require('../backup.js');
const fs = require('fs');

const { getVirusImagesHTML } = require('./virusimages.js');

const renderHead = pug.compileFile('./masterframe/head.pug');

// Pass variables here:
const htmlHead = renderHead({
    webbadress: globalConfig.webbadress
});

const renderHeader = pug.compileFile('./masterframe/header.pug');

// Pass variables here:
const htmlHeader = renderHeader({
    webbadress: globalConfig.webbadress
});

const renderMenu = pug.compileFile('./masterframe/menu.pug');

// Pass variables here:
const htmlMenu = renderMenu({
    webbadress: globalConfig.webbadress
});
var htmlInfoStart = readHTML('./masterframe/infoStart.html');
var htmlInfoStop = readHTML('./masterframe/infoStop.html');
var htmlFooter = readHTML('./masterframe/footer.html');
var htmlBottom = readHTML('./masterframe/bottom.html');

var entriesCSS = readHTML('./masterframe/researchentries_css.html');
var entrieJS = readHTML('./masterframe/researchentries_js.html');
var entriesHTML = readHTML('./masterframe/researchentries.html');

// virus images
var htmlVirusImagesCSS = readHTML('./masterframe/virusimages_css.html');

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
                securityAccessLevel: request.session.securityAccessLevel,
                webbadress: globalConfig.webbadress
            }));
        }
        response.write(htmlHeader);
        response.write(htmlMenu);
        response.write(htmlInfoStart);

        // Hämta nivå för att veta om vi ska dölja arkiverade rader
        let userLevel = request.session.securityAccessLevel ? request.session.securityAccessLevel.toString().trim().toUpperCase() : "";

        // Skapa HTML-textsträng för tabellen för utskrift av XML-data
        let htmlOutput = "" +
            "<link rel=\"stylesheet\" href=\"css/personnel_registry.css\" \/>";

        if (request.session.loggedin) {
            htmlOutput += "<table border=\"0\">";
            htmlOutput += "<tr><td width=\"350\" align=\"left\">";
            htmlOutput += "<h2>Personnel Registry:</h2>\n";
            htmlOutput += "</td><td width=\"350\" align=\"right\">";
            if (request.session.securityAccessLevel == "A" || request.session.securityAccessLevel == "B") {
                htmlOutput += "<a href=\"http://localhost:3000/api/newvirus\" style=\"color:#336699;text-decoration:none;\">Add Research Object</a>";
            }
            htmlOutput += "</td></tr></table>";

            htmlOutput += "<div id=\"table-resp\">" +
                "<div id=\"table-header\">\n" +
                "<div class=\"table-header-cell-light\">Number</div>\n" +
                "<div class=\"table-header-cell-dark\">Name</div>\n" +
                "<div class=\"table-header-cell-light\">Created</div>\n" +
                "<div class=\"table-header-cell-light\">By</div>\n" +
                "<div class=\"table-header-cell-light\">Entries</div>\n" +
                "<div class=\"table-header-cell-light\">Last entry</div>\n";
            if (request.session.securityAccessLevel == "A" || request.session.securityAccessLevel == "B") {
                htmlOutput += "<div class=\"table-header-cell-light\">Edit</div>\n" +
                    "<div class=\"table-header-cell-light\">Delete</div>\n";
            }
            htmlOutput += "</div>\n\n" +
                "<div id=\"table-body\">\n";
            "";

            // Hämta alla objekt + deras entries i EN query
            const rows = await connection.query(`
    SELECT 
        ro.ID,
        ro.objectNumber,
        ro.objectName,
        ro.objectCreator,
        ro.objectCreatedDate,
        ro.objectStatus,
        re.entryDate
    FROM ResearchObjects ro
    LEFT JOIN ResearchEntries re
        ON ro.ID = re.researchObjectID
`);

            // Gruppera entries per objekt
            const objects = {};

            for (const row of rows) {
                if (!objects[row.ID]) {
                    objects[row.ID] = {
                        ID: row.ID,
                        objectNumber: row.objectNumber,
                        objectName: row.objectName,
                        objectStatus: row.objectStatus,
                        objectCreator: row.objectCreator,
                        objectCreatedDate: row.objectCreatedDate,
                        entries: []
                    };
                }

                if (row.entryDate) {
                    objects[row.ID].entries.push(row.entryDate);
                }
            }

            // Loopa igenom objekten och skapa HTML för varje objekt
            for (const id in objects) {
                const obj = objects[id];

                // NY ÄNDRING: Om status är 'archive' och man INTE är nivå A -> Hoppa över denna rad helt
                if (obj.objectStatus === 'archive' && userLevel !== 'A') {
                    continue;
                }

                const archiveClass = (obj.objectStatus === 'archive') ? 'row-archived' : '';

                const entryCount = obj.entries.length;

                function parseDate(str) {
                    const [day, month, year] = str.split('.');
                    return new Date(year, month - 1, day);
                }

                let lastEntryDate = "N/A";
                if (entryCount > 0) {
                    lastEntryDate = obj.entries.reduce((latest, current) => {
                        return parseDate(current) > parseDate(latest) ? current : latest;
                    });
                }



                // Lägg till respektive employee till utskrift-variabeln
                htmlOutput += "<div class= 'resp-table-row " + archiveClass + "'>\n";
                htmlOutput += "<div class=\"table-body-cell\">" + obj.objectNumber + "</div>\n";
                htmlOutput += "<div class=\"table-body-cell-bigger\"><a href=\"http://localhost:3000/api/virusdatabase/" + obj.ID + "\">" + obj.objectName + "</a></div>\n";
                htmlOutput += "<div class=\"table-body-cell\"> " + obj.objectCreatedDate + "</div>\n";
                htmlOutput += "<div class=\"table-body-cell\"> " + obj.objectCreator + "</div>\n";
                htmlOutput += "<div class=\"table-body-cell\"> " + entryCount + "</div>\n";
                htmlOutput += "<div class=\"table-body-cell\"> " + lastEntryDate + "</div>\n";
                if (request.session.securityAccessLevel == "A" || request.session.securityAccessLevel == "B") {
                    htmlOutput += "<div class=\"table-body-cell\"><a href=\"http://localhost:3000/api/editvirus/" + obj.ID + "\" style=\"color:#336699;text-decoration:none;\">E</a></div>\n";
                    htmlOutput += "<div class=\"table-body-cell\"><a href=\"http://localhost:3000/api/deletevirus/" + obj.ID + "\" style=\"color:#336699;text-decoration:none;\">D</a></div>\n";
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

// --------------------- Växla Open/Archive -------------------
router.get('/toggle/:id', async function (request, response) {
    const targetId = request.params.id;

    let userLevel = request.session.securityAccessLevel || "";
    userLevel = userLevel.toString().trim().toUpperCase();

    if (userLevel !== 'A') {
        return response.status(403).send("<h1>Nekat</h1><p>Bara administratörer (A) får göra detta.</p>");
    }

    const ADODB = require('node-adodb');
    const connection = ADODB.open('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=./data/mdb/researchdata.mdb;');

    try {
        const result = await connection.query(`SELECT objectStatus FROM ResearchObjects WHERE id = ${targetId}`);
        if (result.length > 0) {
            const currentStatus = result[0].objectStatus;
            const newStatus = (currentStatus === 'open') ? 'archive' : 'open';
            await connection.execute(`UPDATE ResearchObjects SET objectStatus = '${newStatus}' WHERE id = ${targetId}`);
        }
        response.redirect('/api/virusdatabase/' + targetId);
    } catch (error) {
        response.status(500).send("Update failed.");
    }
});

// --------------------- Läs en specifik virus-----------------------------
router.get('/:id', function (request, response) {
    var virusID = request.params.id;

    // Öppna databasen
    const ADODB = require('node-adodb');
    const connection = ADODB.open('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=./data/mdb/researchdata.mdb;');

    let level = request.session.securityAccessLevel ? request.session.securityAccessLevel.toString().trim().toUpperCase() : "";
    async function sqlQuery() {

        // Attachments
        const dirPath = path.join(__dirname, '..', 'data', virusID, 'attachments');

        let attachmentsHTML = '';

        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);

            attachmentsHTML = files.map(file => {
                const fullPath = path.join(dirPath, file);
                const stats = fs.statSync(fullPath);
                const timestamp = parseInt(file.split('-')[0], 10);
                return `
      <div class="source_row">
        <span class="source_value">${file}</span>
        <span class="source_size">${(stats.size / 1024).toFixed(1)} KB</span>
        <span class="source_date">${(new Date(timestamp).toLocaleString())}</span>
        <div class="source_icons">
          <form method="POST" action="/api/virusdatabase/${virusID}/delete-file" style="display:inline;">
      <input type="hidden" name="fileName" value="${file}">
      <button type="submit">🗑️</button>
    </form>
        </div>
      </div>
    `;
            }).join('');
        } else {
            attachmentsHTML = `<div class="source_row">Inga filer</div>`;
        }

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
                securityAccessLevel: request.session.securityAccessLevel,
                webbadress: globalConfig.webbadress
            }));
        }
        response.write(htmlHeader);
        response.write(htmlMenu);
        response.write(htmlVirusImagesCSS);
        response.write(htmlInfoStart);


        if (request.session.loggedin) {
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

            const btnText = (str_objectStatus === 'open') ? 'Archive Object' : 'Open Object';

            let toggleUrl = (level === 'A')
                ? `/api/virusdatabase/toggle/${str_virusID}`
                : `javascript:alert('Access denied. Incorrect permissions.');`;

            // Security file
            const filePath = path.resolve(__dirname, "../data/safetydatasheets/" + str_objectNumber + ".pdf");

            var virusFileName = "";
            var virusLastModified = "";
            var virusFileSizeKB = "";

            // Skapa HTML-textsträng för tabellen för utskrift av XML-data
            let htmlOutput = `
            <link rel="stylesheet" href="css/personnel_registry_employee.css">
            <div style="display: flex; justify-content: space-between; align-items: baseline; padding: 5px 0;">
                <div style="flex: 1; display: flex;  align-items: center; gap: 10px;">
                        <h1>` + str_objectNumber + `</h1>
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
            </div>`;
            if (request.session.securityAccessLevel == "A" || request.session.securityAccessLevel == "B") {
                htmlOutput += `
            <div style="display:flex; align-items: center; justify-content: space-between; width: 650px;">
            <a href="http://localhost:3000/api/editvirus/${str_virusID}" style="color:#336699;text-decoration:none;"> 
                <button style="margin-top:10px; padding:6px 14px; background:#4682B4;
                 color:#000;
                               border:1px solid #000; border-radius:0;
                               font-size:12px; font-weight:bold; cursor:pointer;">
                    Edit info
                </button></a>
            <a href="${toggleUrl}" class='edit-btn'><button style="margin-top:10px; padding:6px 14px; background:#4682B4;
                 color:#000;
                               border:1px solid #000; border-radius:0;
                               font-size:12px; font-weight:bold; cursor:pointer;">${btnText}</button></a>
                <a href="http://localhost:3000/api/virusdatabase/backup/${str_virusID}" style="color:#336699;text-decoration:none;"> 
                <button style="margin-top:10px; padding:6px 14px; background:#4682B4;
                 color:#000; border:1px solid #000; border-radius:0; font-size:12px; font-weight:bold; cursor:pointer;">
                    Backup virus
                </button></a>
            </div>
            `
            };

            response.write(htmlOutput); // Skriv ut 

            // Attachments
            response.write(`
                <div class="addNewFile">
                    <p>Upload new file</p>
                    <span class="icon_add_file"><a href="/api/data/${virusID}">📝</a></span>
                </div>
                <span class="source_label">Attachment:</span>
                <div id="sources_container">
                ${attachmentsHTML}
                </div>`);
            response.write(entriesCSS);
            response.write(entrieJS);
            response.write(entriesHTML);

            response.write(getVirusImagesHTML(virusID));
        } else {
            response.write("<h2>You are not logged in</h2>\n");
        }
        response.write(htmlInfoStop);
        response.write(htmlFooter);
        response.write(htmlBottom);
        response.end();
    }
    sqlQuery();
});


router.get('/backup/:id', function (request, response) {
    var virusID = request.params.id;

    // Öppna databasen
    const ADODB = require('node-adodb');
    const connection = ADODB.open('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=./data/mdb/researchdata.mdb;');

    let level = request.session.securityAccessLevel ? request.session.securityAccessLevel.toString().trim().toUpperCase() : "";
    async function sqlQuery() {

        // Attachments
        const dirPath = path.join(__dirname, '..', 'data', virusID, 'attachments');

        let attachmentsHTML = '';

        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);

            attachmentsHTML = files.map(file => {
                const fullPath = path.join(dirPath, file);
                const stats = fs.statSync(fullPath);
                const timestamp = parseInt(file.split('-')[0], 10);
                return `
      <div class="source_row">
        <span class="source_value">${file}</span>
        <span class="source_size">${(stats.size / 1024).toFixed(1)} KB</span>
        <span class="source_date">${(new Date(timestamp).toLocaleString())}</span>
        <div class="source_icons">
          <form method="POST" action="/api/virusdatabase/${virusID}/delete-file" style="display:inline;">
      <input type="hidden" name="fileName" value="${file}">
      <button type="submit">🗑️</button>
    </form>
        </div>
      </div>
    `;
            }).join('');
        } else {
            attachmentsHTML = `<div class="source_row">Inga filer</div>`;
        }

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
                securityAccessLevel: request.session.securityAccessLevel,
                webbadress: globalConfig.webbadress
            }));
        }
        response.write(htmlHeader);
        response.write(htmlMenu);
        response.write(htmlVirusImagesCSS);
        response.write(htmlInfoStart);


        if (request.session.loggedin) {
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

            const btnText = (str_objectStatus === 'open') ? 'Archive Object' : 'Open Object';

            let toggleUrl = (level === 'A')
                ? `/api/virusdatabase/toggle/${str_virusID}`
                : `javascript:alert('Access denied. Incorrect permissions.');`;

            // Security file
            const filePath = path.resolve(__dirname, "../data/safetydatasheets/" + str_objectNumber + ".pdf");

            var virusFileName = "";
            var virusLastModified = "";
            var virusFileSizeKB = "";

            // Skapa HTML-textsträng för tabellen för utskrift av XML-data
            let htmlOutput = `
            <link rel="stylesheet" href="css/personnel_registry_employee.css">
            <div style="display: flex; justify-content: space-between; align-items: baseline; padding: 5px 0;">
                <div style="flex: 1; display: flex;  align-items: center; gap: 10px;">
                        <h1>` + str_objectNumber + `</h1>
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
            </div>`;
            if (request.session.securityAccessLevel == "A" || request.session.securityAccessLevel == "B") {
                htmlOutput += `
            <div style="display:flex; align-items: center; justify-content: space-between; width: 650px;">
            <a href="http://localhost:3000/api/editvirus/${str_virusID}" style="color:#336699;text-decoration:none;"> 
                <button style="margin-top:10px; padding:6px 14px; background:#4682B4;
                 color:#000;
                               border:1px solid #000; border-radius:0;
                               font-size:12px; font-weight:bold; cursor:pointer;">
                    Edit info
                </button></a>
            <a href="${toggleUrl}" class='edit-btn'><button style="margin-top:10px; padding:6px 14px; background:#4682B4;
                 color:#000;
                               border:1px solid #000; border-radius:0;
                               font-size:12px; font-weight:bold; cursor:pointer;">${btnText}</button></a>
                <button style="margin-top:10px; padding:6px 14px; background:#4682B4;
                 color:#000; border:1px solid #000; border-radius:0; font-size:12px; font-weight:bold; cursor:pointer;">`
                if (await backupVirus(result)) {
                    htmlOutput += `Virus is now backed up`;
                } else {
                    htmlOutput += `Error backing up virus`;
                }
                htmlOutput += `</button></div>`
            };

            response.write(htmlOutput); // Skriv ut 

            // Attachments
            response.write(`
                <div class="addNewFile">
                    <p>Upload new file</p>
                    <span class="icon_add_file"><a href="/api/data/${virusID}">📝</a></span>
                </div>
                <span class="source_label">Attachment:</span>
                <div id="sources_container">
                ${attachmentsHTML}
                </div>`);
            response.write(entriesCSS);
            response.write(entrieJS);
            response.write(entriesHTML);

            response.write(getVirusImagesHTML(virusID));
        } else {
            response.write("<h2>You are not logged in</h2>\n");
        }
        response.write(htmlInfoStop);
        response.write(htmlFooter);
        response.write(htmlBottom);
        response.end();
    }
    sqlQuery();
});

module.exports = router;