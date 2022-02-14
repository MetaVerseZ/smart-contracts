const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert, time } = require('@openzeppelin/test-helpers');

const withdrawTest = async (signer, holder) => {
	await token.connect(holder ?? deployer).transfer(timelock.address, await token.balanceOf((holder ?? deployer).address));

	const initialBalance = parseInt(ethers.utils.formatEther(await token.balanceOf(signer.address)));
	const initialTimelockBalance = parseInt(ethers.utils.formatEther(await token.balanceOf(timelock.address)));

	await timelock.connect(signer).withdrawAll();

	expect(parseInt(ethers.utils.formatEther(await token.balanceOf(signer.address)))).to.equal(initialBalance + initialTimelockBalance);
	expect(parseInt(ethers.utils.formatEther(await token.balanceOf(timelock.address)))).to.equal(0);
};

describe('Timelock tests', () => {
	describe('Deployment', require('./partials/deployment.test'));

	describe('Timelock Tests', () => {
		before(async () => {
			[deployer, account1, account2, account3, account4, account5] = await ethers.getSigners();
			const Timelock = await ethers.getContractFactory('Timelock');
			timelock = await Timelock.deploy(token.address, [account1.address, account2.address]);
			await timelock.deployed();
		});

		it('cannot withdraw if no balance', async () => {
			await expectRevert(timelock.withdrawAll(), 'nothing to withdraw');
		});

		it('cannot lock without having tokens', async () => {
			await expectRevert(timelock.lock([2500], [new Date().getTime()]), 'contract balance too low');
		});

		it('lock some tokens', async () => {
			await token.transfer(timelock.address, ethers.utils.parseEther('20000'));

			await expectRevert(timelock.lock([2500, 7500], [1]), 'arrays should have the same length');

			await timelock.lock([ethers.utils.parseEther('2500'), ethers.utils.parseEther('7500')], [1, 2]);
			expect(parseInt(ethers.utils.formatEther(await timelock.lockedAmount()))).to.equal(10000);

			await timelock.lock([ethers.utils.parseEther('3500')], [2]);
			expect(parseInt(ethers.utils.formatEther(await timelock.lockedAmount()))).to.equal(13500);

			await timelock.lock([ethers.utils.parseEther('2000')], [3]);
			expect(parseInt(ethers.utils.formatEther(await timelock.lockedAmount()))).to.equal(15500);
		});

		it('withdraw amount', async () => {
			await expectRevert(timelock.connect(account1).withdraw(ethers.utils.parseEther('7500')), 'amount too large');

			const initialBalance = parseInt(ethers.utils.formatEther(await token.balanceOf(account1.address)));

			await timelock.connect(account1).withdraw(ethers.utils.parseEther('4500'));
			expect(parseInt(ethers.utils.formatEther(await token.balanceOf(account1.address)))).to.equal(initialBalance + 4500);

			await expectRevert(timelock.connect(account1).withdraw(ethers.utils.parseEther('1')), 'nothing to withdraw');
		});

		it('cannot withdraw if not owner', async () => {
			await expectRevert(timelock.connect(account3).withdrawAll(), 'owner only');
			await expectRevert(timelock.connect(account4).withdrawAll(), 'owner only');
		});

		it('withdraw from deployer after time', async () => {
			const initialBalance = parseInt(ethers.utils.formatEther(await token.balanceOf(account2.address)));

			await time.increase(time.duration.days(1));

			await timelock.connect(account2).withdrawAll();
			expect(parseInt(ethers.utils.formatEther(await token.balanceOf(account2.address)))).to.equal(initialBalance + 2500);
		});

		it('cannot withdraw second time until time passes', async () => {
			await expectRevert(timelock.withdrawAll(), 'nothing to withdraw');
		});

		it('withdraw second time', async () => {
			const initialBalance = parseInt(ethers.utils.formatEther(await token.balanceOf(account1.address)));
			await time.increase(time.duration.days(1));

			await timelock.connect(account1).withdraw(ethers.utils.parseEther('5000'));

			expect(parseInt(ethers.utils.formatEther(await token.balanceOf(account1.address)))).to.equal(initialBalance + 5000);
			expect(parseInt(ethers.utils.formatEther(await token.balanceOf(timelock.address)))).to.equal(8000);

			await timelock.connect(account2).withdrawAll();
		});

		it('cannot withdraw third time until time passes', async () => {
			await expectRevert(timelock.withdrawAll(), 'nothing to withdraw');
		});

		it('withdraw third time', async () => {
			const initialBalance = parseInt(ethers.utils.formatEther(await token.balanceOf(account2.address)));
			await time.increase(time.duration.days(1));

			await expectRevert(timelock.connect(account2).withdraw(ethers.utils.parseEther('3000')), 'amount too large');

			await timelock.connect(account2).withdraw(ethers.utils.parseEther('2000'));

			expect(parseInt(ethers.utils.formatEther(await token.balanceOf(account2.address)))).to.equal(initialBalance + 2000);
			expect(parseInt(ethers.utils.formatEther(await token.balanceOf(timelock.address)))).to.equal(0);
		});

		it('set owners', async () => {
			await timelock.setOwners([account3.address, account4.address]);

			await expectRevert(timelock.connect(account1).withdrawAll(), 'owner only');
			await expectRevert(timelock.connect(account2).withdrawAll(), 'owner only');

			await withdrawTest(account3, account1);
			await withdrawTest(account4, account3);
		});
	});
});
