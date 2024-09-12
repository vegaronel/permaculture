
function middleWare(req, res, next){
    res.locals.firstname = req.session.firstname;
    res.locals.lastname = req.session.lastname
    res.locals.email = req.session.email;
    res.locals.profilePicture = req.session.profilePicture;
    next();
}
module.exports = middleWare;