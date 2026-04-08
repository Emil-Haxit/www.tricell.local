const express = require('express');
const globalConfig = require('../config/globals.json');
const router = express.Router();

const pug = require('pug');

router.use(express.static('./public'));
const path = require('path');


// --------------------- Läs in Masterframen --------------------------------------------------
const readHTML = require('../readHTML.js');
const fs = require('fs');

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

// --------------------- Router -----------------------------------------------
router.get('/', function (request, response) {

    request.session.destroy();

    response.clearCookie('employeecode');
    response.clearCookie('name');
    response.clearCookie('lastlogin');
    response.clearCookie('logintimes');

    response.setHeader('Content-type', 'text/html');
    response.write(htmlHead);
    response.write(htmlHeader);
    response.write(htmlMenu);
    response.write(htmlInfoStart);

    response.write("User logged out");
    response.write(`
        <script>
            localStorage.removeItem("hqConnected");
        </script>
    `);

    response.write(htmlInfoStop);
    response.write(htmlFooter);
    response.write(htmlBottom);
    response.end();
});

module.exports = router;