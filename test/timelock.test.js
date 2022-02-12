const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert, time } = require('@openzeppelin/test-helpers');

describe('Timelock tests', () => {
	describe('Deployment', require('./partials/deployment.test'));

	describe('Timelock', () => {
		before(async () => {
			const Timelock = await ethers.getContractFactory('Timelock');
			timelock = await Timelock.deploy(token.address);
			await timelock.deployed();

			[main, buyer] = await ethers.getSigners();

			const balance = await token.balanceOf(main.address);
			await token.approve(timelock.address, balance);
			await token.transfer(timelock.address, balance);
		});

		it('cannot withdraw too early', async () => {
			await expectRevert(timelock.withdraw(), 'too early');
		});

		it('cannot withdraw if not receiver', async () => {
			await expectRevert(timelock.connect(buyer).withdraw(), 'receiver only');
		});

		it('withdraw after time', async () => {
			const initialBalance = parseInt(ethers.utils.formatEther(await token.balanceOf(main.address)));
			const initialTimelockBalance = parseInt(ethers.utils.formatEther(await token.balanceOf(timelock.address)));
			await time.increase(time.duration.days(1));
			await timelock.withdraw();
			expect(parseInt(ethers.utils.formatEther(await token.balanceOf(main.address)))).to.equal(initialBalance + initialTimelockBalance);
			expect(parseInt(ethers.utils.formatEther(await token.balanceOf(timelock.address)))).to.equal(0);
		});
	});
});
