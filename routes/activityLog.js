const express = require('express');
const globalConfig = require('../config/globals.json');
const router = express.Router();

router.use(express.static('./public'));
const path = require('path');

const pug = require('pug');
const { response } = require('express');
const pug_loggedinmenu = pug.compileFile('./masterframe/loggedinmenu.pug');

//makes so only A and B secrityaccess can edit, delete and add new objects
const canEdit = (request) => {
    if (!request.session.loggedin) return false;
    const level = request.session.securityAccessLevel;
    return ['A', 'B'].includes(level);
};
// --------------------- Läs in Masterframen --------------------------------
const readHTML = require('../readHTML.js');
const fs = require('fs');
const { json } = require('express');

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
var htmlBottom = readHTML('./masterframe/bottom.html');

// ----------------------  -------------------------------
router.get('/', (request, response) => {
    if (canEdit(request)) {
        // Öppna databasen
        const ADODB = require('node-adodb');
        const connection = ADODB.open('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=./data/mdb/activity_log.mdb;');

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
                    securityAccessLevel: request.session.securityAccessLevel
                }));
            }
            response.write(htmlHeader);
            response.write(htmlMenu);
            response.write(htmlInfoStart);

            // Skapa HTML-textsträng för tabellen för utskrift av databas
            let htmlOutput = "" +
                "<link rel=\"stylesheet\" href=\"css/personnel_registry.css\" />\n" +
                "<script src=\"./scripts/activitylogsorting.js\"></script>\n";

            htmlOutput += "<table border=\"0\">";
            htmlOutput += "<tr><td width=\"100px\" align=\"left\">";
            htmlOutput += "<h2>Activity Log</h2></td>\n";
            // Sort options

            htmlOutput += "<td width=\"80\" align=\"center\">";
            htmlOutput += "<h2>Sort By:</h2></td>\n";

            htmlOutput += "<td width=\"52\" align=\"left\" onclick=\"sorting(20, '" + request.cookies.sortType + "')\">";
            htmlOutput += "<a style=\"text-decoration: none;color: black; cursor: pointer;\">";
            htmlOutput += "<h2><b>20</b></h2></a></td>\n";

            htmlOutput += "<td width=\"52\" align=\"left\" onclick=\"sorting(50, '" + request.cookies.sortType + "')\">";
            htmlOutput += "<a style=\"text-decoration: none;color: black; cursor: pointer;\">";
            htmlOutput += "<h2><b>50</b></h2></a></td>\n";

            htmlOutput += "<td width=\"52\" align=\"left\" onclick=\"sorting(100, '" + request.cookies.sortType + "')\">";
            htmlOutput += "<a style=\"text-decoration: none;color: black; cursor: pointer;\">";
            htmlOutput += "<h2><b>100</b></h2> </a> </td>\n";

            htmlOutput += "<td width=\"72\" align=\"left\" onclick=\"sorting(150, '" + request.cookies.sortType + "')\">";
            htmlOutput += "<a style=\"text-decoration: none;color: black; cursor: pointer;\">";
            htmlOutput += "<h2><b>150</b></h2> </a> </td>\n";


            // Secondary sort options
            htmlOutput += "<td width=\"88\" align=\"center\">";
            htmlOutput += "<a style=\"text-decoration: none;color: black;\">";
            htmlOutput += "<h2>Sort By:</h2> </a> </td>\n";

            htmlOutput += "<td width=\"64\" align=\"left\" onclick=\"sorting(" + request.cookies.sortAmount + ", 'Activity')\">";
            htmlOutput += "<a style=\"text-decoration: none;color: black; cursor: pointer;\">";
            htmlOutput += "<h2><b>Activity</b></h2> </a> </td>\n";

            htmlOutput += "<td width=\"52\" align=\"center\" onclick=\"sorting(" + request.cookies.sortAmount + ", 'EmployeeCode')\">";
            htmlOutput += "<a style=\"text-decoration: none;color: black; cursor: pointer;\">";
            htmlOutput += "<h2><b>User</b></h2> </a> </td>\n";

            htmlOutput += "<td width=\"52\" align=\"center\" onclick=\"sorting(" + request.cookies.sortAmount + ", 'ID')\">";
            htmlOutput += "<a style=\"text-decoration: none;color: black; cursor: pointer;\">";
            htmlOutput += "<h2><b>Date</b></h2> </a> </td>\n";
            htmlOutput += "</tr></table>\n";



            htmlOutput += "<div id=\"table-resp\">" +
                "<div id=\"table-header\">\n" +
                "<div class=\"table-header-cell-light\">Activity</div>\n" +
                "<div class=\"table-header-cell-dark\">User</div>\n" +
                "<div class=\"table-header-cell-light\">Name</div>\n" +
                "<div class=\"table-header-cell-light\">Date</div>\n" +
                "<div class=\"table-header-cell-light\">Time</div>\n";
            if (canEdit(request)) {
                htmlOutput += "<div class=\"table-header-cell-light\">Delete</div>\n";
            }
            htmlOutput += "</div>\n\n" +
                "<div id=\"table-body\">\n";
            "";

            let result;

            // Query 1
            if (request.cookies.sortType == "ID") {
                result = await connection.query("SELECT TOP " + request.cookies.sortAmount + " ID, Activity, EmployeeCode, Name, Date, Time FROM Log ORDER BY " + request.cookies.sortType + " desc");
            }
            else {
                result = await connection.query("SELECT TOP " + request.cookies.sortAmount + " ID, Activity, EmployeeCode, Name, Date, Time FROM Log ORDER BY " + request.cookies.sortType + " desc, ID desc");
            }

            // Ta reda på antalet virus
            var count = result.length;

            // Loopa genom och skriv ut varje person
            let i;
            for (i = 0; i < count; i++) {
                str_id = result[i]['ID'];
                str_activity = result[i]['Activity'];
                str_employeeCode = result[i]['EmployeeCode'];
                str_name = result[i]['Name'];
                str_date = result[i]['Date'];
                str_time = result[i]['Time'];

                // Lägg till respektive employee till utskrift-variabeln
                htmlOutput += "<div class=\"resp-table-row\">\n";
                htmlOutput += "<div class=\"table-body-cell\">" + str_activity + "</div>\n";
                htmlOutput += "<div class=\"table-body-cell-bigger\">" + str_employeeCode + "</div>\n";
                htmlOutput += "<div class=\"table-body-cell\"> " + str_name + "</div>\n";
                htmlOutput += "<div class=\"table-body-cell\"> " + str_date + "</div>\n";
                htmlOutput += "<div class=\"table-body-cell\"> " + str_time + "</div>\n";
                if (canEdit(request)) {
                    htmlOutput += "<div class=\"table-body-cell\"><a href=\"http://localhost:3000/api/activitylog/" + str_id + "\" style=\"color:red;text-decoration:none;\">D</a></div>\n"; // Gör till knapp
                }
                htmlOutput += "</div>\n";
            }

            htmlOutput += "</div></div>\n\n";
            response.write(htmlOutput); // Skriv ut XML-datat

            response.write(htmlInfoStop);

            response.write(htmlBottom);
            response.end();
        }
        sqlQuery();
    }
    else {
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

        let htmlOutput = "<h2>You are not authorised to access this.</h2>";

        response.write(htmlOutput);

        response.write(htmlInfoStop);

        response.write(htmlBottom);
        response.end();
    }
});

// Delete specific activity log
router.get('/:id', (request, response) => {
    // Öppna databasen
    const ADODB = require('node-adodb');
    const connection = ADODB.open('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=./data/mdb/activity_log.mdb;');

    const deleteID = request.params.id;

    async function deleteSQLquery() {
        response.setHeader('Content-type', 'text/html');
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

        if (canEdit(request))  // check permissions first
        {
            const result = await connection.query("SELECT ID FROM Log WHERE ID=" + deleteID);

            if (result.length > 0) {
                // delete record - note: deleteResult not result
                const deleteResult = await connection.execute("DELETE FROM Log WHERE ID=" + deleteID);
                response.write("Activity log deleted.<br />");
                response.write("<a href=\"http://localhost:3000/api/activitylog\" style=\"color:#336699;\">Back to Activity Log</a>");
            }
            else {
                response.write("Object not found.");
            }
        }
        else {
            response.write("You are not authorised to do this.");
        }

        response.write(htmlInfoStop);
        response.write(htmlBottom);
        response.end();
    }
    deleteSQLquery();
});


module.exports = router;