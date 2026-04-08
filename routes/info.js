const express = require('express');
const globalConfig = require('../config/globals.json');
const router = express.Router();
router.use(express.json());

router.use(express.static('./public'));
const path = require('path');


const pug = require('pug');
const pug_loggedinmenu = pug.compileFile('./masterframe/loggedinmenu.pug');
// --------------------- Läs in Masterframen --------------------------------------------------
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


// --------------------- Default-sida (om ingen info-sida anges) -------------------------------
router.get('/', function (request, response) {
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
            securityAccessLevel: request.session.securityAccessLevel,
            webbadress: globalConfig.webbadress
        }));
    }
    response.write(htmlHeader);
    response.write(htmlMenu);
    response.write(htmlInfoStart);

    htmlInfo = readHTML('./public/text/index.html');
    response.write(htmlInfo);

    response.write(htmlInfoStop);
    response.write(htmlFooter);
    response.write(htmlBottom);
    response.end();
});

// --------------------- Läs en specifik info-sida -----------------------------------------------
router.get('/:infotext', function (request, response) {
    const infotext = request.params.infotext;

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
            securityAccessLevel: request.session.securityAccessLevel,
            webbadress: globalConfig.webbadress
        }));
    }

    response.write(htmlHeader);
    response.write(htmlMenu);
    response.write(htmlInfoStart);

    // Kollar om inskickade sidan existerar, annars läs default 
    const filepath = path.resolve(__dirname, "../public/text/" + infotext + '.html');
    if (fs.existsSync(filepath)) {
        htmlInfo = readHTML('./public/text/' + infotext + '.html');
    }
    else {
        htmlInfo = readHTML('./public/text/index.html');
    }
    response.write(htmlInfo);
    response.write(htmlInfoStop);
    response.write(htmlFooter);
    response.write(htmlBottom);
    response.end();
});

module.exports = router;