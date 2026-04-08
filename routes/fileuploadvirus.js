const express = require('express');
const globalConfig = require('../config/globals.json');
const router = express.Router();
const multer = require('multer');
router.use(express.json());
const path = require('path');


const pug = require('pug');
const pug_loggedinmenu = pug.compileFile('./masterframe/loggedinmenu.pug');

// html
const readHTML = require('../readHTML.js');
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

const checkAuth = require('../authMiddleware.js');

router.use(express.static('./public'));
const fs = require('fs');
const { request } = require('http');

// Multer tar enom filen och sparar den i rätt mapp genom att hämta id't från requesten
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const virusId = req.params.id;

        const safeVirusId = String(virusId).replace(/[^a-zA-Z0-9_-]/g, ''); // Skyddar mot injections.

        const uploadPath = path.join(__dirname, '..', 'data', safeVirusId, 'attachments');

        fs.mkdirSync(uploadPath, { recursive: true });

        cb(null, uploadPath);
    },

    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9_-]/g, '');

        cb(null, `${Date.now()}-${baseName}${ext}`);
    }
});
const upload = multer({ storage: storage });

// ---------------------- Lägg till en ny attachment ------------------------------------------------
router.post('/:id', upload.single('fileadd'), function (request, response) {

    const targetid = request.params.id;
    response.redirect(`/api/virusdatabase/${targetid}`);

});




// ---------------------- Formulär för att lägga till ny fil ------------------------------
router.get('/:id', checkAuth, (request, response) => {
    const currentUserId = request.session.userId || null
    const idForFile = request.params.id
    const newdata = `
    <style>
    #fileadd {
        width: 65px;
        border: none;
        background-color: transparent;
    }
</style>

<script>

</script>

<div id="newDatacontainer">
    <strong>Welcome to Tricell Off-Grid</strong>
    <form name="addData" action="/api/data/${idForFile}" method="POST" enctype="multipart/form-data">
        <p>
            pls input fil här <input type="file" name="fileadd" id="fileadd" />
            <input type="submit" value="Upload file" />
        <p>
    </form>
</div>`

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
    response.write(htmlInfoStart);
    response.write(newdata);
    response.end();
});

module.exports = router;