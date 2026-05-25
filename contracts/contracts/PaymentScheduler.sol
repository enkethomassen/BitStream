// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IBitStreamVault {
    function musdBalance(address user) external view returns (uint256);
    function burnMUSD(uint256 amount) external;
    function getCollateralRatio(address user) external view returns (uint256);
}

/**
 * @title PaymentScheduler
 * @notice Schedule recurring MUSD payouts: interval + recipient + amount + spending cap.
 *
 * Automation Layer: works alongside BitStreamVault (Capital Layer).
 * Events: PaymentScheduled, PaymentExecuted, PaymentCancelled, CollateralAlert.
 */
contract PaymentScheduler is Ownable, Pausable, ReentrancyGuard {

    // ─────────────────────────────────────────────────────────
    //  DATA STRUCTURES
    // ─────────────────────────────────────────────────────────

    struct Schedule {
        address owner;
        address recipient;    // wallet recipient (ignored if isX402)
        uint256 amount;       // MUSD per execution (1e18)
        uint256 interval;     // seconds between executions
        uint256 spendingCap;  // max total MUSD to ever pay out (0 = unlimited)
        uint256 totalPaid;    // cumulative MUSD paid
        uint256 lastExecuted; // unix timestamp of last execution
        bool isActive;
        bool isX402;
        string endpoint;      // x402 endpoint URL
    }

    // ─────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────

    IBitStreamVault public vault;
    address public executor;

    mapping(uint256 => Schedule) public schedules;
    mapping(address => uint256[]) public userScheduleIds;
    uint256 public nextScheduleId;

    // ─────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────

    event PaymentScheduled(
        uint256 indexed scheduleId,
        address indexed owner,
        address recipient,
        uint256 amount,
        uint256 interval,
        uint256 spendingCap,
        bool isX402,
        string endpoint
    );
    event PaymentExecuted(
        uint256 indexed scheduleId,
        address indexed owner,
        address recipient,
        uint256 amount,
        bool isX402
    );
    event PaymentCancelled(uint256 indexed scheduleId, address indexed owner);
    event CollateralAlert(address indexed user, uint256 ratio);
    event VaultPaused(address indexed by);
    event VaultUnpaused(address indexed by);

    // ─────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────

    error NotFound();
    error NotActive();
    error NotDue();
    error NotAuthorized();
    error ZeroAmount();
    error InvalidInterval();
    error SpendingCapExceeded();
    error InsufficientMUSDBalance();
    error CollateralTooLow();

    // ─────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────

    constructor(address _vault, address _executor) Ownable(msg.sender) {
        vault = IBitStreamVault(_vault);
        executor = _executor;
    }

    // ─────────────────────────────────────────────────────────
    //  MODIFIERS
    // ─────────────────────────────────────────────────────────

    modifier onlyExecutorOrOwner() {
        if (msg.sender != executor && msg.sender != owner()) revert NotAuthorized();
        _;
    }

    // ─────────────────────────────────────────────────────────
    //  SCHEDULING
    // ─────────────────────────────────────────────────────────

    function schedulePayment(
        address recipient,
        uint256 amount,
        uint256 interval,
        uint256 spendingCap,
        bool isX402,
        string calldata endpoint
    ) external whenNotPaused returns (uint256 scheduleId) {
        if (amount == 0) revert ZeroAmount();
        if (interval < 60) revert InvalidInterval();
        if (!isX402 && recipient == address(0)) revert NotFound();

        scheduleId = nextScheduleId++;
        schedules[scheduleId] = Schedule({
            owner: msg.sender,
            recipient: recipient,
            amount: amount,
            interval: interval,
            spendingCap: spendingCap,
            totalPaid: 0,
            lastExecuted: 0,
            isActive: true,
            isX402: isX402,
            endpoint: endpoint
        });

        userScheduleIds[msg.sender].push(scheduleId);

        emit PaymentScheduled(
            scheduleId, msg.sender, recipient, amount, interval, spendingCap, isX402, endpoint
        );
    }

    function cancelSchedule(uint256 scheduleId) external whenNotPaused {
        Schedule storage s = schedules[scheduleId];
        if (s.owner == address(0)) revert NotFound();
        if (s.owner != msg.sender && msg.sender != owner()) revert NotAuthorized();
        if (!s.isActive) revert NotActive();
        s.isActive = false;
        emit PaymentCancelled(scheduleId, s.owner);
    }

    // ─────────────────────────────────────────────────────────
    //  EXECUTION (called by backend executor agent)
    // ─────────────────────────────────────────────────────────

    function executeSchedule(uint256 scheduleId) external whenNotPaused nonReentrant onlyExecutorOrOwner {
        Schedule storage s = schedules[scheduleId];
        if (s.owner == address(0)) revert NotFound();
        if (!s.isActive) revert NotActive();

        if (s.lastExecuted > 0 && block.timestamp < s.lastExecuted + s.interval) {
            revert NotDue();
        }

        if (s.spendingCap > 0 && s.totalPaid + s.amount > s.spendingCap) {
            s.isActive = false;
            revert SpendingCapExceeded();
        }

        uint256 bal = vault.musdBalance(s.owner);
        if (bal < s.amount) revert InsufficientMUSDBalance();

        uint256 ratio = vault.getCollateralRatio(s.owner);
        if (ratio < 150) {
            emit CollateralAlert(s.owner, ratio);
            revert CollateralTooLow();
        }

        s.lastExecuted = block.timestamp;
        s.totalPaid += s.amount;

        if (s.spendingCap > 0 && s.totalPaid >= s.spendingCap) {
            s.isActive = false;
        }

        emit PaymentExecuted(scheduleId, s.owner, s.recipient, s.amount, s.isX402);
    }

    // ─────────────────────────────────────────────────────────
    //  VIEW
    // ─────────────────────────────────────────────────────────

    function getUserSchedules(address user) external view returns (uint256[] memory) {
        return userScheduleIds[user];
    }

    function isDue(uint256 scheduleId) external view returns (bool) {
        Schedule storage s = schedules[scheduleId];
        if (!s.isActive) return false;
        if (s.lastExecuted == 0) return true;
        return block.timestamp >= s.lastExecuted + s.interval;
    }

    // ─────────────────────────────────────────────────────────
    //  ADMIN
    // ─────────────────────────────────────────────────────────

    function setVault(address _vault) external onlyOwner {
        vault = IBitStreamVault(_vault);
    }

    function setExecutor(address _executor) external onlyOwner {
        executor = _executor;
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
