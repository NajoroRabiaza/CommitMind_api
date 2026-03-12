const isAuthenticated = (req, res, next) => {
    if(req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({
        message: 'Unauthorized. Please login first at /auth/github'
    })
}

module.exports = isAuthenticated;