// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BitStreamVault
 * @notice Core vault: deposit BTC collateral, mint MUSD, track positions.
 *         Built for Bitstream — Bitcoin-backed automated cashflow engine on Mezo.
 *
 * Capital Layer: handles collateral and MUSD issuance only.
 * Off-chain automation (scheduler, x402) is handled by the backend agent.
 */
contract BitStreamVault is ReentrancyGuard, Ownable, Pausable {

    // ─────────────────────────────────────────────────────────
    //  CONSTANTS
    // ─────────────────────────────────────────────────────────

    uint256 public constant MIN_COLLATERAL_RATIO = 150;
    uint256 public constant MUSD_PRECISION = 1e18;

    // ─────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────

    uint256 public mockBtcPriceUSD = 65_000;

    mapping(address => uint256) public musdBalance;
    mapping(address => uint256) public collateral;
    uint256 public totalMUSDSupply;
    address public executor;

    // ─────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────

    event Deposited(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    event MUSDMinted(address indexed user, uint256 amount);
    event MUSDBurned(address indexed user, uint256 amount);
    event CollateralAlert(address indexed user, uint256 ratio, uint256 threshold);
    event VaultPaused(address indexed by);
    event VaultUnpaused(address indexed by);
    event ExecutorUpdated(address indexed newExecutor);

    // ─────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────

    error InsufficientCollateral();
    error InsufficientMUSDBalance();
    error CollateralRatioBelowMinimum();
    error ZeroAmount();
    error Unauthorized();

    // ─────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────

    constructor(address _executor) Ownable(msg.sender) {
        executor = _executor;
    }

    // ─────────────────────────────────────────────────────────
    //  MODIFIERS
    // ─────────────────────────────────────────────────────────

    modifier onlyExecutorOrOwner() {
        if (msg.sender != executor && msg.sender != owner()) revert Unauthorized();
        _;
    }

    // ─────────────────────────────────────────────────────────
    //  CAPITAL LAYER
    // ─────────────────────────────────────────────────────────

    function depositCollateral() external payable whenNotPaused nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        collateral[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);

        uint256 ratio = _collateralRatio(collateral[msg.sender], musdBalance[msg.sender]);
        if (musdBalance[msg.sender] > 0 && ratio < MIN_COLLATERAL_RATIO + 20) {
            emit CollateralAlert(msg.sender, ratio, MIN_COLLATERAL_RATIO);
        }
    }

    function withdrawCollateral(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (collateral[msg.sender] < amount) revert InsufficientCollateral();

        uint256 newCollateral = collateral[msg.sender] - amount;
        if (musdBalance[msg.sender] > 0) {
            uint256 ratio = _collateralRatio(newCollateral, musdBalance[msg.sender]);
            if (ratio < MIN_COLLATERAL_RATIO) revert CollateralRatioBelowMinimum();
        }

        collateral[msg.sender] = newCollateral;
        (bool sent,) = payable(msg.sender).call{value: amount}("");
        require(sent, "transfer failed");
        emit CollateralWithdrawn(msg.sender, amount);
    }

    function mintMUSD(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 newBalance = musdBalance[msg.sender] + amount;
        uint256 ratio = _collateralRatio(collateral[msg.sender], newBalance);
        if (ratio < MIN_COLLATERAL_RATIO) revert CollateralRatioBelowMinimum();

        musdBalance[msg.sender] = newBalance;
        totalMUSDSupply += amount;
        emit MUSDMinted(msg.sender, amount);
    }

    function burnMUSD(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (musdBalance[msg.sender] < amount) revert InsufficientMUSDBalance();
        musdBalance[msg.sender] -= amount;
        totalMUSDSupply -= amount;
        emit MUSDBurned(msg.sender, amount);
    }

    // ─────────────────────────────────────────────────────────
    //  VIEW
    // ─────────────────────────────────────────────────────────

    function getCollateralRatio(address user) external view returns (uint256) {
        if (musdBalance[user] == 0) return type(uint256).max;
        return _collateralRatio(collateral[user], musdBalance[user]);
    }

    function getVaultInfo(address user)
        external view
        returns (uint256 _collateral, uint256 _musdBalance, uint256 _collateralRatio)
    {
        _collateral = collateral[user];
        _musdBalance = musdBalance[user];
        _collateralRatio = musdBalance[user] == 0
            ? type(uint256).max
            : _collateralRatio(collateral[user], musdBalance[user]);
    }

    // ─────────────────────────────────────────────────────────
    //  ADMIN
    // ─────────────────────────────────────────────────────────

    function setExecutor(address _executor) external onlyOwner {
        executor = _executor;
        emit ExecutorUpdated(_executor);
    }

    function setMockBtcPrice(uint256 _price) external onlyOwner {
        mockBtcPriceUSD = _price;
    }

    function pause() external onlyOwner {
        _pause();
        emit VaultPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit VaultUnpaused(msg.sender);
    }

    // ─────────────────────────────────────────────────────────
    //  INTERNAL
    // ─────────────────────────────────────────────────────────

    function _collateralRatio(uint256 _col, uint256 _musd) internal view returns (uint256) {
        if (_musd == 0) return type(uint256).max;
        uint256 collateralUSD = (_col * mockBtcPriceUSD) / MUSD_PRECISION;
        return (collateralUSD * 100) / (_musd / MUSD_PRECISION);
    }

    receive() external payable {
        collateral[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
}
