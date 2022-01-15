const { ethers } = require('hardhat');
const { expect } = require('chai');

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
		try {
			await market.connect(admin).withdrawAll();
		} catch (error) {
			expect(error.message.includes('leave fees for unsold items')).to.equal(true);
		}
	});

	it('cannot withdraw if not admin', async () => {
		try {
			await market.withdrawAll();
			expect(true).to.equal(false);
		} catch (error) {
			expect(error.message.includes('not admin')).to.equal(true);
		}
	});
};

module.exports = test;
