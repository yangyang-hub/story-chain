"use client";

import React, { useEffect, useState } from "react";
import { DocumentDuplicateIcon, EyeIcon, LinkIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "~~/contexts/LanguageContext";
import { getFromIPFS, getIPFSUrl, getJSONFromIPFS } from "~~/services/ipfs/ipfsService";

interface IPFSContentViewerProps {
  cid: string;
  className?: string;
  showUrl?: boolean;
  contentType?: "text" | "json" | "image" | "auto";
}

export const IPFSContentViewer: React.FC<IPFSContentViewerProps> = ({
  cid,
  className = "",
  showUrl = false,
  contentType = "auto",
}) => {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<string>(contentType);
  const { t } = useLanguage();

  useEffect(() => {
    const loadContent = async () => {
      if (!cid) return;

      try {
        setLoading(true);
        setError(null);

        if (contentType === "auto") {
          // 尝试作为 JSON 解析
          try {
            const jsonData = await getJSONFromIPFS(cid);
            setContent(jsonData);
            setType("json");
          } catch {
            // 如果 JSON 解析失败，作为文本处理
            const textData = await getFromIPFS(cid);
            setContent(textData);
            setType("text");
          }
        } else if (contentType === "json") {
          const jsonData = await getJSONFromIPFS(cid);
          setContent(jsonData);
          setType("json");
        } else if (contentType === "text") {
          const textData = await getFromIPFS(cid);
          setContent(textData);
          setType("text");
        } else if (contentType === "image") {
          setContent(getIPFSUrl(cid));
          setType("image");
        }
      } catch (err) {
        console.error("加载 IPFS 内容失败:", err);
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [cid, contentType]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!cid) {
    return null;
  }

  if (loading) {
    return (
      <div className={`p-4 border rounded-lg bg-base-100 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          <span className="text-sm text-base-content/70">{t("loading")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 border rounded-lg bg-error/10 border-error/20 ${className}`}>
        <div className="flex items-center space-x-2">
          <EyeIcon className="w-4 h-4 text-error" />
          <span className="text-sm text-error">{error}</span>
        </div>
      </div>
    );
  }

  const ipfsUrl = getIPFSUrl(cid);

  return (
    <div className={`border rounded-lg bg-base-100 ${className}`}>
      {showUrl && (
        <div className="px-4 py-2 border-b bg-base-200/50 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-base-content/70">
            <LinkIcon className="w-3 h-3" />
            <span className="truncate">IPFS: {cid}</span>
          </div>
          <div className="flex space-x-1">
            <button onClick={() => copyToClipboard(cid)} className="btn btn-ghost btn-xs" title="复制 CID">
              <DocumentDuplicateIcon className="w-3 h-3" />
            </button>
            <button onClick={() => copyToClipboard(ipfsUrl)} className="btn btn-ghost btn-xs" title="复制链接">
              <LinkIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <div className="p-4">
        {type === "image" && (
          <div className="text-center">
            <img
              src={content}
              alt="IPFS Content"
              className="max-w-full max-h-96 mx-auto rounded-lg shadow-sm"
              loading="lazy"
            />
          </div>
        )}

        {type === "json" && (
          <div className="space-y-2">
            {(content.name || content.title) && (
              <div>
                <label className="text-sm font-medium text-base-content/70">标题:</label>
                <p className="text-lg font-semibold">{content.name || content.title}</p>
              </div>
            )}

            {content.description && (
              <div>
                <label className="text-sm font-medium text-base-content/70">描述:</label>
                <p className="text-base-content/90">{content.description}</p>
              </div>
            )}

            {content.content && (
              <div>
                <label className="text-sm font-medium text-base-content/70">内容:</label>
                <div className="prose prose-sm max-w-none mt-2 p-3 bg-base-200 rounded-lg">
                  <p className="whitespace-pre-wrap">{content.content}</p>
                </div>
              </div>
            )}

            {content.author && (
              <div>
                <label className="text-sm font-medium text-base-content/70">作者:</label>
                <p className="font-mono text-sm">{content.author}</p>
              </div>
            )}

            {content.timestamp && (
              <div>
                <label className="text-sm font-medium text-base-content/70">创建时间:</label>
                <p className="text-sm">{new Date(content.timestamp).toLocaleString()}</p>
              </div>
            )}

            {content.attributes && content.attributes.length > 0 && (
              <div>
                <label className="text-sm font-medium text-base-content/70">属性:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {content.attributes.map((attr: any, index: number) => (
                    <div key={index} className="bg-base-200 p-2 rounded text-sm">
                      <span className="font-medium">{attr.trait_type}:</span>
                      <span className="ml-2">{attr.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {content.tags && content.tags.length > 0 && (
              <div>
                <label className="text-sm font-medium text-base-content/70">标签:</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {content.tags.map((tag: string, index: number) => (
                    <span key={index} className="badge badge-sm badge-outline">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {type === "text" && (
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap bg-base-200 p-4 rounded-lg text-sm">{content}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

// 简化版的IPFS内容预览组件
interface IPFSPreviewProps {
  cid: string;
  className?: string;
  maxLines?: number;
}

export const IPFSPreview: React.FC<IPFSPreviewProps> = ({ cid, className = "", maxLines = 3 }) => {
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreview = async () => {
      if (!cid) return;

      try {
        setLoading(true);

        try {
          // 尝试作为 JSON 获取
          const jsonData = await getJSONFromIPFS(cid);
          if (jsonData.content) {
            setPreview(jsonData.content);
          } else if (jsonData.description) {
            setPreview(jsonData.description);
          } else if (jsonData.name) {
            setPreview(jsonData.name);
          } else {
            setPreview(JSON.stringify(jsonData).slice(0, 100));
          }
        } catch {
          // 作为文本处理
          const textData = await getFromIPFS(cid);
          setPreview(textData);
        }
      } catch (err) {
        console.error("加载预览失败:", err);
        setPreview("加载失败");
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [cid]);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-base-300 rounded w-3/4 mb-2" />
        <div className="h-4 bg-base-300 rounded w-1/2" />
      </div>
    );
  }

  const lines = preview.split("\n").slice(0, maxLines);
  const truncated = preview.split("\n").length > maxLines;

  return (
    <div className={`text-sm text-base-content/70 ${className}`}>
      {lines.map((line, index) => (
        <div key={index} className="truncate">
          {line || "\u00A0"}
        </div>
      ))}
      {truncated && <div className="text-xs text-base-content/50 mt-1">...</div>}
    </div>
  );
};
