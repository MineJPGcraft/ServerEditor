/**
 * 校验权限值是否为 0-3 的整数，应该不会有超级管理员乱传
 * @param {*} perm
 * @returns {boolean}
 */
export function isValidPerm(perm) {
    return Number.isInteger(perm) && perm >= 0 && perm <= 3;
}

/**
 * 校验请求类型
 * @param {*} reqType
 * @returns {boolean}
 */
export function isValidReqType(reqType) {
    return ['create', 'edit', 'delete'].includes(reqType);
}

/**
 * 校验标签名（仅允许 types / versions）
 * @param {*} tag
 * @returns {boolean}
 */
export function isValidTagName(tag) {
    return ['types', 'versions'].includes(tag);
}

/**
 * 校验 URL 是否为 http/https 协议 应该没人传别的玩意儿了，还是老老实实校验一下吧
 * @param {*} url
 * @returns {boolean}
 */
export function isValidUrl(url) {
    if (typeof url !== 'string' || !url) return false;
    try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * 校验图标 URL（允许 http/https 和 data:image/，不允许 data:image/svg）别传猎奇图片
 * @param {*} icon
 * @returns {boolean}
 */
export function isValidIcon(icon) {
    if (typeof icon !== 'string' || !icon) return false;
    if (/^data:image\//i.test(icon) && !/^data:image\/svg/i.test(icon)) return true;
    return isValidUrl(icon);
}

/**
 * 校验图片数组（每个元素必须是 http/https URL 字符串）
 * @param {*} picture
 * @returns {boolean}
 */
export function isValidPictureArray(picture) {
    if (picture === undefined || picture === null) return true;
    if (!Array.isArray(picture)) return false;
    return picture.every(p => typeof p === 'string' && isValidUrl(p));
}

/**
 * 校验服务器数据中的 URL 字段（link, icon, picture）
 * 返回错误消息或 null（表示通过）
 * @param {*} data
 * @returns {string|null}
 */
export function validateServerUrls(data) {
    if (!data) return null;

    if (data.link !== undefined && data.link !== null && data.link !== '' && !isValidUrl(data.link)) {
        return 'Invalid link URL: only http/https allowed';
    }
    if (data.icon !== undefined && data.icon !== null && data.icon !== '' && !isValidIcon(data.icon)) {
        return 'Invalid icon URL: only http/https or data:image allowed';
    }
    if (data.picture !== undefined && data.picture !== null && !isValidPictureArray(data.picture)) {
        return 'Invalid picture: must be array of http/https URLs';
    }
    return null;
}
