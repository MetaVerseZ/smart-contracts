const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert } = require('@openzeppelin/test-helpers');

const test = () => {
	it('withdraw', async () => {
		const initialBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(admin.address)));
		const marketBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(market.address)));

		await market.connect(admin).withdrawAll();

		const newBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(admin.address)));
		const newMarketBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(market.address)));

		expect(newBalance - initialBalance).to.equal(marketBalance);
		expect(newMarketBalance).to.equal(0);
	});

	it('cannot withdraw if not admin', async () => {
		await expectRevert(market.connect(fourth).withdrawAll(), 'not admin');
	});
};

module.exports = test;
