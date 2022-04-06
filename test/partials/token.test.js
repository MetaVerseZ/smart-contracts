const { ethers } = require('hardhat');
const { expect } = require('chai');

const test = () => {
	before(async () => {
		[main, buyer, holder, third, fourth] = await ethers.getSigners();
	});

	it('token created and balance sent to holder', async () => {
		const totalSupply = await token.totalSupply();
		await token.approve(holder.address, totalSupply);
		await token.transfer(holder.address, totalSupply);

		const tokenTotalSupply = ethers.utils.formatEther(totalSupply);
		const marketBalance = ethers.utils.formatEther(await token.balanceOf(holder.address));
		expect(marketBalance).to.equal(tokenTotalSupply);
	});

	it('send some tokens to an address', async () => {
		const amount = ethers.utils.parseUnits('1000000', 'ether');

		await token.connect(holder).approve(main.address, amount);
		await token.connect(holder).transfer(main.address, amount);

		await token.connect(holder).approve(buyer.address, amount);
		await token.connect(holder).transfer(buyer.address, amount);

		const mainBalance = ethers.utils.formatEther(await token.balanceOf(main.address));
		expect(mainBalance).to.equal(ethers.utils.formatEther(amount));
	});
};

module.exports = test;
