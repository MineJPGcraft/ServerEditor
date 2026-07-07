import axios from "axios";

// Webhook 邮件通知配置（我们用环境变量来配置，这个需要搭配MCJPG神秘自研Webhook Pusher）
const WEBHOOK_URL = process.env.MAIL_WEBHOOK_URL || "";       // e.g. http://localhost:8000/push
const WEBHOOK_TOKEN = process.env.MAIL_WEBHOOK_TOKEN || "";   // Bearer token

/**
 * 发送邮件通知（基于 webhook）。
 * 若未配置 webhook 地址或 token，则静默跳过。
 * 通知失败不影响主流程，仅打印日志。
 *
 * @param {string} to       收件人邮箱
 * @param {string} subject  邮件主题
 * @param {string} body     邮件正文（\n 为换行）
 */
export async function sendMail(to, subject, body) {
    if (!WEBHOOK_URL || !WEBHOOK_TOKEN) return;
    if (!to) return;
    try {
        await axios.post(WEBHOOK_URL, {
            channel: "email",
            recipient: to,
            subject,
            body
        }, {
            headers: {
                Authorization: `Bearer ${WEBHOOK_TOKEN}`,
                "Content-Type": "application/json"
            }
        });
    } catch (err) {
        console.error("Mail notify failed:", err.message);
    }
}

/**
 * 审核通过通知
 * @param {string} to         收件人邮箱
 * @param {object} request    请求审核的记录
 */
export async function notifyApproved(to, request) {
    const typeMap = { create: "创建", edit: "编辑", delete: "删除" };
    const typeName = typeMap[request.req_type] || request.req_type;
    const serverName = request.data?.name || "未知服务器";

    const subject = `【审核通过】您的${typeName}服务器申请已通过`;
    const body = [
        `您好，`,
        ``,
        `您提交的以下服务器申请已审核通过：`,
        ``,
        `  申请类型：${typeName}`,
        `  服务器名称：${serverName}`,
        `  申请编号：${request.id}`,
        ``,
        `请前往ServerEditor查看详情。`
    ].join("\n");

    await sendMail(to, subject, body);
}

/**
 * 审核驳回通知
 * @param {string} to         收件人邮箱
 * @param {object} request    请求审核的记录
 * @param {string|null} reason 驳回理由
 */
export async function notifyRejected(to, request, reason) {
    const typeMap = { create: "创建", edit: "编辑", delete: "删除" };
    const typeName = typeMap[request.req_type] || request.req_type;
    const serverName = request.data?.name || "未知服务器";

    const subject = `【审核未通过】您的${typeName}服务器申请已被驳回`;
    const body = [
        `您好，`,
        ``,
        `您提交的以下服务器申请未通过审核：`,
        ``,
        `  申请类型：${typeName}`,
        `  服务器名称：${serverName}`,
        `  申请编号：${request.id}`,
        `  驳回理由：${reason || "（未提供具体理由）"}`,
        ``,
        `请根据以上理由修改后重新提交。`
    ].join("\n");

    await sendMail(to, subject, body);
}
