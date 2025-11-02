// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Donations} from "./Donations.sol";

contract DonationsFactory is ReentrancyGuard {
    address public owner;
    bool public paused;

    struct Campaign {
        address campaignAddress;
        address owner;
        string name;
        string orgName;
        uint256 goal;
        uint256 creationTime;
    }

    Campaign[] public campaigns;
    mapping(address => Campaign[]) public userCampaigns;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner.");
        _;
    }

    modifier notPaused() {
        require(!paused, "Factory is paused.");
        _;
    }

    event CampaignCreated(
        address indexed campaign,
        address indexed owner,
        string name,
        string orgName,
        uint256 goal,
        uint256 createdAt
    );

    constructor() {
        owner = msg.sender;
    }

    function pause() external onlyOwner { paused = true; }
    function unpause() external onlyOwner { paused = false; }

    function createCampaign(
        string memory _name,
        string memory _org_name,
        string memory _description,
        uint256 _goal
    ) external notPaused nonReentrant {
        require(bytes(_name).length > 0, "Name empty");
        require(bytes(_org_name).length > 0, "Org name empty");
        require(_goal > 0, "Goal must be > 0");

        Donations newCampaign = new Donations(
            msg.sender,
            _name,
            _org_name,
            _description,
            _goal
        );

        address campaignAddress = address(newCampaign);
        require(campaignAddress != address(0), "Deployment failed");

        Campaign memory campaign = Campaign({
            campaignAddress: campaignAddress,
            owner: msg.sender,
            name: _name,
            orgName: _org_name,
            goal: _goal,
            creationTime: block.timestamp
        });

        campaigns.push(campaign);
        userCampaigns[msg.sender].push(campaign);

        emit CampaignCreated(campaignAddress, msg.sender, _name, _org_name, _goal, block.timestamp);
    }

    function getCampaignsCount() external view returns (uint256) {
        return campaigns.length;
    }

    function getUserCampaignsCount(address user) external view returns (uint256) {
        return userCampaigns[user].length;
    }
}