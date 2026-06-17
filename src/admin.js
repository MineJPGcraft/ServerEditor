import express from "express";
import {db,rd} from "./db.js";
export const admin_router = express.Router();
admin_router.post("/user/edit", async(req, res) => {
    if(req.sessionPerm < 3) return res.status(403).send("Permission denied");
    try
    {
        if(!req.body.id || req.body.perm === undefined)
        {
            return res.status(400).send('Missing required fields');
        }
        const result=await db.query("UPDATE users SET perm=$1 WHERE id=$2;",[req.body.perm,req.body.id]);
        if(result.rowCount<=0)
        {
            return res.status(404).send("User not found");
        }
        await rd.del(await rd.sMembers("user:"+req.body.id));
        await rd.del("user:"+req.body.id);
        res.send("Success.");
    }
    catch(err)
    {
        res.status(500).send(err.message);
    }
});
admin_router.get("/user/list", async(req, res) => {
    if(req.sessionPerm < 3) return res.status(403).send("Permission denied");
    try
    {
        const result=await db.query("SELECT id,name,perm FROM users;");
        res.json(result.rows);
    }
    catch(err)
    {
        res.status(500).send(err.message);
    }
});
admin_router.post("/user/delete", async(req, res) => {
    if(req.sessionPerm < 3) return res.status(403).send("Permission denied");
    try
    {
        if(!req.body.id)
        {
            return res.status(400).send('Missing required fields');
        }
        const result=await db.query("DELETE FROM users WHERE id=$1;",[req.body.id]);
        if(result.rowCount<=0)
        {
            return res.status(404).send("User not found");
        }
        await rd.del(await rd.sMembers("user:"+req.body.id));
        await rd.del("user:"+req.body.id);
        res.send("Success.");
    }
    catch(err)
    {
        res.status(500).send(err.message);
    }
});
admin_router.post("/edit", async(req, res) => {
    try
    {
        const reqs=['name','type','version','icon','description','link','uuid'];
        if(reqs.filter(i=>!req.body[i]).length>0)
        {
            return res.status(400).send('Missing required fields');
        }
        // 所有权检查：非超管只能编辑自己的服务器
        const owner=await db.query("SELECT userid FROM server WHERE uuid=$1;",[req.body.uuid]);
        if(owner.rows.length<=0) return res.status(404).send("Server not found");
        if(req.sessionPerm<3 && owner.rows[0].userid!==req.sessionUserId) return res.status(403).send("Permission denied: not the owner");
        const result=await db.query(`UPDATE server SET
            name=$1,
            type=$2,
            version=$3,
            icon=$4,
            description=$5,
            link=$6,
            IP=$7
        WHERE uuid=$8;`,[req.body.name,req.body.type,req.body.version,req.body.icon,req.body.description,req.body.link,req.body.IP||null,req.body.uuid]);
        if(result.rowCount<=0)
        {
            return res.status(404).send("Server not found");
        }
        await rd.del("server");
        res.send("Success.");
    }
    catch(err)
    {
        console.log(err);
        res.status(500).send(err.message);
    }
});
admin_router.post("/create", async(req, res) => {
    try
    {
        const reqs=['name','type','version','icon','description','link'];
        if(reqs.filter(i=>!req.body[i]).length>0)
        {
            return res.status(400).send('Missing required fields');
        }
        const result=await db.query(`INSERT INTO server
    (name,type,version,icon,description,link,IP,userid)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING uuid;`,[req.body.name,req.body.type,req.body.version,req.body.icon,req.body.description,req.body.link,req.body.IP||null,req.sessionUserId]);
        await rd.del("server");
        res.send(result.rows[0].uuid);
    }
    catch(err)
    {
        console.log(err);
        res.status(500).send(err.message);
    }
});
admin_router.post("/delete", async(req, res) => {
    try
    {
        if(!req.body.uuid)
        {
            return res.status(400).send('Missing uuid');
        }
        // 所有权检查：非超管只能删除自己的服务器
        const owner=await db.query("SELECT userid FROM server WHERE uuid=$1;",[req.body.uuid]);
        if(owner.rows.length<=0) return res.status(404).send("Server not found");
        if(req.sessionPerm<3 && owner.rows[0].userid!==req.sessionUserId) return res.status(403).send("Permission denied: not the owner");
        const result=await db.query("DELETE FROM server WHERE uuid=$1;",[req.body.uuid]);
        if(result.rowCount<=0)
        {
            return res.status(404).send("Server not found");
        }
        await rd.del("server");
        res.send("Success.");
    }
    catch(err)
    {
        console.log(err);
        res.status(500).send(err.message);
    }
});

// 管理用服务器列表（按所有权过滤）
admin_router.get("/server/list", async(req, res) => {
    try {
        let result;
        if(req.sessionPerm>=3) {
            result=await db.query("SELECT s.*, u.name as owner_name FROM server s LEFT JOIN users u ON s.userid=u.id;");
        } else {
            result=await db.query("SELECT s.*, u.name as owner_name FROM server s LEFT JOIN users u ON s.userid=u.id WHERE s.userid=$1;",[req.sessionUserId]);
        }
        res.json(result.rows);
    } catch(err) {
        res.status(500).send(err.message);
    }
});

// 转移服务器所有权（仅超管）
admin_router.post("/transfer", async(req, res) => {
    if(req.sessionPerm<3) return res.status(403).send("Permission denied");
    try {
        if(!req.body.uuid||!req.body.userid) return res.status(400).send('Missing required fields');
        const result=await db.query("UPDATE server SET userid=$1 WHERE uuid=$2;",[req.body.userid,req.body.uuid]);
        if(result.rowCount<=0) return res.status(404).send("Server not found");
        await rd.del("server");
        res.send("Success.");
    } catch(err) {
        res.status(500).send(err.message);
    }
});

admin_router.get("/request/list", async(req, res) => {
    try {
        const result = await db.query(
            `SELECT sr.*, u.name as username, s.name as target_name
             FROM server_requests sr
             LEFT JOIN users u ON sr.userid = u.id
             LEFT JOIN server s ON sr.target_uuid = s.uuid
             WHERE sr.status='pending'
             ORDER BY sr.created_at ASC;`
        );
        res.json(result.rows);
    } catch(err) {
        res.status(500).send(err.message);
    }
});

admin_router.post("/request/edit", async(req, res) => {
    try {
        const { id, data, req_type, target_uuid } = req.body;
        if (!id) return res.status(400).send('Missing id');
        const existing = (await db.query(
            "SELECT * FROM server_requests WHERE id=$1;", [id]
        )).rows;
        if (existing.length === 0) return res.status(404).send('Request not found');
        const newData = data !== undefined ? JSON.stringify(data) : JSON.stringify(existing[0].data);
        const newReqType = req_type || existing[0].req_type;
        const newTargetUuid = target_uuid !== undefined ? (target_uuid || null) : existing[0].target_uuid;
        const result = await db.query(
            `UPDATE server_requests SET data=$1, req_type=$2, target_uuid=$3, updated_at=now()
             WHERE id=$4 RETURNING *;`,
            [newData, newReqType, newTargetUuid, id]
        );
        res.json(result.rows[0]);
    } catch(err) {
        res.status(500).send(err.message);
    }
});

admin_router.post("/request/approve", async(req, res) => {
    try {
        const { id, force_create } = req.body;
        if (!id) return res.status(400).send('Missing id');
        const existing = (await db.query(
            "SELECT * FROM server_requests WHERE id=$1;", [id]
        )).rows;
        if (existing.length === 0) return res.status(404).send('Request not found');
        const request = existing[0];
        const data = request.data;

        if (request.req_type === 'delete') {
            // 删除是幂等操作，目标不存在也视为成功
            await db.query("DELETE FROM server WHERE uuid=$1;", [request.target_uuid]);
            await db.query("UPDATE server_requests SET status='approved', updated_at=now() WHERE id=$1;", [id]);
            return res.send("Success");
        }

        const reqs = ['name','type','version','icon','description','link'];
        if (reqs.filter(i => !data[i]).length > 0) {
            return res.status(400).send('Missing required fields in request data');
        }
        if (request.req_type === 'create' || force_create) {
            const result = await db.query(
                `INSERT INTO server (name,type,version,icon,description,link,IP,userid)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING uuid;`,
                [data.name, data.type, data.version, data.icon, data.description, data.link, data.IP || null, request.userid]
            );
            await db.query(
                "UPDATE server_requests SET status='approved', updated_at=now() WHERE id=$1;", [id]
            );
            return res.json({ uuid: result.rows[0].uuid });
        } else {
            const result = await db.query(
                `UPDATE server SET name=$1,type=$2,version=$3,icon=$4,description=$5,link=$6,IP=$7
                 WHERE uuid=$8;`,
                [data.name, data.type, data.version, data.icon, data.description, data.link, data.IP || null, request.target_uuid]
            );
            if (result.rowCount === 0) {
                return res.status(409).json({ code: 'target_not_found' });
            }
            await db.query(
                "UPDATE server_requests SET status='approved', updated_at=now() WHERE id=$1;", [id]
            );
            return res.send("Success");
        }
    } catch(err) {
        console.log(err);
        res.status(500).send(err.message);
    }
    finally {
        await rd.del("server");
    }
});

admin_router.post("/request/reject", async(req, res) => {
    try {
        const { id, reason } = req.body;
        if (!id) return res.status(400).send('Missing id');
        const existing = (await db.query(
            "SELECT * FROM server_requests WHERE id=$1;", [id]
        )).rows;
        if (existing.length === 0) return res.status(404).send('Request not found');
        await db.query(
            "UPDATE server_requests SET status='rejected', reject_reason=$1, updated_at=now() WHERE id=$2;",
            [reason || null, id]
        );
        res.send("Success");
    } catch(err) {
        res.status(500).send(err.message);
    }
});

admin_router.post("/request/submit", async(req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).send('Missing id');
        const existing = (await db.query(
            "SELECT * FROM server_requests WHERE id=$1;", [id]
        )).rows;
        if (existing.length === 0) return res.status(404).send('Request not found');
        if (existing[0].status !== 'draft') return res.status(400).send('Can only submit draft requests');
        await db.query(
            "UPDATE server_requests SET status='pending', updated_at=now() WHERE id=$1;", [id]
        );
        res.send("Success");
    } catch(err) {
        res.status(500).send(err.message);
    }
});

admin_router.post("/tag/:tag/edit",async(req, res) => {
    try {
        let tag=JSON.stringify(req.body.tag);
        await db.query("UPDATE tags SET tag=$1 WHERE name=$2",[tag,req.params.tag]);
        await rd.del("server");
        res.send("Success");
    }
    catch (err) {
        res.status(500).send(err.message);
    }
});
