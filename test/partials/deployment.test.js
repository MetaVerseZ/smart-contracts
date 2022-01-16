const { ethers } = require('hardhat');

const test = () => {
	it('deploy token contract', async () => {
		const Token = await ethers.getContractFactory('Token');
		token = await Token.deploy();
		await token.deployed();
	});

	it('deploy item contract', async () => {
		const Item = await ethers.getContractFactory('Item');
		admin = (await ethers.getSigners())[9];
		item = await Item.deploy(admin.address);
		await item.deployed();
	});

	it('deploy market contract', async () => {
		const Market = await ethers.getContractFactory('Market');
		market = await Market.deploy(token.address, item.address, admin.address);
		await market.deployed();
		await item.connect(admin).setMarket(market.address);
	});
};

module.exports = test;
