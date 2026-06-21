/**
 * 前端输入校验工具
 * 与后端 validate.js 保持一致，在提交前提供即时反馈
 */

/** 校验权限值是否为 0-3 的整数 */
export function isValidPerm(perm: unknown): perm is number {
  return Number.isInteger(perm) && perm >= 0 && perm <= 3
}

/** 校验请求类型 */
export function isValidReqType(type: unknown): type is 'create' | 'edit' | 'delete' {
  return ['create', 'edit', 'delete'].includes(type as string)
}

/** 校验 URL 是否为 http/https 协议 */
export function isValidUrl(url: unknown): url is string {
  if (typeof url !== 'string' || !url) return false
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** 校验图标 URL（允许 http/https 和 data:image/，不允许 data:image/svg） */
export function isValidIcon(icon: unknown): icon is string {
  if (typeof icon !== 'string' || !icon) return false
  if (/^data:image\//i.test(icon) && !/^data:image\/svg/i.test(icon)) return true
  return isValidUrl(icon)
}

/** 校验图片数组（每个元素必须是 http/https URL 字符串） */
export function isValidPictureArray(picture: unknown): picture is string[] {
  if (picture === undefined || picture === null) return true
  if (!Array.isArray(picture)) return false
  return picture.every(p => typeof p === 'string' && isValidUrl(p))
}

/**
 * 校验服务器数据中的 URL 字段（link, icon, picture）
 * 返回错误消息或 null（表示通过）
 */
export function validateServerUrls(data: Record<string, any> | null | undefined): string | null {
  if (!data) return null

  if (data.link !== undefined && data.link !== null && data.link !== '' && !isValidUrl(data.link)) {
    return '链接必须是 http:// 或 https:// 开头的有效 URL'
  }
  if (data.icon !== undefined && data.icon !== null && data.icon !== '' && !isValidIcon(data.icon)) {
    return '图标必须是 http/https URL 或 data:image 格式（不支持 SVG）'
  }
  if (data.picture !== undefined && data.picture !== null && !isValidPictureArray(data.picture)) {
    return '图片链接必须全部为 http/https URL'
  }
  return null
}
