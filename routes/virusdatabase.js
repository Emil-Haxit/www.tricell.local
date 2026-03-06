const express = require('express');
const router = express.Router();

router.get('/', (request, response) =>
{
    response.send('Virus Database');
});

module.exports = router;