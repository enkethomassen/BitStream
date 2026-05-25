// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IVaultRead {
    function getCollateralRatio(address user) external view returns (uint256);
    function musdBalance(address user) external view returns (uint256);
    function collateral(address user) external view returns (uint256);
}

/**
 * @title CollateralGuard
 * @notice Enforces collateral ratio checks before every payout.
 *         Emits CollateralAlert and can pause the PaymentScheduler
 *         if ratios drop critically low.
 *
 * Safety Layer: guardian contract that backend agent queries before execution.
 */
contract CollateralGuard is Ownable, Pausable {

    // ─────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────

    IVaultRead public vault;

    uint256 public warningThreshold  = 175; // 175% → emit warning
    uint256 public criticalThreshold = 150; // 150% → block payments
    uint256 public emergencyThreshold = 130; // 130% → emergency pause

    // ─────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────

    event CollateralAlert(
        address indexed user,
        uint256 currentRatio,
        uint256 threshold,
        AlertLevel level
    );
    event VaultPaused(address indexed by);
    event VaultUnpaused(address indexed by);
    event ThresholdUpdated(uint256 warning, uint256 critical, uint256 emergency);

    enum AlertLevel { WARNING, CRITICAL, EMERGENCY }

    // ─────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────

    error CollateralCritical(address user, uint256 ratio);
    error ZeroAddress();

    // ─────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────

    constructor(address _vault) Ownable(msg.sender) {
        if (_vault == address(0)) revert ZeroAddress();
        vault = IVaultRead(_vault);
    }

    // ─────────────────────────────────────────────────────────
    //  GUARD CHECK (called by executor before every payment)
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Check collateral health for a user before executing a payment.
     * @return safe True if payment can proceed, false if it should be blocked.
     */
    function checkBeforePayment(address user) external whenNotPaused returns (bool safe) {
        uint256 ratio = vault.getCollateralRatio(user);

        if (ratio >= warningThreshold) {
            return true; // healthy
        }

        if (ratio < emergencyThreshold) {
            emit CollateralAlert(user, ratio, emergencyThreshold, AlertLevel.EMERGENCY);
            _pause(); // emergency: pause all guard checks
            emit VaultPaused(address(this));
            revert CollateralCritical(user, ratio);
        }

        if (ratio < criticalThreshold) {
            emit CollateralAlert(user, ratio, criticalThreshold, AlertLevel.CRITICAL);
            revert CollateralCritical(user, ratio);
        }

        // Between critical and warning — allow but warn
        emit CollateralAlert(user, ratio, warningThreshold, AlertLevel.WARNING);
        return true;
    }

    /**
     * @notice Pure read — no state change, no events. For off-chain polling.
     */
    function getRatioStatus(address user)
        external
        view
        returns (uint256 ratio, bool isHealthy, bool isCritical, bool isEmergency)
    {
        ratio = vault.getCollateralRatio(user);
        isHealthy   = ratio >= warningThreshold;
        isCritical  = ratio < criticalThreshold;
        isEmergency = ratio < emergencyThreshold;
    }

    // ─────────────────────────────────────────────────────────
    //  ADMIN
    // ─────────────────────────────────────────────────────────

    function setVault(address _vault) external onlyOwner {
        if (_vault == address(0)) revert ZeroAddress();
        vault = IVaultRead(_vault);
    }

    function setThresholds(
        uint256 _warning,
        uint256 _critical,
        uint256 _emergency
    ) external onlyOwner {
        require(_emergency < _critical && _critical < _warning, "Invalid order");
        warningThreshold  = _warning;
        criticalThreshold = _critical;
        emergencyThreshold = _emergency;
        emit ThresholdUpdated(_warning, _critical, _emergency);
    }

    function pause() external onlyOwner {
        _pause();
        emit VaultPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit VaultUnpaused(msg.sender);
    }
}
