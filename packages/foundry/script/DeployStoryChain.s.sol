// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/StoryChain.sol";

/**
 * @notice 故事链合约部署脚本
 * @dev 继承ScaffoldETHDeploy提供部署功能
 *
 * 使用方法:
 * yarn deploy --file DeployStoryChain.s.sol  # 本地anvil链
 * yarn deploy --file DeployStoryChain.s.sol --network sepolia # 测试网络（需要keystore）
 */
contract DeployStoryChain is ScaffoldETHDeploy {
    /**
     * @dev 部署故事链合约
     * 使用ScaffoldEthDeployerRunner修饰符来：
     * - 设置正确的部署账户并为其充值
     * - 导出合约地址和ABI到nextjs包
     */
    function run() external ScaffoldEthDeployerRunner {
        // 部署故事链合约
        StoryChain storyChain = new StoryChain();

        // 记录部署信息（简化版本，避免使用address(this)）
        console.log("Story Chain contract deployed at:", address(storyChain));
        console.log("Deployer address:", deployer);
        console.log("Chain ID:", block.chainid);

        // 验证合约部署是否成功
        require(address(storyChain) != address(0), "StoryChain deployment failed");

        // 输出合约的基本信息
        console.log("Contract name:", storyChain.name());
        console.log("Contract symbol:", storyChain.symbol());
        console.log("Contract owner:", storyChain.owner());

        console.log("StoryChain deployment completed successfully!");
    }
}
