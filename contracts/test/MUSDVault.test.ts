import { expect } from "chai";
import { ethers } from "hardhat";
import { MUSDVault } from "../typechain-types";

describe("MUSDVault", () => {
  let vault: MUSDVault;
  let owner: any, user: any, executor: any, recipient: any;

  const ONE_BTC = ethers.parseEther("1");   // 1 mock BTC
  const ONE_MUSD = ethers.parseEther("1");  // 1 MUSD
  const MONTHLY = 2592000;                  // 30 days

  beforeEach(async () => {
    [owner, user, executor, recipient] = await ethers.getSigners();
    const MUSDVault = await ethers.getContractFactory("MUSDVault");
    vault = (await MUSDVault.deploy(executor.address)) as MUSDVault;
    await vault.waitForDeployment();
  });

  describe("Collateral", () => {
    it("accepts BTC collateral deposit", async () => {
      await expect(
        vault.connect(user).depositCollateral({ value: ONE_BTC })
      ).to.emit(vault, "CollateralDeposited").withArgs(user.address, ONE_BTC);

      expect(await vault.collateral(user.address)).to.equal(ONE_BTC);
    });

    it("reverts on zero deposit", async () => {
      await expect(
        vault.connect(user).depositCollateral({ value: 0 })
      ).to.be.revertedWithCustomError(vault, "ZeroAmount");
    });

    it("allows withdrawal when ratio is safe", async () => {
      await vault.connect(user).depositCollateral({ value: ONE_BTC });
      await expect(
        vault.connect(user).withdrawCollateral(ONE_BTC)
      ).to.emit(vault, "CollateralWithdrawn");
    });
  });

  describe("MUSD Minting", () => {
    it("mints MUSD within collateral ratio", async () => {
      await vault.connect(user).depositCollateral({ value: ONE_BTC });
      // 1 BTC @ $65k = $65k collateral, can mint up to ~$43k MUSD (150% ratio)
      const mintAmount = ethers.parseEther("40000");
      await expect(
        vault.connect(user).mintMUSD(mintAmount)
      ).to.emit(vault, "MUSDMinted").withArgs(user.address, mintAmount);

      expect(await vault.musdBalance(user.address)).to.equal(mintAmount);
    });

    it("reverts minting beyond collateral ratio", async () => {
      await vault.connect(user).depositCollateral({ value: ONE_BTC });
      const overMint = ethers.parseEther("50000");
      await expect(
        vault.connect(user).mintMUSD(overMint)
      ).to.be.revertedWithCustomError(vault, "CollateralRatioBelowMinimum");
    });
  });

  describe("Payment Scheduling", () => {
    beforeEach(async () => {
      await vault.connect(user).depositCollateral({ value: ONE_BTC });
      await vault.connect(user).mintMUSD(ethers.parseEther("5000"));
    });

    it("schedules a wallet payment", async () => {
      await expect(
        vault.connect(user).schedulePayment(
          recipient.address,
          ethers.parseEther("500"),
          MONTHLY,
          false,
          ""
        )
      ).to.emit(vault, "PaymentScheduled");
    });

    it("schedules an x402 payment", async () => {
      await expect(
        vault.connect(user).schedulePayment(
          ethers.ZeroAddress,
          ethers.parseEther("20"),
          MONTHLY,
          true,
          "https://api.service.com/premium"
        )
      ).to.emit(vault, "PaymentScheduled");
    });

    it("cancels a payment", async () => {
      await vault.connect(user).schedulePayment(
        recipient.address,
        ONE_MUSD,
        MONTHLY,
        false,
        ""
      );
      await expect(
        vault.connect(user).cancelPayment(0)
      ).to.emit(vault, "PaymentCancelled").withArgs(user.address, 0);

      const userPayments = await vault.getUserPayments(user.address);
      expect(userPayments[0].isActive).to.be.false;
    });
  });

  describe("Payment Execution", () => {
    beforeEach(async () => {
      await vault.connect(user).depositCollateral({ value: ONE_BTC });
      await vault.connect(user).mintMUSD(ethers.parseEther("5000"));
      await vault.connect(user).schedulePayment(
        recipient.address,
        ethers.parseEther("100"),
        60, // 1 min interval for tests
        false,
        ""
      );
    });

    it("executes a due payment", async () => {
      const balanceBefore = await vault.musdBalance(user.address);
      await expect(
        vault.connect(executor).executePayment(user.address, 0)
      ).to.emit(vault, "PaymentExecuted");

      const balanceAfter = await vault.musdBalance(user.address);
      expect(balanceBefore - balanceAfter).to.equal(ethers.parseEther("100"));
    });

    it("reverts execution before interval", async () => {
      await vault.connect(executor).executePayment(user.address, 0);
      await expect(
        vault.connect(executor).executePayment(user.address, 0)
      ).to.be.revertedWithCustomError(vault, "PaymentNotDue");
    });

    it("reverts execution with insufficient MUSD", async () => {
      await vault.connect(user).burnMUSD(ethers.parseEther("5000"));
      await expect(
        vault.connect(executor).executePayment(user.address, 0)
      ).to.be.revertedWithCustomError(vault, "InsufficientMUSDBalance");
    });

    it("reverts execution by unauthorized caller", async () => {
      await expect(
        vault.connect(user).executePayment(user.address, 0)
      ).to.be.revertedWithCustomError(vault, "Unauthorized");
    });
  });

  describe("Emergency Pause", () => {
    it("owner can pause and unpause", async () => {
      await vault.connect(owner).pause();
      await expect(
        vault.connect(user).depositCollateral({ value: ONE_BTC })
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");

      await vault.connect(owner).unpause();
      await expect(
        vault.connect(user).depositCollateral({ value: ONE_BTC })
      ).to.emit(vault, "CollateralDeposited");
    });
  });
});
