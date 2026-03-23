
function checkAuth(req, res, next) {
    if (req.session.securityAccessLevel == "A" || req.session.securityAccessLevel == "B") {
        next();
    } else {
        res.redirect('/');
    }
}
module.exports = checkAuth;

