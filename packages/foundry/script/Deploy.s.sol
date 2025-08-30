//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { DeployStoryChain } from "./DeployStoryChain.s.sol";

/**
 * @notice Main deployment script for all contracts
 * @dev Run this when you want to deploy multiple contracts at once
 *
 * Example: yarn deploy # runs this script(without`--file` flag)
 */
contract DeployScript is ScaffoldETHDeploy {
    function run() external {
        // 部署所有合约
        // 需要时在此添加新的部署

        // 部署故事链合约
        DeployStoryChain deployStoryChain = new DeployStoryChain();
        deployStoryChain.run();

        // 部署其他合约
        // DeployMyContract myContract = new DeployMyContract();
        // myContract.run();
    }
}
