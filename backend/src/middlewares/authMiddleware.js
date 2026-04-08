const jwt = require('jsonwebtoken');

const verifyToken = (req,res,next)=>{
    const authHeader = req.header('Authorization');
    
    if (!authHeader){
        return res.status(401).json({error: 'Acesso negado. Token não fornecido.'});

    }
    try{
        const token = authHeader.replace('Bearer ', '');
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();

    } catch(err){
        return res.status(401).json({error: 'Token inválido ou expirado.'});

    }
};
module.exports=verifyToken;