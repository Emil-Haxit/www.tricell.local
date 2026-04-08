const express = require('express');
const globalConfig = require('../config/globals.json');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const readHTML = require('../readHTML.js');

// Importera Pug för att kunna rendera den dynamiska menyn (loggedinmenu)
const pug = require('pug');
const pug_loggedinmenu = pug.compileFile('./masterframe/loggedinmenu.pug');

// Hjälpfunktion för att hämta XML-värden
function getXmlValue(xml, parentTag, childTag) {
    const parentMatch = xml.match(new RegExp(`<${parentTag}>([\\s\\S]*?)</${parentTag}>`));
    if (!parentMatch) return "--";

    const parentContent = parentMatch[1];
    const childMatch = parentContent.match(new RegExp(`<${childTag}>(.*?)</${childTag}>`));
    return childMatch ? childMatch[1].trim() : "--";
}

// Funktion för att läsa all XML-data
async function getAllBioData() {
    const urlTyrant = "http://tyrant.tricell.local/xml/tyrant.xml";
    const urlVeronica = "http://t-veronica.tricell.local/xml/t-veronica.xml";
    const urlUroboros = "http://uroboros.tricell.local/xml/uroboros.xml";


    let data = {
        T: { temp: "--", hum: "--", light: "--" },
        V: { temp: "--", hum: "--", light: "--" },
        U: { temp: "--", hum: "--", light: "--" }
    };

    try {
        // Tyrant
        const tyrantRes = await fetch(urlTyrant);
        if (tyrantRes.ok) {
            const xml = await tyrantRes.text();
            data.T = {
                temp: getXmlValue(xml, "temperature", "current"),
                hum: getXmlValue(xml, "humidity", "current"),
                light: getXmlValue(xml, "lightSensitivity", "current")
            };
        }

        // T‑Veronica
        const veronicaRes = await fetch(urlVeronica);
        if (veronicaRes.ok) {
            const xml = await veronicaRes.text();
            data.V = {
                temp: getXmlValue(xml, "temperature", "current"),
                hum: getXmlValue(xml, "humidity", "current"),
                light: getXmlValue(xml, "lightSensitivity", "current")
            };
        }

        // Uroboros
        const uroRes = await fetch(urlUroboros);
        if (uroRes.ok) {
            const xml = await uroRes.text();
            data.U = {
                temp: getXmlValue(xml, "temperature", "current"),
                hum: getXmlValue(xml, "humidity", "current"),
                light: getXmlValue(xml, "lightSensitivity", "current")
            };
        }


    } catch (err) {
        console.error("XML Fetch Error:", err);
    }

    return data;
}


router.get('/', async (request, response) => {
    const bioData = await getAllBioData();


    // VIKTIGT: Kolla format JSON först av allt
    if (request.query.format === 'json') {
        return response.json(bioData);
    }

    // Skicka HTML-delar
    response.write(readHTML('./masterframe/head.html'));
    response.write(readHTML('./masterframe/loggedinmenu_css.html'));
    response.write(readHTML('./masterframe/loggedinmenu_js.html'));
    // Rendera menyn med Pug och skicka med användardata från cookies
    if (request.session.loggedin) {
        response.write(pug_loggedinmenu({
            employeecode: request.cookies.employeecode,
            name: request.cookies.name,
            logintimes: request.cookies.logintimes,
            lastlogin: request.cookies.lastlogin,
            securityAccessLevel: request.session.securityAccessLevel,
            webbadress: globalConfig.webbadress
        }));
    }
    response.write(readHTML('./masterframe/header.html'));
    response.write(readHTML('./masterframe/menu.html'));
    response.write(readHTML('./masterframe/infostart.html'));

    let htmloutput = `
    <style>
        .grid-container { display: grid; grid-template-columns: 400px 1fr; gap: 20px; background: transparent; border: none; max-width: 100%; margin: 0 auto; }
        .monitor-box { position: relative; width: 400px; height: 225px; background:#000; overflow: hidden; border: 2px solid #444; }
        .monitor-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; pointer-events: none; }
        .monitor-box::after { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: url('/images/noise-transparent.png'); opacity: 0.15; z-index: 99; pointer-events: none; animation: noise-move 0.2s infinite steps(2); }
        @keyframes noise-move { 0% { background-position: 0 0; } 50% { background-position: 5% 5%; } 100% { background-position: -5% 10%; } }
        .glitch-img { width: 100%; height: 100%; object-fit: cover; }
        .data-box { font-family: 'Courier New', Courier, monospace; color: #000; }
        .blue-info { width: 220px; height: 28px; padding-top: 6px; margin-bottom: 10px; background-color: #cfe7fd; text-align: center; font-weight: bold; border: 1px solid #9dbcdb; color: #222; transition: background-color 0.3s; }
        .alarm { background-color: #ff0000 !important; color: white !important; animation: blink 0.5s infinite; }
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
        .label { color: #555; font-size: 11px; text-transform: uppercase; display: block; font-weight: bold; }
        .spacer { grid-column: span 2; height: 20px; border-bottom: 1px dashed #ccc; margin-bottom: 20px; }
    </style>

    <div class="grid-container">
        <div class="monitor-box">
            <object type="text/html"
            data="http://t-veronica.tricell.local/livestream.html"
            width="410" height="315">
            </object>
        </div>
        <div class="data-box">
            <b>OBJECT: TCL#3 (T-Veronica)</b><br><br>
            <span class="label">Temperature (<12 C):</span> 
            <div id="v_temp" class="blue-info ${Number(bioData.V.temp) > 12 ? 'alarm' : ''}">${bioData.V.temp} C</div>
            <span class="label">Humidity (<20%):</span> 
            <div id="v_hum" class="blue-info ${Number(bioData.V.hum) > 20 ? 'alarm' : ''}">${bioData.V.hum} %</div>
            <span class="label">Light (<150 Lm):</span> 
            <div id="v_light" class="blue-info ${Number(bioData.V.light) > 150 ? 'alarm' : ''}">${bioData.V.light} Lm</div>
        </div>
        <div class="spacer"></div>

        <div class="monitor-box">
            <object type="text/html"
            data="http://tyrant.tricell.local/livestream.html"
            width="410" height="315">
            </object>
        </div>
        <div class="data-box">
            <b>OBJECT: TCL#2 (Tyrant)</b><br><br>
            <span class="label">Temperature (<15 C):</span> 
            <div id="t_temp" class="blue-info ${Number(bioData.T.temp) > 15 ? 'alarm' : ''}">${bioData.T.temp} C</div>
            <span class="label">Humidity (<20%):</span> 
            <div id="t_hum" class="blue-info ${Number(bioData.T.hum) > 20 ? 'alarm' : ''}">${bioData.T.hum} %</div>
            <span class="label">Light (<10 Lm):</span> 
            <div id="t_light" class="blue-info ${Number(bioData.T.light) > 10 ? 'alarm' : ''}">${bioData.T.light} Lm</div>
        </div>
        <div class="spacer"></div>

        <div class="monitor-box">
            <object type="text/html"
            data="http://uroboros.tricell.local/livestream.html"
            width="410" height="315">
            </object>
        </div>
        <div class="data-box">
            <b>OBJECT: TCL#4 (Uroboros)</b><br><br>
            <span class="label">Temperature (<10 C):</span> 
            <div id="u_temp" class="blue-info ${Number(bioData.U.temp) > 10 ? 'alarm' : ''}">${bioData.U.temp} C</div>
            <span class="label">Humidity (<20%):</span> 
            <div id="u_hum" class="blue-info ${Number(bioData.U.hum) > 20 ? 'alarm' : ''}">${bioData.U.hum} %</div>
            <span class="label">Light (<210 Lm):</span> 
            <div id="u_light" class="blue-info ${Number(bioData.U.light) > 210 ? 'alarm' : ''}">${bioData.U.light} Lm</div>
        </div>
    </div>

    <script>
        // Fixar ReferenceError: loadChat is not defined
        function loadChat() { 
            console.log("Tricell Telemetry System: Online"); 
        }

        function updateImages() {
            const t = new Date().getTime();
            if(document.getElementById("img_v")) document.getElementById("img_v").src = "/t-veronica/images/t-veronica.jpg?t=" + t;
            if(document.getElementById("img_t")) document.getElementById("img_t").src = "/tyrant/images/tyrant.jpg?t=" + t;
            if(document.getElementById("img_u")) document.getElementById("img_u").src = "/uroboros/images/uroboros.jpg?t=" + t;
        }

        async function updateData() {
            try {
                // Vi anropar samma URL som vi är på, men lägger till format=json
                const res = await fetch(window.location.pathname + '?format=json');
                if (!res.ok) throw new Error('Network error');
                const data = await res.json();
                
                updateElement("v_temp", data.V.temp, 12, " C");
                updateElement("v_hum", data.V.hum, 20, " %");
                updateElement("v_light", data.V.light, 150, " Lm");

                updateElement("t_temp", data.T.temp, 15, " C");
                updateElement("t_hum", data.T.hum, 20, " %");
                updateElement("t_light", data.T.light, 10, " Lm");

                updateElement("u_temp", data.U.temp, 10, " C");
                updateElement("u_hum", data.U.hum, 20, " %");
                updateElement("u_light", data.U.light, 210, " Lm");
            } catch (e) { 
                console.log("Sync error:", e); 
            }
        }

        function updateElement(id, val, limit, unit) {
            const el = document.getElementById(id);
            if(!el) return;
            el.innerHTML = val + unit;
            if(parseFloat(val) > limit) el.classList.add("alarm");
            else el.classList.remove("alarm");
        }

        window.addEventListener('load', function() {
            loadChat(); 
            setInterval(updateImages, 1000);
            setInterval(updateData, 3000);
            setTimeout(() => { if(typeof $ !== 'undefined' && $.fn.mgGlitch) $(".glitch-img").mgGlitch({glitch:true, blend:true}); }, 500);
        });
    </script>
    `;

    response.write(htmloutput);
    response.write(readHTML('./masterframe/infostop.html'));
    response.write(readHTML('./masterframe/bottom.html'));
    response.end();
});

module.exports = router;