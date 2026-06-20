const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
        return res.status(401).json({ error: 'Token não fornecido.' });
    }
    try {
        const token = authHeader.replace('Bearer ', '').trim();
        const verified = jwt.verify(token, process.env.JWT_SECRET);
    
        req.user = {
            id: verified.id || verified.userId || verified.sub,
            ...verified
        };
        
        if (!req.user.id) {
            console.error('[authMiddleware] AVISO: token sem id. Payload:', verified);
            return res.status(401).json({ error: 'Token inválido: sem ID de usuário.' });
        }
        
        next();
    } catch(err) {
        return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
};

module.exports = verifyToken;