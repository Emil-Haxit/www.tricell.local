const express = require('express');
const router = express.Router();
const multer = require('multer');
router.use(express.json());
const path = require('path');

const checkAuth = require('../authMiddleware.js');

router.use(express.static('./public'));
const readHTML = require('../readHTML.js');
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
    console.log(idForFile)
    const newdata = `<style>
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

    response.render('user', {
        content: newdata,
        userId: currentUserId,
        cookieemployeecode: request.cookies.employeecode,
        cookiename: request.cookies.name,
        cookielogintimes: request.cookies.logintimes,
        cookielastlogin: request.cookies.lastlogin,
        menu: readHTML('./masterframe/menu_back.html'),
    })
});

module.exports = router;