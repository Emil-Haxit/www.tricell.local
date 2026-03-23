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
const pug_editVirus = pug.compileFile('./masterframe/editVirus.pug');
const { getVirusImagesHTML } = require('./virusimages.js');



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

// virus images
var htmlVirusImagesCSS = readHTML('./masterframe/virusimages_css.html');


// ---------------------- Editera virus ------------------------------------------------
router.post('/:id', function (request, response) {
    var id = request.params.id;

    // Ta emot variablerna från formuläret
    if (request.session.securityAccessLevel == "A" || request.session.securityAccessLevel == "B") {
        var form = new formidable.IncomingForm({ allowEmptyFiles: true });
        form.parse(request, function (err, fields, files) {
            var number = fields.number;
            var name = fields.name;
            var text = fields.text;
            text = text.replace(/'/g, "''");
            var presentationVideo = fields.securityPresentationVideo;
            var handlingVideo = fields.securityHandlingVideo;

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


                // Skriv in i databasen
                const result = await connection.execute("UPDATE ResearchObjects SET objectNumber='" + number + "', objectName='" + name + "', objectText='" + text + "', presentationVideoLink='" + presentationVideo + "', securityVideoLink='" + handlingVideo + "' WHERE ID=" + id);

                // Ladda upp filen
                if (files.securityDataSheet.originalFilename != "") {
                    var oldpath = files.securityDataSheet.filepath;
                    //var newpath = path.resolve(__dirname, "../public/fileuploadtemp/"+ files.securityDataSheet.originalFilename);
                    var newpath = path.resolve(__dirname, "../data/safetydatasheets/" + number + ".pdf");
                    fs.renameSync(oldpath, newpath, function (err) {
                        if (err) throw err;
                    });
                }

                // Ge respons till användaren
                response.write("virus edited<br/><p /><a href=\"http://localhost:3000/api/virusdatabase\" style=\"color:#336699;text-decoration:none;\">Go back</a>");


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
        response.write(htmlLoggedinMenuCSS);
        response.write(htmlInfoStart);

        response.write("Not logged in or insufficient security access level");

        response.write(htmlInfoStop);
        response.write(htmlFooter);
        response.write(htmlBottom);
        response.end();
    }

});


// ---------------------- Formulär för att editera virus ------------------------------
router.get('/:id', (request, response) => {
    var id = request.params.id;

    // Öppna databasen
    const ADODB = require('node-adodb');
    const connection = ADODB.open('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=./data/mdb/researchdata.mdb;');

    async function sqlQuery() {
        // Läs nuvarande värden ur databasen
        const result = await connection.query("SELECT * FROM ResearchObjects WHERE id=" + id + "");

        let str_virusID = "" + result[0]['ID'];
        let str_objectNumber = "" + result[0]['objectNumber'];
        let str_objectName = "" + result[0]['objectName'];
        let str_objectText = "" + result[0]['objectText'];
        let str_presentationVideoLink = "";
        let str_securityVideoLink = "";
        if (result[0]['presentationVideoLink']) {
            str_presentationVideoLink = result[0]['presentationVideoLink'];
        }
        if (result[0]['securityVideoLink']) {
            str_securityVideoLink = result[0]['securityVideoLink'];
        }

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
        response.write(htmlVirusImagesCSS);
        response.write(htmlLoggedinMenuCSS);
        response.write(htmlInfoStart);

        if (request.session.securityAccessLevel == "A" || request.session.securityAccessLevel == "B") {

            // Kollar om personen har ett foto
            const path = "./data/safetydatasheets/" + str_objectNumber + ".pdf";
            if (fs.existsSync(path)) {
                oldfile = "./data/safetydatasheets//" + str_objectNumber + ".pdf";
            }
            else {
                oldfile = "test";
            }

            response.write(pug_editVirus({
                virusid: str_virusID,
                number: str_objectNumber,
                name: str_objectName,
                text: str_objectText,
                securityDataSheet: oldfile,
                securityPresentationVideo: str_presentationVideoLink,
                securityHandlingVideo: str_securityVideoLink,
            }));
            response.write(getVirusImagesHTML(id));
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