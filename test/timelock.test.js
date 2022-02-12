const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert, time } = require('@openzeppelin/test-helpers');

const withdrawTest = async (signer, holder) => {
	await token.connect(holder ?? deployer).transfer(timelock.address, await token.balanceOf((holder ?? deployer).address));

	const initialBalance = parseInt(ethers.utils.formatEther(await token.balanceOf(signer.address)));
	const initialTimelockBalance = parseInt(ethers.utils.formatEther(await token.balanceOf(timelock.address)));

	await timelock.connect(signer).withdraw();

	expect(parseInt(ethers.utils.formatEther(await token.balanceOf(signer.address)))).to.equal(initialBalance + initialTimelockBalance);
	expect(parseInt(ethers.utils.formatEther(await token.balanceOf(timelock.address)))).to.equal(0);
};

describe('Timelock tests', () => {
	describe('Deployment', require('./partials/deployment.test'));

	describe('Timelock', () => {
		before(async () => {
			[deployer, account1, account2, account3, account4] = await ethers.getSigners();

			const Timelock = await ethers.getContractFactory('Timelock');
			timelock = await Timelock.deploy(token.address, [account1.address, account3.address]);
			await timelock.deployed();

			const balance = await token.balanceOf(deployer.address);
			await token.transfer(timelock.address, balance);
		});

		it('cannot withdraw too early', async () => {
			await expectRevert(timelock.withdraw(), 'too early');
		});

		it('cannot withdraw if not owner', async () => {
			await expectRevert(timelock.connect(account2).withdraw(), 'owner only');
			await expectRevert(timelock.connect(account4).withdraw(), 'owner only');
		});

		it('withdraw from deployer after time', async () => {
			const initialBalance = parseInt(ethers.utils.formatEther(await token.balanceOf(deployer.address)));
			const initialTimelockBalance = parseInt(ethers.utils.formatEther(await token.balanceOf(timelock.address)));
			await time.increase(time.duration.days(1));
			await timelock.withdraw();
			expect(parseInt(ethers.utils.formatEther(await token.balanceOf(deployer.address)))).to.equal(initialBalance + initialTimelockBalance);
			expect(parseInt(ethers.utils.formatEther(await token.balanceOf(timelock.address)))).to.equal(0);
		});

		it('withdraw from other owners', async () => {
			await withdrawTest(account1);
			await withdrawTest(account3, account1);
		});

		it('set owners', async () => {
			await timelock.setOwners([account2.address, account4.address]);

			await expectRevert(timelock.connect(account1).withdraw(), 'owner only');
			await expectRevert(timelock.connect(account3).withdraw(), 'owner only');

			await withdrawTest(account4, account3);
			await withdrawTest(account2, account4);
		});
	});
});
