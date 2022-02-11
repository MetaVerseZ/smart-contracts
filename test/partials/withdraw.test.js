const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert } = require('@openzeppelin/test-helpers');

const test = () => {
	it('withdraw', async () => {
		const balance = parseFloat(ethers.utils.formatEther(await token.balanceOf(admin.address)));
		await market.connect(admin).withdrawAll();
		const newBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(admin.address)));
		const marketBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(market.address)));
		expect(newBalance > balance).to.equal(true);
		expect(marketBalance).to.equal(parseFloat(ethers.utils.formatEther(listingFee) * (await market.numberOfListedItems())));
	});

	it('leave fees for unsold items', async () => {
		await expectRevert(market.connect(admin).withdrawAll(), 'leave fees for unsold items');
	});

	it('cannot withdraw if not admin', async () => {
		await expectRevert(market.withdrawAll(), 'not admin');
	});
};

module.exports = test;
