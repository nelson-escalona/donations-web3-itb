// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";

contract Donations {
    string public name; // Name of the donation campaign
    string public org_name; // Name of the organization of the campaign
    string public description; // Description of the donation campaign
    uint256 public goal; // Goal(monetary) of the campaign
    address public owner; // Address of the campaign's owner's wallet
    bool public pause; // If the campaign is paused or not
    bool private _entered;

    struct Tier {
        string name;
        string description;
        uint256 amount;
        uint256 donators;
        bool active;
    }

    struct Donator {
        uint256 totalContribution;
        mapping(uint256 => bool) fundedTiers;
    }

    Tier[] public tiers;
    mapping(address => Donator) public donators;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    modifier notPaused() {
        require(!pause, "Contract is paused.");
        _;
    }

    modifier nonReentrant() {
        require(!_entered, "Reentrancy");
        _entered = true;
        _;
        _entered = false;
    }

    event DonationReceived(address indexed donor, uint256 indexed tierIndex, uint256 amount);
    event DonationReceivedCustom(address indexed donor, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event TierAdded(uint256 indexed index, string name, uint256 amount);
    event TierUpdated(uint256 indexed index);
    event PausedToggled(bool paused);

    constructor(
        address _owner,
        string memory _name,
        string memory _org_name,
        string memory _description,
        uint256 _goal
    ) {
        require(_owner != address(0), "Owner required");
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_org_name).length > 0, "Org required");

        name = _name;
        org_name = _org_name;
        description = _description;
        goal = _goal;
        owner = _owner;
    }

    function fund(uint256 _tier_index) public payable notPaused nonReentrant {
        require(_tier_index < tiers.length, "Invalid tier.");
        require(tiers[_tier_index].active, "Tier inactive");
        require(msg.value == tiers[_tier_index].amount, "Incorrect amount.");

        tiers[_tier_index].donators++;
        donators[msg.sender].totalContribution += msg.value;
        donators[msg.sender].fundedTiers[_tier_index] = true;

        emit DonationReceived(msg.sender, _tier_index, msg.value);
    }

    function donate() external payable notPaused nonReentrant {
        require(msg.value > 0, "No value");
        donators[msg.sender].totalContribution += msg.value;

        emit DonationReceivedCustom(msg.sender, msg.value);
    }

    function withdraw() public onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw.");

        Address.sendValue(payable(owner), balance);

        emit Withdrawn(owner, balance);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function addTier(string memory _name, string memory _description, uint256 _amount) public onlyOwner {
        require(_amount > 0, "Amount must be greater than 0.");
        
        tiers.push(Tier(_name, _description, _amount, 0, true));

        emit TierAdded(tiers.length - 1, _name, _amount);
    }

    function setTierActive(uint256 _index, bool _active) public onlyOwner {
        require(_index < tiers.length, "Tier does not exist.");
        require(tiers[_index].donators == 0 || _active, "Cannot deactivate funded tier");
        tiers[_index].active = _active;
        
        emit TierUpdated(_index);
    }

    function getTiers() public view returns (Tier[] memory) {
        return tiers;
    }

    function hasFundedTier(address _donator, uint256 _tier_index) public view returns (bool) {
        return donators[_donator].fundedTiers[_tier_index];
    }

    function togglePause() public onlyOwner {
        pause = !pause;

        emit PausedToggled(pause);
    }

    receive() external payable {
        revert("Use fund()");
    }

    fallback() external payable {
        revert("Use fund()");
    }
}