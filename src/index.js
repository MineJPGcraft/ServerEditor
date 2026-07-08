import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {db,dbinit,rd} from "./db.js";
import cookieParser from "cookie-parser";
import {authRouter,checkSession} from "./auth.js";
import {admin_router} from "./admin.js";
import {oidcConfigRouter} from "./oidc-config.js";
import {userRequestRouter} from "./request.js";
import {setupRouter} from "./setup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set('json spaces', 2);
const port = process.env.PORT || 8080;

// 前端地址（用于 CORS 跨域和 OIDC 回调默认重定向）
// 不设置时保持同源一体化行为；设置后启用跨域支持（逗号分隔多个地址）
const FRONTEND_URL = process.env.FRONTEND_URL || '';
const allowedOrigins = FRONTEND_URL ? FRONTEND_URL.split(',').map(u => u.trim()).filter(Boolean) : [];

// CORS 中间件：FRONTEND_URL 设置时允许前端跨域访问（带凭证）
app.use((req, res, next) => {
    if (allowedOrigins.length > 0) {
        const origin = req.headers.origin;
        if (origin && allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.header('Access-Control-Max-Age', '3600');
        }
    }
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

await dbinit();
await rd.connect();
if(!fs.existsSync("data")) {fs.mkdirSync("data");}
app.use(express.json());
app.use(cookieParser());
app.use('/api/oidcConfig/admin',checkSession(3));
app.use('/api/oidcConfig',oidcConfigRouter);
app.use('/api/auth',authRouter);
app.get("/api/getjson",async (req,res)=>{
    try
    {
        try
        {
            let json=await rd.get("server");
            if(json)
            {
                return res.json(JSON.parse(json));
            }
            throw "qwq";
        }
        catch(err)
        {
           await getjson(req,res);
        }
    }
    catch(err)
    {
        console.log(err);
        res.status(500).send(err.message);
    }
});
app.get("/api/getjson-fork",async (req,res)=>{
    try
    {
        try
        {
            let json=await rd.get("server");
            if(json)
            {
                return res.json(JSON.parse(json));
            }
            throw "qwq";
        }
        catch(err)
        {
            await getjson(req,res);
        }
    }
    catch(err)
    {
        console.log(err);
        res.status(500).send(err.message);
    }
});
app.use('/api/admin',checkSession(2));
app.use('/api/admin',admin_router);
app.use('/api/setup', setupRouter);
app.use('/api/request',checkSession(1));
app.use('/api/request',userRequestRouter);
// 静态文件服务 - 默认提供前端构建文件（一体化部署）
// 如果 dist 目录不存在（前后端分离部署），非 API 路由返回 404
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    // SPA fallback - 所有非API路由返回 index.html
    app.use((req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    app.use((req, res) => {
        res.status(404).send('Not found');
    });
}

let server=app.listen(port, () => {
    console.log("Server started on port " + port);
});
server.on("error", console.error);

async function getjson(req, res) {
  try {
    const rows = (await db.query(
      "SELECT s.*, u.name AS owner_name FROM server s LEFT JOIN users u ON s.userid = u.id"
    )).rows

    for (let i = 0; i < rows.length; i++) {
      rows[i].id = i
    }

    const result = {
      types:    JSON.parse((await db.query("SELECT tag FROM tags WHERE name = 'types'")).rows[0].tag),
      versions: JSON.parse((await db.query("SELECT tag FROM tags WHERE name = 'versions'")).rows[0].tag),
      servers:  rows,
    }

    await rd.set("server", JSON.stringify(result))
    await rd.expire("server", 1800)
    res.json(result)
  } catch (err) {
    console.log(err)
    res.status(500).send(err.message)
  }
}
