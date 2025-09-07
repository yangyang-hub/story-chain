/**
 * 格式化工具函数
 */

/**
 * 将 Wei 转换为 ETH
 */
export function formatEther(wei: string | bigint): string {
  try {
    const ethValue = BigInt(wei) / BigInt("1000000000000000000");
    const remainder = BigInt(wei) % BigInt("1000000000000000000");

    if (remainder === BigInt(0)) {
      return ethValue.toString();
    }

    // 保留4位小数
    const decimal = Number(remainder) / 1000000000000000000;
    return (Number(ethValue) + decimal).toFixed(4);
  } catch (error) {
    console.error("Error formatting ether:", error);
    return "0";
  }
}

/**
 * 格式化地址，显示前后几位
 */
export function formatAddress(address: string, startLength = 6, endLength = 4): string {
  if (!address || address.length < startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * 格式化时间距离
 */
export function formatDistanceToNow(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;

  return new Date(timestamp * 1000).toLocaleDateString();
}

/**
 * 格式化数字，添加千分位分隔符
 */
export function formatNumber(num: number | string): string {
  const number = typeof num === "string" ? parseFloat(num) : num;
  return new Intl.NumberFormat("zh-CN").format(number);
}

/**
 * 格式化文件大小
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * 格式化IPFS哈希显示
 */
export function formatIPFSHash(hash: string, length = 12): string {
  if (!hash) return "";
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length)}...`;
}

/**
 * 格式化交易哈希
 */
export function formatTxHash(hash: string): string {
  return formatAddress(hash, 10, 6);
}

/**
 * 获取活动类型的显示名称和样式
 */
export function getActivityInfo(type: string): { name: string; emoji: string; color: string } {
  const activityTypes: Record<string, { name: string; emoji: string; color: string }> = {
    story_created: { name: "创建故事", emoji: "📝", color: "badge-primary" },
    chapter_created: { name: "创建章节", emoji: "📖", color: "badge-secondary" },
    story_liked: { name: "点赞故事", emoji: "❤️", color: "badge-error" },
    chapter_liked: { name: "点赞章节", emoji: "👍", color: "badge-warning" },
    tip_sent: { name: "发送打赏", emoji: "💰", color: "badge-success" },
    chapter_forked: { name: "分叉章节", emoji: "🍴", color: "badge-info" },
  };

  return activityTypes[type] || { name: type, emoji: "🔔", color: "badge-ghost" };
}
