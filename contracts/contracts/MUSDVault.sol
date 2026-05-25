// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MUSDVault
 * @notice Bitcoin-native cashflow automation vault on Mezo.
 *         Users lock BTC collateral (mocked), mint MUSD, and schedule
 *         recurring payments — either to wallet addresses or x402 endpoints.
 *
 * Architecture Layer: CAPITAL LAYER (Mezo-native)
 * - No AI logic, no x402 logic here.
 * - x402 payments are triggered off-chain by the backend agent.
 */
contract MUSDVault is ReentrancyGuard, Ownable, Pausable {

    // ─────────────────────────────────────────────────────────
    //  CONSTANTS
    // ─────────────────────────────────────────────────────────

    /// @dev Minimum collateral ratio: 150%
    uint256 public constant MIN_COLLATERAL_RATIO = 150;

    /// @dev Mock BTC price in USD cents (65000 USD = 6500000 cents)
    uint256 public mockBtcPriceUSD = 65_000;

    /// @dev 1 MUSD = 1 USD (1e18 precision)
    uint256 public constant MUSD_PRECISION = 1e18;

    // ─────────────────────────────────────────────────────────
    //  DATA STRUCTURES
    // ─────────────────────────────────────────────────────────

    struct Payment {
        address recipient;     // wallet address (ignored if isX402)
        uint256 amount;        // in MUSD (1e18)
        uint256 interval;      // seconds between executions
        uint256 lastExecuted;  // unix timestamp
        bool isActive;
        bool isX402;           // if true, backend agent handles via x402
        string endpoint;       // x402 endpoint URL (empty if not x402)
    }

    // ─────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────

    /// @notice MUSD balances per user
    mapping(address => uint256) public musdBalance;

    /// @notice Mock BTC collateral (in wei-equivalent units, 1e18 = 1 BTC)
    mapping(address => uint256) public collateral;

    /// @notice Payment schedules per user
    mapping(address => Payment[]) public payments;

    /// @notice Total MUSD minted across all users
    uint256 public totalMUSDSupply;

    /// @notice Authorized executor (backend agent address)
    address public executor;

    // ─────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────

    event CollateralDeposited(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    event MUSDMinted(address indexed user, uint256 amount);
    event MUSDBurned(address indexed user, uint256 amount);
    event PaymentScheduled(
        address indexed user,
        uint256 indexed paymentId,
        address recipient,
        uint256 amount,
        uint256 interval,
        bool isX402,
        string endpoint
    );
    event PaymentExecuted(
        address indexed user,
        uint256 indexed paymentId,
        address recipient,
        uint256 amount,
        bool isX402
    );
    event PaymentCancelled(address indexed user, uint256 indexed paymentId);
    event CollateralUpdated(address indexed user, uint256 newCollateral, uint256 musdBalance);
    event ExecutorUpdated(address indexed newExecutor);
    event MockBtcPriceUpdated(uint256 newPrice);

    // ─────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────

    error InsufficientCollateral();
    error InsufficientMUSDBalance();
    error PaymentNotDue();
    error PaymentNotActive();
    error PaymentNotFound();
    error Unauthorized();
    error ZeroAmount();
    error CollateralRatioBelowMinimum();
    error InvalidInterval();

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
    //  CAPITAL LAYER — Collateral & MUSD
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Deposit mock BTC collateral.
     * @dev In production this integrates with Mezo's BTC staking module.
     *      For the MVP we accept any ETH-like amount as a "BTC unit" mock.
     */
    function depositCollateral() external payable whenNotPaused nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        collateral[msg.sender] += msg.value;
        emit CollateralDeposited(msg.sender, msg.value);
        emit CollateralUpdated(msg.sender, collateral[msg.sender], musdBalance[msg.sender]);
    }

    /**
     * @notice Withdraw BTC collateral. Enforces minimum collateral ratio post-withdrawal.
     */
    function withdrawCollateral(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (collateral[msg.sender] < amount) revert InsufficientCollateral();

        uint256 newCollateral = collateral[msg.sender] - amount;

        // Check collateral ratio will remain above minimum after withdrawal
        if (musdBalance[msg.sender] > 0) {
            uint256 ratio = _collateralRatio(newCollateral, musdBalance[msg.sender]);
            if (ratio < MIN_COLLATERAL_RATIO) revert CollateralRatioBelowMinimum();
        }

        collateral[msg.sender] = newCollateral;
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "ETH transfer failed");

        emit CollateralWithdrawn(msg.sender, amount);
        emit CollateralUpdated(msg.sender, collateral[msg.sender], musdBalance[msg.sender]);
    }

    /**
     * @notice Mint MUSD against deposited collateral.
     * @param amount Amount of MUSD to mint (1e18 = 1 MUSD).
     */
    function mintMUSD(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 newBalance = musdBalance[msg.sender] + amount;
        uint256 ratio = _collateralRatio(collateral[msg.sender], newBalance);
        if (ratio < MIN_COLLATERAL_RATIO) revert CollateralRatioBelowMinimum();

        musdBalance[msg.sender] = newBalance;
        totalMUSDSupply += amount;

        emit MUSDMinted(msg.sender, amount);
        emit CollateralUpdated(msg.sender, collateral[msg.sender], musdBalance[msg.sender]);
    }

    /**
     * @notice Burn MUSD to reduce debt position.
     */
    function burnMUSD(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (musdBalance[msg.sender] < amount) revert InsufficientMUSDBalance();

        musdBalance[msg.sender] -= amount;
        totalMUSDSupply -= amount;

        emit MUSDBurned(msg.sender, amount);
        emit CollateralUpdated(msg.sender, collateral[msg.sender], musdBalance[msg.sender]);
    }

    // ─────────────────────────────────────────────────────────
    //  AUTOMATION LAYER — Payment Scheduling
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Schedule a recurring MUSD payment.
     * @param recipient Target wallet address (ignored for x402).
     * @param amount    MUSD amount per execution (1e18 precision).
     * @param interval  Seconds between executions (e.g. 2592000 = monthly).
     * @param isX402    If true, backend agent will pay via x402.
     * @param endpoint  x402 endpoint URL (empty string if isX402 = false).
     */
    function schedulePayment(
        address recipient,
        uint256 amount,
        uint256 interval,
        bool isX402,
        string calldata endpoint
    ) external whenNotPaused returns (uint256 paymentId) {
        if (amount == 0) revert ZeroAmount();
        if (interval < 60) revert InvalidInterval(); // minimum 1 minute
        if (!isX402 && recipient == address(0)) revert PaymentNotFound();

        Payment memory p = Payment({
            recipient: recipient,
            amount: amount,
            interval: interval,
            lastExecuted: 0,
            isActive: true,
            isX402: isX402,
            endpoint: endpoint
        });

        payments[msg.sender].push(p);
        paymentId = payments[msg.sender].length - 1;

        emit PaymentScheduled(
            msg.sender,
            paymentId,
            recipient,
            amount,
            interval,
            isX402,
            endpoint
        );
    }

    /**
     * @notice Cancel an active payment schedule.
     */
    function cancelPayment(uint256 paymentId) external whenNotPaused {
        if (paymentId >= payments[msg.sender].length) revert PaymentNotFound();
        Payment storage p = payments[msg.sender][paymentId];
        if (!p.isActive) revert PaymentNotActive();

        p.isActive = false;
        emit PaymentCancelled(msg.sender, paymentId);
    }

    /**
     * @notice Execute a due payment on behalf of a user.
     * @dev Called by the backend executor agent. For x402 payments the off-chain
     *      agent handles the actual HTTP payment; this function only deducts MUSD.
     * @param user      The vault owner.
     * @param paymentId Index into the user's payment array.
     */
    function executePayment(
        address user,
        uint256 paymentId
    ) external whenNotPaused nonReentrant onlyExecutorOrOwner {
        if (paymentId >= payments[user].length) revert PaymentNotFound();

        Payment storage p = payments[user][paymentId];
        if (!p.isActive) revert PaymentNotActive();

        // Enforce interval
        if (p.lastExecuted > 0 && block.timestamp < p.lastExecuted + p.interval) {
            revert PaymentNotDue();
        }

        // Check MUSD balance
        if (musdBalance[user] < p.amount) revert InsufficientMUSDBalance();

        // Deduct MUSD
        musdBalance[user] -= p.amount;
        totalMUSDSupply -= p.amount;
        p.lastExecuted = block.timestamp;

        // For non-x402 payments: transfer MUSD equivalent via ETH mock
        // (In production: transfer ERC-20 MUSD token to recipient)
        // For x402: backend handles HTTP payment; we only track the deduction here.
        if (!p.isX402 && p.recipient != address(0)) {
            // Emit event — frontend & backend track this for settlement
            // In a full implementation, transfer MUSD ERC-20 token here.
        }

        emit PaymentExecuted(user, paymentId, p.recipient, p.amount, p.isX402);
        emit CollateralUpdated(user, collateral[user], musdBalance[user]);
    }

    // ─────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────

    function getUserPayments(address user) external view returns (Payment[] memory) {
        return payments[user];
    }

    function getCollateralRatio(address user) external view returns (uint256) {
        if (musdBalance[user] == 0) return type(uint256).max;
        return _collateralRatio(collateral[user], musdBalance[user]);
    }

    function getVaultInfo(address user)
        external
        view
        returns (
            uint256 _collateral,
            uint256 _musdBalance,
            uint256 _collateralRatio,
            uint256 _paymentCount
        )
    {
        _collateral = collateral[user];
        _musdBalance = musdBalance[user];
        _collateralRatio = (musdBalance[user] == 0)
            ? type(uint256).max
            : _collateralRatio(collateral[user], musdBalance[user]);
        _paymentCount = payments[user].length;
    }

    function isDue(address user, uint256 paymentId) external view returns (bool) {
        if (paymentId >= payments[user].length) return false;
        Payment storage p = payments[user][paymentId];
        if (!p.isActive) return false;
        if (p.lastExecuted == 0) return true;
        return block.timestamp >= p.lastExecuted + p.interval;
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
        emit MockBtcPriceUpdated(_price);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ─────────────────────────────────────────────────────────
    //  INTERNAL
    // ─────────────────────────────────────────────────────────

    /**
     * @dev Collateral ratio = (collateralUSD / musdDebt) * 100
     *      collateral is in wei (1e18 = 1 BTC mock)
     *      musd is 1e18 = 1 MUSD = 1 USD
     */
    function _collateralRatio(
        uint256 _collateral,
        uint256 _musd
    ) internal view returns (uint256) {
        if (_musd == 0) return type(uint256).max;
        // collateral in "BTC units" * BTC price / MUSD debt
        // both have 1e18 precision → ratio in percent
        uint256 collateralUSD = (_collateral * mockBtcPriceUSD) / MUSD_PRECISION;
        return (collateralUSD * 100) / (_musd / MUSD_PRECISION);
    }

    receive() external payable {
        // Accept ETH for mock BTC collateral
        collateral[msg.sender] += msg.value;
        emit CollateralDeposited(msg.sender, msg.value);
    }
}
