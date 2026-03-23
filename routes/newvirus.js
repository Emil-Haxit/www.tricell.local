const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
var formidable = require('formidable');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

router.use(express.static('./public'));
const path = require('path');

const pug = require('pug');
const { response } = require('express');
const pug_loggedinmenu = pug.compileFile('./masterframe/loggedinmenu.pug');
const pug_editVirus = pug.compileFile('./masterframe/newVirus.pug');



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

var htmlLoggedinMenuCSS = readHTML('./masterframe/loggedinmenu_css.html');
var htmlLoggedinMenuJS = readHTML('./masterframe/loggedinmenu_js.html');
var htmlLoggedinMenu = readHTML('./masterframe/loggedinmenu.html');


// ---------------------- Editera virus ------------------------------------------------
router.post('/', function (request, response) {

    // Ta emot variablerna från formuläret
    if (request.session.loggedin) {
        var form = new formidable.IncomingForm({ allowEmptyFiles: true });
        form.parse(request, function (err, fields, files) {
            var number = fields.number;
            var name = fields.name;
            var text = fields.text;
            var presentationVideo = fields.securityPresentationVideo;
            var handlingVideo = fields.securityHandlingVideo;

            const today = new Date();

            const day = String(today.getDate()).padStart(2, '0');
            const month = String(today.getMonth() + 1).padStart(2, '0'); // månader är 0–11
            const year = today.getFullYear();

            const date = `${day}.${month}.${year}`;

            const time = new Date().toLocaleTimeString('sv-SE', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });


            // Öppna databasen
            const ADODB = require('node-adodb');
            const connection = ADODB.open('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=./data/mdb/researchdata.mdb;');

            async function sqlQuery() {
                response.setHeader('Content-type', 'text/html');
                response.write(htmlHead);
                if (request.session.loggedin) {
                    response.write(htmlLoggedinMenuCSS);
                    response.write(htmlLoggedinMenuJS);
                    //response.write(htmlLoggedinMenu);
                    response.write(pug_loggedinmenu({
                        employeecode: request.cookies.employeecode,
                        name: request.cookies.name,
                        logintimes: request.cookies.logintimes,
                        lastlogin: request.cookies.lastlogin,
                        securityAccessLevel: request.session.securityAccessLevel
                    }));
                }
                response.write(htmlLoggedinMenu);
                response.write(htmlHeader);
                response.write(htmlMenu);
                response.write(htmlInfoStart);


                if (request.session.securityAccessLevel == "A" || request.session.securityAccessLevel == "B") {
                    // Skriv in i databasen
                    const result = await connection.execute("insert into ResearchObjects (objectNumber, objectName, objectText, objectCreator, objectCreatedDate, objectCreatedTime, presentationVideoLink, securityVideoLink) values ('" + number + "','" + name + "','" + text + "','" + request.cookies.employeecode.toUpperCase() + "','" + date + "','" + time + "','" + presentationVideo + "','" + handlingVideo + "')");

                    // Ladda upp filen
                    if (files.securityDataSheet.originalFilename != "") {
                        var oldpath = files.securityDataSheet.filepath;
                        //var newpath = path.resolve(__dirname, "../public/fileuploadtemp/"+ files.ffile.originalFilename);
                        var newpath = path.resolve(__dirname, "../data/safetydatasheets/" + number + ".pdf");
                        fs.renameSync(oldpath, newpath, function (err) {
                            if (err) throw err;
                        });
                    }

                    // Ge respons till användaren
                    response.write("virus added<br/><p /><a href=\"http://localhost:3000/api/virusdatabase\" style=\"color:#336699;text-decoration:none;\">Go back</a>");
                } else {
                    response.write("Not logged in or insufficient security access level");
                }

                response.write(htmlInfoStop);
                response.write(htmlFooter);
                response.write(htmlBottom);
                response.end();
            }
            sqlQuery();


        });
    }
    else {
        response.setHeader('Content-type', 'text/html');
        response.write(htmlHead);
        response.write(htmlHeader);
        response.write(htmlMenu);
        response.write(htmlInfoStart);

        response.write("Not logged in");

        response.write(htmlInfoStop);
        response.write(htmlFooter);
        response.write(htmlBottom);
        response.end();
    }

});


// ---------------------- Formulär för att göra virus ------------------------------
router.get('/', (request, response) => {

    async function sqlQuery() {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.write(htmlHead);
        if (request.session.loggedin) {
            response.write(htmlLoggedinMenuCSS);
            response.write(htmlLoggedinMenuJS);
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

        if (request.session.securityAccessLevel == "A" || request.session.securityAccessLevel == "B") {

            htmlNewEmployeeCSS = readHTML('./masterframe/newemployee_css.html');
            response.write(htmlNewEmployeeCSS);
            htmlNewEmployeeJS = readHTML('./masterframe/newemployee_js.html');
            response.write(htmlNewEmployeeJS);
            response.write(pug_editVirus({
            }));
        }
        else {
            response.write("Not logged in or insufficient security access level");
        }
        response.write(htmlInfoStop);
        response.write(htmlFooter);
        response.write(htmlBottom);
        response.end();

    }
    sqlQuery();

});

module.exports = router;