"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { CurrencyDollarIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useLanguage } from "~~/contexts/LanguageContext";
import { useStoryChain } from "~~/hooks/useStoryChain";

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: bigint;
  chapterId: bigint;
  recipientAddress: string;
  recipientType: "story" | "chapter";
  title: string;
  onTipSuccess?: () => void;
}

export const TipModal: React.FC<TipModalProps> = ({
  isOpen,
  onClose,
  storyId,
  chapterId,
  recipientAddress,
  recipientType,
  title,
  onTipSuccess,
}) => {
  const { address } = useAccount();
  const { tip, isLoading } = useStoryChain();
  const { t } = useLanguage();

  const [tipAmount, setTipAmount] = useState("0.01");
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const predefinedAmounts = ["0.001", "0.01", "0.05", "0.1", "0.5"];

  const handleTip = async () => {
    if (!address) {
      return;
    }

    const amount = useCustom ? customAmount : tipAmount;
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    try {
      await tip(storyId, chapterId, amount);
      onTipSuccess?.();
      onClose();

      // 重置表单
      setTipAmount("0.01");
      setCustomAmount("");
      setUseCustom(false);
    } catch (error) {
      // 错误处理已在 useStoryChain 中处理
      console.error("Tip failed:", error);
    }
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      setCustomAmount(value);
    }
  };

  if (!isOpen) return null;

  const finalAmount = useCustom ? customAmount : tipAmount;
  const isValidAmount = finalAmount && parseFloat(finalAmount) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      {/* 模态框内容 */}
      <div className="relative bg-base-100 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* 头部 */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CurrencyDollarIcon className="w-6 h-6 text-warning" />
                {t(recipientType === "story" ? "tip.story" : "tip.chapter")}
              </h2>
              <p className="text-sm text-base-content/70 mt-1">{t("tip.support_creation")}</p>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {/* 内容信息 */}
          <div className="bg-base-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-sm text-base-content/70 mb-2">
              {t(recipientType === "story" ? "story.title" : "story.chapter")}:
            </h3>
            <p className="font-semibold mb-3 line-clamp-2">{title}</p>

            <div className="flex items-center gap-2 text-sm text-base-content/70">
              <span>{t("story.author")}:</span>
              <Address address={recipientAddress} size="sm" />
            </div>
          </div>

          {/* 金额选择 */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="label">
                <span className="label-text font-medium">{t("tip.select_amount")}</span>
                <span className="label-text-alt">STT</span>
              </label>

              {/* 预设金额 */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {predefinedAmounts.map(amount => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setTipAmount(amount);
                      setUseCustom(false);
                    }}
                    className={`btn btn-sm ${!useCustom && tipAmount === amount ? "btn-primary" : "btn-outline"}`}
                    disabled={isLoading}
                  >
                    {amount} STT
                  </button>
                ))}
              </div>

              {/* 自定义金额 */}
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">{t("tip.custom_amount")}</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={useCustom}
                    onChange={e => setUseCustom(e.target.checked)}
                    disabled={isLoading}
                  />
                </label>
                {useCustom && (
                  <input
                    type="number"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    className="input input-bordered input-sm"
                    placeholder={t("tip.enter_amount")}
                    min="0"
                    step="0.001"
                    disabled={isLoading}
                  />
                )}
              </div>
            </div>

            {/* 费用说明 */}
            {isValidAmount && (
              <div className="alert alert-info">
                <InformationCircleIcon className="w-5 h-5" />
                <div className="text-sm">
                  <div className="font-medium">{t("tip.fee_distribution")}</div>
                  <div>
                    •{" "}
                    {t(recipientType === "story" ? "tip.story_author_receive" : "tip.chapter_author_receive", {
                      amount: (parseFloat(finalAmount) * 0.85).toFixed(4),
                    })}
                  </div>
                  <div>
                    •{" "}
                    {t("tip.story_author_receive", {
                      amount: (parseFloat(finalAmount) * 0.1).toFixed(4),
                    })}
                  </div>
                  <div>
                    •{" "}
                    {t("tip.platform_fee", {
                      amount: (parseFloat(finalAmount) * 0.05).toFixed(4),
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-outline flex-1" disabled={isLoading}>
              {t("button.cancel")}
            </button>

            <button
              type="button"
              onClick={handleTip}
              className="btn btn-warning flex-1 gap-2"
              disabled={!address || !isValidAmount || isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {t("tip.tipping")}
                </>
              ) : (
                <>
                  <CurrencyDollarIcon className="w-4 h-4" />
                  {t("tip.title")} {finalAmount} STT
                </>
              )}
            </button>
          </div>

          {!address && (
            <div className="alert alert-warning mt-4">
              <InformationCircleIcon className="w-5 h-5" />
              <span>{t("tip.connect_wallet")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
