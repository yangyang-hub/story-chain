"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "zh" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 中文翻译
const zhTranslations: Record<string, string> = {
  // 导航
  "nav.home": "首页",
  "nav.create": "创建故事",
  "nav.explore": "探索",
  "nav.debug": "合约调试",
  "nav.profile": "个人中心",
  
  // 主页
  "welcome.to": "欢迎来到",
  "welcome.title": "StoryChain",
  "welcome.subtitle": "去中心化故事创作平台",
  "welcome.description": "在这里，每个故事都可以分叉成无限的可能性。创建、续写、分叉故事，与全世界的创作者一起构建故事宇宙。",
  "welcome.get_started": "开始创作",
  "welcome.explore_stories": "探索故事",
  "welcome.connect_wallet": "连接钱包",
  "welcome.connected_address": "已连接地址",
  
  // 故事相关
  "story.create": "创建故事",
  "story.title": "故事标题",
  "story.content": "故事内容",
  "story.fork_fee": "分叉费用",
  "story.create_story": "创建故事",
  "story.add_chapter": "添加章节",
  "story.fork_story": "分叉故事",
  "story.like": "点赞",
  "story.comment": "评论",
  "story.tip": "打赏",
  "story.author": "作者",
  "story.created_time": "创建时间",
  "story.likes": "点赞数",
  "story.forks": "分叉数",
  "story.tips": "打赏收入",
  "story.chapter": "章节",
  "story.parent_chapter": "父章节",
  
  // 按钮和操作
  "button.create": "创建",
  "button.save": "保存",
  "button.cancel": "取消",
  "button.submit": "提交",
  "button.upload": "上传",
  "button.download": "下载",
  "button.edit": "编辑",
  "button.delete": "删除",
  "button.confirm": "确认",
  "button.back": "返回",
  "button.next": "下一步",
  "button.previous": "上一步",
  
  // 表单
  "form.title.required": "标题必填",
  "form.content.required": "内容必填",
  "form.fee.invalid": "费用格式错误",
  "form.upload_image": "上传图片",
  "form.upload_file": "上传文件",
  
  // 状态提示
  "loading": "加载中...",
  "uploading": "上传中...",
  "success": "操作成功",
  "error": "操作失败",
  "connecting": "连接中...",
  "connected": "已连接",
  "disconnected": "未连接",
  
  // 主题切换
  "theme.light": "浅色模式",
  "theme.dark": "深色模式",
  "theme.toggle": "切换主题",
  
  // 语言切换
  "language.zh": "中文",
  "language.en": "English",
  "language.toggle": "切换语言",
  
  // IPFS相关
  "ipfs.uploading": "上传到IPFS中...",
  "ipfs.uploaded": "已上传到IPFS",
  "ipfs.error": "IPFS上传失败",
  
  // 交易相关
  "transaction.pending": "交易等待确认",
  "transaction.confirmed": "交易已确认",
  "transaction.failed": "交易失败",
  "transaction.hash": "交易哈希",
  
  // 钱包相关
  "wallet.connect": "连接钱包",
  "wallet.disconnect": "断开连接",
  "wallet.account": "账户",
  "wallet.balance": "余额",
  "wallet.network": "网络",
  
  // 错误信息
  "error.network": "网络错误",
  "error.wallet": "钱包错误",
  "error.contract": "合约调用错误",
  "error.ipfs": "IPFS错误",
  "error.unknown": "未知错误",
  
  // 成功信息
  "success.story_created": "故事创建成功！",
  "success.chapter_added": "章节添加成功！",
  "success.story_forked": "故事分叉成功！",
  "success.liked": "点赞成功！",
  "success.tipped": "打赏成功！",
  "success.comment_added": "评论添加成功！",
};

// 英文翻译
const enTranslations: Record<string, string> = {
  // Navigation
  "nav.home": "Home",
  "nav.create": "Create Story",
  "nav.explore": "Explore",
  "nav.debug": "Debug Contracts",
  "nav.profile": "Profile",
  
  // Home page
  "welcome.to": "Welcome to",
  "welcome.title": "StoryChain",
  "welcome.subtitle": "Decentralized Story Creation Platform",
  "welcome.description": "Here, every story can fork into infinite possibilities. Create, continue, and fork stories with creators worldwide to build a story universe.",
  "welcome.get_started": "Get Started",
  "welcome.explore_stories": "Explore Stories",
  "welcome.connect_wallet": "Connect Wallet",
  "welcome.connected_address": "Connected Address",
  
  // Story related
  "story.create": "Create Story",
  "story.title": "Story Title",
  "story.content": "Story Content",
  "story.fork_fee": "Fork Fee",
  "story.create_story": "Create Story",
  "story.add_chapter": "Add Chapter",
  "story.fork_story": "Fork Story",
  "story.like": "Like",
  "story.comment": "Comment",
  "story.tip": "Tip",
  "story.author": "Author",
  "story.created_time": "Created Time",
  "story.likes": "Likes",
  "story.forks": "Forks",
  "story.tips": "Tips Earned",
  "story.chapter": "Chapter",
  "story.parent_chapter": "Parent Chapter",
  
  // Buttons and actions
  "button.create": "Create",
  "button.save": "Save",
  "button.cancel": "Cancel",
  "button.submit": "Submit",
  "button.upload": "Upload",
  "button.download": "Download",
  "button.edit": "Edit",
  "button.delete": "Delete",
  "button.confirm": "Confirm",
  "button.back": "Back",
  "button.next": "Next",
  "button.previous": "Previous",
  
  // Form
  "form.title.required": "Title is required",
  "form.content.required": "Content is required",
  "form.fee.invalid": "Invalid fee format",
  "form.upload_image": "Upload Image",
  "form.upload_file": "Upload File",
  
  // Status messages
  "loading": "Loading...",
  "uploading": "Uploading...",
  "success": "Success",
  "error": "Error",
  "connecting": "Connecting...",
  "connected": "Connected",
  "disconnected": "Disconnected",
  
  // Theme toggle
  "theme.light": "Light Mode",
  "theme.dark": "Dark Mode",
  "theme.toggle": "Toggle Theme",
  
  // Language toggle
  "language.zh": "中文",
  "language.en": "English",
  "language.toggle": "Toggle Language",
  
  // IPFS related
  "ipfs.uploading": "Uploading to IPFS...",
  "ipfs.uploaded": "Uploaded to IPFS",
  "ipfs.error": "IPFS upload failed",
  
  // Transaction related
  "transaction.pending": "Transaction pending",
  "transaction.confirmed": "Transaction confirmed",
  "transaction.failed": "Transaction failed",
  "transaction.hash": "Transaction Hash",
  
  // Wallet related
  "wallet.connect": "Connect Wallet",
  "wallet.disconnect": "Disconnect",
  "wallet.account": "Account",
  "wallet.balance": "Balance",
  "wallet.network": "Network",
  
  // Error messages
  "error.network": "Network error",
  "error.wallet": "Wallet error",
  "error.contract": "Contract call error",
  "error.ipfs": "IPFS error",
  "error.unknown": "Unknown error",
  
  // Success messages
  "success.story_created": "Story created successfully!",
  "success.chapter_added": "Chapter added successfully!",
  "success.story_forked": "Story forked successfully!",
  "success.liked": "Liked successfully!",
  "success.tipped": "Tipped successfully!",
  "success.comment_added": "Comment added successfully!",
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("en");

  // 初始化语言
  useEffect(() => {
    const savedLanguage = localStorage.getItem("storychain-language") as Language;
    if (savedLanguage && (savedLanguage === "zh" || savedLanguage === "en")) {
      setLanguageState(savedLanguage);
    } else {
      // 检测浏览器语言
      const browserLanguage = navigator.language.toLowerCase();
      if (browserLanguage.includes("zh")) {
        setLanguageState("zh");
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("storychain-language", lang);
  };

  const t = (key: string): string => {
    const translations = language === "zh" ? zhTranslations : enTranslations;
    return translations[key] || key;
  };

  const value = {
    language,
    setLanguage,
    t,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};