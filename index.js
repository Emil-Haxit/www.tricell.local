/* ----------------------------- 3:rd party-moduler ------------------------------ */
const config = require('./config/globals.json');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();                  /* Skapa webbserver-objektet */
app.use(express.static('./public'));    /* Skapa global path till "public"-mappen */

// images from data
app.use("/data", express.static("data", {
    index: false,
    dotfiles: "deny",
    extensions: ["png", "jpg", "jpeg", "gif"],
    setHeaders: (res, path) => {
        if (!/\.(png|jpg|jpeg|gif)$/i.test(path)) {
            res.status(403).end("Forbidden");
        }
    }
}));

var cookieParser = require('cookie-parser');
app.use(cookieParser());

app.use(
    session({
        secret: 'thisisasecret',
        saveUninitialized: true,
        resave: false
    }));

app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true
    }));

const pug = require('pug');
const { response } = require('express');
const pug_loggedinmenu = pug.compileFile('./masterframe/loggedinmenu.pug');

/* ------------------------------ Egna moduler ----------------------------------- */
const readHTML = require('./readHTML.js');

/* Läs respektive HTML-text-sida för Masterframen */
var htmlHead = readHTML('./masterframe/head.html');
var htmlHeader = readHTML('./masterframe/header.html');
var htmlMenu = readHTML('./masterframe/menu.html');
var htmlInfoStart = readHTML('./masterframe/infoStart.html');
var htmlIndex = readHTML('./public/text/index.html');
var htmlInfoStop = readHTML('./masterframe/infoStop.html');
var htmlFooter = readHTML('./masterframe/footer.html');
var htmlBottom = readHTML('./masterframe/bottom.html');


/* ------------- Skapa routes för de alternativa rutterna i webbapplikationen ------------------------- */

const info = require('./routes/info');
const personnelregistry = require('./routes/personnelregistry');
const login = require('./routes/login');
const logout = require('./routes/logout');
const virusdatabase = require('./routes/virusdatabase');
const editvirus = require('./routes/editvirus');
const newvirus = require('./routes/newvirus');
const deletevirus = require('./routes/deletevirus');
const newemployee = require('./routes/newemployee');
const deleteemployee = require('./routes/deleteemployee');
const editemployee = require('./routes/editemployee');
const getchat = require('./routes/getchat');
const chat = require('./routes/chat');
const entries = require('./routes/entries.js');
const fileUploadRouter = require('./routes/fileuploadvirus.js');
const editVirusImage = require('./routes/editvirusimage.js');


/* -------------- Skapa default-router (om ingen under-sökväg anges av användaren) --------------------- */
app.get('/', function (request, response) {
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
            securityAccessLevel: request.session.securityAccessLevel
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


app.use('/api/info', info);
app.use('/api/personnelregistry', personnelregistry);
app.use('/api/login', login);
app.use('/api/logout', logout);
app.use('/api/virusdatabase', virusdatabase);
app.use('/api/editvirus', editvirus);
app.use('/api/newvirus', newvirus);
app.use('/api/deletevirus', deletevirus);
app.use('/api/newemployee', newemployee);
app.use('/api/deleteemployee', deleteemployee);
app.use('/api/editemployee', editemployee);
app.use('/api/getchat', getchat);
app.use('/api/chat', chat);
app.use('/api/entries', entries);
app.use('/api/data', fileUploadRouter);
app.use('/api/editvirusimage', editVirusImage);


/* ---------------------------------- Starta webbservern ------------------------------ */
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}... `));