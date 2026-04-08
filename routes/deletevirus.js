const express = require('express');
const globalConfig = require('../config/globals.json');
const router = express.Router();
const bodyParser = require('body-parser');
var formidable = require('formidable');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

router.use(express.static('./public'));
const path = require('path');

const pug = require('pug');
const { response } = require('express'); const pug_loggedinmenu = pug.compileFile('./masterframe/loggedinmenu.pug');



// --------------------- Läs in Masterframen --------------------------------
const readHTML = require('../readHTML.js');
const fs = require('fs');

const renderHead = pug.compileFile('./masterframe/head.pug');

// Pass variables here:
const htmlHead = renderHead({
    webbadress: globalConfig.webbadress
});
var htmlHeader = readHTML('./masterframe/header.html');
const renderMenu = pug.compileFile('./masterframe/menu.pug');

// Pass variables here:
const htmlMenu = renderMenu({
    webbadress: globalConfig.webbadress
});
var htmlInfoStart = readHTML('./masterframe/infoStart.html');
var htmlInfoStop = readHTML('./masterframe/infoStop.html');
var htmlFooter = readHTML('./masterframe/footer.html');
var htmlBottom = readHTML('./masterframe/bottom.html');

var htmlLoggedinMenuCSS = readHTML('./masterframe/loggedinmenu_css.html');
var htmlLoggedinMenuJS = readHTML('./masterframe/loggedinmenu_js.html');
var htmlLoggedinMenu = readHTML('./masterframe/loggedinmenu.html');

// ---------------------- Formulär för att göra virus ------------------------------
router.get('/:id', (request, response) => {

    async function sqlQuery() {

        const ADODB = require('node-adodb');
        const connection = ADODB.open('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=./data/mdb/researchdata.mdb;');
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

        var id = request.params.id;

        if (request.session.securityAccessLevel == "A" || request.session.securityAccessLevel == "B") {

            // Ta reda på virusets objectNumber (för att kunna radera filen)
            const result = await connection.query("SELECT objectNumber FROM ResearchObjects WHERE id=" + id + "");
            let str_objectNumber = "" + result[0]['objectNumber'];

            // Öppna databasen
            const result2 = await connection.execute("DELETE FROM ResearchObjects WHERE ID=" + id);
            response.write("Deleted virus");

            // Radera filen också
            const path = "./data/safetydatasheets/" + str_objectNumber + ".pdf";
            if (fs.existsSync(path)) {
                fs.unlinkSync(path)
            }
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