import pg from "pg";
import redis from "redis";
export const db=new pg.Pool({
    user: process.env.DB_USER||'postgres',
    password: process.env.DB_PASSWORD||'password',
    host: process.env.DB_HOST||'localhost',
    port: process.env.DB_PORT||'5432',
    database: process.env.DB_NAME||'serverlist',
    max:20
});
export const rd=new redis.createClient({url:process.env.REDIS_URL||'redis://localhost:6379'});
export async function dbinit()
{
    await db.query(`CREATE TABLE IF NOT EXISTS server (
    uuid UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text NOT NULL,
    version text NOT NULL,
    icon text NOT NULL,
    description text NOT NULL,
    link text NOT NULL,
    IP text,
    userid text,
    picture jsonb DEFAULT '[]'::jsonb
);`);
    await db.query(`CREATE TABLE IF NOT EXISTS oidc (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    secret text NOT NULL,
    perm integer,
    frontend text,
    redirect_uri text NOT NULL,
    apipoint text NOT NULL,
    auth_url text NOT NULL
);`);
    await db.query(`CREATE TABLE IF NOT EXISTS users (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    perm integer NOT NULL DEFAULT 1,
    nowpd integer NOT NULL DEFAULT 0,
    alpd integer NOT NULL DEFAULT 0
);`);
    await db.query(`CREATE TABLE IF NOT EXISTS server_requests (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    userid text NOT NULL,
    req_type text NOT NULL,
    target_uuid UUID,
    data jsonb NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    reject_reason text
);`);
    // 平滑迁移：为旧版 server 表补充后续新增的列，致敬Lynlan忘记创建列
    await db.query(`ALTER TABLE server ADD COLUMN IF NOT EXISTS userid text;`);
    await db.query(`ALTER TABLE server ADD COLUMN IF NOT EXISTS picture jsonb DEFAULT '[]'::jsonb;`);
    await db.query(`create table if not exists tags (
    name text not null PRIMARY KEY,
    tag text NOT NULL
);`);
    await db.query(`INSERT INTO tags (name,tag) 
VALUES ('types', '[]') 
ON CONFLICT (name) DO NOTHING;`);
    await db.query(`INSERT INTO tags (name,tag) 
VALUES ('versions', '[]') 
ON CONFLICT (name) DO NOTHING;`);
}
